import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { 
  CreditCard, 
  DollarSign, 
  Settings,
  Edit, 
  Save, 
  X, 
  Plus,
  Trash2
} from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/useToast';

interface PaymentOption {
  id: number;
  name: string;
  type: string;
  description: string;
  isActive: boolean;
  processingFee: number;
  minAmount: number;
  maxAmount: number;
}

export const PaymentOptionsManager = () => {
  const [paymentOptions, setPaymentOptions] = useState<PaymentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingOption, setEditingOption] = useState<PaymentOption | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const { toast } = useToast();

  // Load payment options on component mount
  useEffect(() => {
    loadPaymentOptions();
  }, []);

  const loadPaymentOptions = async () => {
    try {
      setLoading(true);
      const options = await api.getPaymentOptions();
      setPaymentOptions(options);
    } catch (error) {
      console.error('Failed to load payment options:', error);
      toast({
        title: 'Error',
        description: 'Failed to load payment options',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddOption = async (newOption: Omit<PaymentOption, 'id'>) => {
    try {
      const createdOption = await api.createPaymentOption(newOption);
      setPaymentOptions(prev => [...prev, createdOption]);
      setShowAddForm(false);
      toast({
        title: 'Success',
        description: 'Payment option added successfully',
        type: 'success',
      });
    } catch (error) {
      console.error('Failed to add payment option:', error);
      toast({
        title: 'Error',
        description: 'Failed to add payment option',
        type: 'error',
      });
    }
  };

  const handleDeleteOption = async (id: number) => {
    if (!confirm('Are you sure you want to delete this payment option?')) {
      return;
    }

    try {
      await api.deletePaymentOption(id.toString());
      setPaymentOptions(prev => prev.filter(option => option.id !== id));
      toast({
        title: 'Success',
        description: 'Payment option deleted successfully',
        type: 'success',
      });
    } catch (error) {
      console.error('Failed to delete payment option:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete payment option',
        type: 'error',
      });
    }
  };

  const handleEditOption = (option: PaymentOption) => {
    setEditingOption({ ...option });
  };

  const handleSaveOption = async () => {
    if (!editingOption) return;
    
    try {
      const updatedOption = await api.updatePaymentOption(editingOption.id.toString(), editingOption);
      setPaymentOptions(prev => prev.map(option => 
        option.id === editingOption.id ? updatedOption : option
      ));
      setEditingOption(null);
      toast({
        title: 'Success',
        description: 'Payment option updated successfully',
        type: 'success',
      });
    } catch (error) {
      console.error('Failed to update payment option:', error);
      toast({
        title: 'Error',
        description: 'Failed to update payment option',
        type: 'error',
      });
    }
  };

  const handleToggleActive = async (id: number, isActive: boolean) => {
    try {
      const updatedOption = await api.updatePaymentOption(id.toString(), { isActive });
      setPaymentOptions(prev => prev.map(option => 
        option.id === id ? { ...option, isActive } : option
      ));
      toast({
        title: 'Success',
        description: `Payment option ${isActive ? 'activated' : 'deactivated'}`,
        type: 'success',
      });
    } catch (error) {
      console.error('Failed to toggle payment option:', error);
      toast({
        title: 'Error',
        description: 'Failed to update payment option',
        type: 'error',
      });
    }
  };

  const formatFee = (fee: number) => {
    return `${fee}%`;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'stripe': return 'bg-blue-100 text-blue-800';
      case 'wire': return 'bg-green-100 text-green-800';
      case 'paypal': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const AddPaymentOptionForm = () => {
    const [formData, setFormData] = useState({
      name: '',
      type: 'stripe',
      description: '',
      processingFee: 0,
      minAmount: 0,
      maxAmount: 999999
    });

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      handleAddOption({ ...formData, isActive: true });
    };

    return (
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Add Payment Option
            <Button variant="ghost" onClick={() => setShowAddForm(false)}>
              <X className="h-4 w-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="add-name">Option Name</Label>
                <Input
                  id="add-name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter payment option name"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="add-type">Payment Type</Label>
                <select
                  id="add-type"
                  value={formData.type}
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="stripe">Stripe (Credit Card)</option>
                  <option value="paypal">PayPal</option>
                  <option value="wire">Wire Transfer</option>
                </select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="add-processingFee">Processing Fee (%)</Label>
                <Input
                  id="add-processingFee"
                  type="number"
                  step="0.1"
                  value={formData.processingFee}
                  onChange={(e) => setFormData(prev => ({ ...prev, processingFee: Number(e.target.value) }))}
                  placeholder="0"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="add-minAmount">Minimum Amount ($)</Label>
                <Input
                  id="add-minAmount"
                  type="number"
                  value={formData.minAmount}
                  onChange={(e) => setFormData(prev => ({ ...prev, minAmount: Number(e.target.value) }))}
                  placeholder="0"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="add-maxAmount">Maximum Amount ($)</Label>
                <Input
                  id="add-maxAmount"
                  type="number"
                  value={formData.maxAmount}
                  onChange={(e) => setFormData(prev => ({ ...prev, maxAmount: Number(e.target.value) }))}
                  placeholder="999999"
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="add-description">Description</Label>
              <Input
                id="add-description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter payment option description"
                required
              />
            </div>
            
            <div className="flex space-x-2">
              <Button type="submit">
                <Plus className="h-4 w-4 mr-2" />
                Add Payment Option
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    );
  };

  const EditOptionForm = ({ option }: { option: PaymentOption }) => (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Edit Payment Option
          <Button variant="ghost" onClick={() => setEditingOption(null)}>
            <X className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Option Name</Label>
            <Input
              id="name"
              value={option.name}
              onChange={(e) => setEditingOption(prev => prev ? { ...prev, name: e.target.value } : null)}
              placeholder="Enter payment option name"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="processingFee">Processing Fee (%)</Label>
            <Input
              id="processingFee"
              type="number"
              step="0.1"
              value={option.processingFee}
              onChange={(e) => setEditingOption(prev => prev ? { ...prev, processingFee: Number(e.target.value) } : null)}
              placeholder="0"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="minAmount">Minimum Amount ($)</Label>
            <Input
              id="minAmount"
              type="number"
              value={option.minAmount}
              onChange={(e) => setEditingOption(prev => prev ? { ...prev, minAmount: Number(e.target.value) } : null)}
              placeholder="0"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="maxAmount">Maximum Amount ($)</Label>
            <Input
              id="maxAmount"
              type="number"
              value={option.maxAmount}
              onChange={(e) => setEditingOption(prev => prev ? { ...prev, maxAmount: Number(e.target.value) } : null)}
              placeholder="0"
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Input
            id="description"
            value={option.description}
            onChange={(e) => setEditingOption(prev => prev ? { ...prev, description: e.target.value } : null)}
            placeholder="Enter payment option description"
          />
        </div>
        
        <div className="flex items-center space-x-2">
          <Switch
            id="isActive"
            checked={option.isActive}
            onCheckedChange={(checked) => setEditingOption(prev => prev ? { ...prev, isActive: checked } : null)}
          />
          <Label htmlFor="isActive">Payment option is active</Label>
        </div>
        
        <div className="flex space-x-2">
          <Button onClick={handleSaveOption} disabled={loading}>
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
          <Button variant="outline" onClick={() => setEditingOption(null)}>
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
          <h3 className="text-lg font-medium text-gray-900">Payment Options</h3>
          <p className="text-sm text-gray-600">Manage accepted payment methods and processing fees</p>
        </div>
        <Button onClick={() => setShowAddForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Payment Option
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Options</p>
                <p className="text-2xl font-bold text-gray-900">{paymentOptions.length}</p>
              </div>
              <Settings className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Options</p>
                <p className="text-2xl font-bold text-gray-900">{paymentOptions.filter(o => o.isActive).length}</p>
              </div>
              <CreditCard className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg. Processing Fee</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatFee(paymentOptions.reduce((sum, o) => sum + o.processingFee, 0) / paymentOptions.length || 0)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Form */}
      {showAddForm && <AddPaymentOptionForm />}

      {/* Edit Form */}
      {editingOption && <EditOptionForm option={editingOption} />}

      {/* Payment Options List */}
      {loading && !showAddForm && !editingOption ? (
        <div className="flex items-center justify-center py-8">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {paymentOptions.map((option) => (
          <Card key={option.id} className={`relative ${!option.isActive ? 'opacity-60' : ''}`}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <CreditCard className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{option.name}</CardTitle>
                    <div className="flex items-center space-x-2">
                      <Badge className={getTypeColor(option.type)}>
                        {option.type}
                      </Badge>
                      {!option.isActive && (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={option.isActive}
                    onCheckedChange={(checked) => handleToggleActive(option.id, checked)}
                  />
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <p className="text-gray-600 text-sm">{option.description}</p>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-900">Processing Fee</h4>
                  <p className="text-lg font-bold text-green-600">{formatFee(option.processingFee)}</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Amount Range</h4>
                  <p className="text-sm text-gray-600">
                    {formatCurrency(option.minAmount)} - {formatCurrency(option.maxAmount)}
                  </p>
                </div>
              </div>
              
              <div className="flex space-x-2 pt-4 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEditOption(option)}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:text-red-700"
                  onClick={() => handleDeleteOption(option.id)}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Remove
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        </div>
      )}
    </div>
  );
};