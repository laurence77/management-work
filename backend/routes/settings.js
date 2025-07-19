const express = require('express');
const Settings = require('../models/Settings');
const router = express.Router();

// GET /api/settings (Admin only)
router.get('/', async (req, res) => {
  try {
    const settings = await Settings.getAll();
    res.json({ success: true, data: settings });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch settings' });
  }
});

// PUT /api/settings (Admin only)
router.put('/', async (req, res) => {
  try {
    const settings = await Settings.update(req.body);
    res.json({ success: true, data: settings });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ success: false, message: 'Failed to update settings' });
  }
});

// GET /api/settings/public
router.get('/public', async (req, res) => {
  try {
    const settings = await Settings.getPublic();
    res.json({ success: true, data: settings });
  } catch (error) {
    console.error('Error fetching public settings:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch public settings' });
  }
});

// POST /api/settings/reset (Admin only)
router.post('/reset', async (req, res) => {
  try {
    const settings = await Settings.resetToDefaults();
    res.json({ success: true, data: settings, message: 'Settings reset to defaults' });
  } catch (error) {
    console.error('Error resetting settings:', error);
    res.status(500).json({ success: false, message: 'Failed to reset settings' });
  }
});

module.exports = router;