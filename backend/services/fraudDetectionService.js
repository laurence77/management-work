const { createClient } = require('@supabase/supabase-js');
const { logger } = require('../utils/logger');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

class FraudDetectionService {
  constructor() {
    this.riskThresholds = {
      HIGH: 80,
      MEDIUM: 50,
      LOW: 20
    };
    
    this.fraudPatterns = {
      SUSPICIOUS_EMAIL: /^[a-z0-9]+@(tempmail|10minutemail|guerrillamail|mailinator|throwaway)/i,
      REPEATED_CANCELLATIONS: 3, // threshold for cancelled bookings
      HIGH_VALUE_RUSH: 50000, // high value booking with rush timeline
      IP_VELOCITY: 5, // max bookings per IP per hour
      PAYMENT_VELOCITY: 3, // max payment attempts per user per hour
      SUSPICIOUS_LOCATIONS: ['nigeria', 'ghana', 'cameroon'], // common fraud locations
      FAKE_PHONE_PATTERNS: [/^(\+1)?0{10}/, /^(\+1)?1{10}/, /^(\+1)?123{7}/]
    };
  }

  // Main fraud detection entry point
  async analyzeBooking(bookingData, userContext = {}) {
    try {
      const riskFactors = [];
      let totalRiskScore = 0;

      // 1. Email analysis
      const emailRisk = await this.analyzeEmail(bookingData.client_email);
      riskFactors.push(...emailRisk.factors);
      totalRiskScore += emailRisk.score;

      // 2. Phone number analysis
      const phoneRisk = await this.analyzePhoneNumber(bookingData.client_phone);
      riskFactors.push(...phoneRisk.factors);
      totalRiskScore += phoneRisk.score;

      // 3. Booking pattern analysis
      const patternRisk = await this.analyzeBookingPatterns(bookingData);
      riskFactors.push(...patternRisk.factors);
      totalRiskScore += patternRisk.score;

      // 4. Payment behavior analysis
      const paymentRisk = await this.analyzePaymentBehavior(bookingData);
      riskFactors.push(...paymentRisk.factors);
      totalRiskScore += paymentRisk.score;

      // 5. Geographic analysis
      const geoRisk = await this.analyzeGeographicRisk(userContext.ip_address, bookingData.venue);
      riskFactors.push(...geoRisk.factors);
      totalRiskScore += geoRisk.score;

      // 6. Historical user behavior
      const historyRisk = await this.analyzeUserHistory(bookingData.user_id || bookingData.client_email);
      riskFactors.push(...historyRisk.factors);
      totalRiskScore += historyRisk.score;

      // 7. Velocity checks
      const velocityRisk = await this.analyzeVelocity(bookingData, userContext);
      riskFactors.push(...velocityRisk.factors);
      totalRiskScore += velocityRisk.score;

      // Calculate final risk level
      const riskLevel = this.calculateRiskLevel(totalRiskScore);
      
      // Create fraud assessment record
      const assessment = {
        booking_id: bookingData.id,
        user_id: bookingData.user_id,
        risk_score: totalRiskScore,
        risk_level: riskLevel,
        risk_factors: riskFactors,
        analysis_data: {
          email_risk: emailRisk,
          phone_risk: phoneRisk,
          pattern_risk: patternRisk,
          payment_risk: paymentRisk,
          geo_risk: geoRisk,
          history_risk: historyRisk,
          velocity_risk: velocityRisk
        },
        requires_review: riskLevel === 'HIGH' || totalRiskScore > this.riskThresholds.MEDIUM,
        auto_block: riskLevel === 'HIGH' && totalRiskScore > 90,
        created_at: new Date()
      };

      // Store assessment
      await this.storeFraudAssessment(assessment);

      // Trigger alerts if necessary
      if (assessment.requires_review) {
        await this.triggerFraudAlert(assessment, bookingData);
      }

      return assessment;
    } catch (error) {
      logger.error('Fraud detection analysis failed:', error);
      throw new Error('Failed to analyze booking for fraud');
    }
  }

