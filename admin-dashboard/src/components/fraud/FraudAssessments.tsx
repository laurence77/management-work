import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Shield, 
  Search, 
  Filter, 
  Eye, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Clock,
  User,
  DollarSign,
  Calendar,
  ExternalLink
} from 'lucide-react';
import { useToast } from '@/hooks/useToast';

interface RiskFactor {
  type: string;
  severity: string;
  description: string;
}

interface FraudAssessment {
  id: number;
  booking_id: number;
  risk_score: number;
  risk_level: string;
  risk_factors: RiskFactor[];
  requires_review: boolean;
  auto_block: boolean;
  review_status: string;
  reviewer_notes?: string;
  created_at: string;
  bookings?: {
    id: number;
    client_email: string;
    client_name: string;
    celebrity_name: string;
    budget: number;
    status: string;
    event_date: string;
  };
}

export const FraudAssessments = () => {
  const [assessments, setAssessments] = useState<FraudAssessment[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedAssessment, setSelectedAssessment] = useState<FraudAssessment | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [updating, setUpdating] = useState(false);
  const { toast } = useToast();

  const fetchAssessments = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (riskFilter) params.append('risk_level', riskFilter);
      if (statusFilter) params.append('review_status', statusFilter);
      
      const response = await fetch(`/api/fraud/assessments?${params}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAssessments(data.assessments || []);
      }
    } catch (error) {
      console.error('Failed to fetch fraud assessments:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateAssessmentStatus = async (assessmentId: number, status: string) => {
    try {
      setUpdating(true);
      const response = await fetch(`/api/fraud/assessments/${assessmentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          status,
          reviewer_notes: reviewNotes
        })
      });

      if (response.ok) {
        toast({
          title: 'Assessment Updated',
          description: `Assessment marked as ${status}`,
          type: 'success'
        });
        
        setSelectedAssessment(null);
        setReviewNotes('');
        await fetchAssessments();
      } else {
        throw new Error('Failed to update assessment');
      }
    } catch (error) {
      console.error('Update assessment error:', error);
      toast({
        title: 'Update Failed',
        description: 'Failed to update assessment status',
        type: 'error'
      });
    } finally {
      setUpdating(false);
    }
  };

  const getRiskBadge = (level: string) => {
    switch (level) {
      case 'HIGH':
        return <Badge className="bg-red-100 text-red-800 border-red-300">High Risk</Badge>;
      case 'MEDIUM':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">Medium Risk</Badge>;
      case 'LOW':
        return <Badge className="bg-green-100 text-green-800 border-green-300">Low Risk</Badge>;
      default:
        return <Badge variant="outline">{level}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800 border-green-300"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800 border-red-300"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      case 'under_review':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-300"><Eye className="h-3 w-3 mr-1" />Under Review</Badge>;
      case 'escalated':
        return <Badge className="bg-purple-100 text-purple-800 border-purple-300"><AlertTriangle className="h-3 w-3 mr-1" />Escalated</Badge>;
      default:
        return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'HIGH':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'MEDIUM':
        return <Eye className="h-4 w-4 text-yellow-500" />;
      default:
        return <Shield className="h-4 w-4 text-blue-500" />;
    }
  };

  const filteredAssessments = assessments.filter(assessment => {
    const matchesSearch = searchTerm === '' || 
      assessment.bookings?.client_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assessment.bookings?.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assessment.bookings?.celebrity_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  useEffect(() => {
    fetchAssessments();
  }, [riskFilter, statusFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center space-x-2">
            <Shield className="h-8 w-8 text-blue-600" />
            <span>Fraud Assessments</span>
          </h1>
          <p className="text-gray-600 mt-1">Review and manage fraud risk assessments</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by client email, name, or celebrity..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={riskFilter} onValueChange={setRiskFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Risk Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Risk Levels</SelectItem>
                <SelectItem value="HIGH">High Risk</SelectItem>
                <SelectItem value="MEDIUM">Medium Risk</SelectItem>
                <SelectItem value="LOW">Low Risk</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Review Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="under_review">Under Review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="escalated">Escalated</SelectItem>
              </SelectContent>
            </Select>

            <Button onClick={fetchAssessments} variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Assessments List */}
      <div className="grid grid-cols-1 gap-6">
        {loading ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading assessments...</p>
            </CardContent>
          </Card>
        ) : filteredAssessments.length > 0 ? (
          filteredAssessments.map((assessment) => (
            <Card key={assessment.id} className="overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        assessment.risk_level === 'HIGH' ? 'bg-red-100' :
                        assessment.risk_level === 'MEDIUM' ? 'bg-yellow-100' : 'bg-green-100'
                      }`}>
                        <span className={`text-xl font-bold ${
                          assessment.risk_level === 'HIGH' ? 'text-red-600' :
                          assessment.risk_level === 'MEDIUM' ? 'text-yellow-600' : 'text-green-600'
                        }`}>
                          {assessment.risk_score}
                        </span>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="font-semibold text-lg">
                          Assessment #{assessment.id}
                        </h3>
                        {getRiskBadge(assessment.risk_level)}
                        {getStatusBadge(assessment.review_status)}
                      </div>
                      
                      {assessment.bookings && (
                        <div className="text-sm text-gray-600 space-y-1">
                          <div className="flex items-center space-x-4">
                            <span className="flex items-center space-x-1">
                              <User className="h-3 w-3" />
                              <span>{assessment.bookings.client_name}</span>
                            </span>
                            <span className="flex items-center space-x-1">
                              <DollarSign className="h-3 w-3" />
                              <span>{formatCurrency(assessment.bookings.budget)}</span>
                            </span>
                            <span className="flex items-center space-x-1">
                              <Calendar className="h-3 w-3" />
                              <span>{new Date(assessment.bookings.event_date).toLocaleDateString()}</span>
                            </span>
                          </div>
                          <p>Celebrity: {assessment.bookings.celebrity_name}</p>
                          <p>Email: {assessment.bookings.client_email}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      onClick={() => setSelectedAssessment(assessment)}
                      variant="outline"
                      size="sm"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Review
                    </Button>
                    
                    {assessment.bookings && (
                      <Button
                        onClick={() => window.location.href = `/bookings/${assessment.booking_id}`}
                        variant="outline"
                        size="sm"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Risk Factors Preview */}
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Risk Factors ({assessment.risk_factors.length})</h4>
                  <div className="flex flex-wrap gap-2">
                    {assessment.risk_factors.slice(0, 3).map((factor, index) => (
                      <div key={index} className="flex items-center space-x-1 px-2 py-1 bg-gray-100 rounded text-xs">
                        {getSeverityIcon(factor.severity)}
                        <span>{factor.type.replace(/_/g, ' ')}</span>
                      </div>
                    ))}
                    {assessment.risk_factors.length > 3 && (
                      <span className="text-xs text-gray-500 px-2 py-1">
                        +{assessment.risk_factors.length - 3} more
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t text-xs text-gray-500">
                  <span>Created: {new Date(assessment.created_at).toLocaleString()}</span>
                  {assessment.requires_review && (
                    <Badge variant="outline" className="ml-2">Requires Review</Badge>
                  )}
                  {assessment.auto_block && (
                    <Badge variant="destructive" className="ml-2">Auto Blocked</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <Shield className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No assessments found</h3>
              <p className="text-gray-600">No fraud assessments match your current filters.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Assessment Detail Modal */}
      {selectedAssessment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">
                  Assessment #{selectedAssessment.id} - Risk Score: {selectedAssessment.risk_score}
                </h2>
                <Button
                  onClick={() => setSelectedAssessment(null)}
                  variant="outline"
                  size="sm"
                >
                  ✕
                </Button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Assessment Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Risk Level</label>
                  <div className="mt-1">{getRiskBadge(selectedAssessment.risk_level)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Review Status</label>
                  <div className="mt-1">{getStatusBadge(selectedAssessment.review_status)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Created</label>
                  <p className="mt-1 text-sm">{new Date(selectedAssessment.created_at).toLocaleString()}</p>
                </div>
              </div>

              {/* Booking Details */}
              {selectedAssessment.bookings && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-medium mb-3">Booking Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Client:</span> {selectedAssessment.bookings.client_name}
                    </div>
                    <div>
                      <span className="font-medium">Email:</span> {selectedAssessment.bookings.client_email}
                    </div>
                    <div>
                      <span className="font-medium">Celebrity:</span> {selectedAssessment.bookings.celebrity_name}
                    </div>
                    <div>
                      <span className="font-medium">Budget:</span> {formatCurrency(selectedAssessment.bookings.budget)}
                    </div>
                    <div>
                      <span className="font-medium">Event Date:</span> {new Date(selectedAssessment.bookings.event_date).toLocaleDateString()}
                    </div>
                    <div>
                      <span className="font-medium">Status:</span> {selectedAssessment.bookings.status}
                    </div>
                  </div>
                </div>
              )}

              {/* Risk Factors */}
              <div>
                <h3 className="font-medium mb-3">Risk Factors ({selectedAssessment.risk_factors.length})</h3>
                <div className="space-y-2">
                  {selectedAssessment.risk_factors.map((factor, index) => (
                    <div key={index} className="flex items-start space-x-3 p-3 border rounded-lg">
                      {getSeverityIcon(factor.severity)}
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-sm">{factor.type.replace(/_/g, ' ')}</span>
                          <Badge variant="outline" className="text-xs">
                            {factor.severity}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{factor.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Review Section */}
              {selectedAssessment.review_status === 'pending' && (
                <div className="border-t pt-6">
                  <h3 className="font-medium mb-3">Review Assessment</h3>
                  <textarea
                    placeholder="Add review notes..."
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    className="w-full p-3 border rounded-lg"
                    rows={3}
                  />
                  
                  <div className="flex space-x-3 mt-4">
                    <Button
                      onClick={() => updateAssessmentStatus(selectedAssessment.id, 'approved')}
                      disabled={updating}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve
                    </Button>
                    
                    <Button
                      onClick={() => updateAssessmentStatus(selectedAssessment.id, 'rejected')}
                      disabled={updating}
                      variant="destructive"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                    
                    <Button
                      onClick={() => updateAssessmentStatus(selectedAssessment.id, 'under_review')}
                      disabled={updating}
                      variant="outline"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Mark Under Review
                    </Button>
                    
                    <Button
                      onClick={() => updateAssessmentStatus(selectedAssessment.id, 'escalated')}
                      disabled={updating}
                      variant="outline"
                    >
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Escalate
                    </Button>
                  </div>
                </div>
              )}

              {/* Existing Review Notes */}
              {selectedAssessment.reviewer_notes && (
                <div className="border-t pt-6">
                  <h3 className="font-medium mb-3">Review Notes</h3>
                  <p className="text-sm text-gray-600 p-3 bg-gray-50 rounded-lg">
                    {selectedAssessment.reviewer_notes}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};