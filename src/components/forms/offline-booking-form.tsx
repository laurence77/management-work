/**
 * Offline-Capable Booking Form
 * Allows users to create bookings while offline, storing them for later sync
 */

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Calendar, MapPin, Clock, DollarSign, User, Mail, Phone, Save, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { offlineStorage } from '@/utils/offline-storage';
import { useOfflineStatus } from '@/hooks/usePWA';

const bookingSchema = z.object({
  celebrityId: z.string().min(1, 'Please select a celebrity'),
  serviceId: z.string().min(1, 'Please select a service'),
  eventDate: z.string().min(1, 'Event date is required'),
  eventTime: z.string().min(1, 'Event time is required'),
  duration: z.number().min(1, 'Duration must be at least 1 hour'),
  location: z.string().min(1, 'Location is required'),
  clientName: z.string().min(2, 'Name must be at least 2 characters'),
  clientEmail: z.string().email('Please enter a valid email'),
  clientPhone: z.string().min(10, 'Please enter a valid phone number'),
  requirements: z.string().optional(),
  specialRequests: z.string().optional(),
  budgetRange: z.string().min(1, 'Please select a budget range'),
  eventType: z.string().min(1, 'Please select event type'),
  guestCount: z.number().min(1, 'Guest count must be at least 1'),
  cateringNeeded: z.boolean().optional(),
  transportNeeded: z.boolean().optional(),
  accommodationNeeded: z.boolean().optional()
});

type BookingFormData = z.infer<typeof bookingSchema>;

interface OfflineBookingFormProps {
  celebrityId?: string;
  serviceId?: string;
  onSuccess?: (bookingId: string) => void;
  onCancel?: () => void;
}

const eventTypes = [
  'Corporate Event',
  'Private Party',
  'Wedding',
  'Birthday Party',
  'Product Launch',
  'Charity Gala',
  'Awards Ceremony',
  'Conference',
  'Other'
];

const budgetRanges = [
  '$5,000 - $10,000',
  '$10,000 - $25,000',
  '$25,000 - $50,000',
  '$50,000 - $100,000',
  '$100,000+'
];

