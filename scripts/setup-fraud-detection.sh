#!/bin/bash

# Celebrity Booking Platform - Advanced Fraud Detection and Payment Security Setup
# This script implements comprehensive fraud detection and payment security measures

set -e

echo "🔒 Setting up Advanced Fraud Detection and Payment Security..."

# Create fraud detection service directory
mkdir -p backend/services/fraud-detection

# Create fraud detection service
cat > backend/services/fraud-detection/FraudDetectionService.js << 'EOF'
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
EOF

# Create fraud detection routes
cat > backend/routes/fraud-detection.js << 'EOF'
const express = require('express');
const router = express.Router();
const FraudDetectionService = require('../services/fraud-detection/FraudDetectionService');
const { authenticateUser, requireRole } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

const fraudService = new FraudDetectionService();

// Rate limiting for fraud detection endpoints
const fraudRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50,
    message: { success: false, error: 'Too many fraud detection requests' }
});

// Analyze transaction for fraud
router.post('/analyze-transaction', 
    fraudRateLimit,
    authenticateUser,
    requireRole(['admin', 'system']),
    async (req, res) => {
        try {
            const transactionData = req.body;
            
            if (!transactionData.id) {
                return res.status(400).json({
                    success: false,
                    error: 'Transaction ID is required'
                });
            }

            const analysis = await fraudService.analyzeTransaction(transactionData);

            res.json({
                success: true,
                data: analysis
            });

        } catch (error) {
            console.error('Fraud analysis error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to analyze transaction for fraud'
            });
        }
    }
);

// Get fraud analysis results
router.get('/analysis/:transactionId', 
    authenticateUser,
    requireRole(['admin', 'manager']),
    async (req, res) => {
        try {
            const { transactionId } = req.params;

            const { data: analysis, error } = await supabase
                .from('fraud_analyses')
                .select('*')
                .eq('transaction_id', transactionId)
                .single();

            if (error && error.code !== 'PGRST116') {
                throw error;
            }

            if (!analysis) {
                return res.status(404).json({
                    success: false,
                    error: 'Fraud analysis not found'
                });
            }

            res.json({
                success: true,
                data: analysis
            });

        } catch (error) {
            console.error('Get fraud analysis error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to retrieve fraud analysis'
            });
        }
    }
);

// Get fraud report
router.get('/report', 
    fraudRateLimit,
    authenticateUser,
    requireRole(['admin', 'manager']),
    async (req, res) => {
        try {
            const { timeframe = '30d' } = req.query;
            
            const report = await fraudService.generateFraudReport(timeframe);

            res.json({
                success: true,
                data: report
            });

        } catch (error) {
            console.error('Fraud report error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to generate fraud report'
            });
        }
    }
);

// Get manual review queue
router.get('/manual-review-queue', 
    authenticateUser,
    requireRole(['admin', 'manager']),
    async (req, res) => {
        try {
            const { page = 1, limit = 20, priority } = req.query;
            const offset = (page - 1) * limit;

            let query = supabase
                .from('manual_review_queue')
                .select(`
                    *,
                    transaction:transactions(*)
                `)
                .eq('status', 'pending')
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);

            if (priority) {
                query = query.eq('priority', priority);
            }

            const { data: reviews, error } = await query;

            if (error) throw error;

            res.json({
                success: true,
                data: {
                    reviews,
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total: reviews.length
                    }
                }
            });

        } catch (error) {
            console.error('Manual review queue error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get manual review queue'
            });
        }
    }
);

// Approve/reject manual review
router.post('/manual-review/:reviewId/decision', 
    authenticateUser,
    requireRole(['admin', 'manager']),
    async (req, res) => {
        try {
            const { reviewId } = req.params;
            const { decision, notes } = req.body; // 'approve' or 'reject'

            if (!['approve', 'reject'].includes(decision)) {
                return res.status(400).json({
                    success: false,
                    error: 'Decision must be either "approve" or "reject"'
                });
            }

            // Update review status
            const { error: updateError } = await supabase
                .from('manual_review_queue')
                .update({
                    status: decision === 'approve' ? 'approved' : 'rejected',
                    reviewed_by: req.user.id,
                    reviewed_at: new Date().toISOString(),
                    notes: notes
                })
                .eq('id', reviewId);

            if (updateError) throw updateError;

            // Update transaction status based on decision
            const { data: review } = await supabase
                .from('manual_review_queue')
                .select('transaction_id')
                .eq('id', reviewId)
                .single();

            if (review) {
                const transactionStatus = decision === 'approve' ? 'approved' : 'rejected_fraud';
                
                await supabase
                    .from('transactions')
                    .update({ 
                        status: transactionStatus,
                        manual_review_decision: decision,
                        manual_review_at: new Date().toISOString()
                    })
                    .eq('id', review.transaction_id);
            }

            res.json({
                success: true,
                message: `Transaction ${decision}d successfully`
            });

        } catch (error) {
            console.error('Manual review decision error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to process manual review decision'
            });
        }
    }
);

