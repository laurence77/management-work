const express = require('express');
const router = express.Router();
const DocumentationService = require('../services/documentation/DocumentationService');
const { authenticateUser, requireRole } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

const docService = new DocumentationService();

// Rate limiting
const docRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 30,
    message: { success: false, error: 'Too many documentation requests' }
});

// Generate API documentation
router.post('/generate/api', 
    docRateLimit,
    authenticateUser, 
    requireRole(['admin']), 
    async (req, res) => {
        try {
            const documentation = await docService.generateAPIDocumentation();
            
            res.json({
                success: true,
                message: 'API documentation generated successfully',
                data: { 
                    generated_at: new Date().toISOString(),
                    content_length: documentation.length
                }
            });
        } catch (error) {
            console.error('API documentation generation error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to generate API documentation'
            });
        }
    }
);

// Generate all documentation
router.post('/generate/all', 
    docRateLimit,
    authenticateUser, 
    requireRole(['admin']), 
    async (req, res) => {
        try {
            const [apiDocs, guides, tutorials, examples] = await Promise.all([
                docService.generateAPIDocumentation(),
                docService.generateGuidesDocumentation(),
                docService.generateTutorials(),
                docService.generateExamples()
            ]);
            
            res.json({
                success: true,
                message: 'All documentation generated successfully',
                data: {
                    api_documentation: true,
                    guides: guides.length,
                    tutorials: tutorials.length,
                    examples: examples.length,
                    generated_at: new Date().toISOString()
                }
            });
        } catch (error) {
            console.error('Documentation generation error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to generate documentation'
            });
        }
    }
);

// Get documentation dashboard data
router.get('/dashboard', 
    docRateLimit,
    authenticateUser, 
    requireRole(['admin', 'manager']), 
    async (req, res) => {
        try {
            const data = await docService.getDashboardData();
            
            res.json({
                success: true,
                data
            });
        } catch (error) {
            console.error('Documentation dashboard error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get documentation dashboard data'
            });
        }
    }
);

module.exports = router;
