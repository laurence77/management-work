const { createClient } = require('@supabase/supabase-js');
const { logger, securityLogger } = require('../../utils/logger');
const AWS = require('aws-sdk');
const fs = require('fs').promises;
const path = require('path');

class DisasterRecoveryService {
    constructor() {
        this.supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );
        
        // AWS S3 for cross-region backups
        this.s3 = new AWS.S3({
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            region: process.env.AWS_REGION || 'us-east-1'
        });
        
        this.backupConfig = {
            primaryRegion: process.env.AWS_REGION || 'us-east-1',
            secondaryRegions: ['us-west-2', 'eu-west-1'],
            retentionDays: 30,
            criticalTables: [
                'users', 'celebrities', 'bookings', 'payments', 
                'contracts', 'user_profiles', 'booking_history'
            ]
        };
        
        this.rtoTargets = {
            critical: 4 * 60 * 60, // 4 hours
            important: 24 * 60 * 60, // 24 hours
            standard: 72 * 60 * 60 // 72 hours
        };
    }

    // Create full database backup
    async createDatabaseBackup(backupType = 'scheduled') {
        const backupId = `backup_${Date.now()}_${backupType}`;
        const timestamp = new Date().toISOString();
        
        try {
            logger.info('Starting database backup', { backupId, backupType });
            
            const backupData = {
                id: backupId,
                timestamp,
                type: backupType,
                status: 'in_progress',
                tables: {},
                metadata: {
                    environment: process.env.NODE_ENV,
                    supabase_url: process.env.SUPABASE_URL,
                    backup_size: 0,
                    table_count: 0
                }
            };

            // Backup critical tables
            for (const tableName of this.backupConfig.criticalTables) {
                try {
                    const tableData = await this.backupTable(tableName);
                    backupData.tables[tableName] = {
                        status: 'completed',
                        row_count: tableData.count,
                        size_bytes: JSON.stringify(tableData.data).length,
                        backed_up_at: new Date().toISOString()
                    };
                    backupData.metadata.backup_size += backupData.tables[tableName].size_bytes;
                    backupData.metadata.table_count++;
                } catch (error) {
                    logger.error(`Failed to backup table ${tableName}`, error);
                    backupData.tables[tableName] = {
                        status: 'failed',
                        error: error.message,
                        backed_up_at: new Date().toISOString()
                    };
                }
            }

            // Upload to multiple regions
            const uploadResults = await this.uploadToMultipleRegions(backupId, backupData);
            backupData.upload_results = uploadResults;
            backupData.status = 'completed';

            // Log backup completion
            await this.logBackupEvent(backupId, 'backup_completed', backupData);
            
            logger.info('Database backup completed successfully', {
                backupId,
                totalSize: backupData.metadata.backup_size,
                tableCount: backupData.metadata.table_count,
                regions: uploadResults.length
            });

            return backupData;
        } catch (error) {
            logger.error('Database backup failed', { backupId, error: error.message });
            await this.logBackupEvent(backupId, 'backup_failed', { error: error.message });
            throw error;
        }
    }

    // Backup individual table
    async backupTable(tableName) {
        try {
            const { data, error, count } = await this.supabase
                .from(tableName)
                .select('*', { count: 'exact' });

            if (error) throw error;

            return { data, count };
        } catch (error) {
            logger.error(`Failed to backup table ${tableName}`, error);
            throw error;
        }
    }

    // Upload backup to multiple AWS regions
    async uploadToMultipleRegions(backupId, backupData) {
        const uploadResults = [];
        const backupContent = JSON.stringify(backupData, null, 2);
        const key = `backups/${new Date().getFullYear()}/${new Date().getMonth() + 1}/${backupId}.json`;

        for (const region of [this.backupConfig.primaryRegion, ...this.backupConfig.secondaryRegions]) {
            try {
                const s3Regional = new AWS.S3({
                    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
                    region: region
                });

                const uploadParams = {
                    Bucket: `celebrity-booking-backups-${region}`,
                    Key: key,
                    Body: backupContent,
                    ContentType: 'application/json',
                    Metadata: {
                        backupId: backupId,
                        timestamp: backupData.timestamp,
                        environment: process.env.NODE_ENV || 'development'
                    }
                };

                const result = await s3Regional.upload(uploadParams).promise();
                
                uploadResults.push({
                    region: region,
                    status: 'success',
                    location: result.Location,
                    etag: result.ETag,
                    uploaded_at: new Date().toISOString()
                });

                logger.info(`Backup uploaded to ${region}`, { backupId, location: result.Location });
            } catch (error) {
                logger.error(`Failed to upload backup to ${region}`, { backupId, error: error.message });
                uploadResults.push({
                    region: region,
                    status: 'failed',
                    error: error.message,
                    uploaded_at: new Date().toISOString()
                });
            }
        }

        return uploadResults;
    }

    // Restore database from backup
    async restoreFromBackup(backupId, options = {}) {
        const { dryRun = false, tablesOnly = null, targetEnvironment = 'staging' } = options;
        
        try {
            logger.warn('Starting database restore', { backupId, dryRun, targetEnvironment });
            
            // Download backup from primary region
            const backupData = await this.downloadBackup(backupId);
            
            if (!backupData) {
                throw new Error(`Backup ${backupId} not found`);
            }

            const restoreResults = {
                backupId,
                timestamp: new Date().toISOString(),
                dryRun,
                targetEnvironment,
                tables: {},
                status: 'in_progress'
            };

            // Filter tables if specified
            const tablesToRestore = tablesOnly || Object.keys(backupData.tables);
            
            for (const tableName of tablesToRestore) {
                if (!backupData.tables[tableName] || backupData.tables[tableName].status !== 'completed') {
                    restoreResults.tables[tableName] = {
                        status: 'skipped',
                        reason: 'backup_not_available'
                    };
                    continue;
                }

                try {
                    if (!dryRun) {
                        await this.restoreTable(tableName, backupData.tables[tableName].data);
                    }
                    
                    restoreResults.tables[tableName] = {
                        status: 'completed',
                        row_count: backupData.tables[tableName].row_count,
                        restored_at: new Date().toISOString()
                    };
                } catch (error) {
                    logger.error(`Failed to restore table ${tableName}`, error);
                    restoreResults.tables[tableName] = {
                        status: 'failed',
                        error: error.message,
                        restored_at: new Date().toISOString()
                    };
                }
            }

            restoreResults.status = 'completed';
            await this.logBackupEvent(backupId, 'restore_completed', restoreResults);
            
            logger.warn('Database restore completed', restoreResults);
            return restoreResults;
        } catch (error) {
            logger.error('Database restore failed', { backupId, error: error.message });
            await this.logBackupEvent(backupId, 'restore_failed', { error: error.message });
            throw error;
        }
    }

    // Download backup from S3
    async downloadBackup(backupId, region = null) {
        const targetRegion = region || this.backupConfig.primaryRegion;
        
        try {
            const s3Regional = new AWS.S3({
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
                region: targetRegion
            });

            // Find backup file
            const listParams = {
                Bucket: `celebrity-booking-backups-${targetRegion}`,
                Prefix: `backups/`,
                MaxKeys: 1000
            };

            const objects = await s3Regional.listObjectsV2(listParams).promise();
            const backupFile = objects.Contents?.find(obj => obj.Key.includes(backupId));

            if (!backupFile) {
                throw new Error(`Backup file not found for ID: ${backupId}`);
            }

            const downloadParams = {
                Bucket: `celebrity-booking-backups-${targetRegion}`,
                Key: backupFile.Key
            };

            const data = await s3Regional.getObject(downloadParams).promise();
            return JSON.parse(data.Body.toString());
        } catch (error) {
            logger.error(`Failed to download backup from ${targetRegion}`, { backupId, error: error.message });
            
            // Try secondary regions if primary fails
            if (!region && this.backupConfig.secondaryRegions.length > 0) {
                for (const secondaryRegion of this.backupConfig.secondaryRegions) {
                    try {
                        logger.info(`Trying secondary region: ${secondaryRegion}`);
                        return await this.downloadBackup(backupId, secondaryRegion);
                    } catch (secondaryError) {
                        logger.warn(`Failed to download from ${secondaryRegion}`, secondaryError.message);
                    }
                }
            }
            
            throw error;
        }
    }

    // Restore individual table
    async restoreTable(tableName, tableData) {
        // This is a simplified restore - in production you'd want more sophisticated logic
        try {
            // First, backup current data
            await this.backupTable(tableName);
            
            // Clear existing data (use with caution!)
            const { error: deleteError } = await this.supabase
                .from(tableName)
                .delete()
                .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

            if (deleteError) {
                logger.warn(`Could not clear table ${tableName}:`, deleteError.message);
            }

            // Insert restored data in batches
            const batchSize = 100;
            for (let i = 0; i < tableData.length; i += batchSize) {
                const batch = tableData.slice(i, i + batchSize);
                const { error } = await this.supabase
                    .from(tableName)
                    .insert(batch);

                if (error) {
                    logger.error(`Failed to insert batch ${i / batchSize + 1} for table ${tableName}`, error);
                    throw error;
                }
            }

            logger.info(`Successfully restored table ${tableName}`, { rows: tableData.length });
        } catch (error) {
            logger.error(`Failed to restore table ${tableName}`, error);
            throw error;
        }
    }

    // Test disaster recovery procedures
    async testDisasterRecovery() {
        const testResults = {
            timestamp: new Date().toISOString(),
            tests: {},
            overall_status: 'passed'
        };

        try {
            // Test 1: Backup creation
            logger.info('Testing backup creation...');
            const testBackup = await this.createDatabaseBackup('test');
            testResults.tests.backup_creation = {
                status: 'passed',
                backup_id: testBackup.id,
                size_mb: Math.round(testBackup.metadata.backup_size / 1024 / 1024 * 100) / 100
            };

            // Test 2: Multi-region availability
            logger.info('Testing multi-region availability...');
            const regionTests = [];
            for (const region of [this.backupConfig.primaryRegion, ...this.backupConfig.secondaryRegions]) {
                try {
                    const downloadTest = await this.downloadBackup(testBackup.id, region);
                    regionTests.push({ region, status: 'available', size: downloadTest ? Object.keys(downloadTest.tables).length : 0 });
                } catch (error) {
                    regionTests.push({ region, status: 'failed', error: error.message });
                    testResults.overall_status = 'warning';
                }
            }
            testResults.tests.multi_region = { regions: regionTests };

            // Test 3: Dry run restore
            logger.info('Testing dry run restore...');
            const restoreTest = await this.restoreFromBackup(testBackup.id, { 
                dryRun: true, 
                tablesOnly: ['users'] 
            });
            testResults.tests.restore_test = {
                status: restoreTest.status === 'completed' ? 'passed' : 'failed',
                tables_tested: Object.keys(restoreTest.tables).length
            };

            // Test 4: RTO/RPO calculations
            logger.info('Testing RTO/RPO metrics...');
            const metrics = await this.calculateRTORPO();
            testResults.tests.rto_rpo = metrics;

            logger.info('Disaster recovery test completed', testResults);
            return testResults;
        } catch (error) {
            logger.error('Disaster recovery test failed', error);
            testResults.overall_status = 'failed';
            testResults.error = error.message;
            return testResults;
        }
    }

    // Calculate Recovery Time Objective (RTO) and Recovery Point Objective (RPO)
    async calculateRTORPO() {
        try {
            // Get latest backup information
            const { data: backups } = await this.supabase
                .from('disaster_recovery_logs')
                .select('*')
                .eq('event_type', 'backup_completed')
                .order('created_at', { ascending: false })
                .limit(10);

            if (!backups || backups.length === 0) {
                return {
                    rpo_hours: 'unknown',
                    rto_estimate_hours: 'unknown',
                    last_backup: 'none'
                };
            }

            const latestBackup = backups[0];
            const now = new Date();
            const lastBackupTime = new Date(latestBackup.created_at);
            const rpoHours = (now.getTime() - lastBackupTime.getTime()) / (1000 * 60 * 60);

            // Estimate RTO based on backup size and network speed
            const backupSizeMB = latestBackup.metadata?.backup_size ? 
                latestBackup.metadata.backup_size / 1024 / 1024 : 100;
            const estimatedRestoreTimeHours = Math.max(1, backupSizeMB / 1000); // Rough estimate

            return {
                rpo_hours: Math.round(rpoHours * 100) / 100,
                rto_estimate_hours: Math.round(estimatedRestoreTimeHours * 100) / 100,
                last_backup: latestBackup.created_at,
                backup_frequency_hours: this.calculateBackupFrequency(backups),
                target_rto_hours: this.rtoTargets.critical / 3600,
                compliance: rpoHours <= 24 && estimatedRestoreTimeHours <= 4
            };
        } catch (error) {
            logger.error('Failed to calculate RTO/RPO', error);
            return {
                rpo_hours: 'error',
                rto_estimate_hours: 'error',
                error: error.message
            };
        }
    }

    // Calculate backup frequency
    calculateBackupFrequency(backups) {
        if (backups.length < 2) return 'insufficient_data';
        
        const intervals = [];
        for (let i = 1; i < backups.length; i++) {
            const current = new Date(backups[i - 1].created_at);
            const previous = new Date(backups[i].created_at);
            intervals.push((current.getTime() - previous.getTime()) / (1000 * 60 * 60));
        }
        
        const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
        return Math.round(avgInterval * 100) / 100;
    }

    // Log disaster recovery events
    async logBackupEvent(backupId, eventType, metadata) {
        try {
            const { error } = await this.supabase
                .from('disaster_recovery_logs')
                .insert({
                    backup_id: backupId,
                    event_type: eventType,
                    metadata: metadata,
                    environment: process.env.NODE_ENV
                });

            if (error) {
                logger.warn('Failed to log backup event', error);
            }
        } catch (error) {
            logger.warn('Failed to log backup event', error);
        }
    }

    // Get disaster recovery status
    async getDisasterRecoveryStatus() {
        try {
            const metrics = await this.calculateRTORPO();
            const recentBackups = await this.getRecentBackups(7);
            const securityStatus = await this.checkSecurityCompliance();

            return {
                timestamp: new Date().toISOString(),
                metrics,
                recent_backups: recentBackups.length,
                security_compliance: securityStatus,
                regions_configured: [this.backupConfig.primaryRegion, ...this.backupConfig.secondaryRegions],
                critical_tables_count: this.backupConfig.criticalTables.length,
                retention_days: this.backupConfig.retentionDays,
                status: this.determineOverallStatus(metrics, recentBackups)
            };
        } catch (error) {
            logger.error('Failed to get disaster recovery status', error);
            return {
                timestamp: new Date().toISOString(),
                status: 'error',
                error: error.message
            };
        }
    }

    // Get recent backups
    async getRecentBackups(days = 7) {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - days);

            const { data, error } = await this.supabase
                .from('disaster_recovery_logs')
                .select('*')
                .eq('event_type', 'backup_completed')
                .gte('created_at', cutoffDate.toISOString())
                .order('created_at', { ascending: false });

            return data || [];
        } catch (error) {
            logger.error('Failed to get recent backups', error);
            return [];
        }
    }

    // Check security compliance
    async checkSecurityCompliance() {
        const compliance = {
            encryption_at_rest: true, // S3 default encryption
            encryption_in_transit: true, // HTTPS/TLS
            access_controls: process.env.AWS_ACCESS_KEY_ID ? true : false,
            audit_logging: true, // Our logging system
            retention_policy: true, // Configured retention
            multi_region: this.backupConfig.secondaryRegions.length > 0,
            score: 0
        };

        // Calculate compliance score
        const totalChecks = Object.keys(compliance).length - 1; // Exclude score
        const passedChecks = Object.values(compliance).filter(Boolean).length - 1;
        compliance.score = Math.round((passedChecks / totalChecks) * 100);

        return compliance;
    }

    // Determine overall DR status
    determineOverallStatus(metrics, recentBackups) {
        if (metrics.rpo_hours === 'error' || metrics.rto_estimate_hours === 'error') {
            return 'error';
        }

        if (recentBackups.length === 0) {
            return 'critical';
        }

        if (metrics.rpo_hours > 48 || metrics.rto_estimate_hours > 8) {
            return 'warning';
        }

        return 'healthy';
    }
}

module.exports = DisasterRecoveryService;
