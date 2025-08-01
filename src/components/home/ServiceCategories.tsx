import { useState } from "react";
import { Calendar, Users, Crown, Building, Coffee, Camera, Mic, Heart, X, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { showSuccess, showError } from "@/utils/toast-helpers";

const services = [
  {
    icon: Coffee,
    title: "Private Meetings",
    description: "Intimate one-on-one conversations with your favorite celebrities in luxury settings.",
    features: ["Personal consultation", "Autographs & photos", "Flexible duration", "VIP treatment"],
    price: "From $5,000",
    popular: false
  },
  {
    icon: Calendar,
    title: "Event Appearances",
    description: "Celebrity appearances for corporate events, parties, and special occasions.",
    features: ["Red carpet arrivals", "Meet & greet sessions", "Photo opportunities", "Custom performances"],
    price: "From $25,000",
    popular: true
  },
  {
    icon: Crown,
    title: "Celebrity Management",
    description: "Full-service celebrity management for brands and entertainment companies.",
    features: ["Career guidance", "Brand partnerships", "Media relations", "Strategic planning"],
    price: "Custom pricing",
    popular: false
  },
  {
    icon: Camera,
    title: "Content Creation",
    description: "Professional content creation with celebrities for marketing campaigns.",
    features: ["Video testimonials", "Social media content", "Photography", "Brand endorsements"],
    price: "From $15,000",
    popular: false
  },
  {
    icon: Mic,
    title: "Speaking Engagements",
    description: "Celebrity speakers for conferences, corporate events, and motivational talks.",
    features: ["Keynote speeches", "Panel discussions", "Workshop facilitation", "Industry insights"],
    price: "From $20,000",
    popular: false
  },
  {
    icon: Heart,
    title: "Charity Events",
    description: "Celebrity participation in charitable causes and fundraising events.",
    features: ["Fundraising galas", "Awareness campaigns", "Community outreach", "Special pricing"],
    price: "From $10,000",
    popular: false
  }
];

export const ServiceCategories = () => {
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [showConciergeModal, setShowConciergeModal] = useState(false);
  const [contactData, setContactData] = useState({
    name: '',
    email: '',
    phone: '',
    service: '',
    budget: '',
    eventDate: '',
    message: ''
  });

  const handleServiceLearnMore = (service) => {
    setSelectedService(service);
    setShowServiceModal(true);
  };

  const handleConciergeContact = () => {
    setShowConciergeModal(true);
  };

  const handleSubmitContact = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:3000/api/forms/service-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...contactData,
          serviceType: selectedService?.title || 'Concierge Service'
        })
      });
      
      if (response.ok) {
        showSuccess('Your request has been submitted! Our team will contact you within 24 hours.');
        setShowServiceModal(false);
        setShowConciergeModal(false);
        setContactData({
          name: '',
          email: '',
          phone: '',
          service: '',
          budget: '',
          eventDate: '',
          message: ''
        });
      }
    } catch (error) {
      showError('There was an error submitting your request. Please try again.');
    }
  };

  return (
    <section className="py-20">
      <div className="container mx-auto px-6">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Premium
            <span className="text-gradient-primary"> Services</span>
          </h2>
          <p className="text-xl text-muted-foreground">
            From intimate meetings to grand events, we offer comprehensive celebrity services 
            tailored to your unique needs and aspirations.
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service, index) => {
            const IconComponent = service.icon;
            return (
              <div
                key={service.title}
                className={`glass-hover relative overflow-hidden ${
                  service.popular ? 'ring-2 ring-primary/50 shadow-glow' : ''
                }`}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {/* Popular Badge */}
                {service.popular && (
                  <div className="absolute top-4 right-4 bg-gradient-primary px-3 py-1 rounded-full">
                    <span className="text-xs font-bold text-primary-foreground">MOST POPULAR</span>
                  </div>
                )}

                <div className="p-8 space-y-6">
                  {/* Icon */}
                  <div className="relative">
                    <div className="w-16 h-16 glass rounded-2xl flex items-center justify-center mb-4">
                      <IconComponent className="h-8 w-8 text-primary" />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-2xl font-bold text-foreground mb-2">
                        {service.title}
                      </h3>
                      <p className="text-muted-foreground leading-relaxed">
                        {service.description}
                      </p>
                    </div>

                    {/* Features */}
                    <ul className="space-y-2">
                      {service.features.map((feature, idx) => (
                        <li key={idx} className="flex items-center space-x-3 text-sm text-muted-foreground">
                          <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>

                    {/* Price */}
                    <div className="pt-4 border-t border-white/10">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-2xl font-bold text-gradient-primary">
                          {service.price}
                        </span>
                        <span className="text-xs text-muted-foreground">per booking</span>
                      </div>

                      <Button 
                        className={service.popular ? 'btn-luxury w-full' : 'btn-glass w-full'}
                        onClick={() => handleServiceLearnMore(service)}
                      >
                        Learn More
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Custom Service CTA */}
        <div className="mt-16 text-center">
          <div className="glass-card max-w-2xl mx-auto p-12 space-y-6">
            <Building className="h-16 w-16 text-primary mx-auto" />
            <h3 className="text-3xl font-bold">Need Something Custom?</h3>
            <p className="text-xl text-muted-foreground">
              Our concierge team specializes in creating bespoke celebrity experiences 
              tailored to your exact requirements.
            </p>
            <Button 
              className="btn-luxury text-lg px-8 py-4"
              onClick={handleConciergeContact}
            >
              Contact Our Concierge
            </Button>
          </div>
        </div>

        {/* Service Details Modal */}
        {showServiceModal && selectedService && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="max-w-4xl w-full max-h-[90vh] overflow-y-auto glass-card">
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-3xl font-bold flex items-center gap-3 mb-2">
                      <selectedService.icon className="h-8 w-8 text-primary" />
                      {selectedService.title}
                    </CardTitle>
                    <CardDescription className="text-lg">
                      {selectedService.description}
                    </CardDescription>
                  </div>
                  <Button 
                    variant="ghost" 
                    onClick={() => setShowServiceModal(false)}
                    className="text-gray-400 hover:text-white"
                  >
                    <X className="h-6 w-6" />
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-8">
                {/* Service Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <h3 className="text-2xl font-bold mb-4">What's Included</h3>
                    <ul className="space-y-3">
                      {selectedService.features.map((feature, idx) => (
                        <li key={idx} className="flex items-center gap-3">
                          <div className="w-2 h-2 bg-primary rounded-full" />
                          <span className="text-lg">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    
                    <div className="mt-6 p-6 bg-gradient-to-r from-primary/10 to-accent/10 rounded-xl">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-3xl font-bold text-gradient-primary">
                            {selectedService.price}
                          </span>
                          <span className="text-sm text-muted-foreground ml-2">per booking</span>
                        </div>
                        {selectedService.popular && (
                          <Badge className="bg-gradient-primary text-primary-foreground">
                            Most Popular
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-2xl font-bold mb-4">Request This Service</h3>
                    <form onSubmit={handleSubmitContact} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Full Name *</Label>
                          <Input
                            required
                            value={contactData.name}
                            onChange={(e) => setContactData({...contactData, name: e.target.value})}
                            className="glass"
                          />
                        </div>
                        <div>
                          <Label>Email *</Label>
                          <Input
                            type="email"
                            required
                            value={contactData.email}
                            onChange={(e) => setContactData({...contactData, email: e.target.value})}
                            className="glass"
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Phone</Label>
                          <Input
                            value={contactData.phone}
                            onChange={(e) => setContactData({...contactData, phone: e.target.value})}
                            className="glass"
                          />
                        </div>
                        <div>
                          <Label>Budget Range</Label>
                          <Input
                            placeholder="e.g. $10,000 - $50,000"
                            value={contactData.budget}
                            onChange={(e) => setContactData({...contactData, budget: e.target.value})}
                            className="glass"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <Label>Event Date</Label>
                        <Input
                          type="date"
                          value={contactData.eventDate}
                          onChange={(e) => setContactData({...contactData, eventDate: e.target.value})}
                          className="glass"
                        />
                      </div>
                      
                      <div>
                        <Label>Additional Details</Label>
                        <Textarea
                          placeholder="Tell us more about your event or requirements..."
                          rows={4}
                          value={contactData.message}
                          onChange={(e) => setContactData({...contactData, message: e.target.value})}
                          className="glass"
                        />
                      </div>
                      
                      <Button type="submit" className="btn-luxury w-full text-lg py-3">
                        Submit Request
                      </Button>
                    </form>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Concierge Contact Modal */}
        {showConciergeModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="max-w-2xl w-full glass-card">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-3xl font-bold">Contact Our Concierge</CardTitle>
                    <CardDescription className="text-lg">
                      Let us create a bespoke celebrity experience for you
                    </CardDescription>
                  </div>
                  <Button 
                    variant="ghost" 
                    onClick={() => setShowConciergeModal(false)}
                    className="text-gray-400 hover:text-white"
                  >
                    <X className="h-6 w-6" />
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent>
                <form onSubmit={handleSubmitContact} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Full Name *</Label>
                      <Input
                        required
                        value={contactData.name}
                        onChange={(e) => setContactData({...contactData, name: e.target.value})}
                        className="glass"
                      />
                    </div>
                    <div>
                      <Label>Email *</Label>
                      <Input
                        type="email"
                        required
                        value={contactData.email}
                        onChange={(e) => setContactData({...contactData, email: e.target.value})}
                        className="glass"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Phone</Label>
                      <Input
                        value={contactData.phone}
                        onChange={(e) => setContactData({...contactData, phone: e.target.value})}
                        className="glass"
                      />
                    </div>
                    <div>
                      <Label>Budget Range</Label>
                      <Input
                        placeholder="e.g. $25,000+"
                        value={contactData.budget}
                        onChange={(e) => setContactData({...contactData, budget: e.target.value})}
                        className="glass"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label>Service Needed</Label>
                    <Input
                      placeholder="Custom celebrity experience, unique event, etc."
                      value={contactData.service}
                      onChange={(e) => setContactData({...contactData, service: e.target.value})}
                      className="glass"
                    />
                  </div>
                  
                  <div>
                    <Label>Event Date</Label>
                    <Input
                      type="date"
                      value={contactData.eventDate}
                      onChange={(e) => setContactData({...contactData, eventDate: e.target.value})}
                      className="glass"
                    />
                  </div>
                  
                  <div>
                    <Label>Tell us about your vision</Label>
                    <Textarea
                      placeholder="Describe your dream celebrity experience..."
                      rows={4}
                      value={contactData.message}
                      onChange={(e) => setContactData({...contactData, message: e.target.value})}
                      className="glass"
                    />
                  </div>
                  
                  <div className="flex gap-4">
                    <Button 
                      type="button" 
                      variant="ghost" 
                      onClick={() => setShowConciergeModal(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button type="submit" className="btn-luxury flex-1 text-lg py-3">
                      <Mail className="h-4 w-4 mr-2" />
                      Send Request
                    </Button>
                  </div>
                </form>
                
                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-2">Contact Information</h4>
                  <div className="space-y-2 text-sm text-blue-700">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      <span>concierge@bookmyreservation.org</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      <span>+1 (555) 123-CONCIERGE</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </section>
  );
};