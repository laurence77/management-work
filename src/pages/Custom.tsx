import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { showSuccess, showError, showBookingSuccess, showBookingError } from "@/utils/toast-helpers";
import { 
  Crown, 
  Star, 
  Sparkles, 
  Heart, 
  Calendar, 
  Mail, 
  Phone, 
  CheckCircle,
  ArrowRight,
  Users,
  Camera,
  Music,
  Award,
  Building
} from "lucide-react";

const Custom = () => {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    organization: "",
    eventType: "",
    eventDate: "",
    budget: "",
    guestCount: "",
    location: "",
    celebrityPreferences: "",
    customRequirements: "",
    inspiration: ""
  });
  const [loading, setLoading] = useState(false);

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
      const response = await fetch('http://localhost:3000/api/forms/service-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          serviceType: 'Custom Celebrity Experience'
        })
      });

      const result = await response.json();
      
      if (result.success) {
        showBookingSuccess();
        showSuccess("Our concierge team will contact you within 24 hours to discuss your vision.");
        setFormData({
          fullName: "",
          email: "",
          phone: "",
          organization: "",
          eventType: "",
          eventDate: "",
          budget: "",
          guestCount: "",
          location: "",
          celebrityPreferences: "",
          customRequirements: "",
          inspiration: ""
        });
      } else {
        showBookingError();
      }
    } catch (error) {
      console.error('Submission error:', error);
      showBookingError();
    } finally {
      setLoading(false);
    }
  };

  const customServices = [
    {
      icon: Crown,
      title: "Exclusive Private Events",
      description: "Intimate gatherings with A-list celebrities in luxury settings"
    },
    {
      icon: Building,
      title: "Corporate Experiences",
      description: "Custom celebrity partnerships for brand activations and corporate events"
    },
    {
      icon: Heart,
      title: "Personal Celebrations",
      description: "Once-in-a-lifetime celebrity experiences for special occasions"
    },
    {
      icon: Camera,
      title: "Content Creation",
      description: "Bespoke celebrity content and collaborations for your brand"
    },
    {
      icon: Music,
      title: "Performance Experiences",
      description: "Custom celebrity performances and entertainment packages"
    },
    {
      icon: Award,
      title: "Recognition Events",
      description: "Celebrity-hosted award ceremonies and recognition events"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Header />
      
      {/* Hero Section */}
      <section className="pt-20 min-h-screen flex items-center justify-center relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10"></div>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        
        <div className="container mx-auto px-6 relative z-10">
          <div className="text-center max-w-4xl mx-auto space-y-8">
            {/* Badge */}
            <div className="inline-flex items-center space-x-2 bg-slate-800/50 backdrop-blur border border-slate-700 px-6 py-3 rounded-full fade-in">
              <Sparkles className="h-5 w-5 text-primary" />
              <span className="text-sm text-slate-300">Custom Celebrity Experiences</span>
              <div className="flex space-x-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 text-primary fill-current" />
                ))}
              </div>
            </div>

            {/* Main Headline */}
            <div className="space-y-4 md:space-y-6 slide-up">
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight text-white">
                Create Your Dream
                <span className="text-gradient-primary block">
                  Celebrity Experience
                </span>
              </h1>
              <p className="text-lg sm:text-xl md:text-2xl text-slate-300 max-w-3xl mx-auto leading-relaxed px-4 sm:px-0">
                From intimate private meetings to grand corporate events, our concierge team creates 
                bespoke celebrity experiences tailored to your exact vision and requirements.
              </p>
            </div>

            {/* Quick Contact */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center fade-in" style={{ animationDelay: '0.3s' }}>
              <Button className="btn-luxury text-lg px-8 py-4" onClick={() => document.getElementById('contact-form')?.scrollIntoView({ behavior: 'smooth' })}>
                Start Planning Now
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <div className="flex items-center gap-4 text-slate-300">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  <span className="text-sm">+1 (555) 123-ELITE</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  <span className="text-sm">concierge@bookmyreservation.org</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Custom Services */}
      <section className="py-20 relative">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
              Unlimited <span className="text-gradient-primary">Possibilities</span>
            </h2>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto">
              Whatever you can imagine, our expert concierge team can bring to life with the perfect celebrity match.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {customServices.map((service, index) => (
              <Card key={index} className="bg-slate-800/50 backdrop-blur border border-slate-700 hover:border-slate-600 transition-all duration-300">
                <CardContent className="p-8 text-center">
                  <service.icon className="h-12 w-12 text-primary mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-white mb-3">{service.title}</h3>
                  <p className="text-slate-300">{service.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Form */}
      <section id="contact-form" className="py-20 relative">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <Card className="bg-slate-800/50 backdrop-blur border border-slate-700">
              <CardHeader className="text-center pb-8">
                <CardTitle className="text-3xl font-bold text-white mb-4">
                  Let's Create Something Extraordinary
                </CardTitle>
                <CardDescription className="text-xl text-slate-300">
                  Tell us about your vision and we'll craft the perfect celebrity experience for you.
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-8">
                  {/* Basic Information */}
                  <div className="space-y-6">
                    <h3 className="text-xl font-semibold text-white border-b border-slate-700 pb-2">Your Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="fullName" className="text-slate-300">Full Name *</Label>
                        <Input
                          id="fullName"
                          value={formData.fullName}
                          onChange={(e) => handleInputChange('fullName', e.target.value)}
                          className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 focus:border-slate-500"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-slate-300">Email Address *</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => handleInputChange('email', e.target.value)}
                          className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 focus:border-slate-500"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone" className="text-slate-300">Phone Number</Label>
                        <Input
                          id="phone"
                          value={formData.phone}
                          onChange={(e) => handleInputChange('phone', e.target.value)}
                          className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 focus:border-slate-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="organization" className="text-slate-300">Organization/Company</Label>
                        <Input
                          id="organization"
                          value={formData.organization}
                          onChange={(e) => handleInputChange('organization', e.target.value)}
                          className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 focus:border-slate-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Event Details */}
                  <div className="space-y-6">
                    <h3 className="text-xl font-semibold text-white border-b border-slate-700 pb-2">Event Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="eventType" className="text-slate-300">Event Type *</Label>
                        <Select value={formData.eventType} onValueChange={(value) => handleInputChange('eventType', value)}>
                          <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                            <SelectValue placeholder="Select event type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="private-meeting">Private Meeting</SelectItem>
                            <SelectItem value="corporate-event">Corporate Event</SelectItem>
                            <SelectItem value="brand-activation">Brand Activation</SelectItem>
                            <SelectItem value="personal-celebration">Personal Celebration</SelectItem>
                            <SelectItem value="content-creation">Content Creation</SelectItem>
                            <SelectItem value="performance">Performance/Show</SelectItem>
                            <SelectItem value="other">Other (Custom)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="eventDate" className="text-slate-300">Preferred Date</Label>
                        <Input
                          id="eventDate"
                          type="date"
                          value={formData.eventDate}
                          onChange={(e) => handleInputChange('eventDate', e.target.value)}
                          className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 focus:border-slate-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="budget" className="text-slate-300">Budget Range *</Label>
                        <Select value={formData.budget} onValueChange={(value) => handleInputChange('budget', value)}>
                          <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                            <SelectValue placeholder="Select budget range" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="25k-50k">$25,000 - $50,000</SelectItem>
                            <SelectItem value="50k-100k">$50,000 - $100,000</SelectItem>
                            <SelectItem value="100k-250k">$100,000 - $250,000</SelectItem>
                            <SelectItem value="250k-500k">$250,000 - $500,000</SelectItem>
                            <SelectItem value="500k-1m">$500,000 - $1,000,000</SelectItem>
                            <SelectItem value="1m-plus">$1,000,000+</SelectItem>
                            <SelectItem value="discuss">Prefer to Discuss</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="guestCount" className="text-slate-300">Guest Count</Label>
                        <Input
                          id="guestCount"
                          placeholder="e.g. 50-100 guests"
                          value={formData.guestCount}
                          onChange={(e) => handleInputChange('guestCount', e.target.value)}
                          className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 focus:border-slate-500"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="location" className="text-slate-300">Location/Venue</Label>
                      <Input
                        id="location"
                        placeholder="City, Country or specific venue"
                        value={formData.location}
                        onChange={(e) => handleInputChange('location', e.target.value)}
                        className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 focus:border-slate-500"
                      />
                    </div>
                  </div>

                  {/* Celebrity Preferences */}
                  <div className="space-y-6">
                    <h3 className="text-xl font-semibold text-white border-b border-slate-700 pb-2">Celebrity Preferences</h3>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="celebrityPreferences" className="text-slate-300">Celebrity Preferences</Label>
                        <Textarea
                          id="celebrityPreferences"
                          placeholder="Tell us about specific celebrities you'd like to work with, or the type of celebrity that would be perfect for your event..."
                          rows={4}
                          value={formData.celebrityPreferences}
                          onChange={(e) => handleInputChange('celebrityPreferences', e.target.value)}
                          className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 focus:border-slate-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="customRequirements" className="text-slate-300">Custom Requirements & Special Requests</Label>
                        <Textarea
                          id="customRequirements"
                          placeholder="Any special requirements, unique requests, or specific goals for this experience..."
                          rows={4}
                          value={formData.customRequirements}
                          onChange={(e) => handleInputChange('customRequirements', e.target.value)}
                          className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 focus:border-slate-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="inspiration" className="text-slate-300">Inspiration & Vision</Label>
                        <Textarea
                          id="inspiration"
                          placeholder="Describe your dream scenario. What would make this the perfect celebrity experience for you?"
                          rows={4}
                          value={formData.inspiration}
                          onChange={(e) => handleInputChange('inspiration', e.target.value)}
                          className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 focus:border-slate-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Submit */}
                  <div className="pt-6 text-center">
                    <Button type="submit" className="btn-luxury text-lg px-12 py-4" disabled={loading}>
                      {loading ? 'Submitting...' : 'Submit Custom Request'}
                      {!loading && <Sparkles className="ml-2 h-5 w-5" />}
                    </Button>
                    <p className="text-sm text-slate-400 mt-4">
                      Our concierge team will review your request and contact you within 24 hours
                    </p>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Why Choose Custom */}
      <section className="py-20 relative">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
              Why Choose <span className="text-gradient-primary">Custom</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="h-8 w-8 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">100% Tailored</h3>
              <p className="text-slate-300">Every detail crafted specifically for your vision and requirements</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-6">
                <Users className="h-8 w-8 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Expert Concierge</h3>
              <p className="text-slate-300">Dedicated team with years of celebrity booking experience</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-6">
                <Crown className="h-8 w-8 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Exclusive Access</h3>
              <p className="text-slate-300">Direct connections to A-list celebrities and exclusive opportunities</p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Custom;