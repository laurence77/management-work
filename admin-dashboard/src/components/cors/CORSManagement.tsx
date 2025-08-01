import React, { useState, useEffect } from 'react';
import { Shield, Globe, AlertTriangle, CheckCircle, XCircle, Settings } from 'lucide-react';
import { Line, Doughnut, Bar } from 'react-chartjs-2';

interface CORSConfig {
    environment: string;
    allowedOrigins: string[];
    trustedDomains: string[];
    corsSettings: {
        credentials: boolean;
        methods: string[];
        maxAge: number;
    };
}

interface CORSAnalytics {
    total_requests: number;
    allowed_requests: number;
    blocked_requests: number;
    unique_origins: number;
    success_rate: string;
    top_origins: Record<string, number>;
    block_reasons: Record<string, number>;
    hourly_distribution: Record<string, number>;
}

interface Domain {
    id: string;
    domain: string;
    is_active: boolean;
    environment: string;
    metadata: any;
    created_at: string;
}

export const CORSManagement: React.FC = () => {
    const [config, setConfig] = useState<CORSConfig | null>(null);
    const [analytics, setAnalytics] = useState<CORSAnalytics | null>(null);
    const [domains, setDomains] = useState<Domain[]>([]);
    const [loading, setLoading] = useState(true);
    const [testOrigin, setTestOrigin] = useState('');
    const [testResult, setTestResult] = useState<any>(null);
    const [selectedPeriod, setSelectedPeriod] = useState('24');

    useEffect(() => {
        fetchCORSData();
    }, [selectedPeriod]);

    const fetchCORSData = async () => {
        try {
            setLoading(true);
            
            // Fetch configuration
            const configResponse = await fetch('/api/cors-management/config');
            const configData = await configResponse.json();
            if (configData.success) setConfig(configData.data.configuration);
            
            // Fetch analytics
            const analyticsResponse = await fetch(`/api/cors-management/analytics?hours=${selectedPeriod}`);
            const analyticsData = await analyticsResponse.json();
            if (analyticsData.success) setAnalytics(analyticsData.data);
            
            // Fetch domains
            const domainsResponse = await fetch('/api/cors-management/domains');
            const domainsData = await domainsResponse.json();
            if (domainsData.success) setDomains(domainsData.data);
            
        } catch (error) {
            console.error('Failed to fetch CORS data:', error);
        } finally {
            setLoading(false);
        }
    };

    const testCORS = async () => {
        try {
            const response = await fetch('/api/cors-management/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ origin: testOrigin })
            });
            
            const data = await response.json();
            if (data.success) {
                setTestResult(data.data);
            }
        } catch (error) {
            console.error('Failed to test CORS:', error);
        }
    };

    const getStatusColor = (success_rate: string) => {
        const rate = parseFloat(success_rate);
        if (rate >= 95) return 'text-green-600';
        if (rate >= 80) return 'text-yellow-600';
        return 'text-red-600';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    const requestsDistributionData = analytics ? {
        labels: ['Allowed', 'Blocked'],
        datasets: [{
            data: [analytics.allowed_requests, analytics.blocked_requests],
            backgroundColor: ['rgba(34, 197, 94, 0.8)', 'rgba(239, 68, 68, 0.8)']
        }]
    } : null;

    const hourlyData = analytics ? {
        labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
        datasets: [{
            label: 'Requests',
            data: Array.from({ length: 24 }, (_, i) => analytics.hourly_distribution[i] || 0),
            borderColor: 'rgb(59, 130, 246)',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            tension: 0.1
        }]
    } : null;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                        <Shield className="mr-3" size={28} />
                        CORS Management
                    </h2>
                    <p className="text-gray-600">Configure and monitor Cross-Origin Resource Sharing policies</p>
                </div>
                <div className="flex items-center space-x-4">
                    <select
                        value={selectedPeriod}
                        onChange={(e) => setSelectedPeriod(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="1">Last hour</option>
                        <option value="24">Last 24 hours</option>
                        <option value="168">Last week</option>
                    </select>
                    <button
                        onClick={fetchCORSData}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                        Refresh
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            {analytics && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-white p-6 rounded-lg shadow border">
                        <div className="flex items-center">
                            <Globe className="h-8 w-8 text-blue-600" />
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-500">Total Requests</p>
                                <p className="text-2xl font-bold text-gray-900">{analytics.total_requests.toLocaleString()}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow border">
                        <div className="flex items-center">
                            <CheckCircle className="h-8 w-8 text-green-600" />
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-500">Success Rate</p>
                                <p className={`text-2xl font-bold ${getStatusColor(analytics.success_rate)}`}>
                                    {analytics.success_rate}%
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow border">
                        <div className="flex items-center">
                            <XCircle className="h-8 w-8 text-red-600" />
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-500">Blocked</p>
                                <p className="text-2xl font-bold text-gray-900">{analytics.blocked_requests.toLocaleString()}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow border">
                        <div className="flex items-center">
                            <Settings className="h-8 w-8 text-purple-600" />
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-500">Unique Origins</p>
                                <p className="text-2xl font-bold text-gray-900">{analytics.unique_origins}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* CORS Configuration */}
            {config && (
                <div className="bg-white rounded-lg shadow border">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h3 className="text-lg font-semibold">Current Configuration</h3>
                    </div>
                    <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <h4 className="font-medium mb-3">Environment: {config.environment}</h4>
                                <div className="space-y-2">
                                    <p><span className="font-medium">Credentials:</span> {config.corsSettings.credentials ? 'Enabled' : 'Disabled'}</p>
                                    <p><span className="font-medium">Max Age:</span> {config.corsSettings.maxAge}s</p>
                                    <p><span className="font-medium">Methods:</span> {config.corsSettings.methods?.join(', ')}</p>
                                </div>
                            </div>
                            <div>
                                <h4 className="font-medium mb-3">Allowed Origins ({config.allowedOrigins.length})</h4>
                                <div className="max-h-32 overflow-y-auto space-y-1">
                                    {config.allowedOrigins.map((origin, index) => (
                                        <div key={index} className="text-sm bg-gray-50 p-2 rounded">
                                            {origin}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {requestsDistributionData && (
                    <div className="bg-white p-6 rounded-lg shadow border">
                        <h3 className="text-lg font-semibold mb-4">Request Distribution</h3>
                        <Doughnut data={requestsDistributionData} options={{ responsive: true }} />
                    </div>
                )}

                {hourlyData && (
                    <div className="bg-white p-6 rounded-lg shadow border">
                        <h3 className="text-lg font-semibold mb-4">Hourly Request Pattern</h3>
                        <Line data={hourlyData} options={{ responsive: true }} />
                    </div>
                )}
            </div>

            {/* CORS Testing */}
            <div className="bg-white rounded-lg shadow border">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold">CORS Testing</h3>
                </div>
                <div className="p-6">
                    <div className="flex space-x-4 mb-4">
                        <input
                            type="text"
                            value={testOrigin}
                            onChange={(e) => setTestOrigin(e.target.value)}
                            placeholder="Enter origin to test (e.g., https://example.com)"
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                            onClick={testCORS}
                            disabled={!testOrigin}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                        >
                            Test CORS
                        </button>
                    </div>
                    
                    {testResult && (
                        <div className={`p-4 rounded-lg border ${
                            testResult.allowed ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                        }`}>
                            <div className="flex items-center mb-2">
                                {testResult.allowed ? (
                                    <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                                ) : (
                                    <XCircle className="h-5 w-5 text-red-600 mr-2" />
                                )}
                                <span className="font-medium">
                                    {testResult.allowed ? 'CORS Allowed' : 'CORS Blocked'}
                                </span>
                            </div>
                            <p className="text-sm">Reason: {testResult.reason}</p>
                            {testResult.security_score !== undefined && (
                                <p className="text-sm">Security Score: {testResult.security_score}</p>
                            )}
                            {testResult.warnings && testResult.warnings.length > 0 && (
                                <div className="mt-2">
                                    <p className="text-sm font-medium">Warnings:</p>
                                    <ul className="text-sm list-disc list-inside">
                                        {testResult.warnings.map((warning: string, index: number) => (
                                            <li key={index}>{warning}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Domain Whitelist */}
            <div className="bg-white rounded-lg shadow border">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold">Domain Whitelist</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Domain
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Environment
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Added
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {domains.map((domain) => (
                                <tr key={domain.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {domain.domain}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                                            domain.environment === 'production' ? 'bg-red-100 text-red-800' :
                                            domain.environment === 'staging' ? 'bg-yellow-100 text-yellow-800' :
                                            'bg-blue-100 text-blue-800'
                                        }`}>
                                            {domain.environment}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                                            domain.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                        }`}>
                                            {domain.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(domain.created_at).toLocaleDateString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
