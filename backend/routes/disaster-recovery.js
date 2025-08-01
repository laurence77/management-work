const express = require('express');
const router = express.Router();
const DisasterRecoveryService = require('../services/disaster-recovery/DisasterRecoveryService');
const { authenticate } = require('../middleware/auth');

const drService = new DisasterRecoveryService();

// Get DR status
router.get('/status', authenticate, async (req, res) => {
    try {
        const status = await drService.getDisasterRecoveryStatus();
        res.json({ success: true, data: status });
    } catch (error) {
        console.error('Failed to get DR status:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Create backup
router.post('/backup', authenticate, async (req, res) => {
    try {
        const { type = 'manual' } = req.body;
        const backup = await drService.createDatabaseBackup(type);
        res.json({ success: true, data: backup });
    } catch (error) {
        console.error('Failed to create backup:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Test disaster recovery
router.post('/test', authenticate, async (req, res) => {
    try {
        const testResults = await drService.testDisasterRecovery();
        res.json({ success: true, data: testResults });
    } catch (error) {
        console.error('Failed to test disaster recovery:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Restore from backup
router.post('/restore', authenticate, async (req, res) => {
    try {
        const { backupId, dryRun = true, tablesOnly, targetEnvironment = 'staging' } = req.body;
        
        if (!backupId) {
            return res.status(400).json({ success: false, error: 'Backup ID is required' });
        }
        
        const restoreResults = await drService.restoreFromBackup(backupId, {
            dryRun,
            tablesOnly,
            targetEnvironment
        });
        
        res.json({ success: true, data: restoreResults });
    } catch (error) {
        console.error('Failed to restore from backup:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get RTO/RPO metrics
router.get('/metrics', authenticate, async (req, res) => {
    try {
        const metrics = await drService.calculateRTORPO();
        res.json({ success: true, data: metrics });
    } catch (error) {
        console.error('Failed to get DR metrics:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get recent backups
router.get('/backups', authenticate, async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 30;
        const backups = await drService.getRecentBackups(days);
        res.json({ success: true, data: backups });
    } catch (error) {
        console.error('Failed to get backups:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
