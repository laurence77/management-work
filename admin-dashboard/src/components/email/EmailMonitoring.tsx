import React, { useState, useEffect } from 'react';
import { 
    Chart as ChartJS, 
    CategoryScale, 
    LinearScale, 
    PointElement, 
    LineElement, 
    BarElement,
    Title, 
    Tooltip, 
    Legend,
    ArcElement
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend
);

interface EmailStats {
    total: number;
    sent: number;
    delivered: number;
    failed: number;
    pending: number;
    deliveryRate: string;
    failureRate: string;
}

interface EmailMetric {
    date: string;
    template_type: string;
    emails_sent: number;
    emails_delivered: number;
    emails_opened: number;
    emails_clicked: number;
    emails_bounced: number;
}

export const EmailMonitoring: React.FC = () => {
    const [stats, setStats] = useState<EmailStats | null>(null);
    const [metrics, setMetrics] = useState<EmailMetric[]>([]);
    const [selectedPeriod, setSelectedPeriod] = useState('7');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchEmailData();
    }, [selectedPeriod]);

    const fetchEmailData = async () => {
        try {
            setLoading(true);
            
            // Fetch stats
            const statsResponse = await fetch(`/api/email/stats?days=${selectedPeriod}`);
            const statsData = await statsResponse.json();
            setStats(statsData);
            
            // Fetch metrics
            const metricsResponse = await fetch(`/api/email/metrics?days=${selectedPeriod}`);
            const metricsData = await metricsResponse.json();
            setMetrics(metricsData);
            
        } catch (error) {
            console.error('Failed to fetch email data:', error);
        } finally {
            setLoading(false);
        }
    };

    const deliveryChartData = {
        labels: metrics.map(m => m.date),
        datasets: [
            {
                label: 'Sent',
                data: metrics.map(m => m.emails_sent),
                borderColor: 'rgb(59, 130, 246)',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                tension: 0.1
            },
            {
                label: 'Delivered',
                data: metrics.map(m => m.emails_delivered),
                borderColor: 'rgb(34, 197, 94)',
                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                tension: 0.1
            }
        ]
    };

    const engagementChartData = {
        labels: metrics.map(m => m.date),
        datasets: [
            {
                label: 'Opened',
                data: metrics.map(m => m.emails_opened),
                backgroundColor: 'rgba(168, 85, 247, 0.8)'
            },
            {
                label: 'Clicked',
                data: metrics.map(m => m.emails_clicked),
                backgroundColor: 'rgba(34, 197, 94, 0.8)'
            }
        ]
    };

    const statusDistribution = stats ? {
        labels: ['Delivered', 'Failed', 'Pending'],
        datasets: [{
            data: [stats.delivered, stats.failed, stats.pending],
            backgroundColor: [
                'rgba(34, 197, 94, 0.8)',
                'rgba(239, 68, 68, 0.8)',
                'rgba(251, 191, 36, 0.8)'
            ]
        }]
    } : null;

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">Email Monitoring</h2>
                <select
                    value={selectedPeriod}
                    onChange={(e) => setSelectedPeriod(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                    <option value="7">Last 7 days</option>
                    <option value="30">Last 30 days</option>
                    <option value="90">Last 90 days</option>
                </select>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-white p-6 rounded-lg shadow-sm border">
                        <h3 className="text-sm font-medium text-gray-500">Total Emails</h3>
                        <p className="text-3xl font-bold text-gray-900">{stats.total.toLocaleString()}</p>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow-sm border">
                        <h3 className="text-sm font-medium text-gray-500">Delivery Rate</h3>
                        <p className="text-3xl font-bold text-green-600">{stats.deliveryRate}%</p>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow-sm border">
                        <h3 className="text-sm font-medium text-gray-500">Failed</h3>
                        <p className="text-3xl font-bold text-red-600">{stats.failed.toLocaleString()}</p>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow-sm border">
                        <h3 className="text-sm font-medium text-gray-500">Pending</h3>
                        <p className="text-3xl font-bold text-yellow-600">{stats.pending.toLocaleString()}</p>
                    </div>
                </div>
            )}

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <h3 className="text-lg font-semibold mb-4">Email Delivery Trends</h3>
                    <Line data={deliveryChartData} options={{ responsive: true }} />
                </div>
                
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <h3 className="text-lg font-semibold mb-4">Status Distribution</h3>
                    {statusDistribution && (
                        <Doughnut data={statusDistribution} options={{ responsive: true }} />
                    )}
                </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h3 className="text-lg font-semibold mb-4">Email Engagement</h3>
                <Bar data={engagementChartData} options={{ responsive: true }} />
            </div>
        </div>
    );
};