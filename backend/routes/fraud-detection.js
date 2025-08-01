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
