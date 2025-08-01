import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileText, 
  Search, 
  Calendar,
  User,
  Mail,
  Phone,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Download,
  Filter
} from 'lucide-react';
import { api } from '@/lib/api';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface FormSubmission {
  id: number;
  type: string;
  fullName: string;
  email: string;
  phone?: string;
  status: string;
  submittedAt: string;
  data: any;
}

export const FormsManager = () => {
  const [representations, setRepresentations] = useState<FormSubmission[]>([]);
  const [consultations, setConsultations] = useState<FormSubmission[]>([]);
  const [serviceRequests, setServiceRequests] = useState<FormSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');

  useEffect(() => {
    loadFormSubmissions();
  }, []);

  const loadFormSubmissions = async () => {
    try {
      setLoading(true);
      const [repResponse, consultResponse, serviceResponse] = await Promise.all([
        api.request<FormSubmission[]>('/admin/forms/representation'),
        api.request<FormSubmission[]>('/admin/forms/consultation'),
        api.request<FormSubmission[]>('/admin/forms/service-requests')
      ]);
      
      setRepresentations(repResponse.data || []);
      setConsultations(consultResponse.data || []);
      setServiceRequests(serviceResponse.data || []);
    } catch (error) {
      console.error('Failed to load form submissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'contacted': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'approved': return <CheckCircle className="h-4 w-4" />;
      case 'rejected': return <XCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const filterSubmissions = (submissions: FormSubmission[]) => {
    return submissions.filter(submission => {
      const matchesSearch = submission.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           submission.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = selectedStatus === 'all' || submission.status === selectedStatus;
      return matchesSearch && matchesStatus;
    });
  };

  const FormSubmissionCard = ({ submission, type }: { submission: FormSubmission; type: string }) => (
    <div className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <h4 className="font-medium text-gray-900">{submission.fullName}</h4>
          <Badge className={getStatusColor(submission.status)}>
            {getStatusIcon(submission.status)}
            <span className="ml-1 capitalize">{submission.status}</span>
          </Badge>
        </div>
        <span className="text-sm text-gray-500">
          {new Date(submission.submittedAt).toLocaleDateString()}
        </span>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        <div className="flex items-center text-sm text-gray-600">
          <Mail className="h-4 w-4 mr-2" />
          {submission.email}
        </div>
        {submission.phone && (
          <div className="flex items-center text-sm text-gray-600">
            <Phone className="h-4 w-4 mr-2" />
            {submission.phone}
          </div>
        )}
      </div>
      
      {/* Type-specific content */}
      {type === 'representation' && submission.data?.category && (
        <p className="text-sm text-gray-600 mb-3">
          <strong>Category:</strong> {submission.data.category}
        </p>
      )}
      {type === 'consultation' && submission.data?.consultationType && (
        <p className="text-sm text-gray-600 mb-3">
          <strong>Type:</strong> {submission.data.consultationType}
        </p>
      )}
      {type === 'service' && submission.data?.serviceName && (
        <p className="text-sm text-gray-600 mb-3">
          <strong>Service:</strong> {submission.data.serviceName}
        </p>
      )}
      
      <div className="flex items-center justify-between">
        <div className="flex items-center text-sm text-gray-500">
          <Calendar className="h-4 w-4 mr-1" />
          {new Date(submission.submittedAt).toLocaleString()}
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm">
            <Eye className="h-4 w-4 mr-1" />
            View Details
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" text="Loading form submissions..." />
      </div>
    );
  }

  const totalForms = representations.length + consultations.length + serviceRequests.length;
  const pendingForms = [...representations, ...consultations, ...serviceRequests]
    .filter(form => form.status === 'pending').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Form Submissions</h2>
          <p className="text-gray-600">Manage representation requests, consultations, and service inquiries</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Submissions</p>
                <p className="text-2xl font-bold text-gray-900">{totalForms}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Review</p>
                <p className="text-2xl font-bold text-gray-900">{pendingForms}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Representation</p>
                <p className="text-2xl font-bold text-gray-900">{representations.length}</p>
              </div>
              <User className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Consultations</p>
                <p className="text-2xl font-bold text-gray-900">{consultations.length}</p>
              </div>
              <Calendar className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={selectedStatus === 'all' ? 'default' : 'outline'}
                onClick={() => setSelectedStatus('all')}
                size="sm"
              >
                All
              </Button>
              <Button
                variant={selectedStatus === 'pending' ? 'default' : 'outline'}
                onClick={() => setSelectedStatus('pending')}
                size="sm"
              >
                Pending
              </Button>
              <Button
                variant={selectedStatus === 'approved' ? 'default' : 'outline'}
                onClick={() => setSelectedStatus('approved')}
                size="sm"
              >
                Approved
              </Button>
              <Button
                variant={selectedStatus === 'contacted' ? 'default' : 'outline'}
                onClick={() => setSelectedStatus('contacted')}
                size="sm"
              >
                Contacted
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Tabs for different form types */}
      <Tabs defaultValue="representation" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="representation">
            Representation Requests ({representations.length})
          </TabsTrigger>
          <TabsTrigger value="consultations">
            Consultations ({consultations.length})
          </TabsTrigger>
          <TabsTrigger value="services">
            Service Requests ({serviceRequests.length})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="representation" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Representation Applications</CardTitle>
              <CardDescription>
                Artists and performers seeking management representation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {filterSubmissions(representations).length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No applications found</h3>
                  <p className="text-gray-600">No representation applications match your search criteria.</p>
                </div>
              ) : (
                filterSubmissions(representations).map((submission) => (
                  <FormSubmissionCard key={submission.id} submission={submission} type="representation" />
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="consultations" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Consultation Requests</CardTitle>
              <CardDescription>
                Clients requesting consultation appointments
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {filterSubmissions(consultations).length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No consultations found</h3>
                  <p className="text-gray-600">No consultation requests match your search criteria.</p>
                </div>
              ) : (
                filterSubmissions(consultations).map((submission) => (
                  <FormSubmissionCard key={submission.id} submission={submission} type="consultation" />
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="services" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Service Requests</CardTitle>
              <CardDescription>
                Requests for celebrity services and bookings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {filterSubmissions(serviceRequests).length === 0 ? (
                <div className="text-center py-8">
                  <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No service requests found</h3>
                  <p className="text-gray-600">No service requests match your search criteria.</p>
                </div>
              ) : (
                filterSubmissions(serviceRequests).map((submission) => (
                  <FormSubmissionCard key={submission.id} submission={submission} type="service" />
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};