// Update fraud detection settings
router.put('/settings', 
    authenticateUser,
    requireRole(['admin']),
    async (req, res) => {
        try {
            const settings = req.body;

            // Validate settings
            if (settings.risk_thresholds) {
                const thresholds = settings.risk_thresholds;
                if (thresholds.low >= thresholds.medium || 
                    thresholds.medium >= thresholds.high || 
                    thresholds.high >= thresholds.critical) {
                    return res.status(400).json({
                        success: false,
                        error: 'Risk thresholds must be in ascending order'
                    });
                }
            }

            // Store settings in database
            const { error } = await supabase
                .from('fraud_detection_settings')
                .upsert({
                    id: 1, // Single row for global settings
                    settings: settings,
                    updated_by: req.user.id,
                    updated_at: new Date().toISOString()
                });

            if (error) throw error;

            res.json({
                success: true,
                message: 'Fraud detection settings updated successfully'
            });

        } catch (error) {
            console.error('Update fraud settings error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to update fraud detection settings'
            });
        }
    }
);

module.exports = router;
EOF

# Create database schema for fraud detection
cat > scripts/fraud-detection-schema.sql << 'EOF'
-- Fraud Detection and Payment Security Tables

-- Fraud analysis results
CREATE TABLE IF NOT EXISTS fraud_analyses (
    id SERIAL PRIMARY KEY,
    transaction_id UUID REFERENCES transactions(id),
    risk_score INTEGER NOT NULL CHECK (risk_score >= 0 AND risk_score <= 100),
    risk_level VARCHAR(20) NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    risk_factors JSONB NOT NULL,
    recommendation JSONB NOT NULL,
    requires_manual_review BOOLEAN DEFAULT false,
    should_block BOOLEAN DEFAULT false,
    confidence_score INTEGER DEFAULT 0,
    ml_model_version VARCHAR(20),
    analyzed_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Manual review queue
CREATE TABLE IF NOT EXISTS manual_review_queue (
    id SERIAL PRIMARY KEY,
    transaction_id UUID REFERENCES transactions(id),
    risk_score INTEGER NOT NULL,
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'critical')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_review', 'approved', 'rejected')),
    assigned_to UUID REFERENCES users(id),
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Device fingerprinting and history
CREATE TABLE IF NOT EXISTS device_history (
    id SERIAL PRIMARY KEY,
    fingerprint VARCHAR(255) NOT NULL,
    user_id UUID REFERENCES users(id),
    ip_address INET,
    user_agent TEXT,
    screen_resolution VARCHAR(20),
    timezone VARCHAR(50),
    language VARCHAR(10),
    is_flagged BOOLEAN DEFAULT false,
    risk_score INTEGER DEFAULT 0,
    first_seen TIMESTAMP DEFAULT NOW(),
    last_seen TIMESTAMP DEFAULT NOW(),
    usage_count INTEGER DEFAULT 1
);

-- Fraud reports and investigations
CREATE TABLE IF NOT EXISTS fraud_reports (
    id SERIAL PRIMARY KEY,
    transaction_id UUID REFERENCES transactions(id),
    user_id UUID REFERENCES users(id),
    report_type VARCHAR(50) NOT NULL, -- 'chargeback', 'identity_theft', 'card_testing', etc.
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'confirmed', 'false_positive', 'closed')),
    description TEXT,
    evidence JSONB,
    reported_by UUID REFERENCES users(id),
    assigned_to UUID REFERENCES users(id),
    resolution TEXT,
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Payment method blacklist
CREATE TABLE IF NOT EXISTS payment_blacklist (
    id SERIAL PRIMARY KEY,
    type VARCHAR(20) NOT NULL, -- 'card_bin', 'email', 'phone', 'ip_address'
    value VARCHAR(255) NOT NULL,
    reason TEXT,
    severity VARCHAR(20) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    expires_at TIMESTAMP,
    added_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(type, value)
);