export function OfflineBookingForm({ 
  celebrityId, 
  serviceId, 
  onSuccess, 
  onCancel 
}: OfflineBookingFormProps) {
  const { toast } = useToast();
  const { isOnline } = useOfflineStatus();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cachedCelebrities, setCachedCelebrities] = useState<any[]>([]);

  const form = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      celebrityId: celebrityId || '',
      serviceId: serviceId || '',
      eventDate: '',
      eventTime: '',
      duration: 2,
      location: '',
      clientName: '',
      clientEmail: '',
      clientPhone: '',
      requirements: '',
      specialRequests: '',
      budgetRange: '',
      eventType: '',
      guestCount: 50,
      cateringNeeded: false,
      transportNeeded: false,
      accommodationNeeded: false
    }
  });

  // Load cached celebrities for offline browsing
  useEffect(() => {
    const loadCachedData = async () => {
      try {
        const celebrities = await offlineStorage.getCachedCelebrities();
        setCachedCelebrities(celebrities.map(c => c.data));
      } catch (error) {
        console.error('Failed to load cached celebrities:', error);
      }
    };

    loadCachedData();
  }, []);

  const onSubmit = async (data: BookingFormData) => {
    setIsSubmitting(true);
    
    try {
      // Calculate estimated pricing
      const basePrice = getBudgetRangeValue(data.budgetRange);
      const additionalFees = calculateAdditionalFees(data);
      const total = basePrice + additionalFees;

      const bookingData = {
        celebrityId: data.celebrityId,
        serviceId: data.serviceId,
        eventDate: `${data.eventDate}T${data.eventTime}`,
        clientInfo: {
          name: data.clientName,
          email: data.clientEmail,
          phone: data.clientPhone
        },
        eventDetails: {
          location: data.location,
          duration: data.duration,
          eventType: data.eventType,
          guestCount: data.guestCount,
          requirements: data.requirements ? [data.requirements] : [],
          specialRequests: data.specialRequests || '',
          cateringNeeded: data.cateringNeeded || false,
          transportNeeded: data.transportNeeded || false,
          accommodationNeeded: data.accommodationNeeded || false
        },
        pricing: {
          basePrice,
          additionalFees,
          total
        },
        status: 'draft' as const
      };

      if (isOnline) {
        // Try to submit online first
        try {
          const response = await fetch('/api/bookings', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(bookingData)
          });

          if (response.ok) {
            const result = await response.json();
            toast({
              title: "Booking Submitted",
              description: "Your booking request has been submitted successfully.",
            });
            onSuccess?.(result.id);
            return;
          } else {
            throw new Error('Online submission failed');
          }
        } catch (error) {
          console.warn('Online submission failed, storing offline:', error);
        }
      }

      // Store offline
      const bookingId = await offlineStorage.storeBooking(bookingData);
      
      toast({
        title: isOnline ? "Booking Saved Offline" : "Booking Saved",
        description: isOnline 
          ? "Online submission failed, but your booking has been saved and will be submitted when connection improves."
          : "Your booking has been saved offline and will be submitted when you're back online.",
        variant: isOnline ? "default" : "default",
      });

      onSuccess?.(bookingId);

    } catch (error) {
      console.error('Booking submission failed:', error);
      toast({
        title: "Booking Failed",
        description: "Failed to save your booking. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getBudgetRangeValue = (range: string): number => {
    const ranges: Record<string, number> = {
      '$5,000 - $10,000': 7500,
      '$10,000 - $25,000': 17500,
      '$25,000 - $50,000': 37500,
      '$50,000 - $100,000': 75000,
      '$100,000+': 150000
    };
    return ranges[range] || 0;
  };

  const calculateAdditionalFees = (data: BookingFormData): number => {
    let fees = 0;
    if (data.cateringNeeded) fees += 2000;
    if (data.transportNeeded) fees += 1500;
    if (data.accommodationNeeded) fees += 3000;
    if (data.guestCount > 100) fees += 1000;
    return fees;
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Book Celebrity Experience
            </CardTitle>
            <CardDescription>
              Fill out this form to request a celebrity booking for your event
            </CardDescription>
          </div>
          
          <div className="flex items-center gap-2">
            {isOnline ? (
              <Badge variant="default" className="bg-green-100 text-green-800">
                <Wifi className="h-3 w-3 mr-1" />
                Online
              </Badge>
            ) : (
              <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                <WifiOff className="h-3 w-3 mr-1" />
                Offline Mode
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Celebrity and Service Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="celebrityId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Celebrity</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a celebrity" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {cachedCelebrities.map((celebrity) => (
                          <SelectItem key={celebrity.id} value={celebrity.id}>
                            {celebrity.name} - {celebrity.category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="eventType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Event Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select event type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {eventTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Event Details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="eventDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Event Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="eventTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Event Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration (hours)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="1" 
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Location and Guest Count */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Event Location</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter event location" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="guestCount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expected Guest Count</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="1" 
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Client Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <User className="h-5 w-5" />
                Contact Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="clientName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Your full name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="clientEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="your@email.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="clientPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input placeholder="(555) 123-4567" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Budget and Additional Services */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Budget & Services
              </h3>

              <FormField
                control={form.control}
                name="budgetRange"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Budget Range</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select your budget range" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {budgetRanges.map((range) => (
                          <SelectItem key={range} value={range}>
                            {range}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Requirements */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="requirements"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Special Requirements</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Any specific requirements for the event..."
                        className="min-h-[80px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Please describe any specific needs, preferences, or requirements
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Offline notice */}
            {!isOnline && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-orange-800">
                  <WifiOff className="h-4 w-4" />
                  <span className="font-medium">Offline Mode</span>
                </div>
                <p className="text-sm text-orange-700 mt-1">
                  Your booking will be saved locally and submitted automatically when your internet connection is restored.
                </p>
              </div>
            )}

            {/* Form Actions */}
            <div className="flex gap-4 pt-4">
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? (
                  <>
                    <Save className="h-4 w-4 mr-2 animate-pulse" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    {isOnline ? 'Submit Booking' : 'Save Booking'}
                  </>
                )}
              </Button>
              
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}