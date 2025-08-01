const { supabase } = require('../../config/supabase');
const { logger } = require('../../utils/logger');
const crypto = require('crypto');
const geoip = require('geoip-lite');

class FraudDetectionService {
    constructor() {
        this.riskScoreThresholds = {
            low: 30,
            medium: 60,
            high: 80,
            critical: 90
        };

        this.fraudPatterns = {
            velocity: {
                max_transactions_per_hour: 5,
                max_amount_per_hour: 50000,
                max_failed_attempts_per_hour: 3
            },
            geographic: {
                suspicious_countries: ['XX', 'YY'], // ISO codes for high-risk countries
                max_distance_km: 1000 // Max distance between consecutive transactions
            },
            behavioral: {
                min_session_duration_seconds: 30,
                max_booking_value_multiplier: 10, // vs user's average
                suspicious_user_agents: ['bot', 'crawler', 'scraper']
            },
            payment: {
                max_card_attempts: 5,
                suspicious_bin_ranges: ['123456', '654321'], // Suspicious BIN ranges
                max_amount_without_verification: 10000
            }
        };

        this.mlModels = {
            transaction_risk: this.initializeTransactionRiskModel(),
            user_behavior: this.initializeUserBehaviorModel(),
            device_fingerprint: this.initializeDeviceFingerprintModel()
        };
    }

    async analyzeTransaction(transactionData) {
        try {
            logger.info('Starting fraud analysis for transaction:', transactionData.id);
            
            const riskFactors = await Promise.all([
                this.analyzeVelocityRisk(transactionData),
                this.analyzeGeographicRisk(transactionData),
                this.analyzeBehavioralRisk(transactionData),
                this.analyzePaymentRisk(transactionData),
                this.analyzeUserHistoryRisk(transactionData),
                this.analyzeDeviceRisk(transactionData),
                this.analyzeBookingPatternRisk(transactionData)
            ]);

            const riskScore = this.calculateCompositeRiskScore(riskFactors);
            const riskLevel = this.determineRiskLevel(riskScore);
            const recommendation = this.generateRecommendation(riskScore, riskFactors);

            const analysisResult = {
                transaction_id: transactionData.id,
                risk_score: riskScore,
                risk_level: riskLevel,
                risk_factors: riskFactors,
                recommendation: recommendation,
                requires_manual_review: riskScore >= this.riskScoreThresholds.high,
                should_block: riskScore >= this.riskScoreThresholds.critical,
                analyzed_at: new Date().toISOString()
            };

            // Store analysis results
            await this.storeFraudAnalysis(analysisResult);

            // Trigger appropriate actions
            await this.executeSecurityActions(analysisResult);

            logger.info('Fraud analysis completed:', {
                transaction_id: transactionData.id,
                risk_score: riskScore,
                risk_level: riskLevel
            });

            return analysisResult;

        } catch (error) {
            logger.error('Fraud analysis failed:', error);
            // Default to medium risk if analysis fails
            return {
                transaction_id: transactionData.id,
                risk_score: 50,
                risk_level: 'medium',
                error: error.message,
                requires_manual_review: true,
                should_block: false
            };
        }
    }

