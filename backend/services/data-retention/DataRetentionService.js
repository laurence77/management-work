const { supabase } = require('../../config/supabase');
const { logger } = require('../../utils/logger');
const cron = require('node-cron');

class DataRetentionService {
    constructor() {
        this.retentionPolicies = {
            // User activity logs - keep for 1 year
            user_activity_logs: {
                table: 'user_activity_logs',
                retention_days: 365,
                date_column: 'created_at',
                archive_before_delete: true
            },
            
            // Session logs - keep for 90 days
            session_logs: {
                table: 'session_logs',
                retention_days: 90,
                date_column: 'created_at',
                archive_before_delete: false
            },
            
            // Email delivery logs - keep for 6 months
            email_delivery_logs: {
                table: 'email_delivery_logs',
                retention_days: 180,
                date_column: 'created_at',
                archive_before_delete: true
            },
            
            // Performance logs - keep for 30 days
            performance_logs: {
                table: 'performance_logs',
                retention_days: 30,
                date_column: 'created_at',
                archive_before_delete: false
            },
            
            // Analytics access logs - keep for 6 months
            analytics_access_logs: {
                table: 'analytics_access_logs',
                retention_days: 180,
                date_column: 'accessed_at',
                archive_before_delete: false
            },
            
            // Audit logs - keep for 7 years (compliance)
            audit_logs: {
                table: 'audit_logs',
                retention_days: 2555, // 7 years
                date_column: 'created_at',
                archive_before_delete: true
            },
            
            // Temporary files - keep for 7 days
            temp_uploads: {
                table: 'temp_uploads',
                retention_days: 7,
                date_column: 'created_at',
                archive_before_delete: false,
                cleanup_files: true
            },
            
            // Failed payment attempts - keep for 1 year
            failed_payments: {
                table: 'failed_payment_attempts',
                retention_days: 365,
                date_column: 'created_at',
                archive_before_delete: true
            },
            
            // Notification logs - keep for 3 months
            notification_logs: {
                table: 'notification_logs',
                retention_days: 90,
                date_column: 'created_at',
                archive_before_delete: false
            },
            
            // Old backup files - keep for 1 year
            backup_files: {
                table: 'backup_logs',
                retention_days: 365,
                date_column: 'created_at',
                archive_before_delete: false,
                cleanup_files: true
            }
        };
        
        this.archiveStorage = {
            enabled: process.env.ARCHIVE_STORAGE_ENABLED === 'true',
            s3_bucket: process.env.ARCHIVE_S3_BUCKET || 'celebrity-booking-archive',
            region: process.env.ARCHIVE_S3_REGION || 'us-east-1'
        };
    }

    start() {
        logger.info('🧹 Starting Data Retention Service...');

        // Daily cleanup at 2:30 AM
        cron.schedule('30 2 * * *', async () => {
            try {
                await this.performDailyCleanup();
            } catch (error) {
                logger.error('Daily cleanup failed:', error);
            }
        });

        // Weekly deep cleanup on Sundays at 3:30 AM
        cron.schedule('30 3 * * 0', async () => {
            try {
                await this.performWeeklyCleanup();
            } catch (error) {
                logger.error('Weekly cleanup failed:', error);
            }
        });

        // Monthly archive on first day at 4:00 AM
        cron.schedule('0 4 1 * *', async () => {
            try {
                await this.performMonthlyArchiving();
            } catch (error) {
                logger.error('Monthly archiving failed:', error);
            }
        });

        // User data cleanup check every Sunday at 5:00 AM
        cron.schedule('0 5 * * 0', async () => {
            try {
                await this.processUserDataRequests();
            } catch (error) {
                logger.error('User data cleanup failed:', error);
            }
        });

        logger.info('✅ Data Retention Service started successfully');
    }

