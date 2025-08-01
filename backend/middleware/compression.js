const compression = require('compression');
const zlib = require('zlib');

/**
 * Advanced Compression Middleware
 * Optimizes response compression with smart filtering and configuration
 */

// Compression configuration
const compressionConfig = {
  // Compression level (1-9, 6 is balanced)
  level: 6,
  
  // Minimum response size to compress (in bytes)
  threshold: 1024,
  
  // Memory level for deflate (1-9, 8 is default)
  memLevel: 8,
  
  // Window size for deflate (9-15, 15 is default)
  windowBits: 15,
  
  // Compression strategy
  strategy: zlib.constants.Z_DEFAULT_STRATEGY,
  
  // Chunk size for streaming compression
  chunkSize: 16 * 1024, // 16KB
  
  // Enable Brotli compression (better than gzip)
  brotli: true
};

// Content types that should be compressed
const compressibleTypes = [
  'text/html',
  'text/css',
  'text/javascript',
  'text/xml',
  'text/plain',
  'application/javascript',
  'application/json',
  'application/xml',
  'application/rss+xml',
  'application/atom+xml',
  'image/svg+xml',
  'application/x-font-ttf',
  'application/vnd.ms-fontobject',
  'font/opentype'
];

// Content types that should NOT be compressed (already compressed)
const nonCompressibleTypes = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/mpeg',
  'audio/mpeg',
  'audio/ogg',
  'application/zip',
  'application/gzip',
  'application/pdf'
];

// Custom filter function for compression
function shouldCompress(req, res) {
  // Don't compress if explicitly disabled
  if (req.headers['x-no-compression']) {
    return false;
  }
  
  // Get content type
  const contentType = res.getHeader('content-type');
  if (!contentType) {
    return false;
  }
  
  // Check if content type is explicitly non-compressible
  if (nonCompressibleTypes.some(type => contentType.includes(type))) {
    return false;
  }
  
  // Check if content type is compressible
  if (compressibleTypes.some(type => contentType.includes(type))) {
    return true;
  }
  
  // Default compression behavior for unknown types
  return compression.filter(req, res);
}

// Advanced compression middleware with multiple algorithms
function createCompressionMiddleware() {
  const middlewares = [];
  
  // Brotli compression (best compression ratio)
  if (compressionConfig.brotli) {
    middlewares.push(compression({
      filter: shouldCompress,
      threshold: compressionConfig.threshold,
      level: compressionConfig.level,
      memLevel: compressionConfig.memLevel,
      windowBits: compressionConfig.windowBits,
      strategy: compressionConfig.strategy,
      chunkSize: compressionConfig.chunkSize,
      
      // Custom Brotli settings
      br: {
        quality: 6, // Brotli quality level (0-11)
        lgwin: 22,  // Window size (10-24)
        lgblock: 0  // Block size (0, 16-24)
      }
    }));
  } else {
    // Standard gzip/deflate compression
    middlewares.push(compression({
      filter: shouldCompress,
      threshold: compressionConfig.threshold,
      level: compressionConfig.level,
      memLevel: compressionConfig.memLevel,
      windowBits: compressionConfig.windowBits,
      strategy: compressionConfig.strategy,
      chunkSize: compressionConfig.chunkSize
    }));
  }
  
  return middlewares;
}

// Middleware to add cache headers for compressed responses
function addCompressionHeaders(req, res, next) {
  // Add vary header to indicate compression varies by encoding
  res.set('Vary', 'Accept-Encoding');
  
  // Add cache control for compressed static assets
  if (req.url.match(/\.(js|css|html|svg|txt)$/)) {
    res.set('Cache-Control', 'public, max-age=31536000'); // 1 year for static assets
  } else if (req.url.match(/\.(json|xml)$/)) {
    res.set('Cache-Control', 'public, max-age=3600'); // 1 hour for API responses
  }
  
  next();
}

// Middleware to log compression statistics
function compressionLogger(req, res, next) {
  const startTime = Date.now();
  const originalWrite = res.write;
  const originalEnd = res.end;
  let originalSize = 0;
  let compressedSize = 0;
  
  // Track original response size
  res.write = function(chunk, encoding) {
    if (chunk) {
      originalSize += Buffer.isBuffer(chunk) ? chunk.length : Buffer.byteLength(chunk, encoding);
    }
    return originalWrite.call(this, chunk, encoding);
  };
  
  res.end = function(chunk, encoding) {
    if (chunk) {
      originalSize += Buffer.isBuffer(chunk) ? chunk.length : Buffer.byteLength(chunk, encoding);
    }
    
    // Log compression statistics in development
    if (process.env.NODE_ENV === 'development') {
      const responseTime = Date.now() - startTime;
      const contentEncoding = res.getHeader('content-encoding');
      const compressionRatio = originalSize > 0 ? ((originalSize - compressedSize) / originalSize * 100).toFixed(1) : 0;
      
      console.log(`📊 ${req.method} ${req.url} - ${responseTime}ms - Original: ${originalSize}b - Encoding: ${contentEncoding || 'none'} - Saved: ${compressionRatio}%`);
    }
    
    return originalEnd.call(this, chunk, encoding);
  };
  
  next();
}

// Pre-compression for static assets (optional optimization)
function preCompressionMiddleware(staticPath) {
  const fs = require('fs');
  const path = require('path');
  
  return (req, res, next) => {
    const acceptEncoding = req.headers['accept-encoding'] || '';
    const filePath = path.join(staticPath, req.url);
    
    // Check if client accepts Brotli
    if (acceptEncoding.includes('br')) {
      const brotliPath = filePath + '.br';
      if (fs.existsSync(brotliPath)) {
        res.set('Content-Encoding', 'br');
        res.set('Content-Type', getContentType(req.url));
        return res.sendFile(path.resolve(brotliPath));
      }
    }
    
    // Check if client accepts gzip
    if (acceptEncoding.includes('gzip')) {
      const gzipPath = filePath + '.gz';
      if (fs.existsSync(gzipPath)) {
        res.set('Content-Encoding', 'gzip');
        res.set('Content-Type', getContentType(req.url));
        return res.sendFile(path.resolve(gzipPath));
      }
    }
    
    next();
  };
}

// Helper function to get content type based on file extension
function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const contentTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.svg': 'image/svg+xml',
    '.txt': 'text/plain'
  };
  
  return contentTypes[ext] || 'application/octet-stream';
}

// Export compression middleware factory
module.exports = {
  // Main compression middleware
  compression: createCompressionMiddleware(),
  
  // Individual middleware components
  addHeaders: addCompressionHeaders,
  logger: compressionLogger,
  preCompression: preCompressionMiddleware,
  
  // Configuration
  config: compressionConfig,
  
  // Utility functions
  shouldCompress,
  
  // Quick setup function
  setup: (app, options = {}) => {
    const config = { ...compressionConfig, ...options };
    
    // Add compression headers
    app.use(addCompressionHeaders);
    
    // Add compression logging in development
    if (process.env.NODE_ENV === 'development') {
      app.use(compressionLogger);
    }
    
    // Add main compression middleware
    const compressionMiddlewares = createCompressionMiddleware();
    compressionMiddlewares.forEach(middleware => {
      app.use(middleware);
    });
    
    console.log(`🗜️ Compression middleware configured with level ${config.level}`);
    console.log(`   Threshold: ${config.threshold} bytes`);
    console.log(`   Brotli: ${config.brotli ? 'enabled' : 'disabled'}`);
  }
};