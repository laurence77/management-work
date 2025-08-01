import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { showAuthError, showNetworkError, showValidationError } from "@/utils/toast-helpers";

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    phone: "",
    company: ""
  });
  const navigate = useNavigate();

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!isLogin) {
        if (formData.password !== formData.confirmPassword) {
          showValidationError('password confirmation');
          setLoading(false);
          return;
        }
      }

      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const response = await fetch(`http://localhost:3000${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const userData = await response.json();
        localStorage.setItem('authToken', userData.token);
        localStorage.setItem('user', JSON.stringify(userData.user));
        navigate('/celebrities');
      } else {
        const error = await response.json();
        showAuthError(error.message);
      }
    } catch (error) {
      console.error('Auth error:', error);
      showNetworkError();
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
              {isLogin ? 'Welcome Back' : 'Create Account'}
            </h2>
            <p className="text-muted-foreground mt-2 text-center">
              {isLogin 
                ? 'Sign in to book celebrities for your events' 
                : 'Join thousands of satisfied customers'
              }
            </p>
          </div>

          <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-foreground mb-2 block">
                        <User className="h-4 w-4 inline mr-2" />
                        First Name *
                      </Label>
                      <Input
                        type="text"
                        value={formData.firstName}
                        onChange={(e) => handleInputChange("firstName", e.target.value)}
                        className="bg-white/5 border-white/10"
                        required
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-foreground mb-2 block">
                        Last Name *
                      </Label>
                      <Input
                        type="text"
                        value={formData.lastName}
                        onChange={(e) => handleInputChange("lastName", e.target.value)}
                        className="bg-white/5 border-white/10"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-foreground mb-2 block">
                      Phone Number
                    </Label>
                    <Input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleInputChange("phone", e.target.value)}
                      placeholder="+1 (555) 123-4567"
                      className="bg-white/5 border-white/10"
                    />
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-foreground mb-2 block">
                      Company (Optional)
                    </Label>
                    <Input
                      type="text"
                      value={formData.company}
                      onChange={(e) => handleInputChange("company", e.target.value)}
                      className="bg-white/5 border-white/10"
                    />
                  </div>
                </>
              )}

              <div>
                <Label className="text-sm font-medium text-foreground mb-2 block">
                  <Mail className="h-4 w-4 inline mr-2" />
                  Email Address *
                </Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  placeholder="your.email@example.com"
                  className="bg-white/5 border-white/10"
                  required
                />
              </div>

              <div>
                <Label className="text-sm font-medium text-foreground mb-2 block">
                  <Lock className="h-4 w-4 inline mr-2" />
                  Password *
                </Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => handleInputChange("password", e.target.value)}
                    className="bg-white/5 border-white/10 pr-12"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {!isLogin && (
                <div>
                  <Label className="text-sm font-medium text-foreground mb-2 block">
                    Confirm Password *
                  </Label>
                  <Input
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                    className="bg-white/5 border-white/10"
                    required
                  />
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full btn-luxury py-3"
              >
                {loading 
                  ? 'Please wait...' 
                  : isLogin 
                    ? 'Sign In' 
                    : 'Create Account'
                }
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-muted-foreground">
                {isLogin 
                  ? "Don't have an account? " 
                  : "Already have an account? "
                }
                <Button
                  type="button"
                  variant="link"
                  className="text-primary hover:text-primary/80 p-0"
                  onClick={() => setIsLogin(!isLogin)}
                >
                  {isLogin ? 'Sign up' : 'Sign in'}
                </Button>
              </p>
            </div>
          </div>
        </Card>
      </div>
      
      <Footer />
    </div>
  );
};

export default Login;