import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ImageUpload } from '@/components/ui/image-upload';
import { Plus, Edit, Trash2, Star, Users } from 'lucide-react';
import { Celebrity } from '@/types';
import { api } from '@/lib/api';

interface CelebrityManagerProps {
  celebrities: Celebrity[];
  onUpdate: () => void;
}

interface CelebrityForm {
  name: string;
  category: string;
  price: number;
  image: string;
  description: string;
  availability: boolean;
  rating: number;
  bookings: number;
  
  // Location fields
  location_city: string;
  location_country: string;
  
  // Social media and contact fields
  facebook_url: string;
  instagram_url: string;
  email: string;
  whatsapp: string;
  telegram_url: string;
  signal_url: string;
  
  // Additional info
  bio: string;
  is_featured: boolean;
  
  // Editable timestamps
  created_at: string;
  updated_at: string;
}

interface CelebrityFormState extends CelebrityForm {
  imageFile: File | null;
}

const defaultForm: CelebrityFormState = {
  name: '',
  category: '',
  price: 0,
  image: '/placeholder.svg',
  description: '',
  availability: true,
  rating: 4.5,
  bookings: 0,
  
  // Location fields
  location_city: '',
  location_country: '',
  
  // Social media and contact fields
  facebook_url: '',
  instagram_url: '',
  email: '',
  whatsapp: '',
  telegram_url: '',
  signal_url: '',
  
  // Additional info
  bio: '',
  is_featured: false,
  
  // Editable timestamps
  created_at: new Date().toISOString().slice(0, 16),
  updated_at: new Date().toISOString().slice(0, 16),
  
  imageFile: null
};

const categories = ['Actor', 'Musician', 'Athlete', 'Influencer', 'Author', 'Chef', 'Director', 'Model'];

export const CelebrityManager = ({ celebrities, onUpdate }: CelebrityManagerProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CelebrityFormState>(defaultForm);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const { imageFile, ...celebrityData } = form;
      
      let celebrity;
      if (editingId) {
        celebrity = await api.updateCelebrity(editingId, celebrityData);
      } else {
        celebrity = await api.createCelebrity(celebrityData);
      }
      
      // Upload image if provided
      if (imageFile && celebrity.id) {
        celebrity = await api.uploadCelebrityImage(celebrity.id, imageFile);
      }
      
      setForm(defaultForm);
      setEditingId(null);
      setIsDialogOpen(false);
      onUpdate();
    } catch (error) {
      console.error('Failed to save celebrity:', error);
      alert('Failed to save celebrity. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (celebrity: Celebrity) => {
    setForm({
      name: celebrity.name,
      category: celebrity.category,
      price: celebrity.price,
      image: celebrity.image,
      description: celebrity.description,
      availability: celebrity.availability,
      rating: celebrity.rating,
      bookings: celebrity.bookings,
      imageFile: null
    });
    setEditingId(celebrity.id);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this celebrity?')) {
      try {
        await api.deleteCelebrity(id);
        onUpdate();
      } catch (error) {
        console.error('Failed to delete celebrity:', error);
        alert('Failed to delete celebrity. Please try again.');
      }
    }
  };

  const handleAddNew = () => {
    setForm(defaultForm);
    setEditingId(null);
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Celebrity Management</CardTitle>
              <CardDescription>
                Add, edit, and manage celebrities on your platform
              </CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={handleAddNew} className="bg-slate-900 hover:bg-slate-800">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Celebrity
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingId ? 'Edit Celebrity' : 'Add New Celebrity'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingId ? 'Update celebrity information' : 'Add a new celebrity to your platform'}
                  </DialogDescription>
                </DialogHeader>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        value={form.name}
                        onChange={(e) => setForm({...form, name: e.target.value})}
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="category">Category</Label>
                      <Select value={form.category} onValueChange={(value) => setForm({...form, category: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="price">Price ($)</Label>
                      <Input
                        id="price"
                        type="number"
                        value={form.price}
                        onChange={(e) => setForm({...form, price: Number(e.target.value)})}
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="rating">Rating (1-5)</Label>
                      <Input
                        id="rating"
                        type="number"
                        min="1"
                        max="5"
                        step="0.1"
                        value={form.rating}
                        onChange={(e) => setForm({...form, rating: Number(e.target.value)})}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Celebrity Image</Label>
                    <ImageUpload
                      value={form.image}
                      onChange={(file, preview) => {
                        setForm({
                          ...form,
                          imageFile: file,
                          image: preview || form.image
                        });
                      }}
                      disabled={loading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={form.description}
                      onChange={(e) => setForm({...form, description: e.target.value})}
                      rows={3}
                      required
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={form.availability}
                      onCheckedChange={(checked) => setForm({...form, availability: checked})}
                    />
                    <Label>Available for booking</Label>
                  </div>

                  <div className="flex gap-3">
                    <Button type="submit" className="bg-slate-900 hover:bg-slate-800" disabled={loading}>
                      {loading ? 'Saving...' : (editingId ? 'Update Celebrity' : 'Add Celebrity')}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {celebrities.map((celebrity) => (
              <Card key={celebrity.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-lg">{celebrity.name}</h3>
                      <p className="text-sm text-slate-600">{celebrity.category}</p>
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs ${
                      celebrity.availability 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {celebrity.availability ? "Available" : "Unavailable"}
                    </div>
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Price:</span>
                      <span className="font-medium">${celebrity.price.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Rating:</span>
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 text-yellow-500 fill-current" />
                        <span className="font-medium">{celebrity.rating}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Bookings:</span>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4 text-slate-600" />
                        <span className="font-medium">{celebrity.bookings}</span>
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-sm text-slate-600 mb-4 line-clamp-2">
                    {celebrity.description}
                  </p>
                  
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(celebrity)}
                      className="flex-1"
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(celebrity.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {celebrities.length === 0 && (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No celebrities yet</h3>
              <p className="text-slate-600 mb-4">
                Add your first celebrity to get started
              </p>
              <Button onClick={handleAddNew} className="bg-slate-900 hover:bg-slate-800">
                <Plus className="h-4 w-4 mr-2" />
                Add Celebrity
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};