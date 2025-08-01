import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Trash2, Download, Info } from 'lucide-react';

const DataRetentionRequest: React.FC = () => {
    const [requestType, setRequestType] = useState<'deletion' | 'export' | null>(null);
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const submitRequest = async () => {
        if (!requestType) return;

        try {
            setLoading(true);
            
            const response = await fetch('/api/data-retention/user-data-request', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    request_type: requestType,
                    reason
                })
            });

            if (response.ok) {
                setSubmitted(true);
            } else {
                alert('Failed to submit request');
            }
        } catch (error) {
            console.error('Request submission error:', error);
            alert('Failed to submit request');
        } finally {
            setLoading(false);
        }
    };

    if (submitted) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-green-600">Request Submitted</CardTitle>
                </CardHeader>
                <CardContent>
                    <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                            Your data {requestType} request has been submitted and will be reviewed by our team. 
                            You will be notified when the request is processed.
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Data Privacy Requests</CardTitle>
                <CardDescription>
                    Request deletion or export of your personal data
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {!requestType ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Button
                            variant="outline"
                            className="h-24 flex flex-col items-center space-y-2"
                            onClick={() => setRequestType('deletion')}
                        >
                            <Trash2 className="h-6 w-6 text-red-600" />
                            <span>Delete My Data</span>
                        </Button>
                        
                        <Button
                            variant="outline"
                            className="h-24 flex flex-col items-center space-y-2"
                            onClick={() => setRequestType('export')}
                        >
                            <Download className="h-6 w-6 text-blue-600" />
                            <span>Export My Data</span>
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <Alert>
                            <Info className="h-4 w-4" />
                            <AlertDescription>
                                {requestType === 'deletion' 
                                    ? 'Requesting data deletion will permanently remove your account and all associated data. This action cannot be undone.'
                                    : 'Requesting data export will provide you with a copy of all your personal data stored in our system.'
                                }
                            </AlertDescription>
                        </Alert>

                        <div>
                            <label className="block text-sm font-medium mb-2">
                                Reason for request (optional)
                            </label>
                            <Textarea
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="Please provide a reason for your request..."
                                rows={3}
                            />
                        </div>

                        <div className="flex gap-2">
                            <Button
                                onClick={submitRequest}
                                disabled={loading}
                                className={requestType === 'deletion' ? 'bg-red-600 hover:bg-red-700' : ''}
                            >
                                {loading ? 'Submitting...' : `Submit ${requestType} Request`}
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => setRequestType(null)}
                                disabled={loading}
                            >
                                Cancel
                            </Button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default DataRetentionRequest;