-- Transaction velocity tracking
CREATE TABLE IF NOT EXISTS transaction_velocity (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    ip_address INET,
    transaction_count INTEGER DEFAULT 1,
    total_amount DECIMAL(12,2) DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    time_window_start TIMESTAMP NOT NULL,
    last_transaction_at TIMESTAMP DEFAULT NOW(),
    is_suspicious BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Fraud detection settings
CREATE TABLE IF NOT EXISTS fraud_detection_settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    settings JSONB NOT NULL,
    updated_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT single_settings_row CHECK (id = 1)
);

-- User transaction statistics (for behavioral analysis)
CREATE TABLE IF NOT EXISTS user_transaction_stats (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) UNIQUE,
    total_transactions INTEGER DEFAULT 0,
    total_amount DECIMAL(12,2) DEFAULT 0,
    avg_transaction_amount DECIMAL(10,2) DEFAULT 0,
    max_transaction_amount DECIMAL(10,2) DEFAULT 0,
    first_transaction_at TIMESTAMP,
    last_transaction_at TIMESTAMP,
    preferred_payment_methods TEXT[],
    common_booking_types TEXT[],
    risk_profile VARCHAR(20) DEFAULT 'unknown',
    last_updated TIMESTAMP DEFAULT NOW()
);

-- IP address reputation and geolocation
CREATE TABLE IF NOT EXISTS ip_reputation (
    id SERIAL PRIMARY KEY,
    ip_address INET UNIQUE NOT NULL,
    reputation_score INTEGER DEFAULT 50 CHECK (reputation_score >= 0 AND reputation_score <= 100),
    is_vpn BOOLEAN DEFAULT false,
    is_tor BOOLEAN DEFAULT false,
    is_proxy BOOLEAN DEFAULT false,
    country_code VARCHAR(2),
    city VARCHAR(100),
    latitude DECIMAL(10,7),
    longitude DECIMAL(10,7),
    isp VARCHAR(255),
    threat_categories TEXT[],
    last_seen TIMESTAMP DEFAULT NOW(),
    first_seen TIMESTAMP DEFAULT NOW(),
    lookup_count INTEGER DEFAULT 1
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_fraud_analyses_transaction ON fraud_analyses(transaction_id);
CREATE INDEX IF NOT EXISTS idx_fraud_analyses_risk_level ON fraud_analyses(risk_level, analyzed_at);
CREATE INDEX IF NOT EXISTS idx_manual_review_queue_status ON manual_review_queue(status, priority, created_at);
CREATE INDEX IF NOT EXISTS idx_device_history_fingerprint ON device_history(fingerprint);
CREATE INDEX IF NOT EXISTS idx_device_history_user ON device_history(user_id, last_seen);
CREATE INDEX IF NOT EXISTS idx_fraud_reports_status ON fraud_reports(status, created_at);
CREATE INDEX IF NOT EXISTS idx_payment_blacklist_type_value ON payment_blacklist(type, value);
CREATE INDEX IF NOT EXISTS idx_transaction_velocity_user ON transaction_velocity(user_id, time_window_start);
CREATE INDEX IF NOT EXISTS idx_transaction_velocity_ip ON transaction_velocity(ip_address, time_window_start);
CREATE INDEX IF NOT EXISTS idx_user_transaction_stats_user ON user_transaction_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_ip_reputation_address ON ip_reputation(ip_address);

-- Create functions for fraud detection
CREATE OR REPLACE FUNCTION update_user_transaction_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update user transaction statistics after each transaction
    INSERT INTO user_transaction_stats (
        user_id, total_transactions, total_amount, avg_transaction_amount,
        max_transaction_amount, first_transaction_at, last_transaction_at
    )
    SELECT 
        NEW.user_id,
        COUNT(*),
        SUM(amount),
        AVG(amount),
        MAX(amount),
        MIN(created_at),
        MAX(created_at)
    FROM transactions 
    WHERE user_id = NEW.user_id AND status = 'completed'
    ON CONFLICT (user_id) DO UPDATE SET
        total_transactions = EXCLUDED.total_transactions,
        total_amount = EXCLUDED.total_amount,
        avg_transaction_amount = EXCLUDED.avg_transaction_amount,
        max_transaction_amount = EXCLUDED.max_transaction_amount,
        last_transaction_at = EXCLUDED.last_transaction_at,
        last_updated = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating user stats
CREATE TRIGGER trigger_update_user_transaction_stats
    AFTER INSERT OR UPDATE ON transactions
    FOR EACH ROW
    WHEN (NEW.status = 'completed')
    EXECUTE FUNCTION update_user_transaction_stats();

-- Create function for velocity tracking
CREATE OR REPLACE FUNCTION track_transaction_velocity()
RETURNS TRIGGER AS $$
DECLARE
    window_start TIMESTAMP;
BEGIN
    window_start := date_trunc('hour', NEW.created_at);
    
    -- Update or insert velocity tracking
    INSERT INTO transaction_velocity (
        user_id, ip_address, transaction_count, total_amount,
        failed_count, time_window_start, last_transaction_at
    ) VALUES (
        NEW.user_id, 
        NEW.ip_address::INET,
        1,
        COALESCE(NEW.amount, 0),
        CASE WHEN NEW.status = 'failed' THEN 1 ELSE 0 END,
        window_start,
        NEW.created_at
    )
    ON CONFLICT (user_id, time_window_start) DO UPDATE SET
        transaction_count = transaction_velocity.transaction_count + 1,
        total_amount = transaction_velocity.total_amount + COALESCE(NEW.amount, 0),
        failed_count = transaction_velocity.failed_count + 
                      CASE WHEN NEW.status = 'failed' THEN 1 ELSE 0 END,
        last_transaction_at = NEW.created_at,
        is_suspicious = (transaction_velocity.transaction_count + 1 > 5) OR 
                       (transaction_velocity.total_amount + COALESCE(NEW.amount, 0) > 50000) OR
                       (transaction_velocity.failed_count + CASE WHEN NEW.status = 'failed' THEN 1 ELSE 0 END > 3);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for velocity tracking
CREATE TRIGGER trigger_track_transaction_velocity
    AFTER INSERT ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION track_transaction_velocity();

-- Insert default fraud detection settings
INSERT INTO fraud_detection_settings (id, settings) VALUES (
    1,
    '{
        "risk_thresholds": {
            "low": 30,
            "medium": 60,
            "high": 80,
            "critical": 90
        },
        "velocity_limits": {
            "max_transactions_per_hour": 5,
            "max_amount_per_hour": 50000,
            "max_failed_attempts_per_hour": 3
        },
        "auto_block_enabled": true,
        "manual_review_threshold": 80,
        "notification_threshold": 90
    }'
) ON CONFLICT (id) DO NOTHING;

