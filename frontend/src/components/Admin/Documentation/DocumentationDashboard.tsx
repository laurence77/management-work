import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Book, FileText, Code, Video, RefreshCw, Download, ExternalLink, CheckCircle } from 'lucide-react';

interface DocumentationData {
    api_documentation: {
        generated: boolean;
        last_updated: string;
    };
    guides: number;
    tutorials: number;
    examples: number;
    total_pages: number;
}

const DocumentationDashboard: React.FC = () => {
    const [data, setData] = useState<DocumentationData | null>(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState<string | null>(null);

    const fetchData = async () => {
        try {
            const response = await fetch('/api/documentation/dashboard', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const result = await response.json();
                setData(result.data);
            }
        } catch (error) {
            console.error('Failed to fetch documentation data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const generateDocumentation = async (type: string) => {
        try {
            setGenerating(type);
            
            const endpoint = type === 'all' ? '/generate/all' : `/generate/${type}`;
            const response = await fetch(`/api/documentation${endpoint}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const result = await response.json();
                alert(`${type} documentation generated successfully!`);
                await fetchData(); // Refresh data
            } else {
                alert(`Failed to generate ${type} documentation`);
            }
        } catch (error) {
            console.error(`${type} documentation generation error:`, error);
            alert(`Failed to generate ${type} documentation`);
        } finally {
            setGenerating(null);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    const documentationSections = [
        {
            title: 'API Reference',
            description: 'Comprehensive API documentation with endpoints, parameters, and examples',
            icon: <Code className="h-5 w-5" />,
            count: data?.api_documentation?.generated ? 1 : 0,
            status: data?.api_documentation?.generated ? 'generated' : 'pending',
            lastUpdated: data?.api_documentation?.last_updated,
            generateType: 'api'
        },
        {
            title: 'User Guides',
            description: 'Step-by-step guides for using the platform',
            icon: <Book className="h-5 w-5" />,
            count: data?.guides || 0,
            status: (data?.guides || 0) > 0 ? 'generated' : 'pending',
            generateType: 'guides'
        },
        {
            title: 'Tutorials',
            description: 'Interactive tutorials and walkthroughs',
            icon: <Video className="h-5 w-5" />,
            count: data?.tutorials || 0,
            status: (data?.tutorials || 0) > 0 ? 'generated' : 'pending',
            generateType: 'tutorials'
        },
        {
            title: 'Code Examples',
            description: 'Sample code and integration examples',
            icon: <FileText className="h-5 w-5" />,
            count: data?.examples || 0,
            status: (data?.examples || 0) > 0 ? 'generated' : 'pending',
            generateType: 'examples'
        }
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">Documentation Management</h1>
                    <p className="text-gray-500 mt-1">
                        Generate and manage platform documentation
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={fetchData} variant="outline">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                    </Button>
                    <Button 
                        onClick={() => generateDocumentation('all')}
                        disabled={generating === 'all'}
                    >
                        {generating === 'all' ? 'Generating...' : 'Generate All'}
                    </Button>
                </div>
            </div>

            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Pages</CardTitle>
                        <FileText className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data?.total_pages || 0}</div>
                        <p className="text-xs text-gray-500">Documentation pages</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">API Docs</CardTitle>
                        <Code className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {data?.api_documentation?.generated ? '1' : '0'}
                        </div>
                        <p className="text-xs text-gray-500">API reference generated</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Guides</CardTitle>
                        <Book className="h-4 w-4 text-purple-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data?.guides || 0}</div>
                        <p className="text-xs text-gray-500">User guides available</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Examples</CardTitle>
                        <Video className="h-4 w-4 text-orange-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data?.examples || 0}</div>
                        <p className="text-xs text-gray-500">Code examples</p>
                    </CardContent>
                </Card>
            </div>

            {/* Documentation Sections */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {documentationSections.map((section, index) => (
                    <Card key={index}>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                {section.icon}
                                {section.title}
                                <Badge 
                                    variant={section.status === 'generated' ? 'default' : 'secondary'}
                                    className={section.status === 'generated' ? 'bg-green-100 text-green-800' : ''}
                                >
                                    {section.status === 'generated' ? (
                                        <>
                                            <CheckCircle className="h-3 w-3 mr-1" />
                                            Generated
                                        </>
                                    ) : (
                                        'Pending'
                                    )}
                                </Badge>
                            </CardTitle>
                            <CardDescription>{section.description}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex justify-between items-center">
                                <div>
                                    <div className="text-2xl font-bold">{section.count}</div>
                                    {section.lastUpdated && (
                                        <div className="text-xs text-gray-500">
                                            Updated: {new Date(section.lastUpdated).toLocaleDateString()}
                                        </div>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        onClick={() => generateDocumentation(section.generateType)}
                                        disabled={generating === section.generateType}
                                    >
                                        {generating === section.generateType ? 'Generating...' : 'Generate'}
                                    </Button>
                                    {section.status === 'generated' && (
                                        <Button size="sm" variant="outline">
                                            <ExternalLink className="h-3 w-3" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Quick Actions */}
            <Card>
                <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                    <CardDescription>Common documentation management tasks</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Button variant="outline" className="h-20 flex flex-col items-center space-y-2">
                            <Download className="h-5 w-5" />
                            <span>Export as PDF</span>
                        </Button>
                        
                        <Button variant="outline" className="h-20 flex flex-col items-center space-y-2">
                            <ExternalLink className="h-5 w-5" />
                            <span>View Live Docs</span>
                        </Button>
                        
                        <Button variant="outline" className="h-20 flex flex-col items-center space-y-2">
                            <RefreshCw className="h-5 w-5" />
                            <span>Regenerate All</span>
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Status */}
            {data?.api_documentation?.generated && (
                <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                        Documentation is up to date. Last generated: {' '}
                        {new Date(data.api_documentation.last_updated).toLocaleString()}
                    </AlertDescription>
                </Alert>
            )}
        </div>
    );
};

export default DocumentationDashboard;
