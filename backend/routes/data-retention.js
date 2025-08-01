const express = require('express');
const router = express.Router();
const DataRetentionService = require('../services/data-retention/DataRetentionService');
const { authenticateUser, requireRole } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

const dataRetentionService = new DataRetentionService();

// Rate limiting
const retentionRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,
    message: { success: false, error: 'Too many retention requests' }
});

// Get retention status
router.get('/status', 
    retentionRateLimit,
    authenticateUser, 
    requireRole(['admin']), 
    async (req, res) => {
        try {
            const status = await dataRetentionService.getRetentionStatus();
            
            res.json({
                success: true,
                data: status
            });
        } catch (error) {
            console.error('Retention status error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get retention status'
            });
        }
    }
);

// Manual cleanup trigger
router.post('/cleanup/:type', 
    retentionRateLimit,
    authenticateUser, 
    requireRole(['admin']), 
    async (req, res) => {
        try {
            const { type } = req.params;
            
            let result;
            switch (type) {
                case 'daily':
                    result = await dataRetentionService.performDailyCleanup();
                    break;
                case 'weekly':
                    result = await dataRetentionService.performWeeklyCleanup();
                    break;
                case 'monthly':
                    result = await dataRetentionService.performMonthlyArchiving();
                    break;
                default:
                    return res.status(400).json({
                        success: false,
                        error: 'Invalid cleanup type'
                    });
            }
            
            res.json({
                success: true,
                message: `${type} cleanup completed`,
                data: result
            });
        } catch (error) {
            console.error('Manual cleanup error:', error);
            res.status(500).json({
                success: false,
                error: 'Cleanup failed'
            });
        }
    }
);

// User data deletion request
router.post('/user-data-request', 
    authenticateUser,
    async (req, res) => {
        try {
            const { request_type = 'deletion', reason } = req.body;
            const userId = req.user.id;
            
            // Create data request
            const { data, error } = await supabase
                .from('user_data_requests')
                .insert({
                    user_id: userId,
                    request_type,
                    reason,
                    status: 'pending',
                    created_at: new Date().toISOString()
                })
                .select()
                .single();
            
            if (error) {
                throw error;
            }
            
            res.json({
                success: true,
                message: 'Data deletion request submitted',
                data: { request_id: data.id }
            });
        } catch (error) {
            console.error('User data request error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to submit data request'
            });
        }
    }
);

module.exports = router;
