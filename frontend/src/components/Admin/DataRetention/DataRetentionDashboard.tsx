import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Clock, Database, HardDrive, Settings, Trash2, Archive, AlertTriangle } from 'lucide-react';

interface RetentionStatus {
    policies: number;
    last_cleanup: string | null;
    next_cleanup: string | null;
    total_cleaned_today: number;
    storage_saved_mb: number;
}

const DataRetentionDashboard: React.FC = () => {
    const [status, setStatus] = useState<RetentionStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [cleanupLoading, setCleanupLoading] = useState<string | null>(null);

    const fetchStatus = async () => {
        try {
            const response = await fetch('/api/data-retention/status', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const result = await response.json();
                setStatus(result.data);
            }
        } catch (error) {
            console.error('Failed to fetch retention status:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStatus();
    }, []);

    const triggerCleanup = async (type: string) => {
        try {
            setCleanupLoading(type);
            
            const response = await fetch(`/api/data-retention/cleanup/${type}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const result = await response.json();
                alert(`${type} cleanup completed successfully!`);
                await fetchStatus(); // Refresh status
            } else {
                alert(`${type} cleanup failed`);
            }
        } catch (error) {
            console.error(`${type} cleanup error:`, error);
            alert(`${type} cleanup failed`);
        } finally {
            setCleanupLoading(null);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    const retentionPolicies = [
        { name: 'User Activity Logs', retention: '365 days', table: 'user_activity_logs', status: 'active' },
        { name: 'Session Logs', retention: '90 days', table: 'session_logs', status: 'active' },
        { name: 'Email Delivery Logs', retention: '180 days', table: 'email_delivery_logs', status: 'active' },
        { name: 'Performance Logs', retention: '30 days', table: 'performance_logs', status: 'active' },
        { name: 'Analytics Access Logs', retention: '180 days', table: 'analytics_access_logs', status: 'active' },
        { name: 'Audit Logs', retention: '7 years', table: 'audit_logs', status: 'active' },
        { name: 'Temporary Files', retention: '7 days', table: 'temp_uploads', status: 'active' },
        { name: 'Failed Payments', retention: '365 days', table: 'failed_payments', status: 'active' },
        { name: 'Notification Logs', retention: '90 days', table: 'notification_logs', status: 'active' },
        { name: 'Backup Files', retention: '365 days', table: 'backup_files', status: 'active' }
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">Data Retention Management</h1>
                    <p className="text-gray-500 mt-1">
                        Automated data cleanup and retention policies
                    </p>
                </div>
                <Button onClick={fetchStatus} variant="outline">
                    <Clock className="h-4 w-4 mr-2" />
                    Refresh Status
                </Button>
            </div>

            {/* Status Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Policies</CardTitle>
                        <Settings className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{status?.policies || 0}</div>
                        <p className="text-xs text-gray-500">Retention policies active</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Records Cleaned Today</CardTitle>
                        <Trash2 className="h-4 w-4 text-red-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{status?.total_cleaned_today || 0}</div>
                        <p className="text-xs text-gray-500">Records removed</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Storage Saved</CardTitle>
                        <HardDrive className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{status?.storage_saved_mb || 0}MB</div>
                        <p className="text-xs text-gray-500">Space reclaimed</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Last Cleanup</CardTitle>
                        <Calendar className="h-4 w-4 text-purple-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-sm font-bold">
                            {status?.last_cleanup 
                                ? new Date(status.last_cleanup).toLocaleDateString()
                                : 'Never'
                            }
                        </div>
                        <p className="text-xs text-gray-500">
                            {status?.last_cleanup 
                                ? new Date(status.last_cleanup).toLocaleTimeString()
                                : 'No cleanup performed'
                            }
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content */}
            <Tabs defaultValue="policies" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="policies">Retention Policies</TabsTrigger>
                    <TabsTrigger value="cleanup">Manual Cleanup</TabsTrigger>
                    <TabsTrigger value="requests">User Data Requests</TabsTrigger>
                </TabsList>

                <TabsContent value="policies" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Active Retention Policies</CardTitle>
                            <CardDescription>
                                Current data retention and cleanup policies
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {retentionPolicies.map((policy, index) => (
                                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                                        <div className="flex items-center space-x-3">
                                            <Database className="h-5 w-5 text-blue-600" />
                                            <div>
                                                <div className="font-medium">{policy.name}</div>
                                                <div className="text-sm text-gray-500">{policy.table}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-3">
                                            <Badge variant="secondary">{policy.retention}</Badge>
                                            <Badge 
                                                variant={policy.status === 'active' ? 'default' : 'secondary'}
                                                className={policy.status === 'active' ? 'bg-green-100 text-green-800' : ''}
                                            >
                                                {policy.status}
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="cleanup" className="space-y-4">
                    <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                            Manual cleanup operations will permanently delete data according to retention policies. 
                            This action cannot be undone.
                        </AlertDescription>
                    </Alert>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Daily Cleanup</CardTitle>
                                <CardDescription>
                                    Clean up short-term data (≤30 days retention)
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Button 
                                    onClick={() => triggerCleanup('daily')}
                                    disabled={cleanupLoading === 'daily'}
                                    className="w-full"
                                >
                                    {cleanupLoading === 'daily' ? 'Running...' : 'Run Daily Cleanup'}
                                </Button>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Weekly Cleanup</CardTitle>
                                <CardDescription>
                                    Comprehensive cleanup with optimization
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Button 
                                    onClick={() => triggerCleanup('weekly')}
                                    disabled={cleanupLoading === 'weekly'}
                                    className="w-full"
                                >
                                    {cleanupLoading === 'weekly' ? 'Running...' : 'Run Weekly Cleanup'}
                                </Button>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Monthly Archive</CardTitle>
                                <CardDescription>
                                    Archive old data to external storage
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Button 
                                    onClick={() => triggerCleanup('monthly')}
                                    disabled={cleanupLoading === 'monthly'}
                                    className="w-full"
                                    variant="outline"
                                >
                                    <Archive className="h-4 w-4 mr-2" />
                                    {cleanupLoading === 'monthly' ? 'Running...' : 'Run Monthly Archive'}
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="requests" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>User Data Requests</CardTitle>
                            <CardDescription>
                                GDPR compliance - user data deletion and export requests
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="text-center py-8 text-gray-500">
                                <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                <p>No pending user data requests</p>
                                <p className="text-sm mt-2">
                                    User data deletion requests will appear here for admin review
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default DataRetentionDashboard;
