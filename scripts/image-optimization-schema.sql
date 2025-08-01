-- Image Optimization and CDN Tables

-- Image uploads and metadata
CREATE TABLE IF NOT EXISTS image_uploads (
    id SERIAL PRIMARY KEY,
    public_id VARCHAR(255) UNIQUE NOT NULL,
    original_url TEXT NOT NULL,
    image_type VARCHAR(50) NOT NULL, -- 'profile_image', 'gallery_image', 'banner_image', 'thumbnail'
    file_size BIGINT,
    width INTEGER,
    height INTEGER,
    format VARCHAR(10),
    optimized_variants JSONB,
    optimization_completed_at TIMESTAMP,
    uploaded_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Image analytics and performance
CREATE TABLE IF NOT EXISTS image_analytics (
    id SERIAL PRIMARY KEY,
    image_id INTEGER REFERENCES image_uploads(id) ON DELETE CASCADE,
    views INTEGER DEFAULT 0,
    loads INTEGER DEFAULT 0,
    load_time_avg DECIMAL(10,3), -- in seconds
    bandwidth_used BIGINT DEFAULT 0, -- in bytes
    bandwidth_saved BIGINT DEFAULT 0, -- estimated savings from optimization
    cache_hit_rate DECIMAL(5,2) DEFAULT 0, -- percentage
    date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(image_id, date)
);

-- CDN cache performance
CREATE TABLE IF NOT EXISTS cdn_cache_stats (
    id SERIAL PRIMARY KEY,
    cache_region VARCHAR(50),
    hit_rate DECIMAL(5,2),
    miss_rate DECIMAL(5,2),
    bandwidth_saved_gb DECIMAL(10,3),
    requests_count BIGINT,
    date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(cache_region, date)
);

-- Image processing queue
CREATE TABLE IF NOT EXISTS image_processing_queue (
    id SERIAL PRIMARY KEY,
    image_id INTEGER REFERENCES image_uploads(id) ON DELETE CASCADE,
    processing_type VARCHAR(50), -- 'optimization', 'variant_generation', 'format_conversion'
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    priority INTEGER DEFAULT 5,
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    error_message TEXT,
    processing_options JSONB,
    scheduled_at TIMESTAMP DEFAULT NOW(),
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Image SEO metadata
CREATE TABLE IF NOT EXISTS image_seo_metadata (
    id SERIAL PRIMARY KEY,
    image_id INTEGER REFERENCES image_uploads(id) ON DELETE CASCADE,
    alt_text TEXT,
    title TEXT,
    caption TEXT,
    description TEXT,
    keywords TEXT[],
    structured_data JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_image_uploads_type ON image_uploads(image_type);
CREATE INDEX IF NOT EXISTS idx_image_uploads_public_id ON image_uploads(public_id);
CREATE INDEX IF NOT EXISTS idx_image_uploads_created_at ON image_uploads(created_at);
CREATE INDEX IF NOT EXISTS idx_image_analytics_image_date ON image_analytics(image_id, date);
CREATE INDEX IF NOT EXISTS idx_cdn_cache_stats_region_date ON cdn_cache_stats(cache_region, date);
CREATE INDEX IF NOT EXISTS idx_image_processing_queue_status ON image_processing_queue(status, priority);
CREATE INDEX IF NOT EXISTS idx_image_seo_metadata_image_id ON image_seo_metadata(image_id);

-- Create functions
CREATE OR REPLACE FUNCTION get_image_usage_stats()
RETURNS TABLE(
    public_id VARCHAR,
    image_type VARCHAR,
    file_size BIGINT,
    optimized_variants JSONB,
    total_views BIGINT,
    total_bandwidth BIGINT,
    cache_hit_rate DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        iu.public_id,
        iu.image_type,
        iu.file_size,
        iu.optimized_variants,
        COALESCE(SUM(ia.views), 0) as total_views,
        COALESCE(SUM(ia.bandwidth_used), 0) as total_bandwidth,
        COALESCE(AVG(ia.cache_hit_rate), 0) as cache_hit_rate
    FROM image_uploads iu
    LEFT JOIN image_analytics ia ON iu.id = ia.image_id
    GROUP BY iu.id, iu.public_id, iu.image_type, iu.file_size, iu.optimized_variants
    ORDER BY total_views DESC;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_image_uploads_updated_at
    BEFORE UPDATE ON image_uploads
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_image_seo_metadata_updated_at
    BEFORE UPDATE ON image_seo_metadata
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert default image optimization presets
INSERT INTO system_settings (key, value, description, category) VALUES
('image_optimization_enabled', 'true', 'Enable automatic image optimization', 'images'),
('image_max_file_size_mb', '10', 'Maximum file size for image uploads in MB', 'images'),
('image_quality_default', '85', 'Default image quality for optimization (1-100)', 'images'),
('image_webp_enabled', 'true', 'Enable WebP format conversion', 'images'),
('image_lazy_loading_enabled', 'true', 'Enable lazy loading for images', 'images'),
('cdn_cache_duration_days', '30', 'CDN cache duration in days', 'images'),
('image_sitemap_enabled', 'true', 'Include images in sitemap', 'images')
ON CONFLICT (key) DO NOTHING;

-- Sample data for testing
INSERT INTO image_uploads (
    public_id, original_url, image_type, file_size, width, height, format
) VALUES
('sample/celebrity-1', 'https://res.cloudinary.com/demo/image/upload/celebrity-1.jpg', 'profile_image', 250000, 800, 600, 'jpg'),
('sample/gallery-1', 'https://res.cloudinary.com/demo/image/upload/gallery-1.jpg', 'gallery_image', 450000, 1200, 800, 'jpg'),
('sample/banner-1', 'https://res.cloudinary.com/demo/image/upload/banner-1.jpg', 'banner_image', 600000, 1920, 600, 'jpg')
ON CONFLICT (public_id) DO NOTHING;
