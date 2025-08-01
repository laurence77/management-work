-- n8n Workflow Management Tables
-- This migration adds tables specifically for n8n workflow storage and management

-- N8N workflows storage
CREATE TABLE IF NOT EXISTS n8n_workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    workflow_data JSONB NOT NULL,
    tags TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT false,
    last_execution JSONB,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- N8N execution logs
CREATE TABLE IF NOT EXISTS n8n_executions (
    id VARCHAR(255) PRIMARY KEY,
    workflow_id UUID REFERENCES n8n_workflows(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL CHECK (status IN ('running', 'success', 'error', 'waiting')),
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    finished_at TIMESTAMP WITH TIME ZONE,
    duration_ms INTEGER,
    error_message TEXT,
    trigger_event VARCHAR(100),
    execution_data JSONB,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_n8n_workflows_name ON n8n_workflows(name);
CREATE INDEX IF NOT EXISTS idx_n8n_workflows_active ON n8n_workflows(is_active);
CREATE INDEX IF NOT EXISTS idx_n8n_workflows_created_by ON n8n_workflows(created_by);
CREATE INDEX IF NOT EXISTS idx_n8n_workflows_tags ON n8n_workflows USING GIN(tags);

CREATE INDEX IF NOT EXISTS idx_n8n_executions_workflow_id ON n8n_executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_n8n_executions_status ON n8n_executions(status);
CREATE INDEX IF NOT EXISTS idx_n8n_executions_started_at ON n8n_executions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_n8n_executions_created_by ON n8n_executions(created_by);

-- Enable Row Level Security
ALTER TABLE n8n_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE n8n_executions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for n8n_workflows (admin access only)
CREATE POLICY "n8n_workflows_admin_access" ON n8n_workflows
    FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- RLS Policies for n8n_executions (admin access only)
CREATE POLICY "n8n_executions_admin_access" ON n8n_executions
    FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- Create functions for workflow management
CREATE OR REPLACE FUNCTION update_n8n_workflow_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER trigger_update_n8n_workflow_timestamp
    BEFORE UPDATE ON n8n_workflows
    FOR EACH ROW
    EXECUTE FUNCTION update_n8n_workflow_timestamp();

-- Function to get workflow execution metrics
CREATE OR REPLACE FUNCTION get_n8n_workflow_metrics(
    workflow_id_param UUID DEFAULT NULL,
    days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
    workflow_id UUID,
    workflow_name TEXT,
    total_executions BIGINT,
    successful_executions BIGINT,
    failed_executions BIGINT,
    success_rate DECIMAL(5,2),
    avg_duration_ms DECIMAL(10,2),
    last_execution TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        w.id as workflow_id,
        w.name as workflow_name,
        COUNT(e.id) as total_executions,
        COUNT(CASE WHEN e.status = 'success' THEN 1 END) as successful_executions,
        COUNT(CASE WHEN e.status = 'error' THEN 1 END) as failed_executions,
        CASE 
            WHEN COUNT(e.id) > 0 THEN 
                ROUND((COUNT(CASE WHEN e.status = 'success' THEN 1 END)::DECIMAL / COUNT(e.id)) * 100, 2)
            ELSE 0.00
        END as success_rate,
        COALESCE(AVG(e.duration_ms), 0)::DECIMAL(10,2) as avg_duration_ms,
        MAX(e.started_at) as last_execution
    FROM n8n_workflows w
    LEFT JOIN n8n_executions e ON w.id = e.workflow_id 
        AND e.started_at >= (NOW() - INTERVAL '%s days', days_back)
    WHERE (workflow_id_param IS NULL OR w.id = workflow_id_param)
    GROUP BY w.id, w.name
    ORDER BY w.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up old executions
CREATE OR REPLACE FUNCTION cleanup_old_n8n_executions(days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM n8n_executions 
    WHERE created_at < (NOW() - INTERVAL '%s days', days_to_keep);
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    INSERT INTO automation_logs (
        workflow_id, 
        workflow_name, 
        trigger_event, 
        result, 
        success, 
        executed_at
    ) VALUES (
        'cleanup_function',
        'N8N Execution Cleanup',
        'scheduled_cleanup',
        jsonb_build_object('deleted_executions', deleted_count),
        true,
        NOW()
    );
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert some sample workflow templates
INSERT INTO n8n_workflows (id, name, description, workflow_data, tags, is_active, created_by) VALUES
(
    'template-celebrity-monitor',
    'Celebrity Performance Monitor Template',
    'Template for monitoring celebrity booking performance and generating alerts',
    '{"name": "Celebrity Performance Monitor Template", "nodes": [], "connections": {}, "tags": ["template", "performance", "monitoring"]}',
    ARRAY['template', 'performance', 'monitoring', 'celebrity'],
    false,
    NULL
),
(
    'template-lead-scoring',
    'Lead Scoring Workflow Template', 
    'Template for automated lead scoring and qualification',
    '{"name": "Lead Scoring Workflow Template", "nodes": [], "connections": {}, "tags": ["template", "lead-scoring", "automation"]}',
    ARRAY['template', 'lead-scoring', 'sales', 'automation'],
    false,
    NULL
) ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE n8n_workflows IS 'Storage for n8n workflow definitions and metadata';
COMMENT ON TABLE n8n_executions IS 'Execution logs for n8n workflows';
COMMENT ON FUNCTION get_n8n_workflow_metrics IS 'Get performance metrics for n8n workflows';
COMMENT ON FUNCTION cleanup_old_n8n_executions IS 'Clean up old n8n execution records';