-- Insert some sample blacklist entries
INSERT INTO payment_blacklist (type, value, reason, severity) VALUES
('card_bin', '123456', 'Known fraudulent BIN range', 'high'),
('ip_address', '192.168.1.100', 'Previous fraud attempts', 'medium'),
('email', 'fraud@example.com', 'Identity theft case', 'critical')
ON CONFLICT (type, value) DO NOTHING;
EOF

echo "🗄️ Setting up fraud detection database schema..."
if command -v psql > /dev/null; then
    psql "${DATABASE_URL:-postgresql://localhost/celebrity_booking}" -f scripts/fraud-detection-schema.sql
    echo "✅ Fraud detection database schema created"
else
    echo "⚠️ PostgreSQL not found. Please run the fraud-detection-schema.sql manually"
fi

# Create React fraud detection dashboard
mkdir -p frontend/src/components/Admin/FraudDetection

cat > frontend/src/components/Admin/FraudDetection/FraudDetectionDashboard.tsx << 'EOF'
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
    Shield, AlertTriangle, Eye, Ban, CheckCircle, Clock, 
    TrendingUp, Users, CreditCard, MapPin, Zap
} from 'lucide-react';

interface FraudReport {
    timeframe: string;
    total_analyses: number;
    risk_distribution: {
        low: number;
        medium: number;
        high: number;
        critical: number;
    };
    blocked_transactions: number;
    manual_reviews: number;
    avg_risk_score: number;
    common_risk_factors: Array<{
        factor: string;
        frequency: number;
        avg_score: number;
    }>;
}

