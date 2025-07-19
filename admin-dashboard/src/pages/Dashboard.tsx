import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  Star, 
  DollarSign, 
  Settings, 
  LogOut,
  Phone,
  Mail,
  MapPin,
  Plus
} from 'lucide-react';
import { CelebrityManager } from '@/components/CelebrityManager';
import { SiteSettingsManager } from '@/components/SiteSettingsManager';
import { Celebrity, SiteSettings } from '@/types';
import { api } from '@/lib/api';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const [celebrities, setCelebrities] = useState<Celebrity[]>([]);
  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
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

  const handleLogout = async () => {
    try {
      await api.logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
      // Force logout on client side even if API call fails
      localStorage.removeItem('admin_token');
      navigate('/login');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const totalCelebrities = celebrities.length;
  const availableCelebrities = celebrities.filter(c => c.availability).length;
  const totalBookings = celebrities.reduce((sum, c) => sum + c.bookings, 0);
  const averageRating = celebrities.length > 0 
    ? celebrities.reduce((sum, c) => sum + c.rating, 0) / celebrities.length 
    : 0;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                EliteConnect Admin
              </h1>
              <p className="text-slate-600">
                Manage your celebrity booking platform
              </p>
            </div>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="hover:bg-slate-100"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="celebrities">Celebrities</TabsTrigger>
            <TabsTrigger value="settings">Site Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-8">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Celebrities</CardTitle>
                  <Users className="h-4 w-4 text-slate-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalCelebrities}</div>
                  <p className="text-xs text-slate-600">
                    {availableCelebrities} available
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
                  <DollarSign className="h-4 w-4 text-slate-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalBookings}</div>
                  <p className="text-xs text-slate-600">
                    Across all celebrities
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
                  <Star className="h-4 w-4 text-slate-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{averageRating.toFixed(1)}</div>
                  <p className="text-xs text-slate-600">
                    Out of 5.0 stars
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Platform Status</CardTitle>
                  <Settings className="h-4 w-4 text-slate-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">Active</div>
                  <p className="text-xs text-slate-600">
                    All systems operational
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Celebrities */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Celebrities</CardTitle>
                <CardDescription>
                  Latest celebrities added to the platform
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {celebrities.slice(0, 5).map((celebrity) => (
                    <div key={celebrity.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center">
                          <Star className="h-6 w-6 text-slate-600" />
                        </div>
                        <div>
                          <h4 className="font-medium">{celebrity.name}</h4>
                          <p className="text-sm text-slate-600">{celebrity.category}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">${celebrity.price.toLocaleString()}</div>
                        <div className={`text-xs px-2 py-1 rounded-full ${
                          celebrity.availability 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {celebrity.availability ? "Available" : "Unavailable"}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Site Info */}
            {siteSettings && (
              <Card>
                <CardHeader>
                  <CardTitle>Site Information</CardTitle>
                  <CardDescription>
                    Current website contact details
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center space-x-3">
                      <Phone className="h-5 w-5 text-slate-600" />
                      <div>
                        <p className="font-medium">Phone</p>
                        <p className="text-sm text-slate-600">{siteSettings.phone}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Mail className="h-5 w-5 text-slate-600" />
                      <div>
                        <p className="font-medium">Email</p>
                        <p className="text-sm text-slate-600">{siteSettings.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <MapPin className="h-5 w-5 text-slate-600" />
                      <div>
                        <p className="font-medium">Address</p>
                        <p className="text-sm text-slate-600">{siteSettings.address}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="celebrities">
            <CelebrityManager celebrities={celebrities} onUpdate={loadData} />
          </TabsContent>

          <TabsContent value="settings">
            {siteSettings && (
              <SiteSettingsManager settings={siteSettings} onUpdate={loadData} />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;