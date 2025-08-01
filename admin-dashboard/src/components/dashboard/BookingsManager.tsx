import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Calendar, Search, Filter, Eye, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Booking } from '@/types';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/useToast';
import { TableSkeleton } from '@/components/ui/loading-spinner';

interface BookingsManagerProps {
  onBookingUpdate?: () => void;
}

export const BookingsManager = ({ onBookingUpdate }: BookingsManagerProps) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    try {
      setLoading(true);
      const data = await api.getBookings();
      setBookings(data);
    } catch (error: any) {
      console.error('Failed to load bookings:', error);
      toast({
        title: 'Failed to load bookings',
        description: error.message || 'Something went wrong.',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateBookingStatus = async (bookingId: string, status: string) => {
    try {
      await api.updateBookingStatus(bookingId, { status });
      await loadBookings();
      onBookingUpdate?.();
      
      toast({
        title: 'Booking updated',
        description: `Booking status changed to ${status}.`,
        type: 'success',
      });
    } catch (error: any) {
      console.error('Failed to update booking:', error);
      toast({
        title: 'Update failed',
        description: error.message || 'Failed to update booking status.',
        type: 'error',
      });
    }
  };

  const filteredBookings = bookings.filter(booking => {
    const matchesFilter = filter === 'all' || booking.status === filter;
    const matchesSearch = searchTerm === '' || 
      booking.contact_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.contact_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.celebrity?.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesFilter && matchesSearch;
  });

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'confirmed': return 'default';
      case 'pending': return 'secondary';
      case 'cancelled': return 'destructive';
      case 'completed': return 'outline';
      default: return 'secondary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed': return <CheckCircle className="h-3 w-3" />;
      case 'pending': return <Clock className="h-3 w-3" />;
      case 'cancelled': return <XCircle className="h-3 w-3" />;
      case 'completed': return <CheckCircle className="h-3 w-3" />;
      default: return <Clock className="h-3 w-3" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Bookings Management</CardTitle>
          <CardDescription>
            Manage customer bookings and reservations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TableSkeleton rows={5} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bookings Management</CardTitle>
        <CardDescription>
          Manage customer bookings and reservations
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search bookings..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-40">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Bookings List */}
        <div className="space-y-4">
          {filteredBookings.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchTerm || filter !== 'all' ? 'No bookings match your filters' : 'No bookings found'}
            </div>
          ) : (
            filteredBookings.map((booking) => (
              <BookingCard 
                key={booking.id} 
                booking={booking} 
                onStatusUpdate={updateBookingStatus}
              />
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const BookingCard = ({ 
  booking, 
  onStatusUpdate 
}: { 
  booking: Booking; 
  onStatusUpdate: (id: string, status: string) => void; 
}) => {
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'confirmed': return 'default';
      case 'pending': return 'secondary';
      case 'cancelled': return 'destructive';
      case 'completed': return 'outline';
      default: return 'secondary';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-2">
          <div className="flex items-center space-x-3">
            <h4 className="font-medium text-gray-900">
              {booking.celebrity?.name || 'Unknown Celebrity'}
            </h4>
            <Badge variant={getStatusBadgeVariant(booking.status)}>
              {booking.status}
            </Badge>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
            <div>
              <p><strong>Client:</strong> {booking.contact_name}</p>
              <p><strong>Email:</strong> {booking.contact_email}</p>
              <p><strong>Phone:</strong> {booking.contact_phone}</p>
            </div>
            <div>
              <p><strong>Event Date:</strong> {formatDate(booking.event_date)}</p>
              <p><strong>Duration:</strong> {booking.event_duration} hours</p>
              <p><strong>Type:</strong> {booking.event_type}</p>
              <p><strong>Location:</strong> {booking.event_location}</p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-lg font-semibold text-gray-900">
              ${booking.total_amount.toLocaleString()}
            </div>
            <div className="text-sm text-gray-500">
              Payment: {booking.payment_status}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 ml-4">
          {booking.status === 'pending' && (
            <>
              <Button
                size="sm"
                onClick={() => onStatusUpdate(booking.id, 'confirmed')}
                className="text-xs"
              >
                Confirm
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onStatusUpdate(booking.id, 'cancelled')}
                className="text-xs"
              >
                Cancel
              </Button>
            </>
          )}
          {booking.status === 'confirmed' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onStatusUpdate(booking.id, 'completed')}
              className="text-xs"
            >
              Mark Complete
            </Button>
          )}
          <Button size="sm" variant="ghost" className="text-xs">
            <Eye className="h-3 w-3 mr-1" />
            View Details
          </Button>
        </div>
      </div>
    </div>
  );
};