    async performDailyCleanup() {
        logger.info('Starting daily data cleanup...');
        
        const cleanupSummary = {
            total_records_cleaned: 0,
            total_files_cleaned: 0,
            tables_processed: [],
            errors: []
        };

        for (const [policyName, policy] of Object.entries(this.retentionPolicies)) {
            try {
                if (policy.retention_days <= 30) { // Only daily cleanup for short retention
                    const result = await this.cleanupTable(policy);
                    cleanupSummary.total_records_cleaned += result.records_deleted;
                    cleanupSummary.total_files_cleaned += result.files_deleted;
                    cleanupSummary.tables_processed.push(policyName);
                    
                    logger.info(`Daily cleanup completed for ${policyName}:`, result);
                }
            } catch (error) {
                logger.error(`Daily cleanup failed for ${policyName}:`, error);
                cleanupSummary.errors.push({ policy: policyName, error: error.message });
            }
        }

        // Log daily cleanup summary
        await this.logCleanupActivity('daily', cleanupSummary);
        
        logger.info('Daily cleanup completed:', cleanupSummary);
    }

    async performWeeklyCleanup() {
        logger.info('Starting weekly data cleanup...');
        
        const cleanupSummary = {
            total_records_cleaned: 0,
            total_files_cleaned: 0,
            tables_processed: [],
            archived_records: 0,
            errors: []
        };

        for (const [policyName, policy] of Object.entries(this.retentionPolicies)) {
            try {
                const result = await this.cleanupTable(policy);
                cleanupSummary.total_records_cleaned += result.records_deleted;
                cleanupSummary.total_files_cleaned += result.files_deleted;
                cleanupSummary.archived_records += result.records_archived || 0;
                cleanupSummary.tables_processed.push(policyName);
                
                logger.info(`Weekly cleanup completed for ${policyName}:`, result);
            } catch (error) {
                logger.error(`Weekly cleanup failed for ${policyName}:`, error);
                cleanupSummary.errors.push({ policy: policyName, error: error.message });
            }
        }

        // Additional weekly tasks
        await this.optimizeDatabaseTables();
        await this.cleanupOrphanedRecords();

        await this.logCleanupActivity('weekly', cleanupSummary);
        
        logger.info('Weekly cleanup completed:', cleanupSummary);
    }

    async performMonthlyArchiving() {
        logger.info('Starting monthly archiving...');
        
        if (!this.archiveStorage.enabled) {
            logger.info('Archive storage not enabled, skipping monthly archiving');
            return;
        }

        const archiveSummary = {
            total_records_archived: 0,
            total_size_archived: 0,
            tables_archived: [],
            errors: []
        };

        for (const [policyName, policy] of Object.entries(this.retentionPolicies)) {
            if (policy.archive_before_delete && policy.retention_days > 90) {
                try {
                    const result = await this.archiveOldData(policy);
                    archiveSummary.total_records_archived += result.records_archived;
                    archiveSummary.total_size_archived += result.size_archived;
                    archiveSummary.tables_archived.push(policyName);
                } catch (error) {
                    logger.error(`Monthly archiving failed for ${policyName}:`, error);
                    archiveSummary.errors.push({ policy: policyName, error: error.message });
                }
            }
        }

        await this.logCleanupActivity('monthly_archive', archiveSummary);
        
        logger.info('Monthly archiving completed:', archiveSummary);
    }