  // Email analysis
  async analyzeEmail(email) {
    const factors = [];
    let score = 0;

    if (!email) {
      factors.push({ type: 'missing_email', severity: 'HIGH', description: 'No email address provided' });
      return { score: 30, factors };
    }

    // Check against suspicious email patterns
    if (this.fraudPatterns.SUSPICIOUS_EMAIL.test(email)) {
      factors.push({ 
        type: 'suspicious_email_domain', 
        severity: 'HIGH', 
        description: 'Email from known temporary/suspicious domain' 
      });
      score += 40;
    }

    // Check email format and complexity
    const emailParts = email.split('@');
    if (emailParts.length !== 2) {
      factors.push({ type: 'invalid_email_format', severity: 'MEDIUM', description: 'Invalid email format' });
      score += 20;
    } else {
      const [localPart, domain] = emailParts;
      
      // Very short local part
      if (localPart.length < 3) {
        factors.push({ type: 'short_email_local', severity: 'MEDIUM', description: 'Suspiciously short email local part' });
        score += 15;
      }
      
      // Check for repeated characters
      if (/(.)\1{3,}/.test(localPart)) {
        factors.push({ type: 'repeated_chars', severity: 'MEDIUM', description: 'Email contains repeated characters' });
        score += 10;
      }
    }

    // Check against known blacklisted emails
    const isBlacklisted = await this.checkEmailBlacklist(email);
    if (isBlacklisted) {
      factors.push({ type: 'blacklisted_email', severity: 'HIGH', description: 'Email address is blacklisted' });
      score += 50;
    }

    return { score, factors };
  }

  // Phone number analysis
  async analyzePhoneNumber(phone) {
    const factors = [];
    let score = 0;

    if (!phone) {
      factors.push({ type: 'missing_phone', severity: 'MEDIUM', description: 'No phone number provided' });
      return { score: 15, factors };
    }

    // Check against fake phone patterns
    for (const pattern of this.fraudPatterns.FAKE_PHONE_PATTERNS) {
      if (pattern.test(phone)) {
        factors.push({ 
          type: 'fake_phone_pattern', 
          severity: 'HIGH', 
          description: 'Phone number matches fake/test pattern' 
        });
        score += 35;
        break;
      }
    }

    // Check phone number validity (basic)
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10 || cleanPhone.length > 15) {
      factors.push({ type: 'invalid_phone_length', severity: 'MEDIUM', description: 'Phone number has invalid length' });
      score += 20;
    }

