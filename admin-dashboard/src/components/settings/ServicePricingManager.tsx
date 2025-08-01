import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { 
  DollarSign, 
  Edit, 
  Save, 
  X, 
  Plus,
  Trash2,
  Settings,
  Users,
  Video,
  Award,
  Camera,
  Music,
  Crown
} from 'lucide-react';
import { api } from '@/lib/api';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface ServicePricing {
  id: number;
  title: string;
  description: string;
  basePrice: number;
  category: string;
  duration: string;
  features: string[];
  isActive: boolean;
  icon: string;
}

const serviceIcons = {
  Users, Video, Award, Camera, Music, Crown
};

export const ServicePricingManager = () => {
  const [services, setServices] = useState<ServicePricing[]>([
    {
      id: 1,
      title: "Private Meet & Greet",
      description: "Exclusive one-on-one time with your favorite celebrity in a private, intimate setting.",
      basePrice: 5000,
      category: "personal",
      duration: "30-60 minutes",
      features: ["Private venue", "Photo opportunities", "Personal conversation", "Signed memorabilia"],
      isActive: true,
      icon: "Users"
    },
    {
      id: 2,
      title: "Virtual Shoutouts",
      description: "Personalized video messages for birthdays, anniversaries, or special occasions.",
      basePrice: 500,
      category: "personal",
      duration: "1-3 minutes",
      features: ["Personalized script", "HD video quality", "24-48 hour delivery", "Unlimited replays"],
      isActive: true,
      icon: "Video"
    },
    {
      id: 3,
      title: "Brand Endorsements",
      description: "Partner with A-list celebrities for authentic brand partnerships and campaigns.",
      basePrice: 50000,
      category: "brand",
      duration: "Campaign based",
      features: ["Social media posts", "Commercial appearances", "Product integration", "Usage rights"],
      isActive: true,
      icon: "Award"
    }
  ]);
  
  const [loading, setLoading] = useState(false);
  const [editingService, setEditingService] = useState<ServicePricing | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const handleEditService = (service: ServicePricing) => {
    setEditingService({ ...service });
  };

  const handleSaveService = async () => {
    if (!editingService) return;
    
    setLoading(true);
    try {
      // API call would go here
      setServices(prev => prev.map(service => 
        service.id === editingService.id ? editingService : service
      ));
      setEditingService(null);
    } catch (error) {
      console.error('Failed to update service:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddService = () => {
    const newService: ServicePricing = {
      id: Date.now(),
      title: "",
      description: "",
      basePrice: 0,
      category: "personal",
      duration: "",
      features: [],
      isActive: true,
      icon: "Users"
    };
    setEditingService(newService);
    setShowAddForm(true);
  };

  const handleDeleteService = (id: number) => {
    if (confirm('Are you sure you want to delete this service?')) {
      setServices(prev => prev.filter(service => service.id !== id));
    }
  };

  const handleToggleActive = async (id: number, isActive: boolean) => {
    setServices(prev => prev.map(service => 
      service.id === id ? { ...service, isActive } : service
    ));
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(price);
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'personal': return 'bg-blue-100 text-blue-800';
      case 'brand': return 'bg-purple-100 text-purple-800';
      case 'events': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const EditServiceForm = ({ service }: { service: ServicePricing }) => (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          {showAddForm ? 'Add New Service' : 'Edit Service'}
          <Button variant="ghost" onClick={() => { setEditingService(null); setShowAddForm(false); }}>
            <X className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="title">Service Title</Label>
            <Input
              id="title"
              value={service.title}
              onChange={(e) => setEditingService(prev => prev ? { ...prev, title: e.target.value } : null)}
              placeholder="Enter service title"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="basePrice">Base Price ($)</Label>
            <Input
              id="basePrice"
              type="number"
              value={service.basePrice}
              onChange={(e) => setEditingService(prev => prev ? { ...prev, basePrice: Number(e.target.value) } : null)}
              placeholder="0"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <select
              id="category"
              value={service.category}
              onChange={(e) => setEditingService(prev => prev ? { ...prev, category: e.target.value } : null)}
              className="w-full p-2 border border-gray-300 rounded-md"
            >
              <option value="personal">Personal</option>
              <option value="brand">Brand</option>
              <option value="events">Events</option>
            </select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="duration">Duration</Label>
            <Input
              id="duration"
              value={service.duration}
              onChange={(e) => setEditingService(prev => prev ? { ...prev, duration: e.target.value } : null)}
              placeholder="e.g., 30-60 minutes"
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={service.description}
            onChange={(e) => setEditingService(prev => prev ? { ...prev, description: e.target.value } : null)}
            placeholder="Enter service description"
            rows={3}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="features">Features (one per line)</Label>
          <Textarea
            id="features"
            value={service.features.join('\n')}
            onChange={(e) => setEditingService(prev => prev ? { ...prev, features: e.target.value.split('\n').filter(f => f.trim()) } : null)}
            placeholder="Enter features, one per line"
            rows={4}
          />
        </div>
        
        <div className="flex items-center space-x-2">
          <Switch
            id="isActive"
            checked={service.isActive}
            onCheckedChange={(checked) => setEditingService(prev => prev ? { ...prev, isActive: checked } : null)}
          />
          <Label htmlFor="isActive">Service is active</Label>
        </div>
        
        <div className="flex space-x-2">
          <Button onClick={handleSaveService} disabled={loading}>
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Saving...' : showAddForm ? 'Add Service' : 'Save Changes'}
          </Button>
          <Button variant="outline" onClick={() => { setEditingService(null); setShowAddForm(false); }}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Service Pricing Management</h3>
          <p className="text-sm text-gray-600">Manage your service offerings and pricing structure</p>
        </div>
        <Button onClick={handleAddService}>
          <Plus className="h-4 w-4 mr-2" />
          Add Service
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Services</p>
                <p className="text-2xl font-bold text-gray-900">{services.length}</p>
              </div>
              <Settings className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Services</p>
                <p className="text-2xl font-bold text-gray-900">{services.filter(s => s.isActive).length}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg. Price</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatPrice(services.reduce((sum, s) => sum + s.basePrice, 0) / services.length || 0)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit Form */}
      {editingService && <EditServiceForm service={editingService} />}

      {/* Services List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {services.map((service) => {
          const IconComponent = serviceIcons[service.icon as keyof typeof serviceIcons] || Users;
          
          return (
            <Card key={service.id} className={`relative ${!service.isActive ? 'opacity-60' : ''}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <IconComponent className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{service.title}</CardTitle>
                      <div className="flex items-center space-x-2">
                        <Badge className={getCategoryColor(service.category)}>
                          {service.category}
                        </Badge>
                        {!service.isActive && (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={service.isActive}
                      onCheckedChange={(checked) => handleToggleActive(service.id, checked)}
                    />
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <p className="text-gray-600 text-sm">{service.description}</p>
                
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold text-green-600">
                    From {formatPrice(service.basePrice)}
                  </div>
                  <div className="text-sm text-gray-500">
                    {service.duration}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-900">Features:</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {service.features.map((feature, index) => (
                      <li key={index} className="flex items-center">
                        <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mr-2"></div>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div className="flex space-x-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditService(service)}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteService(service.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};