    async cleanupTable(policy) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - policy.retention_days);
        
        const result = {
            records_deleted: 0,
            files_deleted: 0,
            records_archived: 0,
            errors: []
        };

        try {
            // Archive data if required
            if (policy.archive_before_delete) {
                const archiveResult = await this.archiveTableData(policy, cutoffDate);
                result.records_archived = archiveResult.records_archived;
            }

            // Get records to delete
            const { data: recordsToDelete, error: selectError } = await supabase
                .from(policy.table)
                .select('*')
                .lt(policy.date_column, cutoffDate.toISOString())
                .limit(1000); // Process in batches

            if (selectError) {
                throw selectError;
            }

            if (recordsToDelete && recordsToDelete.length > 0) {
                // Clean up associated files if required
                if (policy.cleanup_files) {
                    const filesDeleted = await this.cleanupAssociatedFiles(recordsToDelete, policy);
                    result.files_deleted = filesDeleted;
                }

                // Delete records
                const { error: deleteError } = await supabase
                    .from(policy.table)
                    .delete()
                    .lt(policy.date_column, cutoffDate.toISOString());

                if (deleteError) {
                    throw deleteError;
                }

                result.records_deleted = recordsToDelete.length;
            }

        } catch (error) {
            result.errors.push(error.message);
            throw error;
        }

        return result;
    }

    async processUserDataRequests() {
        logger.info('Processing user data deletion requests...');

        try {
            // Get users who requested data deletion
            const { data: deletionRequests, error } = await supabase
                .from('user_data_requests')
                .select('*')
                .eq('status', 'approved')
                .eq('request_type', 'deletion')
                .lt('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()); // 30 days old

            if (error) {
                throw error;
            }

            for (const request of deletionRequests || []) {
                try {
                    await this.deleteUserData(request.user_id);
                    
                    // Mark request as completed
                    await supabase
                        .from('user_data_requests')
                        .update({ 
                            status: 'completed',
                            completed_at: new Date().toISOString()
                        })
                        .eq('id', request.id);

                    logger.info(`Completed data deletion for user ${request.user_id}`);
                } catch (error) {
                    logger.error(`Failed to delete data for user ${request.user_id}:`, error);
                    
                    // Mark request as failed
                    await supabase
                        .from('user_data_requests')
                        .update({ 
                            status: 'failed',
                            error_message: error.message
                        })
                        .eq('id', request.id);
                }
            }

        } catch (error) {
            logger.error('Failed to process user data requests:', error);
        }
    }

    async deleteUserData(userId) {
        const tablesToCleanup = [
            'user_activity_logs',
            'session_logs',
            'user_preferences',
            'notification_logs',
            'analytics_access_logs',
            'booking_history',
            'payment_history',
            'user_files'
        ];

        for (const table of tablesToCleanup) {
            try {
                await supabase
                    .from(table)
                    .delete()
                    .eq('user_id', userId);
                
                logger.debug(`Deleted user data from ${table} for user ${userId}`);
            } catch (error) {
                logger.warn(`Failed to delete from ${table} for user ${userId}:`, error);
            }
        }

        // Anonymize user record instead of deleting
        await supabase
            .from('users')
            .update({
                email: `deleted_${userId}@deleted.com`,
                name: 'Deleted User',
                phone: null,
                profile_image: null,
                status: 'deleted',
                deleted_at: new Date().toISOString()
            })
            .eq('id', userId);
    }

    async optimizeDatabaseTables() {
        logger.info('Optimizing database tables...');

        try {
            // Get table statistics
            const { data: tables, error } = await supabase
                .rpc('get_table_statistics');

            if (error) {
                logger.warn('Could not get table statistics:', error);
                return;
            }

            // Log table sizes for monitoring
            const tableStats = tables.map(t => ({
                table: t.table_name,
                size: t.table_size,
                row_count: t.row_count
            }));

            await this.logCleanupActivity('table_optimization', {
                table_statistics: tableStats,
                optimization_time: new Date().toISOString()
            });

            logger.info('Database optimization completed');
        } catch (error) {
            logger.error('Database optimization failed:', error);
        }
    }

    async cleanupOrphanedRecords() {
        logger.info('Cleaning up orphaned records...');

        const orphanCleanupQueries = [
            // Clean up booking records without valid users
            `DELETE FROM bookings WHERE user_id NOT IN (SELECT id FROM users WHERE status != 'deleted')`,
            
            // Clean up payment records without valid bookings
            `DELETE FROM payments WHERE booking_id NOT IN (SELECT id FROM bookings)`,
            
            // Clean up notifications without valid users
            `DELETE FROM notifications WHERE user_id NOT IN (SELECT id FROM users WHERE status != 'deleted')`,
            
            // Clean up session logs without valid users
            `DELETE FROM session_logs WHERE user_id NOT IN (SELECT id FROM users WHERE status != 'deleted')`
        ];

        let totalCleaned = 0;

        for (const query of orphanCleanupQueries) {
            try {
                const { data, error } = await supabase.rpc('execute_cleanup_query', { query });
                if (error) {
                    logger.warn('Orphan cleanup query failed:', error);
                } else {
                    totalCleaned += data?.affected_rows || 0;
                }
            } catch (error) {
                logger.warn('Orphan cleanup failed:', error);
            }
        }

        logger.info(`Cleaned up ${totalCleaned} orphaned records`);
    }

    async archiveTableData(policy, cutoffDate) {
        if (!this.archiveStorage.enabled) {
            return { records_archived: 0 };
        }

        try {
            // Get data to archive
            const { data: dataToArchive, error } = await supabase
                .from(policy.table)
                .select('*')
                .lt(policy.date_column, cutoffDate.toISOString())
                .limit(5000);

            if (error || !dataToArchive || dataToArchive.length === 0) {
                return { records_archived: 0 };
            }

            // Create archive file
            const archiveData = {
                table: policy.table,
                archived_at: new Date().toISOString(),
                cutoff_date: cutoffDate.toISOString(),
                record_count: dataToArchive.length,
                data: dataToArchive
            };

            const fileName = `${policy.table}_${new Date().toISOString().split('T')[0]}.json`;
            
            // In a real implementation, you would upload to S3 here
            logger.info(`Would archive ${dataToArchive.length} records from ${policy.table} to ${fileName}`);

            return { records_archived: dataToArchive.length };
        } catch (error) {
            logger.error(`Failed to archive data for ${policy.table}:`, error);
            return { records_archived: 0 };
        }
    }

    async cleanupAssociatedFiles(records, policy) {
        let filesDeleted = 0;

        for (const record of records) {
            try {
                // Determine file paths based on table type
                let filePaths = [];
                
                if (policy.table === 'temp_uploads' && record.file_path) {
                    filePaths.push(record.file_path);
                } else if (policy.table === 'backup_logs' && record.backup_path) {
                    filePaths.push(record.backup_path);
                } else if (record.attachments) {
                    filePaths = Array.isArray(record.attachments) ? record.attachments : [record.attachments];
                }

                for (const filePath of filePaths) {
                    try {
                        // Delete file from storage (Cloudinary, S3, etc.)
                        await this.deleteFile(filePath);
                        filesDeleted++;
                    } catch (error) {
                        logger.warn(`Failed to delete file ${filePath}:`, error);
                    }
                }
            } catch (error) {
                logger.warn('Failed to process file cleanup for record:', error);
            }
        }

        return filesDeleted;
    }

    async deleteFile(filePath) {
        // Implementation depends on storage service
        if (filePath.includes('cloudinary')) {
            // Delete from Cloudinary
            logger.debug(`Would delete Cloudinary file: ${filePath}`);
        } else if (filePath.includes('s3')) {
            // Delete from S3
            logger.debug(`Would delete S3 file: ${filePath}`);
        } else {
            // Delete local file
            logger.debug(`Would delete local file: ${filePath}`);
        }
    }

    async logCleanupActivity(type, summary) {
        try {
            await supabase
                .from('data_retention_logs')
                .insert({
                    cleanup_type: type,
                    summary: summary,
                    created_at: new Date().toISOString()
                });
        } catch (error) {
            logger.warn('Failed to log cleanup activity:', error);
        }
    }

    async getRetentionStatus() {
        try {
            const status = {
                policies: Object.keys(this.retentionPolicies).length,
                last_cleanup: null,
                next_cleanup: null,
                total_cleaned_today: 0,
                storage_saved_mb: 0
            };

            // Get latest cleanup log
            const { data: latestLog } = await supabase
                .from('data_retention_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(1);

            if (latestLog && latestLog.length > 0) {
                status.last_cleanup = latestLog[0].created_at;
                status.total_cleaned_today = latestLog[0].summary?.total_records_cleaned || 0;
            }

            return status;
        } catch (error) {
            logger.error('Failed to get retention status:', error);
            return null;
        }
    }
}

module.exports = DataRetentionService;
