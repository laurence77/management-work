/**
 * Offline Data Viewer Component
 * Shows users their offline data and sync status
 */

import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Mail, 
  User, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Trash2, 
  Upload,
  Eye,
  EyeOff,
  Database,
  RotateCw
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { offlineStorage, BookingData, ContactFormData } from '@/utils/offline-storage';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { cn } from '@/lib/utils';

interface OfflineStats {
  bookings: number;
  contactForms: number;
  celebrities: number;
  totalRecords: number;
}

export function OfflineDataViewer() {
  const { toast } = useToast();
  const { performSync, isSyncing, isOnline } = useOfflineSync();
  const [stats, setStats] = useState<OfflineStats>({
    bookings: 0,
    contactForms: 0,
    celebrities: 0,
    totalRecords: 0
  });
  const [bookings, setBookings] = useState<BookingData[]>([]);
  const [contactForms, setContactForms] = useState<ContactFormData[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<BookingData | null>(null);
  const [selectedContact, setSelectedContact] = useState<ContactFormData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadOfflineData = async () => {
    try {
      setLoading(true);
      const [offlineBookings, offlineContacts, storageStats] = await Promise.all([
        offlineStorage.getOfflineBookings(),
        offlineStorage.getUnsyncedContactForms(),
        offlineStorage.getStorageStats()
      ]);

      setBookings(offlineBookings);
      setContactForms(offlineContacts);
      setStats(storageStats);
    } catch (error) {
      console.error('Failed to load offline data:', error);
      toast({
        title: "Error",
        description: "Failed to load offline data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOfflineData();
    
    // Refresh data every 30 seconds
    const interval = setInterval(loadOfflineData, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleSyncAll = async () => {
    try {
      await performSync();
      await loadOfflineData(); // Refresh data after sync
      toast({
        title: "Sync Initiated",
        description: "Attempting to sync all offline data",
      });
    } catch (error) {
      toast({
        title: "Sync Failed",
        description: "Failed to start sync process",
        variant: "destructive"
      });
    }
  };

  const handleClearAllData = async () => {
    try {
      await offlineStorage.clearAllData();
      await loadOfflineData();
      toast({
        title: "Data Cleared",
        description: "All offline data has been cleared",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to clear offline data",
        variant: "destructive"
      });
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const getStatusBadge = (synced: boolean) => {
    return synced ? (
      <Badge variant="default" className="bg-green-100 text-green-800">
        <CheckCircle className="h-3 w-3 mr-1" />
        Synced
      </Badge>
    ) : (
      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
        <Clock className="h-3 w-3 mr-1" />
        Pending
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RotateCw className="h-6 w-6 animate-spin mr-2" />
            Loading offline data...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Offline Data Manager
            </CardTitle>
            <CardDescription>
              View and manage your offline data and sync status
            </CardDescription>
          </div>
          
          <div className="flex gap-2">
            <Button
              onClick={handleSyncAll}
              disabled={!isOnline || isSyncing}
              variant="default"
            >
              {isSyncing ? (
                <>
                  <RotateCw className="h-4 w-4 mr-2 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Sync All
                </>
              )}
            </Button>
            
            <Button
              onClick={handleClearAllData}
              variant="destructive"
              size="sm"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear All
            </Button>
          </div>
        </div>

        {/* Stats overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{stats.bookings}</div>
            <div className="text-sm text-blue-800">Bookings</div>
          </div>
          <div className="bg-green-50 p-3 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{stats.contactForms}</div>
            <div className="text-sm text-green-800">Contact Forms</div>
          </div>
          <div className="bg-purple-50 p-3 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">{stats.celebrities}</div>
            <div className="text-sm text-purple-800">Cached Celebrities</div>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-2xl font-bold text-gray-600">{stats.totalRecords}</div>
            <div className="text-sm text-gray-800">Total Records</div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="bookings" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="bookings">
              Bookings ({bookings.length})
            </TabsTrigger>
            <TabsTrigger value="contacts">
              Contact Forms ({contactForms.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="bookings" className="space-y-4">
            {bookings.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No offline bookings found
              </div>
            ) : (
              <div className="space-y-3">
                {bookings.map((booking) => (
                  <Card key={booking.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            Event: {booking.data.eventDetails.eventType || 'Private Event'}
                          </span>
                          {getStatusBadge(booking.synced)}
                        </div>
                        
                        <div className="text-sm text-muted-foreground space-y-1">
                          <div className="flex items-center gap-2">
                            <User className="h-3 w-3" />
                            {booking.data.clientInfo.name} ({booking.data.clientInfo.email})
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-3 w-3" />
                            Created: {formatDate(booking.timestamp)}
                          </div>
                        </div>
                      </div>

                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedBooking(booking)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Booking Details</DialogTitle>
                            <DialogDescription>
                              Offline booking created on {formatDate(booking.timestamp)}
                            </DialogDescription>
                          </DialogHeader>
                          
                          {selectedBooking && (
                            <ScrollArea className="max-h-96">
                              <div className="space-y-4">
                                <div>
                                  <h4 className="font-medium mb-2">Client Information</h4>
                                  <div className="bg-gray-50 p-3 rounded text-sm space-y-1">
                                    <div><strong>Name:</strong> {selectedBooking.data.clientInfo.name}</div>
                                    <div><strong>Email:</strong> {selectedBooking.data.clientInfo.email}</div>
                                    <div><strong>Phone:</strong> {selectedBooking.data.clientInfo.phone}</div>
                                  </div>
                                </div>

                                <div>
                                  <h4 className="font-medium mb-2">Event Details</h4>
                                  <div className="bg-gray-50 p-3 rounded text-sm space-y-1">
                                    <div><strong>Date:</strong> {selectedBooking.data.eventDate}</div>
                                    <div><strong>Location:</strong> {selectedBooking.data.eventDetails.location}</div>
                                    <div><strong>Duration:</strong> {selectedBooking.data.eventDetails.duration} hours</div>
                                    <div><strong>Guest Count:</strong> {selectedBooking.data.eventDetails.guestCount}</div>
                                  </div>
                                </div>

                                <div>
                                  <h4 className="font-medium mb-2">Pricing</h4>
                                  <div className="bg-gray-50 p-3 rounded text-sm space-y-1">
                                    <div><strong>Base Price:</strong> ${selectedBooking.data.pricing.basePrice.toLocaleString()}</div>
                                    <div><strong>Additional Fees:</strong> ${selectedBooking.data.pricing.additionalFees.toLocaleString()}</div>
                                    <div><strong>Total:</strong> ${selectedBooking.data.pricing.total.toLocaleString()}</div>
                                  </div>
                                </div>

                                {selectedBooking.data.eventDetails.requirements.length > 0 && (
                                  <div>
                                    <h4 className="font-medium mb-2">Requirements</h4>
                                    <div className="bg-gray-50 p-3 rounded text-sm">
                                      {selectedBooking.data.eventDetails.requirements.join(', ')}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </ScrollArea>
                          )}
                        </DialogContent>
                      </Dialog>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="contacts" className="space-y-4">
            {contactForms.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No offline contact forms found
              </div>
            ) : (
              <div className="space-y-3">
                {contactForms.map((contact) => (
                  <Card key={contact.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {contact.data.subject}
                          </span>
                          {getStatusBadge(contact.synced)}
                        </div>
                        
                        <div className="text-sm text-muted-foreground space-y-1">
                          <div className="flex items-center gap-2">
                            <User className="h-3 w-3" />
                            {contact.data.name} ({contact.data.email})
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-3 w-3" />
                            Created: {formatDate(contact.timestamp)}
                          </div>
                        </div>
                      </div>

                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedContact(contact)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Contact Form Details</DialogTitle>
                            <DialogDescription>
                              Contact form created on {formatDate(contact.timestamp)}
                            </DialogDescription>
                          </DialogHeader>
                          
                          {selectedContact && (
                            <div className="space-y-4">
                              <div className="bg-gray-50 p-3 rounded text-sm space-y-2">
                                <div><strong>Name:</strong> {selectedContact.data.name}</div>
                                <div><strong>Email:</strong> {selectedContact.data.email}</div>
                                {selectedContact.data.phone && (
                                  <div><strong>Phone:</strong> {selectedContact.data.phone}</div>
                                )}
                                <div><strong>Type:</strong> {selectedContact.data.type}</div>
                                <div><strong>Subject:</strong> {selectedContact.data.subject}</div>
                              </div>
                              
                              <div>
                                <strong className="text-sm">Message:</strong>
                                <div className="bg-gray-50 p-3 rounded mt-1 text-sm">
                                  {selectedContact.data.message}
                                </div>
                              </div>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}