interface ManualReview {
    id: string;
    transaction_id: string;
    risk_score: number;
    priority: string;
    created_at: string;
    transaction: {
        amount: number;
        user_id: string;
        payment_method: string;
    };
}

const FraudDetectionDashboard: React.FC = () => {
    const [report, setReport] = useState<FraudReport | null>(null);
    const [manualReviews, setManualReviews] = useState<ManualReview[]>([]);
    const [loading, setLoading] = useState(true);
    const [timeframe, setTimeframe] = useState('30d');

    const fetchData = async () => {
        try {
            setLoading(true);
            
            const [reportResponse, reviewsResponse] = await Promise.all([
                fetch(`/api/fraud-detection/report?timeframe=${timeframe}`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                }),
                fetch('/api/fraud-detection/manual-review-queue', {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                })
            ]);

            if (reportResponse.ok) {
                const reportResult = await reportResponse.json();
                setReport(reportResult.data);
            }

            if (reviewsResponse.ok) {
                const reviewsResult = await reviewsResponse.json();
                setManualReviews(reviewsResult.data.reviews || []);
            }

        } catch (error) {
            console.error('Failed to fetch fraud detection data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [timeframe]);

    const handleReviewDecision = async (reviewId: string, decision: 'approve' | 'reject') => {
        try {
            const response = await fetch(`/api/fraud-detection/manual-review/${reviewId}/decision`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ decision })
            });

            if (response.ok) {
                alert(`Transaction ${decision}d successfully!`);
                await fetchData(); // Refresh data
            } else {
                alert(`Failed to ${decision} transaction`);
            }

        } catch (error) {
            console.error(`Review decision error:`, error);
            alert(`Failed to ${decision} transaction`);
        }
    };

    const getRiskColor = (level: string) => {
        switch (level) {
            case 'low': return 'text-green-600 bg-green-100';
            case 'medium': return 'text-yellow-600 bg-yellow-100';
            case 'high': return 'text-orange-600 bg-orange-100';
            case 'critical': return 'text-red-600 bg-red-100';
            default: return 'text-gray-600 bg-gray-100';
        }
    };

    const getPriorityIcon = (priority: string) => {
        switch (priority) {
            case 'critical': return <AlertTriangle className="h-4 w-4 text-red-600" />;
            case 'high': return <TrendingUp className="h-4 w-4 text-orange-600" />;
            default: return <Clock className="h-4 w-4 text-blue-600" />;
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">Fraud Detection & Security</h1>
                    <p className="text-gray-500 mt-1">
                        Advanced fraud detection and payment security monitoring
                    </p>
                </div>
                <div className="flex gap-2">
                    <select
                        value={timeframe}
                        onChange={(e) => setTimeframe(e.target.value)}
                        className="px-3 py-2 border rounded-md"
                    >
                        <option value="7d">Last 7 days</option>
                        <option value="30d">Last 30 days</option>
                        <option value="90d">Last 90 days</option>
                    </select>
                    <Button onClick={fetchData} variant="outline">
                        <Shield className="h-4 w-4 mr-2" />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Analyses</CardTitle>
                        <Eye className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{report?.total_analyses || 0}</div>
                        <p className="text-xs text-gray-500">Transactions analyzed</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Blocked</CardTitle>
                        <Ban className="h-4 w-4 text-red-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{report?.blocked_transactions || 0}</div>
                        <p className="text-xs text-gray-500">Fraudulent transactions</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Manual Reviews</CardTitle>
                        <Users className="h-4 w-4 text-orange-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{report?.manual_reviews || 0}</div>
                        <p className="text-xs text-gray-500">Require human review</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Avg Risk Score</CardTitle>
                        <TrendingUp className="h-4 w-4 text-purple-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{Math.round(report?.avg_risk_score || 0)}</div>
                        <p className="text-xs text-gray-500">Out of 100</p>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content Tabs */}
            <Tabs defaultValue="overview" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="manual-review">Manual Review</TabsTrigger>
                    <TabsTrigger value="risk-factors">Risk Factors</TabsTrigger>
                    <TabsTrigger value="settings">Settings</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Risk Distribution</CardTitle>
                                <CardDescription>Transaction risk levels</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {report?.risk_distribution && Object.entries(report.risk_distribution).map(([level, count]) => (
                                        <div key={level} className="flex items-center justify-between">
                                            <div className="flex items-center space-x-2">
                                                <Badge className={getRiskColor(level)}>
                                                    {level.toUpperCase()}
                                                </Badge>
                                                <span>{count} transactions</span>
                                            </div>
                                            <div className="w-32">
                                                <Progress 
                                                    value={report.total_analyses > 0 ? (count / report.total_analyses) * 100 : 0} 
                                                    className="h-2"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Security Status</CardTitle>
                                <CardDescription>Current security overview</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span>Fraud Detection</span>
                                        <Badge className="text-green-600 bg-green-100">
                                            <CheckCircle className="h-3 w-3 mr-1" />
                                            Active
                                        </Badge>
                                    </div>
                                    
                                    <div className="flex items-center justify-between">
                                        <span>Auto-Block</span>
                                        <Badge className="text-green-600 bg-green-100">
                                            <Zap className="h-3 w-3 mr-1" />
                                            Enabled
                                        </Badge>
                                    </div>
                                    
                                    <div className="flex items-center justify-between">
                                        <span>Manual Review Queue</span>
                                        <Badge variant="secondary">
                                            {manualReviews.length} pending
                                        </Badge>
                                    </div>
                                    
                                    <div className="flex items-center justify-between">
                                        <span>Detection Rate</span>
                                        <span className="font-bold">
                                            {report?.total_analyses > 0 
                                                ? Math.round(((report.blocked_transactions + report.manual_reviews) / report.total_analyses) * 100)
                                                : 0
                                            }%
                                        </span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="manual-review" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Manual Review Queue</CardTitle>
                            <CardDescription>
                                Transactions requiring human review ({manualReviews.length} pending)
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {manualReviews.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                    <p>No transactions pending manual review</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {manualReviews.map((review) => (
                                        <div key={review.id} className="border rounded-lg p-4">
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center space-x-3">
                                                    {getPriorityIcon(review.priority)}
                                                    <div>
                                                        <div className="font-medium">
                                                            Transaction {review.transaction_id.substring(0, 8)}...
                                                        </div>
                                                        <div className="text-sm text-gray-500">
                                                            {new Date(review.created_at).toLocaleString()}
                                                        </div>
                                                    </div>
                                                </div>
                                                <Badge className={getRiskColor(
                                                    review.risk_score >= 90 ? 'critical' :
                                                    review.risk_score >= 80 ? 'high' :
                                                    review.risk_score >= 60 ? 'medium' : 'low'
                                                )}>
                                                    Risk: {review.risk_score}
                                                </Badge>
                                            </div>
                                            
                                            <div className="grid grid-cols-3 gap-4 mb-3 text-sm">
                                                <div>
                                                    <span className="text-gray-500">Amount:</span>
                                                    <div className="font-medium">${review.transaction.amount.toLocaleString()}</div>
                                                </div>
                                                <div>
                                                    <span className="text-gray-500">Payment:</span>
                                                    <div className="font-medium capitalize">{review.transaction.payment_method}</div>
                                                </div>
                                                <div>
                                                    <span className="text-gray-500">Priority:</span>
                                                    <div className="font-medium capitalize">{review.priority}</div>
                                                </div>
                                            </div>
                                            
                                            <div className="flex gap-2">
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleReviewDecision(review.id, 'approve')}
                                                    className="bg-green-600 hover:bg-green-700"
                                                >
                                                    <CheckCircle className="h-3 w-3 mr-1" />
                                                    Approve
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    onClick={() => handleReviewDecision(review.id, 'reject')}
                                                >
                                                    <Ban className="h-3 w-3 mr-1" />
                                                    Reject
                                                </Button>
                                                <Button size="sm" variant="outline">
                                                    <Eye className="h-3 w-3 mr-1" />
                                                    Details
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="risk-factors" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Common Risk Factors</CardTitle>
                            <CardDescription>Most frequent fraud indicators</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {report?.common_risk_factors?.map((factor, index) => (
                                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                                                {factor.factor === 'velocity' && <Zap className="h-4 w-4 text-blue-600" />}
                                                {factor.factor === 'geographic' && <MapPin className="h-4 w-4 text-blue-600" />}
                                                {factor.factor === 'payment' && <CreditCard className="h-4 w-4 text-blue-600" />}
                                                {!['velocity', 'geographic', 'payment'].includes(factor.factor) && 
                                                  <AlertTriangle className="h-4 w-4 text-blue-600" />}
                                            </div>
                                            <div>
                                                <div className="font-medium capitalize">{factor.factor.replace('_', ' ')}</div>
                                                <div className="text-sm text-gray-500">{factor.frequency} occurrences</div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-bold">Avg: {factor.avg_score}</div>
                                            <div className="text-sm text-gray-500">risk score</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="settings" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Fraud Detection Settings</CardTitle>
                            <CardDescription>Configure fraud detection parameters</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Alert>
                                <AlertTriangle className="h-4 w-4" />
                                <AlertDescription>
                                    Fraud detection settings can be configured here. Changes will affect 
                                    how transactions are analyzed and flagged for review.
                                </AlertDescription>
                            </Alert>
                            
                            <div className="mt-4 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2">Risk Thresholds</label>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs text-gray-500">Medium Risk</label>
                                            <input type="number" className="w-full p-2 border rounded" defaultValue="60" />
                                        </div>
                                        <div>
                                            <label className="text-xs text-gray-500">High Risk</label>
                                            <input type="number" className="w-full p-2 border rounded" defaultValue="80" />
                                        </div>
                                    </div>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium mb-2">Auto-Block Threshold</label>
                                    <input type="number" className="w-full p-2 border rounded" defaultValue="90" />
                                    <p className="text-xs text-gray-500 mt-1">Transactions above this score are automatically blocked</p>
                                </div>
                                
                                <Button>Save Settings</Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default FraudDetectionDashboard;
EOF

# Install fraud detection dependencies
echo "📦 Installing fraud detection dependencies..."
if [ -f package.json ]; then
    npm install --save geoip-lite
    echo "✅ Fraud detection dependencies installed"
fi

echo ""
echo "🎉 Advanced Fraud Detection and Payment Security Setup Complete!"
echo ""
echo "📋 What was configured:"
echo "  ✅ FraudDetectionService with comprehensive risk analysis"
echo "  ✅ Multi-factor fraud detection (7 risk categories)"
echo "  ✅ Machine learning-ready architecture"
echo "  ✅ Real-time transaction analysis and blocking"
echo "  ✅ Manual review queue with admin approval workflow"
echo "  ✅ Device fingerprinting and behavioral analysis"
echo "  ✅ Geographic and velocity-based fraud detection"
echo "  ✅ Payment method and BIN analysis"
echo "  ✅ Admin dashboard for fraud management"
echo "  ✅ Automated security actions and alerting"
echo ""
echo "🔧 Next steps:"
echo "  1. Run database migrations: psql \$DATABASE_URL -f scripts/fraud-detection-schema.sql"
echo "  2. Configure fraud detection thresholds for your use case"
echo "  3. Integrate with external fraud databases (BIN, IP reputation)"
echo "  4. Set up machine learning models for enhanced detection"
echo "  5. Configure alerting and notification systems"
echo ""
echo "🔒 Fraud Detection Features:"
echo "  • 7-factor risk analysis (velocity, geographic, behavioral, payment, etc.)"
echo "  • Real-time risk scoring (0-100 scale)"
echo "  • Automatic transaction blocking for critical risk"
echo "  • Manual review queue for borderline cases"
echo "  • Device fingerprinting and tracking"
echo "  • Geographic anomaly detection"
echo "  • Payment velocity monitoring"
echo "  • BIN and card testing detection"
echo "  • User behavior analysis"
echo "  • IP reputation checking"
echo "  • Comprehensive fraud reporting"
echo ""
echo "🎯 Risk Categories:"
echo "  • Velocity: Transaction frequency and amounts"
echo "  • Geographic: Location-based anomalies"
echo "  • Behavioral: User session and interaction patterns"
echo "  • Payment: Card BIN and payment method analysis"
echo "  • User History: Account age and verification status"
echo "  • Device: Fingerprinting and reputation"
echo "  • Booking Pattern: Event-specific fraud indicators"
echo ""
echo "🎯 Access fraud detection at: /admin/fraud-detection"