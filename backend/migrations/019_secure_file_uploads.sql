-- Secure File Uploads Migration
-- Creates tables and structures for secure file upload management

-- Create secure_files table
CREATE TABLE IF NOT EXISTS secure_files (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  original_name VARCHAR(255) NOT NULL,
  secure_name VARCHAR(255) NOT NULL UNIQUE,
  file_path TEXT NOT NULL,
  public_url TEXT,
  mime_type VARCHAR(100) NOT NULL,
  file_size BIGINT NOT NULL,
  original_size BIGINT NOT NULL,
  user_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  virus_scanned BOOLEAN DEFAULT false,
  content_validated BOOLEAN DEFAULT false,
  processing_metadata JSONB DEFAULT '{}',
  upload_ip INET,
  upload_user_agent TEXT,
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by UUID REFERENCES app_users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create file_upload_quotas table for managing upload limits
CREATE TABLE IF NOT EXISTS file_upload_quotas (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES app_users(id) ON DELETE CASCADE,
  quota_type VARCHAR(50) NOT NULL, -- 'daily', 'monthly', 'total'
  max_files INTEGER DEFAULT 100,
  max_size_bytes BIGINT DEFAULT 1073741824, -- 1GB default
  current_files INTEGER DEFAULT 0,
  current_size_bytes BIGINT DEFAULT 0,
  reset_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, user_id, quota_type)
);

-- Create file_scan_results table for virus scan tracking
CREATE TABLE IF NOT EXISTS file_scan_results (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  file_id UUID REFERENCES secure_files(id) ON DELETE CASCADE,
  scan_type VARCHAR(50) NOT NULL, -- 'virus', 'content', 'malware'
  scan_result VARCHAR(20) NOT NULL, -- 'clean', 'infected', 'suspicious', 'error'
  scan_details JSONB DEFAULT '{}',
  scanner_version VARCHAR(100),
  scanned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create file_access_logs table for tracking file access
CREATE TABLE IF NOT EXISTS file_access_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  file_id UUID REFERENCES secure_files(id) ON DELETE CASCADE,
  user_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
  access_type VARCHAR(20) NOT NULL, -- 'view', 'download', 'share'
  ip_address INET,
  user_agent TEXT,
  referer TEXT,
  accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_secure_files_user_id ON secure_files(user_id);
CREATE INDEX IF NOT EXISTS idx_secure_files_organization_id ON secure_files(organization_id);
CREATE INDEX IF NOT EXISTS idx_secure_files_created_at ON secure_files(created_at);
CREATE INDEX IF NOT EXISTS idx_secure_files_mime_type ON secure_files(mime_type);
CREATE INDEX IF NOT EXISTS idx_secure_files_deleted_at ON secure_files(deleted_at);
CREATE INDEX IF NOT EXISTS idx_secure_files_file_size ON secure_files(file_size);

CREATE INDEX IF NOT EXISTS idx_file_upload_quotas_org_user ON file_upload_quotas(organization_id, user_id);
CREATE INDEX IF NOT EXISTS idx_file_upload_quotas_reset_at ON file_upload_quotas(reset_at);

CREATE INDEX IF NOT EXISTS idx_file_scan_results_file_id ON file_scan_results(file_id);
CREATE INDEX IF NOT EXISTS idx_file_scan_results_scan_result ON file_scan_results(scan_result);
CREATE INDEX IF NOT EXISTS idx_file_scan_results_scanned_at ON file_scan_results(scanned_at);

CREATE INDEX IF NOT EXISTS idx_file_access_logs_file_id ON file_access_logs(file_id);
CREATE INDEX IF NOT EXISTS idx_file_access_logs_user_id ON file_access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_file_access_logs_accessed_at ON file_access_logs(accessed_at);

-- Enable Row Level Security
ALTER TABLE secure_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_upload_quotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_scan_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_access_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for secure_files
CREATE POLICY "Users can view their own files" ON secure_files
  FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM app_users au 
      WHERE au.auth_id = auth.uid() 
      AND (
        au.id = user_id OR
        (au.organization_id = organization_id AND au.role IN ('admin', 'super_admin'))
      )
    )
  );

