import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
    Shield, AlertTriangle, Eye, Ban, CheckCircle, Clock, 
    TrendingUp, Users, CreditCard, MapPin, Zap
} from 'lucide-react';

interface FraudReport {
    timeframe: string;
    total_analyses: number;
    risk_distribution: {
        low: number;
        medium: number;
        high: number;
        critical: number;
    };
    blocked_transactions: number;
    manual_reviews: number;
    avg_risk_score: number;
    common_risk_factors: Array<{
        factor: string;
        frequency: number;
        avg_score: number;
    }>;
}

interface ManualReview {
    id: string;
    transaction_id: string;
    risk_score: number;
    priority: string;
    created_at: string;
    transaction: {
        amount: number;
        user_id: string;
        payment_method: string;
    };
}

const FraudDetectionDashboard: React.FC = () => {
    const [report, setReport] = useState<FraudReport | null>(null);
    const [manualReviews, setManualReviews] = useState<ManualReview[]>([]);
    const [loading, setLoading] = useState(true);
    const [timeframe, setTimeframe] = useState('30d');

    const fetchData = async () => {
        try {
            setLoading(true);
            
            const [reportResponse, reviewsResponse] = await Promise.all([
                fetch(`/api/fraud-detection/report?timeframe=${timeframe}`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                }),
                fetch('/api/fraud-detection/manual-review-queue', {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                })
            ]);

            if (reportResponse.ok) {
                const reportResult = await reportResponse.json();
                setReport(reportResult.data);
            }

            if (reviewsResponse.ok) {
                const reviewsResult = await reviewsResponse.json();
                setManualReviews(reviewsResult.data.reviews || []);
            }

        } catch (error) {
            console.error('Failed to fetch fraud detection data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [timeframe]);

    const handleReviewDecision = async (reviewId: string, decision: 'approve' | 'reject') => {
        try {
            const response = await fetch(`/api/fraud-detection/manual-review/${reviewId}/decision`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ decision })
            });

            if (response.ok) {
                alert(`Transaction ${decision}d successfully!`);
                await fetchData(); // Refresh data
            } else {
                alert(`Failed to ${decision} transaction`);
            }

        } catch (error) {
            console.error(`Review decision error:`, error);
            alert(`Failed to ${decision} transaction`);
        }
    };

    const getRiskColor = (level: string) => {
        switch (level) {
            case 'low': return 'text-green-600 bg-green-100';
            case 'medium': return 'text-yellow-600 bg-yellow-100';
            case 'high': return 'text-orange-600 bg-orange-100';
            case 'critical': return 'text-red-600 bg-red-100';
            default: return 'text-gray-600 bg-gray-100';
        }
    };

    const getPriorityIcon = (priority: string) => {
        switch (priority) {
            case 'critical': return <AlertTriangle className="h-4 w-4 text-red-600" />;
            case 'high': return <TrendingUp className="h-4 w-4 text-orange-600" />;
            default: return <Clock className="h-4 w-4 text-blue-600" />;
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">Fraud Detection & Security</h1>
                    <p className="text-gray-500 mt-1">
                        Advanced fraud detection and payment security monitoring
                    </p>
                </div>
                <div className="flex gap-2">
                    <select
                        value={timeframe}
                        onChange={(e) => setTimeframe(e.target.value)}
                        className="px-3 py-2 border rounded-md"
                    >
                        <option value="7d">Last 7 days</option>
                        <option value="30d">Last 30 days</option>
                        <option value="90d">Last 90 days</option>
                    </select>
                    <Button onClick={fetchData} variant="outline">
                        <Shield className="h-4 w-4 mr-2" />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Analyses</CardTitle>
                        <Eye className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{report?.total_analyses || 0}</div>
                        <p className="text-xs text-gray-500">Transactions analyzed</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Blocked</CardTitle>
                        <Ban className="h-4 w-4 text-red-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{report?.blocked_transactions || 0}</div>
                        <p className="text-xs text-gray-500">Fraudulent transactions</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Manual Reviews</CardTitle>
                        <Users className="h-4 w-4 text-orange-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{report?.manual_reviews || 0}</div>
                        <p className="text-xs text-gray-500">Require human review</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Avg Risk Score</CardTitle>
                        <TrendingUp className="h-4 w-4 text-purple-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{Math.round(report?.avg_risk_score || 0)}</div>
                        <p className="text-xs text-gray-500">Out of 100</p>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content Tabs */}
            <Tabs defaultValue="overview" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="manual-review">Manual Review</TabsTrigger>
                    <TabsTrigger value="risk-factors">Risk Factors</TabsTrigger>
                    <TabsTrigger value="settings">Settings</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Risk Distribution</CardTitle>
                                <CardDescription>Transaction risk levels</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {report?.risk_distribution && Object.entries(report.risk_distribution).map(([level, count]) => (
                                        <div key={level} className="flex items-center justify-between">
                                            <div className="flex items-center space-x-2">
                                                <Badge className={getRiskColor(level)}>
                                                    {level.toUpperCase()}
                                                </Badge>
                                                <span>{count} transactions</span>
                                            </div>
                                            <div className="w-32">
                                                <Progress 
                                                    value={report.total_analyses > 0 ? (count / report.total_analyses) * 100 : 0} 
                                                    className="h-2"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Security Status</CardTitle>
                                <CardDescription>Current security overview</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span>Fraud Detection</span>
                                        <Badge className="text-green-600 bg-green-100">
                                            <CheckCircle className="h-3 w-3 mr-1" />
                                            Active
                                        </Badge>
                                    </div>
                                    
                                    <div className="flex items-center justify-between">
                                        <span>Auto-Block</span>
                                        <Badge className="text-green-600 bg-green-100">
                                            <Zap className="h-3 w-3 mr-1" />
                                            Enabled
                                        </Badge>
                                    </div>
                                    
                                    <div className="flex items-center justify-between">
                                        <span>Manual Review Queue</span>
                                        <Badge variant="secondary">
                                            {manualReviews.length} pending
                                        </Badge>
                                    </div>
                                    
                                    <div className="flex items-center justify-between">
                                        <span>Detection Rate</span>
                                        <span className="font-bold">
                                            {report?.total_analyses > 0 
                                                ? Math.round(((report.blocked_transactions + report.manual_reviews) / report.total_analyses) * 100)
                                                : 0
                                            }%
                                        </span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="manual-review" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Manual Review Queue</CardTitle>
                            <CardDescription>
                                Transactions requiring human review ({manualReviews.length} pending)
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {manualReviews.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                    <p>No transactions pending manual review</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {manualReviews.map((review) => (
                                        <div key={review.id} className="border rounded-lg p-4">
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center space-x-3">
                                                    {getPriorityIcon(review.priority)}
                                                    <div>
                                                        <div className="font-medium">
                                                            Transaction {review.transaction_id.substring(0, 8)}...
                                                        </div>
                                                        <div className="text-sm text-gray-500">
                                                            {new Date(review.created_at).toLocaleString()}
                                                        </div>
                                                    </div>
                                                </div>
                                                <Badge className={getRiskColor(
                                                    review.risk_score >= 90 ? 'critical' :
                                                    review.risk_score >= 80 ? 'high' :
                                                    review.risk_score >= 60 ? 'medium' : 'low'
                                                )}>
                                                    Risk: {review.risk_score}
                                                </Badge>
                                            </div>
                                            
                                            <div className="grid grid-cols-3 gap-4 mb-3 text-sm">
                                                <div>
                                                    <span className="text-gray-500">Amount:</span>
                                                    <div className="font-medium">${review.transaction.amount.toLocaleString()}</div>
                                                </div>
                                                <div>
                                                    <span className="text-gray-500">Payment:</span>
                                                    <div className="font-medium capitalize">{review.transaction.payment_method}</div>
                                                </div>
                                                <div>
                                                    <span className="text-gray-500">Priority:</span>
                                                    <div className="font-medium capitalize">{review.priority}</div>
                                                </div>
                                            </div>
                                            
                                            <div className="flex gap-2">
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleReviewDecision(review.id, 'approve')}
                                                    className="bg-green-600 hover:bg-green-700"
                                                >
                                                    <CheckCircle className="h-3 w-3 mr-1" />
                                                    Approve
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    onClick={() => handleReviewDecision(review.id, 'reject')}
                                                >
                                                    <Ban className="h-3 w-3 mr-1" />
                                                    Reject
                                                </Button>
                                                <Button size="sm" variant="outline">
                                                    <Eye className="h-3 w-3 mr-1" />
                                                    Details
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="risk-factors" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Common Risk Factors</CardTitle>
                            <CardDescription>Most frequent fraud indicators</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {report?.common_risk_factors?.map((factor, index) => (
                                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                                                {factor.factor === 'velocity' && <Zap className="h-4 w-4 text-blue-600" />}
                                                {factor.factor === 'geographic' && <MapPin className="h-4 w-4 text-blue-600" />}
                                                {factor.factor === 'payment' && <CreditCard className="h-4 w-4 text-blue-600" />}
                                                {!['velocity', 'geographic', 'payment'].includes(factor.factor) && 
                                                  <AlertTriangle className="h-4 w-4 text-blue-600" />}
                                            </div>
                                            <div>
                                                <div className="font-medium capitalize">{factor.factor.replace('_', ' ')}</div>
                                                <div className="text-sm text-gray-500">{factor.frequency} occurrences</div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-bold">Avg: {factor.avg_score}</div>
                                            <div className="text-sm text-gray-500">risk score</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="settings" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Fraud Detection Settings</CardTitle>
                            <CardDescription>Configure fraud detection parameters</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Alert>
                                <AlertTriangle className="h-4 w-4" />
                                <AlertDescription>
                                    Fraud detection settings can be configured here. Changes will affect 
                                    how transactions are analyzed and flagged for review.
                                </AlertDescription>
                            </Alert>
                            
                            <div className="mt-4 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2">Risk Thresholds</label>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs text-gray-500">Medium Risk</label>
                                            <input type="number" className="w-full p-2 border rounded" defaultValue="60" />
                                        </div>
                                        <div>
                                            <label className="text-xs text-gray-500">High Risk</label>
                                            <input type="number" className="w-full p-2 border rounded" defaultValue="80" />
                                        </div>
                                    </div>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium mb-2">Auto-Block Threshold</label>
                                    <input type="number" className="w-full p-2 border rounded" defaultValue="90" />
                                    <p className="text-xs text-gray-500 mt-1">Transactions above this score are automatically blocked</p>
                                </div>
                                
                                <Button>Save Settings</Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default FraudDetectionDashboard;