    async analyzeVelocityRisk(transactionData) {
        const userId = transactionData.user_id;
        const amount = transactionData.amount;
        const now = new Date();
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

        // Check recent transactions from same user
        const { data: recentTransactions, error } = await supabase
            .from('transactions')
            .select('*')
            .eq('user_id', userId)
            .gte('created_at', oneHourAgo.toISOString())
            .order('created_at', { ascending: false });

        if (error) {
            logger.warn('Failed to fetch recent transactions:', error);
            return { factor: 'velocity', score: 0, details: 'data_unavailable' };
        }

        let riskScore = 0;
        const details = {};

        // Transaction count velocity
        if (recentTransactions.length >= this.fraudPatterns.velocity.max_transactions_per_hour) {
            riskScore += 25;
            details.high_transaction_count = recentTransactions.length;
        }

        // Amount velocity
        const totalAmount = recentTransactions.reduce((sum, tx) => sum + (tx.amount || 0), 0);
        if (totalAmount >= this.fraudPatterns.velocity.max_amount_per_hour) {
            riskScore += 30;
            details.high_amount_velocity = totalAmount;
        }

        // Failed attempt velocity
        const failedAttempts = recentTransactions.filter(tx => tx.status === 'failed').length;
        if (failedAttempts >= this.fraudPatterns.velocity.max_failed_attempts_per_hour) {
            riskScore += 20;
            details.high_failure_rate = failedAttempts;
        }

        return {
            factor: 'velocity',
            score: Math.min(riskScore, 100),
            details
        };
    }

    async analyzeGeographicRisk(transactionData) {
        const ipAddress = transactionData.ip_address;
        const userId = transactionData.user_id;

        if (!ipAddress) {
            return { factor: 'geographic', score: 10, details: 'no_ip_address' };
        }

        const geoInfo = geoip.lookup(ipAddress);
        if (!geoInfo) {
            return { factor: 'geographic', score: 15, details: 'geo_lookup_failed' };
        }

        let riskScore = 0;
        const details = { country: geoInfo.country, city: geoInfo.city };

        // Check against suspicious countries
        if (this.fraudPatterns.geographic.suspicious_countries.includes(geoInfo.country)) {
            riskScore += 40;
            details.suspicious_country = true;
        }

        // Check geographic velocity (distance from last transaction)
        const { data: lastTransaction } = await supabase
            .from('transactions')
            .select('ip_address, geo_data')
            .eq('user_id', userId)
            .neq('id', transactionData.id)
            .order('created_at', { ascending: false })
            .limit(1);

        if (lastTransaction && lastTransaction.length > 0) {
            const lastGeo = lastTransaction[0].geo_data;
            if (lastGeo && lastGeo.latitude && lastGeo.longitude) {
                const distance = this.calculateDistance(
                    geoInfo.ll[0], geoInfo.ll[1],
                    lastGeo.latitude, lastGeo.longitude
                );

                if (distance > this.fraudPatterns.geographic.max_distance_km) {
                    riskScore += 25;
                    details.high_geographic_velocity = { distance_km: distance };
                }
            }
        }

        // Tor/VPN detection (simplified)
        if (this.detectVpnOrTor(ipAddress, geoInfo)) {
            riskScore += 20;
            details.vpn_or_tor_detected = true;
        }

        return {
            factor: 'geographic',
            score: Math.min(riskScore, 100),
            details
        };
    }

    async analyzeBehavioralRisk(transactionData) {
        const sessionDuration = transactionData.session_duration || 0;
        const userAgent = transactionData.user_agent || '';
        const userId = transactionData.user_id;

        let riskScore = 0;
        const details = {};

        // Session duration analysis
        if (sessionDuration < this.fraudPatterns.behavioral.min_session_duration_seconds) {
            riskScore += 15;
            details.short_session = sessionDuration;
        }

        // User agent analysis
        const suspiciousAgent = this.fraudPatterns.behavioral.suspicious_user_agents.some(
            pattern => userAgent.toLowerCase().includes(pattern)
        );
        if (suspiciousAgent) {
            riskScore += 30;
            details.suspicious_user_agent = true;
        }

        // Booking value vs user's history
        const { data: userStats } = await supabase
            .from('user_transaction_stats')
            .select('avg_transaction_amount, total_transactions')
            .eq('user_id', userId)
            .single();

        if (userStats && userStats.avg_transaction_amount) {
            const multiplier = transactionData.amount / userStats.avg_transaction_amount;
            if (multiplier > this.fraudPatterns.behavioral.max_booking_value_multiplier) {
                riskScore += 20;
                details.unusual_amount = { multiplier, avg_amount: userStats.avg_transaction_amount };
            }
        }

        // Time-based patterns (unusual hours)
        const hour = new Date(transactionData.created_at).getHours();
        if (hour >= 2 && hour <= 5) { // 2 AM - 5 AM unusual activity
            riskScore += 10;
            details.unusual_hour = hour;
        }

        return {
            factor: 'behavioral',
            score: Math.min(riskScore, 100),
            details
        };
    }

