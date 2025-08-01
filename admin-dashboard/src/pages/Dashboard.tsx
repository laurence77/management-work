import { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CelebrityManager } from '@/components/CelebrityManager';
import { SiteSettingsManager } from '@/components/SiteSettingsManager';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { StatsOverview } from '@/components/dashboard/StatsOverview';
import { RecentCelebrities } from '@/components/dashboard/RecentCelebrities';
import { SiteInfo } from '@/components/dashboard/SiteInfo';
import { BookingsManager } from '@/components/dashboard/BookingsManager';
import { AutomationDashboard } from '@/components/automation/AutomationDashboard';
import { EmailSettingsManager } from '@/components/settings/EmailSettingsManager';
import { EmailTemplateManager } from '@/components/settings/EmailTemplateManager';
import { UsersManager } from '@/components/dashboard/UsersManager';
import { FormsManager } from '@/components/dashboard/FormsManager';
import { ServicePricingManager } from '@/components/settings/ServicePricingManager';
import { PaymentOptionsManager } from '@/components/settings/PaymentOptionsManager';
import { Celebrity, SiteSettings } from '@/types';
import { api } from '@/lib/api';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useRealtime, RealtimeEvent } from '@/hooks/useRealtime';

const Dashboard = () => {
  const [celebrities, setCelebrities] = useState<Celebrity[]>([]);
  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [celebsData, settingsData] = await Promise.all([
        api.getCelebrities(),
        api.getSiteSettings()
      ]);
      setCelebrities(celebsData);
      setSiteSettings(settingsData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle real-time celebrity changes
  const handleCelebrityChange = useCallback((event: RealtimeEvent, payload: any) => {
    const { new: newRecord, old: oldRecord } = payload;
    
    setCelebrities(prev => {
      switch (event) {
        case 'INSERT':
          return [...prev, newRecord];
        case 'UPDATE':
          return prev.map(celeb => 
            celeb.id === newRecord.id ? { ...celeb, ...newRecord } : celeb
          );
        case 'DELETE':
          return prev.filter(celeb => celeb.id !== oldRecord.id);
        default:
          return prev;
      }
    });
  }, []);

  // Handle real-time booking changes
  const handleBookingChange = useCallback((event: RealtimeEvent, payload: any) => {
    // For bookings, we might want to refresh the data or update specific components
    if (event === 'INSERT' || event === 'UPDATE') {
      // Optionally refresh celebrity booking counts
      setTimeout(() => {
        loadData();
      }, 1000);
    }
  }, []);

  // Handle real-time settings changes
  const handleSettingsChange = useCallback((event: RealtimeEvent, payload: any) => {
    if (event === 'UPDATE') {
      setSiteSettings(payload.new);
    }
  }, []);

  // Set up real-time subscriptions
  useRealtime({
    onCelebrityChange: handleCelebrityChange,
    onBookingChange: handleBookingChange,
    onSettingsChange: handleSettingsChange,
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading dashboard..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <DashboardHeader />

      <div className="container mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-7 mb-8">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="celebrities">Celebrities</TabsTrigger>
            <TabsTrigger value="bookings">Bookings</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="forms">Forms</TabsTrigger>
            <TabsTrigger value="automation">Automation</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-8">
            <StatsOverview celebrities={celebrities} />
            <RecentCelebrities celebrities={celebrities} />
            <SiteInfo siteSettings={siteSettings} />
          </TabsContent>

          <TabsContent value="celebrities">
            <CelebrityManager celebrities={celebrities} onUpdate={loadData} />
          </TabsContent>

          <TabsContent value="bookings">
            <BookingsManager onBookingUpdate={loadData} />
          </TabsContent>

          <TabsContent value="users">
            <UsersManager />
          </TabsContent>

          <TabsContent value="forms">
            <FormsManager />
          </TabsContent>

          <TabsContent value="automation">
            <AutomationDashboard />
          </TabsContent>

          <TabsContent value="settings">
            <div className="space-y-6">
              <Tabs defaultValue="site" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="site">Site Settings</TabsTrigger>
                  <TabsTrigger value="email">Email Settings</TabsTrigger>
                  <TabsTrigger value="services">Service Pricing</TabsTrigger>
                  <TabsTrigger value="payments">Payment Options</TabsTrigger>
                </TabsList>
                
                <TabsContent value="site" className="mt-6">
                  {siteSettings && (
                    <SiteSettingsManager settings={siteSettings} onUpdate={loadData} />
                  )}
                </TabsContent>
                
                <TabsContent value="email" className="mt-6">
                  <Tabs defaultValue="settings" className="w-full">
                    <TabsList>
                      <TabsTrigger value="settings">Email Settings</TabsTrigger>
                      <TabsTrigger value="templates">Email Templates</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="settings" className="mt-6">
                      <EmailSettingsManager />
                    </TabsContent>
                    
                    <TabsContent value="templates" className="mt-6">
                      <EmailTemplateManager />
                    </TabsContent>
                  </Tabs>
                </TabsContent>
                
                <TabsContent value="services" className="mt-6">
                  <ServicePricingManager />
                </TabsContent>
                
                <TabsContent value="payments" className="mt-6">
                  <PaymentOptionsManager />
                </TabsContent>
              </Tabs>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;