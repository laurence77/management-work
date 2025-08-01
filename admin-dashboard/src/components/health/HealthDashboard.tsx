import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Activity, Server, Database, Mail, HardDrive, Cpu, MemoryStick } from 'lucide-react';

interface HealthCheck {
    status: 'healthy' | 'warning' | 'failed';
    responseTime?: number;
    error?: string;
    details?: any;
    timestamp: string;
}

interface HealthData {
    status: 'healthy' | 'degraded' | 'unhealthy';
    timestamp: string;
    version: string;
    environment: string;
    uptime: number;
    responseTime: number;
    checks: {
        database?: HealthCheck;
        email?: HealthCheck;
        redis?: HealthCheck;
        filesystem?: HealthCheck;
        memory?: HealthCheck;
        cpu?: HealthCheck;
        disk?: HealthCheck;
    };
    summary: {
        total: number;
        passed: number;
        failed: number;
        warnings: number;
    };
    system?: any;
}

const StatusIcon: React.FC<{ status: string; size?: number }> = ({ status, size = 20 }) => {
    switch (status) {
        case 'healthy':
            return <CheckCircle className="text-green-500" size={size} />;
        case 'warning':
            return <AlertTriangle className="text-yellow-500" size={size} />;
        case 'failed':
            return <XCircle className="text-red-500" size={size} />;
        default:
            return <Activity className="text-gray-400" size={size} />;
    }
};

const ServiceIcon: React.FC<{ service: string; size?: number }> = ({ service, size = 24 }) => {
    const iconProps = { size, className: "text-gray-600" };
    
    switch (service) {
        case 'database':
            return <Database {...iconProps} />;
        case 'email':
            return <Mail {...iconProps} />;
        case 'redis':
            return <Server {...iconProps} />;
        case 'filesystem':
            return <HardDrive {...iconProps} />;
        case 'memory':
            return <MemoryStick {...iconProps} />;
        case 'cpu':
            return <Cpu {...iconProps} />;
        case 'disk':
            return <HardDrive {...iconProps} />;
        default:
            return <Activity {...iconProps} />;
    }
};

export const HealthDashboard: React.FC = () => {
    const [healthData, setHealthData] = useState<HealthData | null>(null);
    const [loading, setLoading] = useState(true);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const fetchHealthData = async () => {
        try {
            const response = await fetch('/api/health/detailed');
            const data = await response.json();
            setHealthData(data);
            setLastUpdated(new Date());
        } catch (error) {
            console.error('Failed to fetch health data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHealthData();
    }, []);

    useEffect(() => {
        if (!autoRefresh) return;
        
        const interval = setInterval(fetchHealthData, 30000); // Refresh every 30 seconds
        return () => clearInterval(interval);
    }, [autoRefresh]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'healthy': return 'text-green-600 bg-green-50 border-green-200';
            case 'degraded': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
            case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
            case 'unhealthy': return 'text-red-600 bg-red-50 border-red-200';
            case 'failed': return 'text-red-600 bg-red-50 border-red-200';
            default: return 'text-gray-600 bg-gray-50 border-gray-200';
        }
    };

    const formatUptime = (seconds: number) => {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        
        if (days > 0) return `${days}d ${hours}h ${minutes}m`;
        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes}m`;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!healthData) {
        return (
            <div className="text-center p-8">
                <XCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to load health data</h3>
                <button 
                    onClick={fetchHealthData}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">System Health</h2>
                    <p className="text-gray-600">
                        Last updated: {lastUpdated?.toLocaleTimeString()}
                    </p>
                </div>
                <div className="flex items-center space-x-4">
                    <label className="flex items-center">
                        <input
                            type="checkbox"
                            checked={autoRefresh}
                            onChange={(e) => setAutoRefresh(e.target.checked)}
                            className="mr-2"
                        />
                        Auto-refresh
                    </label>
                    <button
                        onClick={fetchHealthData}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                        Refresh
                    </button>
                </div>
            </div>

            {/* Overall Status */}
            <div className={`p-6 rounded-lg border-2 ${getStatusColor(healthData.status)}`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <StatusIcon status={healthData.status} size={32} />
                        <div>
                            <h3 className="text-xl font-semibold capitalize">{healthData.status}</h3>
                            <p className="text-sm opacity-75">
                                {healthData.summary.passed}/{healthData.summary.total} services healthy
                            </p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-sm">Response Time: {healthData.responseTime}ms</p>
                        <p className="text-sm">Uptime: {formatUptime(healthData.uptime)}</p>
                    </div>
                </div>
            </div>

            {/* System Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-lg shadow border">
                    <h4 className="font-medium text-gray-900 mb-2">Environment</h4>
                    <p className="text-2xl font-bold text-blue-600">{healthData.environment}</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow border">
                    <h4 className="font-medium text-gray-900 mb-2">Version</h4>
                    <p className="text-2xl font-bold text-green-600">{healthData.version}</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow border">
                    <h4 className="font-medium text-gray-900 mb-2">Services</h4>
                    <p className="text-2xl font-bold text-purple-600">{healthData.summary.total}</p>
                </div>
            </div>

            {/* Service Checks */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(healthData.checks).map(([service, check]) => (
                    <div key={service} className={`p-4 rounded-lg border ${getStatusColor(check.status)}`}>
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-2">
                                <ServiceIcon service={service} />
                                <h4 className="font-medium capitalize">{service}</h4>
                            </div>
                            <StatusIcon status={check.status} />
                        </div>
                        
                        {check.responseTime && (
                            <p className="text-sm mb-1">Response: {check.responseTime}ms</p>
                        )}
                        
                        {check.error && (
                            <p className="text-sm text-red-600 mb-1">Error: {check.error}</p>
                        )}
                        
                        {check.details && (
                            <div className="text-xs space-y-1 mt-2 opacity-75">
                                {Object.entries(check.details).map(([key, value]) => (
                                    <div key={key} className="flex justify-between">
                                        <span>{key}:</span>
                                        <span>{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                        
                        <p className="text-xs opacity-60 mt-2">
                            {new Date(check.timestamp).toLocaleTimeString()}
                        </p>
                    </div>
                ))}
            </div>

            {/* System Details */}
            {healthData.system && (
                <div className="bg-white p-6 rounded-lg shadow border">
                    <h3 className="text-lg font-semibold mb-4">System Information</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        {Object.entries(healthData.system).map(([key, value]) => (
                            <div key={key}>
                                <span className="font-medium text-gray-600">{key.replace(/_/g, ' ')}:</span>
                                <p className="text-gray-900">{String(value)}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