CREATE POLICY "Users can upload files" ON secure_files
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM app_users au 
      WHERE au.auth_id = auth.uid() 
      AND au.id = user_id
    )
  );

CREATE POLICY "Users can update their own files" ON secure_files
  FOR UPDATE USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM app_users au 
      WHERE au.auth_id = auth.uid() 
      AND (
        au.id = user_id OR
        (au.organization_id = organization_id AND au.role IN ('admin', 'super_admin'))
      )
    )
  );

CREATE POLICY "Users can delete their own files" ON secure_files
  FOR DELETE USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM app_users au 
      WHERE au.auth_id = auth.uid() 
      AND (
        au.id = user_id OR
        (au.organization_id = organization_id AND au.role IN ('admin', 'super_admin'))
      )
    )
  );

-- RLS Policies for file_upload_quotas
CREATE POLICY "Users can view quotas in their organization" ON file_upload_quotas
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM app_users au 
      WHERE au.auth_id = auth.uid() 
      AND au.organization_id = organization_id
    )
  );

CREATE POLICY "Admins can manage quotas" ON file_upload_quotas
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM app_users au 
      WHERE au.auth_id = auth.uid() 
      AND au.organization_id = organization_id
      AND au.role IN ('admin', 'super_admin')
    )
  );

-- RLS Policies for file_scan_results  
CREATE POLICY "Users can view scan results for their files" ON file_scan_results
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM secure_files sf
      JOIN app_users au ON au.auth_id = auth.uid()
      WHERE sf.id = file_id 
      AND (
        sf.user_id = au.id OR
        (sf.organization_id = au.organization_id AND au.role IN ('admin', 'super_admin'))
      )
    )
  );

-- RLS Policies for file_access_logs
CREATE POLICY "Users can view access logs for their files" ON file_access_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM secure_files sf
      JOIN app_users au ON au.auth_id = auth.uid()
      WHERE sf.id = file_id 
      AND (
        sf.user_id = au.id OR
        (sf.organization_id = au.organization_id AND au.role IN ('admin', 'super_admin'))
      )
    )
  );

-- Create functions for quota management
CREATE OR REPLACE FUNCTION update_upload_quota()
RETURNS TRIGGER AS $$
BEGIN
  -- Update quota when file is uploaded
  IF TG_OP = 'INSERT' THEN
    INSERT INTO file_upload_quotas (organization_id, user_id, quota_type, current_files, current_size_bytes)
    VALUES (NEW.organization_id, NEW.user_id, 'daily', 1, NEW.file_size)
    ON CONFLICT (organization_id, user_id, quota_type)
    DO UPDATE SET 
      current_files = file_upload_quotas.current_files + 1,
      current_size_bytes = file_upload_quotas.current_size_bytes + NEW.file_size,
      updated_at = NOW();
    
    RETURN NEW;
  END IF;
  
  -- Update quota when file is deleted
  IF TG_OP = 'UPDATE' AND OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
    UPDATE file_upload_quotas 
    SET 
      current_files = GREATEST(0, current_files - 1),
      current_size_bytes = GREATEST(0, current_size_bytes - OLD.file_size),
      updated_at = NOW()
    WHERE organization_id = OLD.organization_id 
      AND user_id = OLD.user_id 
      AND quota_type = 'daily';
    
    RETURN NEW;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers
CREATE TRIGGER update_upload_quota_trigger
  AFTER INSERT OR UPDATE ON secure_files
  FOR EACH ROW
  EXECUTE FUNCTION update_upload_quota();

