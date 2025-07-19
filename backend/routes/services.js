const express = require('express');
const router = express.Router();

// GET /api/services
router.get('/', async (req, res) => {
  // TODO: Get all services with filtering
  res.json({ success: true, message: 'Get services endpoint - TODO' });
});

// GET /api/services/:id
router.get('/:id', async (req, res) => {
  // TODO: Get single service by ID
  res.json({ success: true, message: 'Get service by ID endpoint - TODO' });
});

// POST /api/services/request
router.post('/request', async (req, res) => {
  // TODO: Request service booking
  res.json({ success: true, message: 'Request service endpoint - TODO' });
});

// GET /api/services/categories
router.get('/categories', async (req, res) => {
  // TODO: Get service categories
  res.json({ success: true, message: 'Get service categories endpoint - TODO' });
});

module.exports = router;