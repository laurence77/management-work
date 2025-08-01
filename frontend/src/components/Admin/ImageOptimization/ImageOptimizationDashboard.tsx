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
    Upload, Image, Zap, BarChart3, Settings, 
    FileImage, HardDrive, Gauge, TrendingUp,
    RefreshCw, Download, Eye, Clock
} from 'lucide-react';

interface ImagePerformanceData {
    total_images: number;
    total_size_mb: number;
    optimization_savings_mb: number;
    optimization_percentage: number;
    performance_metrics: {
        avg_load_time: number;
        total_bandwidth_saved: number;
        total_views: number;
    };
    by_type: Record<string, {
        count: number;
        total_size: number;
        optimized: number;
    }>;
}

interface UsageReport {
    total_images: number;
    storage_used_gb: number;
    bandwidth_usage_gb: number;
    optimization_rate: number;
    cdn_hit_rate: number;
}

const ImageOptimizationDashboard: React.FC = () => {
    const [performanceData, setPerformanceData] = useState<ImagePerformanceData | null>(null);
    const [usageReport, setUsageReport] = useState<UsageReport | null>(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [optimizing, setOptimizing] = useState(false);

    const fetchData = async () => {
        try {
            setLoading(true);
            
            const [performanceResponse, usageResponse] = await Promise.all([
                fetch('/api/image-optimization/performance-analysis', {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                }),
                fetch('/api/image-optimization/usage-report', {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                })
            ]);

            if (performanceResponse.ok) {
                const performanceResult = await performanceResponse.json();
                setPerformanceData(performanceResult.data);
            }

            if (usageResponse.ok) {
                const usageResult = await usageResponse.json();
                setUsageReport(usageResult.data);
            }

        } catch (error) {
            console.error('Failed to fetch image optimization data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            setUploading(true);
            
            const formData = new FormData();
            formData.append('image', file);
            formData.append('imageType', 'gallery_image');

            const response = await fetch('/api/image-optimization/upload', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: formData
            });

            if (response.ok) {
                const result = await response.json();
                alert('Image uploaded and optimized successfully!');
                await fetchData(); // Refresh data
            } else {
                alert('Failed to upload image');
            }

        } catch (error) {
            console.error('Image upload error:', error);
            alert('Failed to upload image');
        } finally {
            setUploading(false);
        }
    };

    const handleBatchOptimization = async () => {
        try {
            setOptimizing(true);
            
            const response = await fetch('/api/image-optimization/batch-optimize', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ batchSize: 20 })
            });

            if (response.ok) {
                const result = await response.json();
                alert(`Batch optimization completed! Processed: ${result.data.processed}, Successful: ${result.data.successful}`);
                await fetchData(); // Refresh data
            } else {
                alert('Batch optimization failed');
            }

        } catch (error) {
            console.error('Batch optimization error:', error);
            alert('Batch optimization failed');
        } finally {
            setOptimizing(false);
        }
    };

    const generateSitemap = async () => {
        try {
            const response = await fetch('/api/image-optimization/generate-sitemap', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const result = await response.json();
                alert(`Image sitemap generated with ${result.data.images_count} images!`);
            } else {
                alert('Failed to generate sitemap');
            }
        } catch (error) {
            console.error('Sitemap generation error:', error);
            alert('Failed to generate sitemap');
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
                    <h1 className="text-3xl font-bold">Image Optimization & CDN</h1>
                    <p className="text-gray-500 mt-1">
                        Advanced image optimization with Cloudinary CDN integration
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={fetchData} variant="outline">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                    </Button>
                    <Button onClick={generateSitemap} variant="outline">
                        <Download className="h-4 w-4 mr-2" />
                        Generate Sitemap
                    </Button>
                </div>
            </div>

            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Images</CardTitle>
                        <FileImage className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{performanceData?.total_images || 0}</div>
                        <p className="text-xs text-gray-500">Images stored</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Storage Used</CardTitle>
                        <HardDrive className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {usageReport?.storage_used_gb?.toFixed(2) || 0}GB
                        </div>
                        <p className="text-xs text-gray-500">Total storage</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Optimization Rate</CardTitle>
                        <Zap className="h-4 w-4 text-yellow-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {performanceData?.optimization_percentage?.toFixed(1) || 0}%
                        </div>
                        <p className="text-xs text-gray-500">Images optimized</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">CDN Hit Rate</CardTitle>
                        <Gauge className="h-4 w-4 text-purple-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {usageReport?.cdn_hit_rate?.toFixed(1) || 0}%
                        </div>
                        <p className="text-xs text-gray-500">Cache efficiency</p>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content Tabs */}
            <Tabs defaultValue="overview" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="upload">Upload & Optimize</TabsTrigger>
                    <TabsTrigger value="performance">Performance</TabsTrigger>
                    <TabsTrigger value="management">Management</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Storage Optimization</CardTitle>
                                <CardDescription>Space saved through optimization</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="flex justify-between">
                                        <span>Original Size</span>
                                        <span className="font-bold">
                                            {performanceData?.total_size_mb?.toFixed(2) || 0}MB
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Space Saved</span>
                                        <span className="font-bold text-green-600">
                                            {performanceData?.optimization_savings_mb?.toFixed(2) || 0}MB
                                        </span>
                                    </div>
                                    <Progress 
                                        value={performanceData?.optimization_percentage || 0} 
                                        className="h-2"
                                    />
                                    <p className="text-sm text-gray-500">
                                        {performanceData?.optimization_percentage?.toFixed(1) || 0}% of images optimized
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Images by Type</CardTitle>
                                <CardDescription>Breakdown by image category</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {performanceData?.by_type && Object.entries(performanceData.by_type).map(([type, data]) => (
                                        <div key={type} className="flex items-center justify-between">
                                            <div className="flex items-center space-x-2">
                                                <Image className="h-4 w-4" />
                                                <span className="capitalize">{type.replace('_', ' ')}</span>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <Badge variant="secondary">{data.count}</Badge>
                                                <Badge 
                                                    variant={data.optimized === data.count ? 'default' : 'outline'}
                                                    className={data.optimized === data.count ? 'bg-green-100 text-green-800' : ''}
                                                >
                                                    {data.optimized}/{data.count} optimized
                                                </Badge>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Performance Metrics</CardTitle>
                            <CardDescription>Image loading and bandwidth statistics</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="text-center">
                                    <div className="flex items-center justify-center mb-2">
                                        <Eye className="h-5 w-5 text-blue-600 mr-2" />
                                        <span className="text-sm font-medium">Total Views</span>
                                    </div>
                                    <div className="text-2xl font-bold">
                                        {performanceData?.performance_metrics?.total_views?.toLocaleString() || 0}
                                    </div>
                                </div>
                                
                                <div className="text-center">
                                    <div className="flex items-center justify-center mb-2">
                                        <Clock className="h-5 w-5 text-green-600 mr-2" />
                                        <span className="text-sm font-medium">Avg Load Time</span>
                                    </div>
                                    <div className="text-2xl font-bold">
                                        {performanceData?.performance_metrics?.avg_load_time?.toFixed(2) || 0}s
                                    </div>
                                </div>
                                
                                <div className="text-center">
                                    <div className="flex items-center justify-center mb-2">
                                        <TrendingUp className="h-5 w-5 text-purple-600 mr-2" />
                                        <span className="text-sm font-medium">Bandwidth Saved</span>
                                    </div>
                                    <div className="text-2xl font-bold">
                                        {((performanceData?.performance_metrics?.total_bandwidth_saved || 0) / (1024 * 1024)).toFixed(1)}MB
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="upload" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Upload & Optimize Images</CardTitle>
                            <CardDescription>Upload new images with automatic optimization</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label htmlFor="image-upload">Select Image</Label>
                                <Input
                                    id="image-upload"
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    disabled={uploading}
                                    className="mt-1"
                                />
                                <p className="text-sm text-gray-500 mt-1">
                                    Supports JPEG, PNG, WebP, and GIF. Max file size: 10MB
                                </p>
                            </div>

                            {uploading && (
                                <Alert>
                                    <Upload className="h-4 w-4" />
                                    <AlertDescription>
                                        Uploading and optimizing image... This may take a few moments.
                                    </AlertDescription>
                                </Alert>
                            )}

                            <div className="flex gap-2">
                                <Button 
                                    onClick={handleBatchOptimization}
                                    disabled={optimizing}
                                    variant="outline"
                                >
                                    <Zap className="h-4 w-4 mr-2" />
                                    {optimizing ? 'Optimizing...' : 'Batch Optimize Existing'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Optimization Settings</CardTitle>
                            <CardDescription>Configure image optimization parameters</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label>Default Quality</Label>
                                    <Input type="number" min="1" max="100" defaultValue="85" />
                                    <p className="text-sm text-gray-500 mt-1">1-100, higher is better quality</p>
                                </div>
                                
                                <div>
                                    <Label>Max File Size (MB)</Label>
                                    <Input type="number" min="1" max="50" defaultValue="10" />
                                    <p className="text-sm text-gray-500 mt-1">Maximum upload file size</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="performance" className="space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Bandwidth Usage</CardTitle>
                                <CardDescription>CDN bandwidth consumption</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="text-center">
                                    <div className="text-3xl font-bold mb-2">
                                        {usageReport?.bandwidth_usage_gb?.toFixed(2) || 0}GB
                                    </div>
                                    <p className="text-gray-500">This month</p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Cache Performance</CardTitle>
                                <CardDescription>CDN cache hit rate</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <span>Hit Rate</span>
                                        <span className="font-bold">{usageReport?.cdn_hit_rate?.toFixed(1) || 0}%</span>
                                    </div>
                                    <Progress value={usageReport?.cdn_hit_rate || 0} className="h-2" />
                                    <p className="text-sm text-gray-500">
                                        Higher hit rates indicate better caching efficiency
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="management" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Batch Operations</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <Button 
                                    variant="outline" 
                                    className="w-full"
                                    onClick={handleBatchOptimization}
                                    disabled={optimizing}
                                >
                                    <Zap className="h-4 w-4 mr-2" />
                                    Optimize All Images
                                </Button>
                                
                                <Button variant="outline" className="w-full">
                                    <Settings className="h-4 w-4 mr-2" />
                                    Regenerate Variants
                                </Button>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>SEO Tools</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <Button 
                                    variant="outline" 
                                    className="w-full"
                                    onClick={generateSitemap}
                                >
                                    <Download className="h-4 w-4 mr-2" />
                                    Generate Sitemap
                                </Button>
                                
                                <Button variant="outline" className="w-full">
                                    <BarChart3 className="h-4 w-4 mr-2" />
                                    SEO Analysis
                                </Button>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Maintenance</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <Button variant="outline" className="w-full">
                                    <RefreshCw className="h-4 w-4 mr-2" />
                                    Clear Cache
                                </Button>
                                
                                <Button variant="outline" className="w-full">
                                    <HardDrive className="h-4 w-4 mr-2" />
                                    Cleanup Unused
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default ImageOptimizationDashboard;