-- Create function to reset daily quotas
CREATE OR REPLACE FUNCTION reset_daily_quotas()
RETURNS void AS $$
BEGIN
  UPDATE file_upload_quotas 
  SET 
    current_files = 0,
    current_size_bytes = 0,
    reset_at = NOW() + INTERVAL '1 day',
    updated_at = NOW()
  WHERE quota_type = 'daily' 
    AND (reset_at IS NULL OR reset_at <= NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get file upload statistics
CREATE OR REPLACE FUNCTION get_upload_statistics(
  p_organization_id UUID DEFAULT NULL,
  p_time_range INTERVAL DEFAULT INTERVAL '24 hours'
)
RETURNS TABLE(
  total_files BIGINT,
  total_size BIGINT,
  avg_size NUMERIC,
  virus_scanned_count BIGINT,
  content_validated_count BIGINT,
  top_mime_types JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_files,
    COALESCE(SUM(file_size), 0)::BIGINT as total_size,
    COALESCE(AVG(file_size), 0)::NUMERIC as avg_size,
    COUNT(*) FILTER (WHERE virus_scanned = true)::BIGINT as virus_scanned_count,
    COUNT(*) FILTER (WHERE content_validated = true)::BIGINT as content_validated_count,
    COALESCE(
      jsonb_object_agg(
        mime_type, 
        mime_count
      ) FILTER (WHERE mime_type IS NOT NULL),
      '{}'::jsonb
    ) as top_mime_types
  FROM (
    SELECT 
      sf.*,
      COUNT(*) OVER (PARTITION BY sf.mime_type) as mime_count
    FROM secure_files sf
    WHERE sf.deleted_at IS NULL
      AND sf.created_at >= NOW() - p_time_range
      AND (p_organization_id IS NULL OR sf.organization_id = p_organization_id)
  ) stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to clean up old deleted files
CREATE OR REPLACE FUNCTION cleanup_deleted_files()
RETURNS INTEGER AS $$
DECLARE
  cleaned_count INTEGER := 0;
BEGIN
  -- Get count of files to be cleaned
  SELECT COUNT(*) INTO cleaned_count
  FROM secure_files
  WHERE deleted_at IS NOT NULL 
    AND deleted_at < NOW() - INTERVAL '30 days';
  
  -- Delete old scan results first (foreign key constraint)
  DELETE FROM file_scan_results 
  WHERE file_id IN (
    SELECT id FROM secure_files 
    WHERE deleted_at IS NOT NULL 
      AND deleted_at < NOW() - INTERVAL '30 days'
  );
  
  -- Delete old access logs
  DELETE FROM file_access_logs 
  WHERE file_id IN (
    SELECT id FROM secure_files 
    WHERE deleted_at IS NOT NULL 
      AND deleted_at < NOW() - INTERVAL '30 days'
  );
  
  -- Delete the file records
  DELETE FROM secure_files 
  WHERE deleted_at IS NOT NULL 
    AND deleted_at < NOW() - INTERVAL '30 days';
  
  RETURN cleaned_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert default quotas for existing organizations
INSERT INTO file_upload_quotas (organization_id, user_id, quota_type, max_files, max_size_bytes)
SELECT 
  o.id as organization_id,
  NULL as user_id,
  'daily' as quota_type,
  1000 as max_files,
  10737418240 as max_size_bytes -- 10GB
FROM organizations o
ON CONFLICT (organization_id, user_id, quota_type) DO NOTHING;

-- Create Supabase storage bucket if not exists (this should be done via Supabase dashboard)
-- Note: This cannot be done via SQL migration, needs to be done via Supabase dashboard or API

-- Add comment for documentation
COMMENT ON TABLE secure_files IS 'Stores metadata for all securely uploaded files with virus scanning and content validation';
COMMENT ON TABLE file_upload_quotas IS 'Manages upload quotas and limits for users and organizations';
COMMENT ON TABLE file_scan_results IS 'Tracks virus and malware scan results for uploaded files';
COMMENT ON TABLE file_access_logs IS 'Logs all access attempts to uploaded files for audit purposes';