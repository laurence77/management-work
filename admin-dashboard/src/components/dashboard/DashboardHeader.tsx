import { Button } from '@/components/ui/button';
import { LogOut, User } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { useNavigate } from 'react-router-dom';

export const DashboardHeader = () => {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: 'Logged out successfully',
        description: 'You have been logged out of your account.',
        type: 'success',
      });
      navigate('/login');
    } catch (error: any) {
      console.error('Logout failed:', error);
      toast({
        title: 'Logout failed',
        description: error.message || 'Something went wrong while logging out.',
        type: 'error',
      });
      // Force logout on client side even if API call fails
      navigate('/login');
    }
  };

  return (
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
          
          <div className="flex items-center space-x-4">
            {user && (
              <div className="flex items-center space-x-2 text-sm text-slate-600">
                <User className="h-4 w-4" />
                <span>
                  {user.firstName} {user.lastName}
                </span>
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                  {user.role}
                </span>
              </div>
            )}
            
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
    </div>
  );
};