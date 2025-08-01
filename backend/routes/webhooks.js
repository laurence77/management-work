const express = require('express');
const router = express.Router();
const { logger } = require('../utils/logger');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// n8n Webhook endpoint for booking automation
router.post('/n8n/booking-created', async (req, res) => {
  try {
    const { booking_id, user_id, celebrity_id, event_type, budget, status } = req.body;
    
    logger.info('n8n webhook received - booking created:', { booking_id, user_id });
    
    // Trigger n8n workflow for booking processing
    const workflowData = {
      event: 'booking_created',
      timestamp: new Date().toISOString(),
      data: {
        booking_id,
        user_id,
        celebrity_id,
        event_type,
        budget,
        status,
        priority: budget > 50000 ? 'high' : budget > 20000 ? 'medium' : 'low',
        auto_approve: budget < 10000 && status === 'pending'
      }
    };
    
    res.json({ 
      success: true, 
      message: 'Booking webhook processed',
      workflow_triggered: true,
      data: workflowData
    });
    
  } catch (error) {
    logger.error('n8n booking webhook error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// n8n Webhook for celebrity updates
router.post('/n8n/celebrity-updated', async (req, res) => {
  try {
    const { celebrity_id, field_changed, old_value, new_value } = req.body;
    
    const workflowData = {
      event: 'celebrity_updated',
      timestamp: new Date().toISOString(),
      data: {
        celebrity_id,
        field_changed,
        old_value,
        new_value,
        requires_notification: ['price', 'availability', 'status'].includes(field_changed)
      }
    };
    
    logger.info('n8n webhook - celebrity updated:', workflowData);
    
    res.json({ 
      success: true, 
      message: 'Celebrity update webhook processed',
      data: workflowData
    });
    
  } catch (error) {
    logger.error('n8n celebrity webhook error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// n8n Webhook for analytics automation
router.post('/n8n/analytics-trigger', async (req, res) => {
  try {
    const { event_type, metrics, thresholds } = req.body;
    
    const workflowData = {
      event: 'analytics_trigger',
      timestamp: new Date().toISOString(),
      data: {
        event_type,
        metrics,
        thresholds,
        requires_alert: metrics.some(m => m.value > (thresholds[m.name] || 100))
      }
    };
    
    res.json({ 
      success: true, 
      message: 'Analytics webhook processed',
      data: workflowData
    });
    
  } catch (error) {
    logger.error('n8n analytics webhook error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// n8n Webhook for smart recommendations
router.post('/n8n/recommendation-engine', async (req, res) => {
  try {
    const { user_id, context, preferences } = req.body;
    
    // Get user history for better recommendations
    const { data: userHistory } = await supabase
      .from('bookings')
      .select('*')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })
      .limit(10);
    
    const workflowData = {
      event: 'recommendation_request',
      timestamp: new Date().toISOString(),
      data: {
        user_id,
        context,
        preferences,
        user_history: userHistory,
        personalization_score: userHistory?.length > 0 ? 'high' : 'low'
      }
    };
    
    res.json({ 
      success: true, 
      message: 'Recommendation engine triggered',
      data: workflowData
    });
    
  } catch (error) {
    logger.error('n8n recommendation webhook error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// n8n Automation results receiver
router.post('/n8n/automation-result', async (req, res) => {
  try {
    const { workflow_id, result, actions_taken, success } = req.body;
    
    logger.info('n8n automation result received:', { 
      workflow_id, 
      success, 
      actions_count: actions_taken?.length || 0 
    });
    
    // Store automation results for tracking
    const { error } = await supabase
      .from('automation_logs')
      .insert({
        workflow_id,
        result,
        actions_taken,
        success,
        executed_at: new Date()
      });
    
    if (error) {
      logger.error('Failed to store automation result:', error);
    }
    
    res.json({ 
      success: true, 
      message: 'Automation result processed' 
    });
    
  } catch (error) {
    logger.error('n8n result webhook error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;