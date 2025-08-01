import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Lock, CheckCircle, AlertCircle } from "lucide-react";

const PasswordReset = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Form data
  const [formData, setFormData] = useState({
    email: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Check if we have reset tokens in URL
  const accessToken = searchParams.get('access_token');
  const refreshToken = searchParams.get('refresh_token');

  // If we have tokens, show reset form
  useState(() => {
    if (accessToken && refreshToken) {
      setStep('reset');
    }
  });

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch('http://localhost:3000/api/password-reset/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: formData.email })
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(data.message);
        // In development, show the reset link
        if (data.resetLink) {
          setMessage(data.message + '\n\nDevelopment Reset Link: ' + data.resetLink);
        }
      } else {
        setError(data.message || 'Failed to send reset email');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.newPassword !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:3000/api/password-reset/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          access_token: accessToken,
          refresh_token: refreshToken,
          new_password: formData.newPassword
        })
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('Password updated successfully! Redirecting to login...');
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } else {
        setError(data.message || 'Failed to reset password');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Header />
      
      <div className="pt-24 pb-12 min-h-screen flex items-center justify-center bg-gradient-hero">
        <Card className="w-full max-w-md bg-card/90 backdrop-blur border border-white/10 mx-4">
          <div className="p-6 border-b border-white/10">
            <h2 className="text-2xl font-bold text-foreground text-center">
              {step === 'request' ? 'Reset Password' : 'Set New Password'}
            </h2>
            <p className="text-muted-foreground mt-2 text-center">
              {step === 'request' 
                ? 'Enter your email to receive a password reset link' 
                : 'Enter your new password below'
              }
            </p>
          </div>

          <div className="p-6">
            {/* Success Message */}
            {message && (
              <div className="mb-4 p-3 bg-green-500/20 border border-green-500/30 rounded-lg flex items-start space-x-2">
                <CheckCircle className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                <p className="text-green-400 text-sm whitespace-pre-line">{message}</p>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg flex items-start space-x-2">
                <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {step === 'request' ? (
              <form onSubmit={handleRequestReset} className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-foreground mb-2 block">
                    <Mail className="h-4 w-4 inline mr-2" />
                    Email Address
                  </Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Enter your email address"
                    className="bg-white/5 border-white/10"
                    required
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full btn-luxury py-3"
                >
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </Button>

                <div className="text-center">
                  <p className="text-muted-foreground text-sm">
                    Remember your password?{' '}
                    <Button
                      type="button"
                      variant="link"
                      className="text-primary hover:text-primary/80 p-0"
                      onClick={() => navigate('/login')}
                    >
                      Back to Login
                    </Button>
                  </p>
                </div>
              </form>
            ) : (
              <form onSubmit={handlePasswordReset} className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-foreground mb-2 block">
                    <Lock className="h-4 w-4 inline mr-2" />
                    New Password
                  </Label>
                  <Input
                    type="password"
                    value={formData.newPassword}
                    onChange={(e) => setFormData(prev => ({ ...prev, newPassword: e.target.value }))}
                    placeholder="Enter new password"
                    className="bg-white/5 border-white/10"
                    required
                    minLength={8}
                  />
                </div>

                <div>
                  <Label className="text-sm font-medium text-foreground mb-2 block">
                    Confirm New Password
                  </Label>
                  <Input
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    placeholder="Confirm new password"
                    className="bg-white/5 border-white/10"
                    required
                    minLength={8}
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full btn-luxury py-3"
                >
                  {loading ? 'Updating...' : 'Update Password'}
                </Button>
              </form>
            )}

            {/* Admin Note */}
            <div className="mt-6 p-3 bg-blue-500/20 border border-blue-500/30 rounded-lg">
              <p className="text-blue-400 text-xs text-center">
                Admin users can contact support for password assistance
              </p>
            </div>
          </div>
        </Card>
      </div>
      
      <Footer />
    </div>
  );
};

export default PasswordReset;