    async analyzePaymentRisk(transactionData) {
        const cardBin = transactionData.card_bin;
        const amount = transactionData.amount;
        const paymentMethod = transactionData.payment_method;

        let riskScore = 0;
        const details = {};

        // BIN analysis
        if (cardBin) {
            const binPrefix = cardBin.substring(0, 6);
            if (this.fraudPatterns.payment.suspicious_bin_ranges.some(range => 
                binPrefix.startsWith(range))) {
                riskScore += 35;
                details.suspicious_bin = binPrefix;
            }

            // Check BIN against known fraud database
            const binRisk = await this.checkBinDatabase(binPrefix);
            if (binRisk.is_high_risk) {
                riskScore += binRisk.risk_score;
                details.bin_database_match = binRisk;
            }
        }

        // Amount-based risk
        if (amount > this.fraudPatterns.payment.max_amount_without_verification) {
            riskScore += 15;
            details.high_amount = amount;
        }

        // Payment method risk
        if (paymentMethod === 'cryptocurrency') {
            riskScore += 10; // Crypto has higher risk
            details.crypto_payment = true;
        }

        // Check for card testing patterns
        const { data: recentCardAttempts } = await supabase
            .from('transactions')
            .select('*')
            .eq('card_bin', cardBin)
            .eq('status', 'failed')
            .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

        if (recentCardAttempts && recentCardAttempts.length > this.fraudPatterns.payment.max_card_attempts) {
            riskScore += 40;
            details.card_testing_pattern = recentCardAttempts.length;
        }

        return {
            factor: 'payment',
            score: Math.min(riskScore, 100),
            details
        };
    }

    async analyzeUserHistoryRisk(transactionData) {
        const userId = transactionData.user_id;

        // Get user account age and history
        const { data: user } = await supabase
            .from('users')
            .select('created_at, status, verification_level, total_bookings, account_flags')
            .eq('id', userId)
            .single();

        if (!user) {
            return { factor: 'user_history', score: 50, details: 'user_not_found' };
        }

        let riskScore = 0;
        const details = {};

        // Account age
        const accountAge = Date.now() - new Date(user.created_at).getTime();
        const accountAgeDays = accountAge / (1000 * 60 * 60 * 24);

        if (accountAgeDays < 1) {
            riskScore += 30;
            details.new_account = accountAgeDays;
        } else if (accountAgeDays < 7) {
            riskScore += 15;
            details.young_account = accountAgeDays;
        }

        // Verification level
        if (user.verification_level < 2) {
            riskScore += 20;
            details.low_verification = user.verification_level;
        }

        // Account flags
        if (user.account_flags && user.account_flags.length > 0) {
            riskScore += 25;
            details.account_flags = user.account_flags;
        }

        // Booking history
        if (user.total_bookings === 0) {
            riskScore += 10;
            details.first_booking = true;
        }

        // Check for previous fraud reports
        const { data: fraudReports } = await supabase
            .from('fraud_reports')
            .select('*')
            .eq('user_id', userId)
            .eq('status', 'confirmed');

        if (fraudReports && fraudReports.length > 0) {
            riskScore += 80;
            details.previous_fraud = fraudReports.length;
        }

        return {
            factor: 'user_history',
            score: Math.min(riskScore, 100),
            details
        };
    }

