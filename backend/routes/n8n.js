const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { supabase } = require('../config/supabase');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/workflows/',
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/json') {
      cb(null, true);
    } else {
      cb(new Error('Only JSON files are allowed'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Get all workflows
router.get('/workflows', authenticate, async (req, res) => {
  try {
    const { data: workflows, error } = await supabase
      .from('n8n_workflows')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Error fetching workflows:', error);
      return res.status(500).json({ error: 'Failed to fetch workflows' });
    }

    // Parse workflow data and calculate metrics
    const processedWorkflows = workflows.map(workflow => {
      let workflowData = {};
      try {
        workflowData = typeof workflow.workflow_data === 'string' 
          ? JSON.parse(workflow.workflow_data) 
          : workflow.workflow_data;
      } catch (err) {
        logger.error('Error parsing workflow data:', err);
      }

      return {
        id: workflow.id,
        name: workflow.name,
        description: workflow.description,
        active: workflow.is_active,
        tags: workflow.tags || [],
        nodes: workflowData.nodes ? workflowData.nodes.length : 0,
        triggers: workflowData.nodes ? workflowData.nodes.filter(node => 
          node.type && (
            node.type.includes('trigger') || 
            node.type.includes('webhook') ||
            node.type.includes('schedule')
          )
        ).length : 0,
        createdAt: workflow.created_at,
        updatedAt: workflow.updated_at,
        workflow: workflowData,
        lastExecution: workflow.last_execution
      };
    });

    res.json({ workflows: processedWorkflows });
  } catch (error) {
    logger.error('Error in GET /workflows:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get workflow executions
router.get('/executions', authenticate, async (req, res) => {
  try {
    const { data: executions, error } = await supabase
      .from('n8n_executions')
      .select(`
        *,
        n8n_workflows (
          name
        )
      `)
      .order('started_at', { ascending: false })
      .limit(100);

    if (error) {
      logger.error('Error fetching executions:', error);
      return res.status(500).json({ error: 'Failed to fetch executions' });
    }

    const processedExecutions = executions.map(execution => ({
      id: execution.id,
      workflowId: execution.workflow_id,
      workflowName: execution.n8n_workflows?.name || 'Unknown Workflow',
      status: execution.status,
      startedAt: execution.started_at,
      finishedAt: execution.finished_at,
      duration: execution.duration_ms,
      errorMessage: execution.error_message,
      triggerEvent: execution.trigger_event
    }));

    res.json({ executions: processedExecutions });
  } catch (error) {
    logger.error('Error in GET /executions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Upload new workflow
router.post('/workflows/upload', authenticate, upload.single('workflow'), async (req, res) => {
  try {
    let workflowData;
    
    if (req.file) {
      // File upload
      const fileContent = await fs.readFile(req.file.path, 'utf8');
      workflowData = JSON.parse(fileContent);
      
      // Clean up uploaded file
      await fs.unlink(req.file.path);
    } else if (req.body.workflow) {
      // JSON data
      workflowData = typeof req.body.workflow === 'string' 
        ? JSON.parse(req.body.workflow) 
        : req.body.workflow;
    } else {
      return res.status(400).json({ error: 'No workflow data provided' });
    }

    // Validate workflow structure
    if (!workflowData.nodes || !Array.isArray(workflowData.nodes)) {
      return res.status(400).json({ error: 'Invalid workflow structure: missing nodes' });
    }

    const name = req.body.name || workflowData.name || 'Untitled Workflow';
    const description = req.body.description || workflowData.description || '';
    const tags = req.body.tags ? req.body.tags.split(',').map(tag => tag.trim()) : [];

    // Store workflow in database
    const { data: workflow, error } = await supabase
      .from('n8n_workflows')
      .insert({
        name,
        description,
        workflow_data: workflowData,
        tags,
        is_active: false,
        created_by: req.user.id
      })
      .select()
      .single();

    if (error) {
      logger.error('Error storing workflow:', error);
      return res.status(500).json({ error: 'Failed to store workflow' });
    }

    logger.info(`New workflow uploaded: ${name} by user ${req.user.id}`);
    res.json({ 
      success: true, 
      workflow: {
        id: workflow.id,
        name: workflow.name,
        description: workflow.description,
        tags: workflow.tags
      }
    });

  } catch (error) {
    logger.error('Error in POST /workflows/upload:', error);
    
    // Clean up file if it exists
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        logger.error('Error cleaning up uploaded file:', unlinkError);
      }
    }
    
    res.status(500).json({ error: 'Failed to upload workflow' });
  }
});

// Toggle workflow active status
router.post('/workflows/:id/toggle', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { active } = req.body;

    const { data: workflow, error } = await supabase
      .from('n8n_workflows')
      .update({ 
        is_active: active,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error('Error toggling workflow:', error);
      return res.status(500).json({ error: 'Failed to update workflow' });
    }

    logger.info(`Workflow ${id} ${active ? 'activated' : 'deactivated'} by user ${req.user.id}`);
    res.json({ success: true, workflow });

  } catch (error) {
    logger.error('Error in POST /workflows/:id/toggle:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Execute workflow manually
router.post('/workflows/:id/execute', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const triggerData = req.body.data || {};

    // Get workflow
    const { data: workflow, error: workflowError } = await supabase
      .from('n8n_workflows')
      .select('*')
      .eq('id', id)
      .single();

    if (workflowError || !workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    // Create execution record
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = new Date().toISOString();

    const { data: execution, error: executionError } = await supabase
      .from('n8n_executions')
      .insert({
        id: executionId,
        workflow_id: id,
        status: 'running',
        started_at: startTime,
        trigger_event: 'manual',
        execution_data: { triggerData, manual: true },
        created_by: req.user.id
      })
      .select()
      .single();

    if (executionError) {
      logger.error('Error creating execution record:', executionError);
      return res.status(500).json({ error: 'Failed to create execution record' });
    }

    // Here you would integrate with actual n8n execution engine
    // For now, we'll simulate the execution
    setTimeout(async () => {
      try {
        // Simulate workflow execution
        const success = Math.random() > 0.2; // 80% success rate
        const duration = Math.floor(Math.random() * 5000) + 1000; // 1-6 seconds
        
        await supabase
          .from('n8n_executions')
          .update({
            status: success ? 'success' : 'error',
            finished_at: new Date().toISOString(),
            duration_ms: duration,
            error_message: success ? null : 'Simulated execution error'
          })
          .eq('id', executionId);

        // Update workflow last execution
        await supabase
          .from('n8n_workflows')
          .update({
            last_execution: {
              status: success ? 'success' : 'error',
              startedAt: startTime,
              finishedAt: new Date().toISOString(),
              executionId
            }
          })
          .eq('id', id);

      } catch (updateError) {
        logger.error('Error updating execution:', updateError);
      }
    }, 2000);

    logger.info(`Manual execution started for workflow ${id} by user ${req.user.id}`);
    res.json({ 
      success: true, 
      executionId,
      message: 'Workflow execution started'
    });

  } catch (error) {
    logger.error('Error in POST /workflows/:id/execute:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete workflow
router.delete('/workflows/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    // Delete associated executions first
    await supabase
      .from('n8n_executions')
      .delete()
      .eq('workflow_id', id);

    // Delete workflow
    const { error } = await supabase
      .from('n8n_workflows')
      .delete()
      .eq('id', id);

    if (error) {
      logger.error('Error deleting workflow:', error);
      return res.status(500).json({ error: 'Failed to delete workflow' });
    }

    logger.info(`Workflow ${id} deleted by user ${req.user.id}`);
    res.json({ success: true, message: 'Workflow deleted successfully' });

  } catch (error) {
    logger.error('Error in DELETE /workflows/:id:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get workflow library templates
router.get('/library', authenticate, async (req, res) => {
  try {
    const templates = [
      {
        id: 'celebrity-performance-monitor',
        name: 'Celebrity Performance Monitor',
        description: 'Monitors celebrity booking performance, generates alerts, and sends email reports every 6 hours.',
        tags: ['performance', 'monitoring', 'email', 'alerts'],
        category: 'Analytics',
        filename: 'n8n-celebrity-performance-monitor.json'
      },
      {
        id: 'lead-scoring-workflow',
        name: 'Lead Scoring & Qualification',
        description: 'Automatically scores and qualifies leads based on multiple factors and triggers appropriate follow-up actions.',
        tags: ['lead-scoring', 'automation', 'crm', 'sales'],
        category: 'Sales',
        filename: 'n8n-lead-scoring-workflow.json'
      }
    ];

    res.json({ templates });
  } catch (error) {
    logger.error('Error in GET /library:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Download workflow template
router.get('/library/:templateId/download', authenticate, async (req, res) => {
  try {
    const { templateId } = req.params;
    
    const templateFiles = {
      'celebrity-performance-monitor': path.join(__dirname, '../../n8n-celebrity-performance-monitor.json'),
      'lead-scoring-workflow': path.join(__dirname, '../../n8n-lead-scoring-workflow.json')
    };

    const filePath = templateFiles[templateId];
    if (!filePath) {
      return res.status(404).json({ error: 'Template not found' });
    }

    try {
      const workflowData = await fs.readFile(filePath, 'utf8');
      const parsedData = JSON.parse(workflowData);
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${templateId}.json"`);
      res.json(parsedData);
      
    } catch (fileError) {
      logger.error('Error reading template file:', fileError);
      res.status(404).json({ error: 'Template file not found' });
    }

  } catch (error) {
    logger.error('Error in GET /library/:templateId/download:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get workflow metrics
router.get('/metrics', authenticate, async (req, res) => {
  try {
    const { data: executions, error } = await supabase
      .from('n8n_executions')
      .select('status, duration_ms, started_at')
      .gte('started_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()); // Last 30 days

    if (error) {
      logger.error('Error fetching execution metrics:', error);
      return res.status(500).json({ error: 'Failed to fetch metrics' });
    }

    const totalExecutions = executions.length;
    const successfulExecutions = executions.filter(e => e.status === 'success').length;
    const successRate = totalExecutions > 0 ? ((successfulExecutions / totalExecutions) * 100).toFixed(1) : 0;
    
    const validDurations = executions.filter(e => e.duration_ms && e.duration_ms > 0);
    const averageExecutionTime = validDurations.length > 0 
      ? Math.round(validDurations.reduce((sum, e) => sum + e.duration_ms, 0) / validDurations.length)
      : 0;

    const { data: activeWorkflows, error: workflowError } = await supabase
      .from('n8n_workflows')
      .select('id')
      .eq('is_active', true);

    if (workflowError) {
      logger.error('Error fetching active workflows:', workflowError);
    }

    const metrics = {
      total_executions: totalExecutions,
      success_rate: parseFloat(successRate),
      average_execution_time: averageExecutionTime,
      active_workflows: activeWorkflows ? activeWorkflows.length : 0
    };

    res.json({ metrics });

  } catch (error) {
    logger.error('Error in GET /metrics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;