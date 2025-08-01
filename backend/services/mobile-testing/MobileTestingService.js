const { supabase } = require('../../config/supabase');
const { logger } = require('../../utils/logger');
const puppeteer = require('puppeteer');
const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');

class MobileTestingService {
    constructor() {
        this.deviceProfiles = {
            'iPhone 14 Pro': {
                userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
                viewport: { width: 393, height: 852, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
                category: 'premium_ios'
            },
            'iPhone 13': {
                userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
                viewport: { width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
                category: 'standard_ios'
            },
            'Samsung Galaxy S23': {
                userAgent: 'Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36',
                viewport: { width: 360, height: 780, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
                category: 'premium_android'
            },
            'Google Pixel 7': {
                userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36',
                viewport: { width: 412, height: 869, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true },
                category: 'standard_android'
            },
            'iPad Pro': {
                userAgent: 'Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
                viewport: { width: 1024, height: 1366, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
                category: 'tablet'
            },
            'Budget Android': {
                userAgent: 'Mozilla/5.0 (Linux; Android 10; SM-A205F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36',
                viewport: { width: 360, height: 640, deviceScaleFactor: 1.5, isMobile: true, hasTouch: true },
                category: 'budget_android'
            }
        };

        this.testSuites = {
            performance: {
                name: 'Performance Testing',
                tests: ['page_load_speed', 'core_web_vitals', 'network_optimization', 'bundle_analysis']
            },
            functionality: {
                name: 'Functionality Testing',
                tests: ['navigation', 'forms', 'search', 'booking_flow', 'payments', 'user_auth']
            },
            usability: {
                name: 'Usability Testing',
                tests: ['touch_targets', 'readability', 'orientation', 'accessibility', 'gesture_support']
            },
            compatibility: {
                name: 'Compatibility Testing',
                tests: ['browser_compatibility', 'os_versions', 'screen_sizes', 'network_conditions']
            },
            security: {
                name: 'Security Testing',
                tests: ['ssl_validation', 'form_security', 'session_management', 'data_protection']
            }
        };

        this.networkConditions = {
            '4G': { downloadThroughput: 4000000, uploadThroughput: 1000000, latency: 150 },
            '3G': { downloadThroughput: 1600000, uploadThroughput: 750000, latency: 300 },
            'Slow 3G': { downloadThroughput: 500000, uploadThroughput: 500000, latency: 2000 },
            'WiFi': { downloadThroughput: 10000000, uploadThroughput: 5000000, latency: 40 },
            'Offline': { downloadThroughput: 0, uploadThroughput: 0, latency: 0 }
        };
    }

    async runComprehensiveTest(options = {}) {
        const {
            devices = Object.keys(this.deviceProfiles),
            testSuites = Object.keys(this.testSuites),
            baseUrl = 'http://localhost:3000',
            pages = ['/', '/celebrities', '/booking', '/login', '/register'],
            includePerformance = true,
            includeFunctionality = true,
            includeAccessibility = true
        } = options;

        logger.info('Starting comprehensive mobile testing...', {
            devices: devices.length,
            testSuites: testSuites.length,
            pages: pages.length
        });

        const testResults = {
            test_id: this.generateTestId(),
            started_at: new Date().toISOString(),
            options,
            results: {
                devices: {},
                summary: {
                    total_tests: 0,
                    passed: 0,
                    failed: 0,
                    warnings: 0
                }
            }
        };

        for (const deviceName of devices) {
            try {
                logger.info(`Testing on device: ${deviceName}`);
                
                const deviceResults = await this.testDevice(
                    deviceName, 
                    this.deviceProfiles[deviceName],
                    { baseUrl, pages, testSuites, includePerformance, includeFunctionality, includeAccessibility }
                );

                testResults.results.devices[deviceName] = deviceResults;
                
                // Update summary
                testResults.results.summary.total_tests += deviceResults.summary.total_tests;
                testResults.results.summary.passed += deviceResults.summary.passed;
                testResults.results.summary.failed += deviceResults.summary.failed;
                testResults.results.summary.warnings += deviceResults.summary.warnings;

            } catch (error) {
                logger.error(`Device testing failed for ${deviceName}:`, error);
                testResults.results.devices[deviceName] = {
                    error: error.message,
                    summary: { total_tests: 0, passed: 0, failed: 1, warnings: 0 }
                };
                testResults.results.summary.total_tests += 1;
                testResults.results.summary.failed += 1;
            }
        }

        testResults.completed_at = new Date().toISOString();
        testResults.duration_ms = new Date(testResults.completed_at).getTime() - new Date(testResults.started_at).getTime();

        // Store results
        await this.storeTestResults(testResults);

        logger.info('Comprehensive mobile testing completed:', testResults.results.summary);
        return testResults;
    }

    async testDevice(deviceName, deviceProfile, options) {
        const browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });

        try {
            const page = await browser.newPage();
            
            // Configure device emulation
            await page.setUserAgent(deviceProfile.userAgent);
            await page.setViewport(deviceProfile.viewport);

            const deviceResults = {
                device: deviceName,
                profile: deviceProfile,
                pages: {},
                summary: { total_tests: 0, passed: 0, failed: 0, warnings: 0 }
            };

            for (const pagePath of options.pages) {
                try {
                    logger.info(`Testing page: ${pagePath} on ${deviceName}`);
                    
                    const pageResults = await this.testPage(
                        page, 
                        `${options.baseUrl}${pagePath}`, 
                        deviceName,
                        options
                    );

                    deviceResults.pages[pagePath] = pageResults;
                    
                    // Update device summary
                    deviceResults.summary.total_tests += pageResults.summary.total_tests;
                    deviceResults.summary.passed += pageResults.summary.passed;
                    deviceResults.summary.failed += pageResults.summary.failed;
                    deviceResults.summary.warnings += pageResults.summary.warnings;

                } catch (error) {
                    logger.error(`Page testing failed for ${pagePath}:`, error);
                    deviceResults.pages[pagePath] = {
                        error: error.message,
                        summary: { total_tests: 0, passed: 0, failed: 1, warnings: 0 }
                    };
                    deviceResults.summary.total_tests += 1;
                    deviceResults.summary.failed += 1;
                }
            }

            return deviceResults;

        } finally {
            await browser.close();
        }
    }

    async testPage(page, url, deviceName, options) {
        const pageResults = {
            url,
            device: deviceName,
            tests: {},
            summary: { total_tests: 0, passed: 0, failed: 0, warnings: 0 }
        };

        // Performance Testing
        if (options.includePerformance) {
            const performanceResults = await this.runPerformanceTests(page, url, deviceName);
            pageResults.tests.performance = performanceResults;
            this.updateSummary(pageResults.summary, performanceResults.summary);
        }

        // Functionality Testing
        if (options.includeFunctionality) {
            const functionalityResults = await this.runFunctionalityTests(page, url);
            pageResults.tests.functionality = functionalityResults;
            this.updateSummary(pageResults.summary, functionalityResults.summary);
        }

        // Accessibility Testing
        if (options.includeAccessibility) {
            const accessibilityResults = await this.runAccessibilityTests(page, url);
            pageResults.tests.accessibility = accessibilityResults;
            this.updateSummary(pageResults.summary, accessibilityResults.summary);
        }

        // Usability Testing
        const usabilityResults = await this.runUsabilityTests(page, url, deviceName);
        pageResults.tests.usability = usabilityResults;
        this.updateSummary(pageResults.summary, usabilityResults.summary);

        return pageResults;
    }

    async runPerformanceTests(page, url, deviceName) {
        const results = {
            tests: {},
            summary: { total_tests: 0, passed: 0, failed: 0, warnings: 0 }
        };

        try {
            // Page Load Speed Test
            const loadStart = Date.now();
            await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
            const loadTime = Date.now() - loadStart;

            results.tests.page_load_speed = {
                load_time_ms: loadTime,
                status: loadTime < 3000 ? 'passed' : loadTime < 5000 ? 'warning' : 'failed',
                threshold: 3000,
                message: `Page loaded in ${loadTime}ms`
            };

            // Core Web Vitals
            const webVitals = await page.evaluate(() => {
                return new Promise((resolve) => {
                    const vitals = {};
                    
                    // Largest Contentful Paint
                    new PerformanceObserver((list) => {
                        const entries = list.getEntries();
                        if (entries.length > 0) {
                            vitals.lcp = entries[entries.length - 1].startTime;
                        }
                    }).observe({ type: 'largest-contentful-paint', buffered: true });

                    // First Input Delay
                    new PerformanceObserver((list) => {
                        const entries = list.getEntries();
                        if (entries.length > 0) {
                            vitals.fid = entries[0].processingStart - entries[0].startTime;
                        }
                    }).observe({ type: 'first-input', buffered: true });

                    // Cumulative Layout Shift
                    let clsValue = 0;
                    new PerformanceObserver((list) => {
                        for (const entry of list.getEntries()) {
                            if (!entry.hadRecentInput) {
                                clsValue += entry.value;
                            }
                        }
                        vitals.cls = clsValue;
                    }).observe({ type: 'layout-shift', buffered: true });

                    setTimeout(() => resolve(vitals), 2000);
                });
            });

            results.tests.core_web_vitals = {
                lcp: webVitals.lcp || 0,
                fid: webVitals.fid || 0,
                cls: webVitals.cls || 0,
                status: this.evaluateWebVitals(webVitals),
                thresholds: { lcp: 2500, fid: 100, cls: 0.1 }
            };

            // Resource Analysis
            const resourceMetrics = await page.evaluate(() => {
                const entries = performance.getEntriesByType('resource');
                return {
                    total_resources: entries.length,
                    images: entries.filter(e => e.initiatorType === 'img').length,
                    scripts: entries.filter(e => e.initiatorType === 'script').length,
                    stylesheets: entries.filter(e => e.initiatorType === 'link').length,
                    total_size: entries.reduce((sum, e) => sum + (e.transferSize || 0), 0)
                };
            });

            results.tests.resource_optimization = {
                ...resourceMetrics,
                status: resourceMetrics.total_size < 2000000 ? 'passed' : 'warning',
                message: `Total resource size: ${Math.round(resourceMetrics.total_size / 1024)}KB`
            };

        } catch (error) {
            results.tests.performance_error = {
                error: error.message,
                status: 'failed'
            };
        }

        // Update summary
        Object.values(results.tests).forEach(test => {
            results.summary.total_tests++;
            if (test.status === 'passed') results.summary.passed++;
            else if (test.status === 'warning') results.summary.warnings++;
            else results.summary.failed++;
        });

        return results;
    }

    async runFunctionalityTests(page, url) {
        const results = {
            tests: {},
            summary: { total_tests: 0, passed: 0, failed: 0, warnings: 0 }
        };

        try {
            // Navigation Test
            results.tests.navigation = await this.testNavigation(page);
            
            // Forms Test (if present)
            if (url.includes('login') || url.includes('register') || url.includes('booking')) {
                results.tests.forms = await this.testForms(page);
            }

            // Search Functionality (if present)
            if (url.includes('celebrities') || url === '/') {
                results.tests.search = await this.testSearch(page);
            }

            // Interactive Elements
            results.tests.interactive_elements = await this.testInteractiveElements(page);

        } catch (error) {
            results.tests.functionality_error = {
                error: error.message,
                status: 'failed'
            };
        }

        // Update summary
        Object.values(results.tests).forEach(test => {
            results.summary.total_tests++;
            if (test.status === 'passed') results.summary.passed++;
            else if (test.status === 'warning') results.summary.warnings++;
            else results.summary.failed++;
        });

        return results;
    }

    async runAccessibilityTests(page, url) {
        const results = {
            tests: {},
            summary: { total_tests: 0, passed: 0, failed: 0, warnings: 0 }
        };

        try {
            // Check for basic accessibility features
            const accessibilityChecks = await page.evaluate(() => {
                const results = {};
                
                // Alt text for images
                const images = document.querySelectorAll('img');
                const imagesWithoutAlt = Array.from(images).filter(img => !img.alt);
                results.alt_text = {
                    total_images: images.length,
                    missing_alt: imagesWithoutAlt.length,
                    status: imagesWithoutAlt.length === 0 ? 'passed' : 'failed'
                };

                // Form labels
                const inputs = document.querySelectorAll('input, textarea, select');
                const inputsWithoutLabels = Array.from(inputs).filter(input => {
                    const id = input.id;
                    const label = document.querySelector(`label[for="${id}"]`);
                    return !label && !input.getAttribute('aria-label');
                });
                results.form_labels = {
                    total_inputs: inputs.length,
                    missing_labels: inputsWithoutLabels.length,
                    status: inputsWithoutLabels.length === 0 ? 'passed' : 'warning'
                };

                // Heading structure
                const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
                results.heading_structure = {
                    total_headings: headings.length,
                    has_h1: document.querySelector('h1') !== null,
                    status: document.querySelector('h1') ? 'passed' : 'warning'
                };

                // Focus indicators
                const focusableElements = document.querySelectorAll('a, button, input, textarea, select');
                results.focus_indicators = {
                    total_focusable: focusableElements.length,
                    status: focusableElements.length > 0 ? 'passed' : 'warning'
                };

                return results;
            });

            results.tests = accessibilityChecks;

        } catch (error) {
            results.tests.accessibility_error = {
                error: error.message,
                status: 'failed'
            };
        }

        // Update summary
        Object.values(results.tests).forEach(test => {
            results.summary.total_tests++;
            if (test.status === 'passed') results.summary.passed++;
            else if (test.status === 'warning') results.summary.warnings++;
            else results.summary.failed++;
        });

        return results;
    }

    async runUsabilityTests(page, url, deviceName) {
        const results = {
            tests: {},
            summary: { total_tests: 0, passed: 0, failed: 0, warnings: 0 }
        };

        try {
            // Touch Target Size Test
            const touchTargets = await page.evaluate(() => {
                const clickableElements = document.querySelectorAll('button, a, input[type="button"], input[type="submit"]');
                const smallTargets = [];
                
                clickableElements.forEach(element => {
                    const rect = element.getBoundingClientRect();
                    const size = Math.min(rect.width, rect.height);
                    if (size < 44) { // 44px is recommended minimum
                        smallTargets.push({
                            tag: element.tagName,
                            size: Math.round(size),
                            text: element.textContent?.substring(0, 50)
                        });
                    }
                });

                return {
                    total_targets: clickableElements.length,
                    small_targets: smallTargets.length,
                    small_target_details: smallTargets,
                    status: smallTargets.length === 0 ? 'passed' : 'warning'
                };
            });

            results.tests.touch_targets = touchTargets;

            // Text Readability Test
            const readability = await page.evaluate(() => {
                const textElements = document.querySelectorAll('p, div, span, a, button, h1, h2, h3, h4, h5, h6');
                const smallText = [];
                
                textElements.forEach(element => {
                    const styles = window.getComputedStyle(element);
                    const fontSize = parseInt(styles.fontSize);
                    
                    if (fontSize < 14 && element.textContent.trim().length > 0) {
                        smallText.push({
                            tag: element.tagName,
                            fontSize: fontSize,
                            text: element.textContent.substring(0, 30)
                        });
                    }
                });

                return {
                    total_text_elements: textElements.length,
                    small_text_count: smallText.length,
                    small_text_details: smallText.slice(0, 10),
                    status: smallText.length < 5 ? 'passed' : 'warning'
                };
            });

            results.tests.text_readability = readability;

            // Viewport and Orientation Test
            const viewportTest = await this.testViewportHandling(page);
            results.tests.viewport_handling = viewportTest;

        } catch (error) {
            results.tests.usability_error = {
                error: error.message,
                status: 'failed'
            };
        }

        // Update summary
        Object.values(results.tests).forEach(test => {
            results.summary.total_tests++;
            if (test.status === 'passed') results.summary.passed++;
            else if (test.status === 'warning') results.summary.warnings++;
            else results.summary.failed++;
        });

        return results;
    }

    async testNavigation(page) {
        try {
            const navigationElements = await page.evaluate(() => {
                const navElements = document.querySelectorAll('nav a, .navigation a, .menu a');
                return Array.from(navElements).map(el => ({
                    text: el.textContent.trim(),
                    href: el.href,
                    hasHref: !!el.href
                }));
            });

            return {
                navigation_links: navigationElements.length,
                working_links: navigationElements.filter(link => link.hasHref).length,
                status: navigationElements.length > 0 ? 'passed' : 'warning',
                details: navigationElements.slice(0, 10)
            };
        } catch (error) {
            return { error: error.message, status: 'failed' };
        }
    }

    async testForms(page) {
        try {
            const formAnalysis = await page.evaluate(() => {
                const forms = document.querySelectorAll('form');
                const formData = [];

                forms.forEach(form => {
                    const inputs = form.querySelectorAll('input, textarea, select');
                    const submitButtons = form.querySelectorAll('input[type="submit"], button[type="submit"]');
                    
                    formData.push({
                        inputs: inputs.length,
                        submitButtons: submitButtons.length,
                        hasValidation: form.querySelector('[required]') !== null
                    });
                });

                return {
                    total_forms: forms.length,
                    forms: formData,
                    status: forms.length > 0 ? 'passed' : 'warning'
                };
            });

            return formAnalysis;
        } catch (error) {
            return { error: error.message, status: 'failed' };
        }
    }

    async testSearch(page) {
        try {
            const searchFunctionality = await page.evaluate(() => {
                const searchInputs = document.querySelectorAll('input[type="search"], input[placeholder*="search" i], input[name*="search" i]');
                return {
                    search_inputs: searchInputs.length,
                    status: searchInputs.length > 0 ? 'passed' : 'warning'
                };
            });

            return searchFunctionality;
        } catch (error) {
            return { error: error.message, status: 'failed' };
        }
    }

    async testInteractiveElements(page) {
        try {
            const interactiveElements = await page.evaluate(() => {
                const buttons = document.querySelectorAll('button');
                const links = document.querySelectorAll('a');
                const inputs = document.querySelectorAll('input, textarea, select');

                return {
                    buttons: buttons.length,
                    links: links.length,
                    inputs: inputs.length,
                    total_interactive: buttons.length + links.length + inputs.length,
                    status: (buttons.length + links.length + inputs.length) > 0 ? 'passed' : 'warning'
                };
            });

            return interactiveElements;
        } catch (error) {
            return { error: error.message, status: 'failed' };
        }
    }

    async testViewportHandling(page) {
        try {
            // Test different orientations (simulate by changing viewport)
            const originalViewport = page.viewport();
            
            // Test landscape orientation
            await page.setViewport({
                ...originalViewport,
                width: originalViewport.height,
                height: originalViewport.width
            });

            const landscapeTest = await page.evaluate(() => {
                return {
                    hasHorizontalScroll: document.body.scrollWidth > window.innerWidth,
                    hasOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth
                };
            });

            // Restore original viewport
            await page.setViewport(originalViewport);

            return {
                landscape_handling: landscapeTest,
                status: !landscapeTest.hasOverflow ? 'passed' : 'warning'
            };
        } catch (error) {
            return { error: error.message, status: 'failed' };
        }
    }

    async runLighthouseAudit(url, deviceName) {
        try {
            const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] });
            const options = {
                logLevel: 'info',
                output: 'json',
                onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
                port: chrome.port,
                emulatedFormFactor: deviceName.toLowerCase().includes('ipad') ? 'desktop' : 'mobile'
            };

            const runnerResult = await lighthouse(url, options);
            await chrome.kill();

            const scores = runnerResult.lhr.categories;
            return {
                performance: Math.round(scores.performance.score * 100),
                accessibility: Math.round(scores.accessibility.score * 100),
                bestPractices: Math.round(scores['best-practices'].score * 100),
                seo: Math.round(scores.seo.score * 100),
                details: runnerResult.lhr.audits
            };
        } catch (error) {
            logger.error('Lighthouse audit failed:', error);
            return { error: error.message };
        }
    }

    evaluateWebVitals(vitals) {
        const lcp = vitals.lcp || 0;
        const fid = vitals.fid || 0;
        const cls = vitals.cls || 0;

        const lcpGood = lcp <= 2500;
        const fidGood = fid <= 100;
        const clsGood = cls <= 0.1;

        if (lcpGood && fidGood && clsGood) return 'passed';
        if ((lcpGood || lcp <= 4000) && (fidGood || fid <= 300) && (clsGood || cls <= 0.25)) return 'warning';
        return 'failed';
    }

    updateSummary(summary, testSummary) {
        summary.total_tests += testSummary.total_tests;
        summary.passed += testSummary.passed;
        summary.failed += testSummary.failed;
        summary.warnings += testSummary.warnings;
    }

    generateTestId() {
        return `mobile_test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    async storeTestResults(results) {
        try {
            await supabase
                .from('mobile_test_results')
                .insert({
                    test_id: results.test_id,
                    results: results,
                    summary: results.results.summary,
                    created_at: new Date().toISOString()
                });

            logger.info('Mobile test results stored:', results.test_id);
        } catch (error) {
            logger.error('Failed to store mobile test results:', error);
        }
    }

    async generateMobileReport(testId) {
        try {
            const { data: testResult, error } = await supabase
                .from('mobile_test_results')
                .select('*')
                .eq('test_id', testId)
                .single();

            if (error) throw error;

            const report = {
                test_id: testId,
                executive_summary: this.generateExecutiveSummary(testResult.results),
                device_analysis: this.generateDeviceAnalysis(testResult.results.devices),
                recommendations: this.generateRecommendations(testResult.results),
                detailed_results: testResult.results,
                generated_at: new Date().toISOString()
            };

            return report;
        } catch (error) {
            logger.error('Failed to generate mobile report:', error);
            throw error;
        }
    }

    generateExecutiveSummary(results) {
        const summary = results.summary;
        const successRate = Math.round((summary.passed / summary.total_tests) * 100);
        
        return {
            overall_score: successRate,
            total_tests: summary.total_tests,
            devices_tested: Object.keys(results.devices).length,
            critical_issues: summary.failed,
            warnings: summary.warnings,
            status: successRate >= 90 ? 'excellent' : 
                   successRate >= 80 ? 'good' : 
                   successRate >= 70 ? 'fair' : 'needs_improvement'
        };
    }

    generateDeviceAnalysis(devices) {
        const analysis = {};
        
        Object.entries(devices).forEach(([deviceName, deviceResults]) => {
            if (deviceResults.error) {
                analysis[deviceName] = { status: 'error', error: deviceResults.error };
                return;
            }

            const summary = deviceResults.summary;
            const successRate = summary.total_tests > 0 ? Math.round((summary.passed / summary.total_tests) * 100) : 0;
            
            analysis[deviceName] = {
                success_rate: successRate,
                status: successRate >= 90 ? 'excellent' : 
                       successRate >= 80 ? 'good' : 
                       successRate >= 70 ? 'fair' : 'needs_improvement',
                critical_issues: summary.failed,
                warnings: summary.warnings,
                category: this.deviceProfiles[deviceName]?.category || 'unknown'
            };
        });

        return analysis;
    }

    generateRecommendations(results) {
        const recommendations = [];
        
        // Analyze common issues across devices
        const deviceResults = Object.values(results.devices);
        const commonIssues = this.findCommonIssues(deviceResults);
        
        commonIssues.forEach(issue => {
            recommendations.push({
                priority: issue.severity,
                category: issue.category,
                issue: issue.description,
                recommendation: issue.solution,
                affected_devices: issue.devices
            });
        });

        return recommendations.sort((a, b) => {
            const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
            return priorityOrder[b.priority] - priorityOrder[a.priority];
        });
    }

    findCommonIssues(deviceResults) {
        const issues = [];
        
        // Check for performance issues
        const slowDevices = deviceResults.filter(device => {
            return device.pages && Object.values(device.pages).some(page => {
                return page.tests?.performance?.tests?.page_load_speed?.load_time_ms > 5000;
            });
        });

        if (slowDevices.length > 0) {
            issues.push({
                severity: 'high',
                category: 'performance',
                description: 'Slow page load times detected',
                solution: 'Optimize images, minify CSS/JS, implement lazy loading',
                devices: slowDevices.map(d => d.device)
            });
        }

        // Check for accessibility issues
        const accessibilityIssues = deviceResults.filter(device => {
            return device.pages && Object.values(device.pages).some(page => {
                return page.tests?.accessibility?.tests?.alt_text?.missing_alt > 0;
            });
        });

        if (accessibilityIssues.length > 0) {
            issues.push({
                severity: 'medium',
                category: 'accessibility',
                description: 'Images missing alt text',
                solution: 'Add descriptive alt text to all images',
                devices: accessibilityIssues.map(d => d.device)
            });
        }

        return issues;
    }
}

module.exports = MobileTestingService;
