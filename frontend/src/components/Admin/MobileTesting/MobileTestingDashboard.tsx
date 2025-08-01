import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
    Smartphone, Tablet, Monitor, Play, FileText, 
    CheckCircle, AlertTriangle, XCircle, Clock, Zap
} from 'lucide-react';

interface TestResult {
    test_id: string;
    summary: {
        total_tests: number;
        passed: number;
        failed: number;
        warnings: number;
    };
    created_at: string;
}

interface DeviceInfo {
    name: string;
    category: string;
    viewport: {
        width: number;
        height: number;
    };
}

const MobileTestingDashboard: React.FC = () => {
    const [testResults, setTestResults] = useState<TestResult[]>([]);
    const [devices, setDevices] = useState<DeviceInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [testing, setTesting] = useState(false);
    const [quickTestUrl, setQuickTestUrl] = useState('');
    const [selectedDevices, setSelectedDevices] = useState<string[]>([]);

    const fetchData = async () => {
        try {
            setLoading(true);
            
            const [resultsResponse, devicesResponse] = await Promise.all([
                fetch('/api/mobile-testing/results', {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                }),
                fetch('/api/mobile-testing/devices', {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                })
            ]);

            if (resultsResponse.ok) {
                const resultsData = await resultsResponse.json();
                setTestResults(resultsData.data.results || []);
            }

            if (devicesResponse.ok) {
                const devicesData = await devicesResponse.json();
                setDevices(devicesData.data.devices || []);
                setSelectedDevices(devicesData.data.devices.slice(0, 3).map((d: DeviceInfo) => d.name));
            }

        } catch (error) {
            console.error('Failed to fetch mobile testing data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const runComprehensiveTest = async () => {
        try {
            setTesting(true);
            
            const testOptions = {
                devices: selectedDevices,
                pages: ['/', '/celebrities', '/booking', '/login'],
                baseUrl: window.location.origin,
                includePerformance: true,
                includeFunctionality: true,
                includeAccessibility: true
            };

            const response = await fetch('/api/mobile-testing/run-test', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(testOptions)
            });

            if (response.ok) {
                const result = await response.json();
                alert(`Mobile testing started! Test ID: ${result.data.test_id}\nEstimated duration: ${result.data.estimated_duration}`);
                
                // Refresh results after a delay
                setTimeout(() => {
                    fetchData();
                }, 30000); // Check after 30 seconds
            } else {
                alert('Failed to start mobile testing');
            }

        } catch (error) {
            console.error('Mobile testing error:', error);
            alert('Failed to start mobile testing');
        } finally {
            setTesting(false);
        }
    };

    const runQuickTest = async () => {
        if (!quickTestUrl) return;

        try {
            setTesting(true);
            
            const response = await fetch('/api/mobile-testing/quick-test', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    url: quickTestUrl,
                    device: 'iPhone 13'
                })
            });

            if (response.ok) {
                const result = await response.json();
                alert('Quick test completed! Check results below.');
                await fetchData();
            } else {
                alert('Failed to run quick test');
            }

        } catch (error) {
            console.error('Quick test error:', error);
            alert('Failed to run quick test');
        } finally {
            setTesting(false);
        }
    };

    const getDeviceIcon = (category: string) => {
        switch (category) {
            case 'tablet': return <Tablet className="h-4 w-4" />;
            case 'premium_ios':
            case 'standard_ios':
            case 'premium_android':
            case 'standard_android':
            case 'budget_android':
                return <Smartphone className="h-4 w-4" />;
            default: return <Monitor className="h-4 w-4" />;
        }
    };

    const getStatusColor = (passed: number, total: number) => {
        if (total === 0) return 'text-gray-500';
        const percentage = (passed / total) * 100;
        if (percentage >= 90) return 'text-green-600';
        if (percentage >= 70) return 'text-yellow-600';
        return 'text-red-600';
    };

    const getStatusIcon = (passed: number, total: number) => {
        if (total === 0) return <Clock className="h-4 w-4" />;
        const percentage = (passed / total) * 100;
        if (percentage >= 90) return <CheckCircle className="h-4 w-4 text-green-600" />;
        if (percentage >= 70) return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
        return <XCircle className="h-4 w-4 text-red-600" />;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    const latestResult = testResults[0];
    const successRate = latestResult 
        ? Math.round((latestResult.summary.passed / latestResult.summary.total_tests) * 100)
        : 0;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">Mobile Testing & Optimization</h1>
                    <p className="text-gray-500 mt-1">
                        Comprehensive mobile app testing across devices and browsers
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={fetchData} variant="outline">
                        <Smartphone className="h-4 w-4 mr-2" />
                        Refresh
                    </Button>
                    <Button 
                        onClick={runComprehensiveTest}
                        disabled={testing || selectedDevices.length === 0}
                    >
                        <Play className="h-4 w-4 mr-2" />
                        {testing ? 'Testing...' : 'Run Full Test'}
                    </Button>
                </div>
            </div>

            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Latest Test Score</CardTitle>
                        <Zap className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{successRate}%</div>
                        <p className="text-xs text-gray-500">Overall success rate</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Tests Run</CardTitle>
                        <CheckCircle className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{testResults.length}</div>
                        <p className="text-xs text-gray-500">Total test sessions</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Devices Tested</CardTitle>
                        <Smartphone className="h-4 w-4 text-purple-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{devices.length}</div>
                        <p className="text-xs text-gray-500">Supported devices</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Issues Found</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-orange-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {latestResult ? latestResult.summary.failed + latestResult.summary.warnings : 0}
                        </div>
                        <p className="text-xs text-gray-500">In latest test</p>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content Tabs */}
            <Tabs defaultValue="test-runner" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="test-runner">Test Runner</TabsTrigger>
                    <TabsTrigger value="results">Test Results</TabsTrigger>
                    <TabsTrigger value="devices">Device Coverage</TabsTrigger>
                    <TabsTrigger value="reports">Reports</TabsTrigger>
                </TabsList>

                <TabsContent value="test-runner" className="space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Comprehensive Test</CardTitle>
                                <CardDescription>
                                    Run full mobile testing suite across multiple devices
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <Label>Select Devices to Test</Label>
                                    <div className="grid grid-cols-2 gap-2 mt-2">
                                        {devices.map((device) => (
                                            <label key={device.name} className="flex items-center space-x-2">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedDevices.includes(device.name)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setSelectedDevices([...selectedDevices, device.name]);
                                                        } else {
                                                            setSelectedDevices(selectedDevices.filter(d => d !== device.name));
                                                        }
                                                    }}
                                                />
                                                <div className="flex items-center space-x-1">
                                                    {getDeviceIcon(device.category)}
                                                    <span className="text-sm">{device.name}</span>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <Button 
                                        onClick={runComprehensiveTest}
                                        disabled={testing || selectedDevices.length === 0}
                                        className="flex-1"
                                    >
                                        <Play className="h-4 w-4 mr-2" />
                                        {testing ? 'Running Tests...' : `Test ${selectedDevices.length} Devices`}
                                    </Button>
                                </div>

                                {testing && (
                                    <Alert>
                                        <Clock className="h-4 w-4" />
                                        <AlertDescription>
                                            Mobile testing is running in the background. This may take 5-10 minutes to complete.
                                            Results will appear in the Test Results tab when finished.
                                        </AlertDescription>
                                    </Alert>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Quick Test</CardTitle>
                                <CardDescription>
                                    Run a quick performance test on a single page
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <Label htmlFor="quick-test-url">Page URL</Label>
                                    <Input
                                        id="quick-test-url"
                                        value={quickTestUrl}
                                        onChange={(e) => setQuickTestUrl(e.target.value)}
                                        placeholder="https://example.com/page"
                                        className="mt-1"
                                    />
                                </div>

                                <Button 
                                    onClick={runQuickTest}
                                    disabled={testing || !quickTestUrl}
                                    className="w-full"
                                    variant="outline"
                                >
                                    <Zap className="h-4 w-4 mr-2" />
                                    {testing ? 'Testing...' : 'Run Quick Test'}
                                </Button>

                                <div className="text-sm text-gray-500">
                                    <p>Quick test includes:</p>
                                    <ul className="list-disc list-inside mt-1 space-y-1">
                                        <li>Page load performance</li>
                                        <li>Core Web Vitals</li>
                                        <li>Basic accessibility checks</li>
                                        <li>Mobile usability</li>
                                    </ul>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="results" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Test Results History</CardTitle>
                            <CardDescription>
                                Recent mobile testing results ({testResults.length} tests)
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {testResults.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                    <p>No test results yet</p>
                                    <p className="text-sm mt-2">Run your first mobile test to see results here</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {testResults.map((result) => (
                                        <div key={result.test_id} className="border rounded-lg p-4">
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center space-x-3">
                                                    {getStatusIcon(result.summary.passed, result.summary.total_tests)}
                                                    <div>
                                                        <div className="font-medium">
                                                            Test {result.test_id.substring(0, 12)}...
                                                        </div>
                                                        <div className="text-sm text-gray-500">
                                                            {new Date(result.created_at).toLocaleString()}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className={`text-lg font-bold ${getStatusColor(result.summary.passed, result.summary.total_tests)}`}>
                                                        {Math.round((result.summary.passed / result.summary.total_tests) * 100)}%
                                                    </div>
                                                    <div className="text-sm text-gray-500">Success Rate</div>
                                                </div>
                                            </div>
                                            
                                            <div className="grid grid-cols-4 gap-4 mb-3">
                                                <div className="text-center">
                                                    <div className="text-sm text-gray-500">Total</div>
                                                    <div className="font-bold">{result.summary.total_tests}</div>
                                                </div>
                                                <div className="text-center">
                                                    <div className="text-sm text-gray-500">Passed</div>
                                                    <div className="font-bold text-green-600">{result.summary.passed}</div>
                                                </div>
                                                <div className="text-center">
                                                    <div className="text-sm text-gray-500">Warnings</div>
                                                    <div className="font-bold text-yellow-600">{result.summary.warnings}</div>
                                                </div>
                                                <div className="text-center">
                                                    <div className="text-sm text-gray-500">Failed</div>
                                                    <div className="font-bold text-red-600">{result.summary.failed}</div>
                                                </div>
                                            </div>
                                            
                                            <Progress 
                                                value={(result.summary.passed / result.summary.total_tests) * 100} 
                                                className="h-2 mb-3"
                                            />
                                            
                                            <div className="flex gap-2">
                                                <Button size="sm" variant="outline">
                                                    <FileText className="h-3 w-3 mr-1" />
                                                    View Details
                                                </Button>
                                                <Button size="sm" variant="outline">
                                                    <FileText className="h-3 w-3 mr-1" />
                                                    Generate Report
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="devices" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Device Coverage</CardTitle>
                            <CardDescription>
                                Supported devices for mobile testing
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {devices.map((device) => (
                                    <div key={device.name} className="border rounded-lg p-4">
                                        <div className="flex items-center space-x-3 mb-2">
                                            {getDeviceIcon(device.category)}
                                            <div>
                                                <div className="font-medium">{device.name}</div>
                                                <div className="text-sm text-gray-500 capitalize">
                                                    {device.category.replace('_', ' ')}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-sm text-gray-600">
                                            {device.viewport.width} × {device.viewport.height}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="reports" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Testing Reports</CardTitle>
                            <CardDescription>
                                Generate detailed mobile testing reports
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="text-center py-8 text-gray-500">
                                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                <p>Report generation coming soon</p>
                                <p className="text-sm mt-2">
                                    Detailed reports with recommendations will be available here
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default MobileTestingDashboard;