    async analyzeDeviceRisk(transactionData) {
        const deviceFingerprint = transactionData.device_fingerprint;
        const ipAddress = transactionData.ip_address;

        if (!deviceFingerprint) {
            return { factor: 'device', score: 15, details: 'no_fingerprint' };
        }

        let riskScore = 0;
        const details = {};

        // Check device reputation
        const { data: deviceHistory } = await supabase
            .from('device_history')
            .select('*')
            .eq('fingerprint', deviceFingerprint)
            .order('created_at', { ascending: false })
            .limit(10);

        if (deviceHistory) {
            // Multiple users on same device (shared/compromised device)
            const uniqueUsers = new Set(deviceHistory.map(d => d.user_id));
            if (uniqueUsers.size > 5) {
                riskScore += 25;
                details.shared_device = uniqueUsers.size;
            }

            // Check for flagged device
            const flaggedEntries = deviceHistory.filter(d => d.is_flagged);
            if (flaggedEntries.length > 0) {
                riskScore += 40;
                details.flagged_device = flaggedEntries.length;
            }
        }

        // IP reputation check
        const ipRisk = await this.checkIPReputation(ipAddress);
        if (ipRisk.is_malicious) {
            riskScore += 50;
            details.malicious_ip = ipRisk;
        }

        return {
            factor: 'device',
            score: Math.min(riskScore, 100),
            details
        };
    }

    async analyzeBookingPatternRisk(transactionData) {
        const bookingData = transactionData.booking_data;
        if (!bookingData) {
            return { factor: 'booking_pattern', score: 0, details: 'no_booking_data' };
        }

        let riskScore = 0;
        const details = {};

        // Check for unrealistic booking patterns
        const eventDate = new Date(bookingData.event_date);
        const bookingDate = new Date(transactionData.created_at);
        const daysUntilEvent = (eventDate - bookingDate) / (1000 * 60 * 60 * 24);

        // Last-minute bookings (higher risk)
        if (daysUntilEvent < 1) {
            riskScore += 20;
            details.last_minute_booking = daysUntilEvent;
        }

        // Extremely far future bookings
        if (daysUntilEvent > 365) {
            riskScore += 15;
            details.far_future_booking = daysUntilEvent;
        }

        // Unusual event types for the amount
        if (bookingData.event_type === 'private' && transactionData.amount < 1000) {
            riskScore += 10;
            details.unusual_price_for_type = true;
        }

        // Check for duplicate bookings
        const { data: similarBookings } = await supabase
            .from('bookings')
            .select('*')
            .eq('celebrity_id', bookingData.celebrity_id)
            .eq('event_date', bookingData.event_date)
            .neq('user_id', transactionData.user_id);

        if (similarBookings && similarBookings.length > 0) {
            riskScore += 30;
            details.duplicate_booking_attempt = similarBookings.length;
        }

        return {
            factor: 'booking_pattern',
            score: Math.min(riskScore, 100),
            details
        };
    }

    calculateCompositeRiskScore(riskFactors) {
        const weights = {
            velocity: 0.20,
            geographic: 0.15,
            behavioral: 0.15,
            payment: 0.25,
            user_history: 0.15,
            device: 0.05,
            booking_pattern: 0.05
        };

        let weightedScore = 0;
        let totalWeight = 0;

        riskFactors.forEach(factor => {
            const weight = weights[factor.factor] || 0.1;
            weightedScore += factor.score * weight;
            totalWeight += weight;
        });

        return Math.round(weightedScore / totalWeight);
    }

    determineRiskLevel(riskScore) {
        if (riskScore >= this.riskScoreThresholds.critical) return 'critical';
        if (riskScore >= this.riskScoreThresholds.high) return 'high';
        if (riskScore >= this.riskScoreThresholds.medium) return 'medium';
        return 'low';
    }

