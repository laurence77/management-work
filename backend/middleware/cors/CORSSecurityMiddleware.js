const { securityLogger } = require('../../utils/logger');

class CORSSecurityMiddleware {
    constructor() {
        this.blockedOrigins = new Set();
        this.rateLimitMap = new Map();
        this.suspiciousPatterns = [
            /\b(?:admin|api|backend|internal|private|secure)\b/i,
            /\b(?:test|staging|dev|development)\b/i,
            /\b(?:localhost|127\.0\.0\.1|0\.0\.0\.0)\b/i,
            /\b(?:ngrok|herokuapp|vercel|netlify)\.com\b/i,
            /\b(?:amazonaws|cloudfront|cloudflare)\.com\b/i
        ];
        
        // Production domain whitelist
        this.productionDomains = new Set([
            'bookmyreservation.org',
            'www.bookmyreservation.org',
            'admin.bookmyreservation.org',
            'api.bookmyreservation.org'
        ]);
        
        // Initialize monitoring
        this.initializeMonitoring();
    }

    initializeMonitoring() {
        // Clean up rate limit map every hour
        setInterval(() => {
            const cutoffTime = Date.now() - (60 * 60 * 1000); // 1 hour ago
            for (const [origin, data] of this.rateLimitMap) {
                if (data.lastRequest < cutoffTime) {
                    this.rateLimitMap.delete(origin);
                }
            }
        }, 60 * 60 * 1000);
    }

    // Enhanced origin validation with security checks
    validateOriginSecurity(origin, req) {
        if (!origin) return { allowed: true, reason: 'no_origin' };

        const validation = {
            allowed: false,
            reason: '',
            securityScore: 0,
            warnings: []
        };

        try {
            const url = new URL(origin);
            const hostname = url.hostname.toLowerCase();
            const protocol = url.protocol;

            // Basic protocol check
            if (!['http:', 'https:'].includes(protocol)) {
                validation.reason = 'invalid_protocol';
                return validation;
            }

            // Production environment checks
            if (process.env.NODE_ENV === 'production') {
                // Only HTTPS in production
                if (protocol !== 'https:') {
                    validation.reason = 'http_not_allowed_in_production';
                    return validation;
                }

                // Check against production whitelist
                if (!this.productionDomains.has(hostname)) {
                    validation.reason = 'domain_not_whitelisted';
                    return validation;
                }
            }

            // Check for suspicious patterns
            const suspiciousCount = this.suspiciousPatterns.reduce((count, pattern) => {
                return count + (pattern.test(origin) ? 1 : 0);
            }, 0);

            if (suspiciousCount > 0) {
                validation.warnings.push(`suspicious_patterns_detected: ${suspiciousCount}`);
                validation.securityScore -= suspiciousCount * 10;
            }

            // Check for blocked origins
            if (this.blockedOrigins.has(origin)) {
                validation.reason = 'origin_blocked';
                return validation;
            }

            // Rate limiting per origin
            const rateLimitResult = this.checkRateLimit(origin);
            if (!rateLimitResult.allowed) {
                validation.reason = 'rate_limit_exceeded';
                return validation;
            }

            // Port validation
            const port = url.port;
            if (port && process.env.NODE_ENV === 'production') {
                const allowedPorts = ['80', '443'];
                if (!allowedPorts.includes(port)) {
                    validation.warnings.push(`non_standard_port: ${port}`);
                    validation.securityScore -= 5;
                }
            }

            // TLD validation for production
            if (process.env.NODE_ENV === 'production') {
                const tld = hostname.split('.').pop();
                const suspiciousTlds = ['tk', 'ml', 'ga', 'cf', 'gq', 'xyz', 'top'];
                if (suspiciousTlds.includes(tld)) {
                    validation.warnings.push(`suspicious_tld: ${tld}`);
                    validation.securityScore -= 15;
                }
            }

            // Check request headers for additional security
            const userAgent = req?.headers?.['user-agent'];
            if (userAgent) {
                const botPatterns = [
                    /bot|crawler|spider|scraper/i,
                    /curl|wget|postman/i,
                    /automated|headless/i
                ];
                
                if (botPatterns.some(pattern => pattern.test(userAgent))) {
                    validation.warnings.push('automated_request_detected');
                    validation.securityScore -= 5;
                }
            }

            // Final decision
            if (validation.securityScore < -20) {
                validation.reason = 'low_security_score';
                return validation;
            }

            validation.allowed = true;
            validation.reason = 'validation_passed';
            return validation;

        } catch (error) {
            validation.reason = 'invalid_url_format';
            return validation;
        }
    }

    // Rate limiting per origin
    checkRateLimit(origin) {
        const now = Date.now();
        const windowMs = 5 * 60 * 1000; // 5 minutes
        const maxRequests = 100; // Max requests per window

        if (!this.rateLimitMap.has(origin)) {
            this.rateLimitMap.set(origin, {
                count: 1,
                firstRequest: now,
                lastRequest: now
            });
            return { allowed: true };
        }

        const data = this.rateLimitMap.get(origin);
        
        // Reset window if expired
        if (now - data.firstRequest > windowMs) {
            data.count = 1;
            data.firstRequest = now;
            data.lastRequest = now;
            return { allowed: true };
        }

        data.count++;
        data.lastRequest = now;

        if (data.count > maxRequests) {
            // Temporarily block origin if rate limit exceeded
            securityLogger.warn('Origin rate limit exceeded', {
                origin,
                count: data.count,
                maxRequests,
                windowMs
            });
            return { allowed: false, reason: 'rate_limit_exceeded' };
        }

        return { allowed: true };
    }

    // Block suspicious origin
    blockOrigin(origin, reason) {
        this.blockedOrigins.add(origin);
        securityLogger.warn('Origin blocked', { origin, reason });
        
        // Auto-unblock after 1 hour
        setTimeout(() => {
            this.blockedOrigins.delete(origin);
            securityLogger.info('Origin unblocked', { origin });
        }, 60 * 60 * 1000);
    }

    // Create middleware function
    createMiddleware() {
        return (req, res, next) => {
            const origin = req.headers.origin;
            
            if (origin) {
                const validation = this.validateOriginSecurity(origin, req);
                
                // Log security events
                if (!validation.allowed) {
                    securityLogger.warn('CORS request blocked by security middleware', {
                        origin,
                        reason: validation.reason,
                        userAgent: req.headers['user-agent'],
                        ip: req.ip,
                        timestamp: new Date().toISOString()
                    });
                    
                    // Block persistently suspicious origins
                    if (['low_security_score', 'suspicious_patterns'].some(r => validation.reason.includes(r))) {
                        this.blockOrigin(origin, validation.reason);
                    }
                }
                
                if (validation.warnings.length > 0) {
                    securityLogger.info('CORS security warnings', {
                        origin,
                        warnings: validation.warnings,
                        securityScore: validation.securityScore
                    });
                }
                
                // Add security headers
                res.setHeader('X-CORS-Security-Check', validation.allowed ? 'passed' : 'failed');
                if (validation.securityScore !== undefined) {
                    res.setHeader('X-Security-Score', validation.securityScore.toString());
                }
            }
            
            next();
        };
    }

    // Get current security status
    getSecurityStatus() {
        return {
            blockedOrigins: Array.from(this.blockedOrigins),
            activeRateLimits: this.rateLimitMap.size,
            productionDomains: Array.from(this.productionDomains),
            suspiciousPatternsCount: this.suspiciousPatterns.length
        };
    }
}

module.exports = CORSSecurityMiddleware;