    return { score, factors };
  }

  // Booking pattern analysis
  async analyzeBookingPatterns(bookingData) {
    const factors = [];
    let score = 0;

    // High value booking with rush timeline
    if (bookingData.budget > this.fraudPatterns.HIGH_VALUE_RUSH) {
      const eventDate = new Date(bookingData.event_date);
      const now = new Date();
      const daysUntilEvent = (eventDate - now) / (1000 * 60 * 60 * 24);
      
      if (daysUntilEvent < 7) {
        factors.push({ 
          type: 'high_value_rush', 
          severity: 'HIGH', 
          description: `High value booking ($${bookingData.budget.toLocaleString()}) with ${Math.round(daysUntilEvent)} days notice` 
        });
        score += 30;
      }
    }

    // Unusual event type for celebrity
    if (bookingData.celebrity_id && bookingData.event_type) {
      const unusualCombination = await this.checkUnusualEventType(bookingData.celebrity_id, bookingData.event_type);
      if (unusualCombination) {
        factors.push({ 
          type: 'unusual_event_type', 
          severity: 'MEDIUM', 
          description: 'Event type is unusual for this celebrity' 
        });
        score += 15;
      }
    }

    // Multiple booking attempts
    const recentAttempts = await this.getRecentBookingAttempts(bookingData.client_email, 24);
    if (recentAttempts > 3) {
      factors.push({ 
        type: 'multiple_attempts', 
        severity: 'MEDIUM', 
        description: `${recentAttempts} booking attempts in 24 hours` 
      });
      score += 20;
    }

    return { score, factors };
  }

  // Payment behavior analysis
  async analyzePaymentBehavior(bookingData) {
    const factors = [];
    let score = 0;

    // Check for payment velocity
    if (bookingData.user_id) {
      const recentPaymentAttempts = await this.getRecentPaymentAttempts(bookingData.user_id, 1);
      if (recentPaymentAttempts > this.fraudPatterns.PAYMENT_VELOCITY) {
        factors.push({ 
          type: 'payment_velocity', 
          severity: 'HIGH', 
          description: `${recentPaymentAttempts} payment attempts in 1 hour` 
        });
        score += 35;
      }
    }

    // Unusual payment amounts
    if (bookingData.budget) {
      if (bookingData.budget > 100000) {
        factors.push({ 
          type: 'very_high_amount', 
          severity: 'MEDIUM', 
          description: `Very high booking amount: $${bookingData.budget.toLocaleString()}` 
        });
        score += 15;
      }
      
      // Round number amounts (often fake)
      if (bookingData.budget % 10000 === 0 && bookingData.budget > 10000) {
        factors.push({ 
          type: 'round_amount', 
          severity: 'MEDIUM', 
          description: 'Budget is a suspiciously round number' 
        });
        score += 10;
      }
    }

    return { score, factors };
  }

  // Geographic risk analysis
  async analyzeGeographicRisk(ipAddress, venue) {
    const factors = [];
    let score = 0;

    if (ipAddress) {
      // Get IP geolocation (this would need a real IP geolocation service)
      const ipLocation = await this.getIPLocation(ipAddress);
      
      if (ipLocation && this.fraudPatterns.SUSPICIOUS_LOCATIONS.some(loc => 
        ipLocation.country?.toLowerCase().includes(loc)
      )) {
        factors.push({ 
          type: 'suspicious_ip_location', 
          severity: 'HIGH', 
          description: `Request from high-risk location: ${ipLocation.country}` 
        });
        score += 40;
      }

      // VPN/Proxy detection
      if (ipLocation && ipLocation.isProxy) {
        factors.push({ 
          type: 'proxy_detected', 
          severity: 'MEDIUM', 
          description: 'Request appears to be from VPN/proxy' 
        });
        score += 20;
      }
    }

    return { score, factors };
  }

  // User history analysis
  async analyzeUserHistory(userIdentifier) {
    const factors = [];
    let score = 0;

    try {
      // Get user's booking history
      const { data: bookings } = await supabase
        .from('bookings')
        .select('status, created_at')
        .or(`user_id.eq.${userIdentifier},client_email.eq.${userIdentifier}`)
        .order('created_at', { ascending: false })
        .limit(20);

      if (bookings && bookings.length > 0) {
        const cancelledBookings = bookings.filter(b => b.status === 'cancelled').length;
        const totalBookings = bookings.length;
        
        // High cancellation rate
        if (totalBookings >= 3 && cancelledBookings >= this.fraudPatterns.REPEATED_CANCELLATIONS) {
          const cancellationRate = (cancelledBookings / totalBookings) * 100;
          factors.push({ 
            type: 'high_cancellation_rate', 
            severity: 'HIGH', 
            description: `${cancellationRate.toFixed(1)}% cancellation rate (${cancelledBookings}/${totalBookings})` 
          });
          score += 30;
        }

        // Check for disputed/fraudulent bookings
        const disputedBookings = bookings.filter(b => b.status === 'disputed').length;
        if (disputedBookings > 0) {
          factors.push({ 
            type: 'previous_disputes', 
            severity: 'HIGH', 
            description: `${disputedBookings} previous disputed booking(s)` 
          });
          score += 40;
        }
      } else {
        // New user with no history
        factors.push({ 
          type: 'new_user', 
          severity: 'LOW', 
          description: 'New user with no booking history' 
        });
        score += 5;
      }
    } catch (error) {
      logger.error('Error analyzing user history:', error);
    }

    return { score, factors };
  }

  // Velocity analysis
  async analyzeVelocity(bookingData, userContext) {
    const factors = [];
    let score = 0;

    if (userContext.ip_address) {
      // IP velocity check
      const ipBookings = await this.getRecentIPBookings(userContext.ip_address, 1);
      if (ipBookings > this.fraudPatterns.IP_VELOCITY) {
        factors.push({ 
          type: 'ip_velocity', 
          severity: 'HIGH', 
          description: `${ipBookings} bookings from same IP in 1 hour` 
        });
        score += 35;
      }
    }

    // User velocity check
    if (bookingData.user_id) {
      const userBookings = await this.getRecentUserBookings(bookingData.user_id, 24);
      if (userBookings > 5) {
        factors.push({ 
          type: 'user_velocity', 
          severity: 'MEDIUM', 
          description: `${userBookings} bookings by user in 24 hours` 
        });
        score += 20;
      }
    }

    return { score, factors };
  }

  // Helper methods
  calculateRiskLevel(score) {
    if (score >= this.riskThresholds.HIGH) return 'HIGH';
    if (score >= this.riskThresholds.MEDIUM) return 'MEDIUM';
    return 'LOW';
  }

  async storeFraudAssessment(assessment) {
    const { error } = await supabase
      .from('fraud_assessments')
      .insert(assessment);

    if (error) {
      logger.error('Failed to store fraud assessment:', error);
      throw error;
    }
  }

  async triggerFraudAlert(assessment, bookingData) {
    // Create alert record
    const alert = {
      type: 'fraud_detection',
      severity: assessment.risk_level,
      title: `Potential Fraud: ${assessment.risk_level} Risk Booking`,
      message: `Booking #${bookingData.id} flagged with ${assessment.risk_score} risk score`,
      booking_id: bookingData.id,
      user_id: bookingData.user_id,
      metadata: {
        risk_factors: assessment.risk_factors,
        client_email: bookingData.client_email,
        budget: bookingData.budget
      },
      is_read: false,
      created_at: new Date()
    };

    await supabase.from('alerts').insert(alert);

    // If auto-block is recommended, update booking status
    if (assessment.auto_block) {
      await supabase
        .from('bookings')
        .update({ 
          status: 'blocked',
          notes: `Automatically blocked due to high fraud risk (score: ${assessment.risk_score})`
        })
        .eq('id', bookingData.id);
    }

    logger.info(`Fraud alert triggered for booking ${bookingData.id}, risk: ${assessment.risk_level}`);
  }

  // Helper database queries
  async checkEmailBlacklist(email) {
    const { data } = await supabase
      .from('email_blacklist')
      .select('email')
      .eq('email', email.toLowerCase())
      .single();
    
    return !!data;
  }

  async checkUnusualEventType(celebrityId, eventType) {
    // This would check against celebrity's typical event types
    // For now, return false
    return false;
  }

  async getRecentBookingAttempts(email, hours) {
    const since = new Date(Date.now() - (hours * 60 * 60 * 1000));
    const { data } = await supabase
      .from('bookings')
      .select('id')
      .eq('client_email', email)
      .gte('created_at', since.toISOString());
    
    return data?.length || 0;
  }

  async getRecentPaymentAttempts(userId, hours) {
    const since = new Date(Date.now() - (hours * 60 * 60 * 1000));
    const { data } = await supabase
      .from('payment_attempts')
      .select('id')
      .eq('user_id', userId)
      .gte('created_at', since.toISOString());
    
    return data?.length || 0;
  }

  async getRecentIPBookings(ipAddress, hours) {
    const since = new Date(Date.now() - (hours * 60 * 60 * 1000));
    const { data } = await supabase
      .from('booking_sessions')
      .select('id')
      .eq('ip_address', ipAddress)
      .gte('created_at', since.toISOString());
    
    return data?.length || 0;
  }

  async getRecentUserBookings(userId, hours) {
    const since = new Date(Date.now() - (hours * 60 * 60 * 1000));
    const { data } = await supabase
      .from('bookings')
      .select('id')
      .eq('user_id', userId)
      .gte('created_at', since.toISOString());
    
    return data?.length || 0;
  }

  async getIPLocation(ipAddress) {
    // This would integrate with a real IP geolocation service
    // For now, return mock data
    return {
      country: 'Unknown',
      isProxy: false
    };
  }

  // Batch fraud analysis for existing bookings
  async analyzeExistingBookings(limit = 100) {
    try {
      const { data: bookings } = await supabase
        .from('bookings')
        .select('*')
        .is('fraud_assessment_id', null)
        .limit(limit);

      const results = [];
      for (const booking of bookings || []) {
        try {
          const assessment = await this.analyzeBooking(booking);
          results.push({ booking_id: booking.id, success: true, assessment });
        } catch (error) {
          results.push({ booking_id: booking.id, success: false, error: error.message });
        }
      }

      return results;
    } catch (error) {
      logger.error('Batch fraud analysis failed:', error);
      throw error;
    }
  }

  // Get fraud statistics
  async getFraudStatistics(days = 30) {
    const since = new Date(Date.now() - (days * 24 * 60 * 60 * 1000));
    
    const { data: assessments } = await supabase
      .from('fraud_assessments')
      .select('risk_level, risk_score, created_at')
      .gte('created_at', since.toISOString());

    const total = assessments?.length || 0;
    const high = assessments?.filter(a => a.risk_level === 'HIGH').length || 0;
    const medium = assessments?.filter(a => a.risk_level === 'MEDIUM').length || 0;
    const low = assessments?.filter(a => a.risk_level === 'LOW').length || 0;
    
    const avgRiskScore = total > 0 
      ? assessments.reduce((sum, a) => sum + a.risk_score, 0) / total 
      : 0;

    return {
      total_assessments: total,
      high_risk: high,
      medium_risk: medium,
      low_risk: low,
      average_risk_score: Math.round(avgRiskScore * 100) / 100,
      fraud_rate: total > 0 ? Math.round((high / total) * 100 * 100) / 100 : 0
    };
  }
}

module.exports = new FraudDetectionService();