    generateRecommendation(riskScore, riskFactors) {
        const actions = [];

        if (riskScore >= this.riskScoreThresholds.critical) {
            actions.push('BLOCK_TRANSACTION');
            actions.push('FLAG_USER_ACCOUNT');
            actions.push('NOTIFY_SECURITY_TEAM');
        } else if (riskScore >= this.riskScoreThresholds.high) {
            actions.push('REQUIRE_MANUAL_REVIEW');
            actions.push('REQUEST_ADDITIONAL_VERIFICATION');
            actions.push('DELAY_TRANSACTION_PROCESSING');
        } else if (riskScore >= this.riskScoreThresholds.medium) {
            actions.push('ENHANCED_MONITORING');
            actions.push('REQUEST_VERIFICATION');
        } else {
            actions.push('PROCEED_NORMALLY');
        }

        // Add specific recommendations based on risk factors
        riskFactors.forEach(factor => {
            if (factor.score > 50) {
                switch (factor.factor) {
                    case 'velocity':
                        actions.push('IMPLEMENT_RATE_LIMITING');
                        break;
                    case 'payment':
                        actions.push('VERIFY_PAYMENT_METHOD');
                        break;
                    case 'user_history':
                        actions.push('VERIFY_USER_IDENTITY');
                        break;
                }
            }
        });

        return {
            actions: [...new Set(actions)], // Remove duplicates
            confidence: this.calculateConfidence(riskScore, riskFactors),
            priority: riskScore >= this.riskScoreThresholds.high ? 'high' : 'normal'
        };
    }

    calculateConfidence(riskScore, riskFactors) {
        // Calculate confidence based on data availability and consistency
        const dataPoints = riskFactors.filter(f => f.details !== 'data_unavailable').length;
        const maxDataPoints = 7;
        const dataAvailability = dataPoints / maxDataPoints;

        // Check consistency of risk indicators
        const highRiskFactors = riskFactors.filter(f => f.score > 70).length;
        const consistency = highRiskFactors > 2 ? 0.9 : 0.6;

        return Math.round((dataAvailability * consistency) * 100);
    }

    async executeSecurityActions(analysisResult) {
        const actions = analysisResult.recommendation.actions;

        for (const action of actions) {
            try {
                await this.executeSecurityAction(action, analysisResult);
            } catch (error) {
                logger.error(`Failed to execute security action ${action}:`, error);
            }
        }
    }

    async executeSecurityAction(action, analysisResult) {
        switch (action) {
            case 'BLOCK_TRANSACTION':
                await this.blockTransaction(analysisResult.transaction_id);
                break;
            case 'FLAG_USER_ACCOUNT':
                await this.flagUserAccount(analysisResult.transaction_id);
                break;
            case 'NOTIFY_SECURITY_TEAM':
                await this.notifySecurityTeam(analysisResult);
                break;
            case 'REQUIRE_MANUAL_REVIEW':
                await this.queueForManualReview(analysisResult);
                break;
            case 'REQUEST_ADDITIONAL_VERIFICATION':
                await this.requestAdditionalVerification(analysisResult.transaction_id);
                break;
            case 'ENHANCED_MONITORING':
                await this.enableEnhancedMonitoring(analysisResult.transaction_id);
                break;
        }
    }

    // Helper methods
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Earth's radius in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    detectVpnOrTor(ipAddress, geoInfo) {
        // Simplified VPN/Tor detection
        // In production, integrate with specialized services like IPQualityScore
        const suspiciousIsps = ['hosting', 'vpn', 'proxy', 'tor'];
        const isp = geoInfo.org || '';
        return suspiciousIsps.some(pattern => 
            isp.toLowerCase().includes(pattern)
        );
    }

    async checkBinDatabase(binPrefix) {
        // Mock implementation - integrate with real BIN database
        const highRiskBins = ['123456', '654321', '999999'];
        return {
            is_high_risk: highRiskBins.includes(binPrefix),
            risk_score: highRiskBins.includes(binPrefix) ? 30 : 0,
            bin_type: 'unknown'
        };
    }

    async checkIPReputation(ipAddress) {
        // Mock implementation - integrate with IP reputation service
        const maliciousIPs = ['192.168.1.100', '10.0.0.1'];
        return {
            is_malicious: maliciousIPs.includes(ipAddress),
            reputation_score: maliciousIPs.includes(ipAddress) ? 90 : 10,
            categories: []
        };
    }

    async storeFraudAnalysis(analysisResult) {
        try {
            await supabase
                .from('fraud_analyses')
                .insert(analysisResult);
        } catch (error) {
            logger.error('Failed to store fraud analysis:', error);
        }
    }

    async blockTransaction(transactionId) {
        await supabase
            .from('transactions')
            .update({ 
                status: 'blocked_fraud',
                blocked_at: new Date().toISOString()
            })
            .eq('id', transactionId);
    }

    async flagUserAccount(transactionId) {
        const { data: transaction } = await supabase
            .from('transactions')
            .select('user_id')
            .eq('id', transactionId)
            .single();

        if (transaction) {
            await supabase
                .from('users')
                .update({ 
                    account_flags: ['fraud_risk'],
                    flagged_at: new Date().toISOString()
                })
                .eq('id', transaction.user_id);
        }
    }

    async notifySecurityTeam(analysisResult) {
        // Implementation for security team notification
        logger.warn('🚨 HIGH RISK TRANSACTION DETECTED:', analysisResult);
        // Send email, Slack notification, etc.
    }

    async queueForManualReview(analysisResult) {
        await supabase
            .from('manual_review_queue')
            .insert({
                transaction_id: analysisResult.transaction_id,
                risk_score: analysisResult.risk_score,
                priority: analysisResult.recommendation.priority,
                created_at: new Date().toISOString()
            });
    }

    // ML Model initializers (simplified mock implementations)
    initializeTransactionRiskModel() {
        return {
            predict: (features) => {
                // Mock ML prediction
                return Math.random() * 100;
            }
        };
    }

    initializeUserBehaviorModel() {
        return {
            predict: (features) => {
                return Math.random() * 100;
            }
        };
    }

    initializeDeviceFingerprintModel() {
        return {
            predict: (features) => {
                return Math.random() * 100;
            }
        };
    }

    async generateFraudReport(timeframe = '30d') {
        try {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - parseInt(timeframe.replace('d', '')));

            const { data: analyses, error } = await supabase
                .from('fraud_analyses')
                .select('*')
                .gte('analyzed_at', startDate.toISOString());

            if (error) throw error;

            const report = {
                timeframe,
                total_analyses: analyses.length,
                risk_distribution: {
                    low: analyses.filter(a => a.risk_level === 'low').length,
                    medium: analyses.filter(a => a.risk_level === 'medium').length,
                    high: analyses.filter(a => a.risk_level === 'high').length,
                    critical: analyses.filter(a => a.risk_level === 'critical').length
                },
                blocked_transactions: analyses.filter(a => a.should_block).length,
                manual_reviews: analyses.filter(a => a.requires_manual_review).length,
                avg_risk_score: analyses.reduce((sum, a) => sum + a.risk_score, 0) / analyses.length,
                common_risk_factors: this.getCommonRiskFactors(analyses),
                generated_at: new Date().toISOString()
            };

            return report;
        } catch (error) {
            logger.error('Failed to generate fraud report:', error);
            throw error;
        }
    }

    getCommonRiskFactors(analyses) {
        const factorCounts = {};
        
        analyses.forEach(analysis => {
            analysis.risk_factors.forEach(factor => {
                if (!factorCounts[factor.factor]) {
                    factorCounts[factor.factor] = { count: 0, total_score: 0 };
                }
                factorCounts[factor.factor].count++;
                factorCounts[factor.factor].total_score += factor.score;
            });
        });

        return Object.entries(factorCounts)
            .map(([factor, data]) => ({
                factor,
                frequency: data.count,
                avg_score: Math.round(data.total_score / data.count)
            }))
            .sort((a, b) => b.frequency - a.frequency)
            .slice(0, 5);
    }
}

module.exports = FraudDetectionService;
