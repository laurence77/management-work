import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { showSuccess, showError, showBookingSuccess, showBookingError } from "@/utils/toast-helpers";
import { 
  Star, 
  Users, 
  Video, 
  Award, 
  Camera, 
  Music, 
  Crown, 
  Heart,
  CheckCircle,
  ArrowRight,
  Sparkles,
  Calendar,
  Phone,
  Mail
} from "lucide-react";

const Services = () => {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showConsultationModal, setShowConsultationModal] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const [consultationData, setConsultationData] = useState({
    fullName: "",
    email: "",
    phone: "",
    preferredDate: "",
    preferredTime: "",
    consultationType: "",
    message: ""
  });

  const [serviceRequestData, setServiceRequestData] = useState({
    fullName: "",
    email: "",
    phone: "",
    eventDate: "",
    eventType: "",
    budget: "",
    requirements: ""
  });

  const handleConsultationInputChange = (field: string, value: string) => {
    setConsultationData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleServiceInputChange = (field: string, value: string) => {
    setServiceRequestData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleConsultationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await fetch('http://localhost:3000/api/forms/consultation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(consultationData)
      });

      const result = await response.json();
      
      if (result.success) {
        showSuccess("Consultation request submitted successfully! We'll contact you to confirm your appointment.");
        setConsultationData({
          fullName: "",
          email: "",
          phone: "",
          preferredDate: "",
          preferredTime: "",
          consultationType: "",
          message: ""
        });
        setShowConsultationModal(false);
      } else {
        showError("Failed to submit consultation request. Please try again.");
      }
    } catch (error) {
      console.error('Submission error:', error);
      showError("Failed to submit consultation request. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleServiceRequest = (service: any) => {
    setSelectedService(service);
    setServiceRequestData(prev => ({
      ...prev,
      eventType: service.title
    }));
    setShowServiceModal(true);
  };

  const handleServiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await fetch('http://localhost:3000/api/forms/service-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...serviceRequestData,
          serviceId: selectedService?.id,
          serviceName: selectedService?.title
        })
      });

      const result = await response.json();
      
      if (result.success) {
        showBookingSuccess();
        showSuccess("We'll contact you with a customized quote.");
        setServiceRequestData({
          fullName: "",
          email: "",
          phone: "",
          eventDate: "",
          eventType: "",
          budget: "",
          requirements: ""
        });
        setShowServiceModal(false);
        setSelectedService(null);
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

  const categories = [
    { id: "all", name: "All Services", count: 12 },
    { id: "personal", name: "Personal", count: 4 },
    { id: "brand", name: "Brand", count: 3 },
    { id: "events", name: "Events", count: 5 }
  ];

  const services = [
    {
      id: 1,
      category: "personal",
      title: "Private Meet & Greet",
      description: "Exclusive one-on-one time with your favorite celebrity in a private, intimate setting.",
      icon: Users,
      price: "From $5,000",
      duration: "30-60 minutes",
      features: ["Private venue", "Photo opportunities", "Personal conversation", "Signed memorabilia"],
      popularity: "Most Popular",
      image: "/placeholder.svg"
    },
    {
      id: 2,
      category: "personal",
      title: "Virtual Shoutouts",
      description: "Personalized video messages for birthdays, anniversaries, or special occasions.",
      icon: Video,
      price: "From $500",
      duration: "1-3 minutes",
      features: ["Personalized script", "HD video quality", "24-48 hour delivery", "Unlimited replays"],
      popularity: null,
      image: "/placeholder.svg"
    },
    {
      id: 3,
      category: "brand",
      title: "Brand Endorsements",
      description: "Partner with A-list celebrities for authentic brand partnerships and campaigns.",
      icon: Award,
      price: "From $50,000",
      duration: "Campaign based",
      features: ["Social media posts", "Commercial appearances", "Product integration", "Usage rights"],
      popularity: "Premium",
      image: "/placeholder.svg"
    },
    {
      id: 4,
      category: "events",
      title: "Red Carpet Appearances",
      description: "Make your event unforgettable with celebrity appearances at premieres and galas.",
      icon: Camera,
      price: "From $25,000",
      duration: "2-4 hours",
      features: ["Red carpet walk", "Photo sessions", "Media interviews", "VIP treatment"],
      popularity: null,
      image: "/placeholder.svg"
    },
    {
      id: 5,
      category: "events",
      title: "Concert Bookings",
      description: "Book world-class musicians and performers for your private events and concerts.",
      icon: Music,
      price: "From $100,000",
      duration: "Full performance",
      features: ["Full band setup", "Sound engineering", "Custom setlist", "Meet & greet"],
      popularity: "Exclusive",
      image: "/placeholder.svg"
    },
    {
      id: 6,
      category: "personal",
      title: "Personal Styling Session",
      description: "Get styled by celebrity fashion experts and stylists for your special occasions.",
      icon: Crown,
      price: "From $2,500",
      duration: "2-3 hours",
      features: ["Wardrobe consultation", "Personal shopping", "Styling session", "Photo shoot"],
      popularity: null,
      image: "/placeholder.svg"
    }
  ];

  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "Event Planner",
      content: "EliteConnect made our charity gala extraordinary. The celebrity appearance exceeded all expectations.",
      rating: 5,
      service: "Red Carpet Appearances"
    },
    {
      name: "Michael Chen",
      role: "Brand Manager",
      content: "The brand partnership we secured through EliteConnect resulted in a 300% increase in engagement.",
      rating: 5,
      service: "Brand Endorsements"
    },
    {
      name: "Emma Rodriguez",
      role: "Private Client",
      content: "The meet & greet was a dream come true. Professional, intimate, and perfectly organized.",
      rating: 5,
      service: "Private Meet & Greet"
    }
  ];

  const filteredServices = selectedCategory === "all" 
    ? services 
    : services.filter(service => service.category === selectedCategory);

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
            <div className="inline-flex items-center space-x-2 glass-card px-6 py-3 fade-in">
              <Sparkles className="h-5 w-5 text-primary" />
              <span className="text-sm text-muted-foreground">Premium Celebrity Services</span>
              <div className="flex space-x-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 text-primary fill-current" />
                ))}
              </div>
            </div>

            {/* Main Headline */}
            <div className="space-y-4 md:space-y-6 slide-up">
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight">
                Exclusive Celebrity
                <span className="text-gradient-primary block">
                  Services
                </span>
              </h1>
              <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed px-4 sm:px-0">
                From intimate meet & greets to grand brand partnerships, we create unforgettable 
                celebrity experiences tailored to your needs.
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 md:gap-8 max-w-2xl mx-auto mt-12 px-4 fade-in" style={{ animationDelay: '0.3s' }}>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-gradient-primary">500+</div>
                <div className="text-sm text-muted-foreground">Services Delivered</div>
              </div>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-gradient-primary">98%</div>
                <div className="text-sm text-muted-foreground">Satisfaction Rate</div>
              </div>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-gradient-primary">24/7</div>
                <div className="text-sm text-muted-foreground">Concierge Support</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Categories */}
      <section className="py-20 relative">
        <div className="container mx-auto px-6">
          {/* Category Filter */}
          <div className="flex flex-wrap justify-center gap-4 mb-16">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`glass-card px-6 py-3 rounded-full transition-all duration-300 ${
                  selectedCategory === category.id
                    ? 'bg-primary/20 border-primary/30 text-primary'
                    : 'hover:bg-white/10'
                }`}
              >
                {category.name} ({category.count})
              </button>
            ))}
          </div>

          {/* Services Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredServices.map((service) => (
              <Card key={service.id} className="glass-card border-white/10 overflow-hidden group hover:scale-105 transition-all duration-300">
                {service.popularity && (
                  <div className="absolute top-4 right-4 z-10">
                    <Badge className="bg-primary/90 text-primary-foreground">
                      {service.popularity}
                    </Badge>
                  </div>
                )}
                
                <div className="aspect-video bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                  <service.icon className="h-16 w-16 text-primary" />
                </div>
                
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl">{service.title}</CardTitle>
                    <div className="text-right">
                      <div className="text-lg font-bold text-primary">{service.price}</div>
                      <div className="text-sm text-muted-foreground">{service.duration}</div>
                    </div>
                  </div>
                  <CardDescription className="text-muted-foreground">
                    {service.description}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    {service.features.map((feature, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-primary" />
                        <span className="text-sm text-muted-foreground">{feature}</span>
                      </div>
                    ))}
                  </div>
                  
                  <Button className="btn-luxury w-full group" onClick={() => handleServiceRequest(service)}>
                    Request This Service
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section className="py-20 relative">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              How It <span className="text-gradient-primary">Works</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Our streamlined process ensures your celebrity service experience is seamless and extraordinary.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { step: "01", title: "Consultation", description: "Tell us your vision and requirements" },
              { step: "02", title: "Matching", description: "We find the perfect celebrity for your needs" },
              { step: "03", title: "Coordination", description: "We handle all logistics and arrangements" },
              { step: "04", title: "Experience", description: "Enjoy your unforgettable celebrity moment" }
            ].map((item, index) => (
              <div key={index} className="text-center group">
                <div className="glass-card w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                  <span className="text-2xl font-bold text-primary">{item.step}</span>
                </div>
                <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                <p className="text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 relative">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Client <span className="text-gradient-primary">Stories</span>
            </h2>
            <p className="text-xl text-muted-foreground">
              Hear from our satisfied clients who experienced celebrity magic through EliteConnect.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="glass-card border-white/10">
                <CardContent className="p-8">
                  <div className="flex space-x-1 mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 text-primary fill-current" />
                    ))}
                  </div>
                  <blockquote className="text-muted-foreground mb-4">
                    "{testimonial.content}"
                  </blockquote>
                  <div>
                    <div className="font-semibold">{testimonial.name}</div>
                    <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                    <Badge variant="outline" className="mt-2 text-xs">
                      {testimonial.service}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 relative">
        <div className="container mx-auto px-6">
          <div className="glass-card text-center p-12 md:p-16">
            <Heart className="h-16 w-16 text-primary mx-auto mb-6" />
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Create Something <span className="text-gradient-primary">Extraordinary?</span>
            </h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Let us help you create an unforgettable celebrity experience that exceeds your wildest dreams.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button className="btn-luxury text-lg px-8 py-4" onClick={() => setShowConsultationModal(true)}>
                Start Your Journey
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button variant="ghost" className="btn-glass text-lg px-8 py-4" onClick={() => setShowConsultationModal(true)}>
                Schedule Consultation
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Footer />

      {/* Consultation Modal */}
      {showConsultationModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl bg-card/90 backdrop-blur border border-white/10">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl">Schedule Consultation</CardTitle>
                  <CardDescription>
                    Book a free consultation to discuss your celebrity service needs.
                  </CardDescription>
                </div>
                <Button variant="ghost" onClick={() => setShowConsultationModal(false)} className="text-muted-foreground hover:text-foreground">
                  ×
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleConsultationSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="consultation-fullName">Full Name *</Label>
                    <Input
                      id="consultation-fullName"
                      value={consultationData.fullName}
                      onChange={(e) => handleConsultationInputChange('fullName', e.target.value)}
                      className="glass bg-white/5 border-white/10"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="consultation-email">Email Address *</Label>
                    <Input
                      id="consultation-email"
                      type="email"
                      value={consultationData.email}
                      onChange={(e) => handleConsultationInputChange('email', e.target.value)}
                      className="glass bg-white/5 border-white/10"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="consultation-phone">Phone Number *</Label>
                    <Input
                      id="consultation-phone"
                      value={consultationData.phone}
                      onChange={(e) => handleConsultationInputChange('phone', e.target.value)}
                      className="glass bg-white/5 border-white/10"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="consultation-type">Service Interest *</Label>
                    <Select value={consultationData.consultationType} onValueChange={(value) => handleConsultationInputChange('consultationType', value)}>
                      <SelectTrigger className="glass bg-white/5 border-white/10">
                        <SelectValue placeholder="Select service type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="personal">Personal Services</SelectItem>
                        <SelectItem value="brand">Brand Partnerships</SelectItem>
                        <SelectItem value="events">Event Bookings</SelectItem>
                        <SelectItem value="general">General Inquiry</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="consultation-date">Preferred Date *</Label>
                    <Input
                      id="consultation-date"
                      type="date"
                      value={consultationData.preferredDate}
                      onChange={(e) => handleConsultationInputChange('preferredDate', e.target.value)}
                      className="glass bg-white/5 border-white/10"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="consultation-time">Preferred Time *</Label>
                    <Select value={consultationData.preferredTime} onValueChange={(value) => handleConsultationInputChange('preferredTime', value)}>
                      <SelectTrigger className="glass bg-white/5 border-white/10">
                        <SelectValue placeholder="Select time slot" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="09:00">9:00 AM</SelectItem>
                        <SelectItem value="10:00">10:00 AM</SelectItem>
                        <SelectItem value="11:00">11:00 AM</SelectItem>
                        <SelectItem value="14:00">2:00 PM</SelectItem>
                        <SelectItem value="15:00">3:00 PM</SelectItem>
                        <SelectItem value="16:00">4:00 PM</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="consultation-message">Tell us about your needs</Label>
                  <Textarea
                    id="consultation-message"
                    value={consultationData.message}
                    onChange={(e) => handleConsultationInputChange('message', e.target.value)}
                    className="glass bg-white/5 border-white/10"
                    rows={3}
                    placeholder="Describe the celebrity service you're looking for..."
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-4 pt-6">
                  <Button type="submit" className="btn-luxury flex-1" disabled={loading}>
                    {loading ? 'Booking...' : 'Schedule Consultation'}
                    {!loading && <Calendar className="ml-2 h-5 w-5" />}
                  </Button>
                  <Button type="button" variant="ghost" className="btn-glass" onClick={() => setShowConsultationModal(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Service Request Modal */}
      {showServiceModal && selectedService && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl bg-card/90 backdrop-blur border border-white/10">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl">Request {selectedService.title}</CardTitle>
                  <CardDescription>
                    {selectedService.description}
                  </CardDescription>
                </div>
                <Button variant="ghost" onClick={() => setShowServiceModal(false)} className="text-muted-foreground hover:text-foreground">
                  ×
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleServiceSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="service-fullName">Full Name *</Label>
                    <Input
                      id="service-fullName"
                      value={serviceRequestData.fullName}
                      onChange={(e) => handleServiceInputChange('fullName', e.target.value)}
                      className="glass bg-white/5 border-white/10"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="service-email">Email Address *</Label>
                    <Input
                      id="service-email"
                      type="email"
                      value={serviceRequestData.email}
                      onChange={(e) => handleServiceInputChange('email', e.target.value)}
                      className="glass bg-white/5 border-white/10"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="service-phone">Phone Number *</Label>
                    <Input
                      id="service-phone"
                      value={serviceRequestData.phone}
                      onChange={(e) => handleServiceInputChange('phone', e.target.value)}
                      className="glass bg-white/5 border-white/10"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="service-date">Event Date *</Label>
                    <Input
                      id="service-date"
                      type="date"
                      value={serviceRequestData.eventDate}
                      onChange={(e) => handleServiceInputChange('eventDate', e.target.value)}
                      className="glass bg-white/5 border-white/10"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="service-budget">Budget Range *</Label>
                    <Select value={serviceRequestData.budget} onValueChange={(value) => handleServiceInputChange('budget', value)}>
                      <SelectTrigger className="glass bg-white/5 border-white/10">
                        <SelectValue placeholder="Select budget range" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="under-10k">Under $10,000</SelectItem>
                        <SelectItem value="10k-50k">$10,000 - $50,000</SelectItem>
                        <SelectItem value="50k-100k">$50,000 - $100,000</SelectItem>
                        <SelectItem value="100k-plus">$100,000+</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="service-requirements">Special Requirements</Label>
                  <Textarea
                    id="service-requirements"
                    value={serviceRequestData.requirements}
                    onChange={(e) => handleServiceInputChange('requirements', e.target.value)}
                    className="glass bg-white/5 border-white/10"
                    rows={3}
                    placeholder="Tell us about your event, specific celebrity preferences, or any special requirements..."
                  />
                </div>

                <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                  <h4 className="font-semibold text-primary mb-2">Service Details:</h4>
                  <p className="text-sm text-muted-foreground mb-2">{selectedService.description}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-primary">{selectedService.price}</span>
                    <span className="text-sm text-muted-foreground">{selectedService.duration}</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 pt-6">
                  <Button type="submit" className="btn-luxury flex-1" disabled={loading}>
                    {loading ? 'Submitting...' : 'Submit Request'}
                    {!loading && <Mail className="ml-2 h-5 w-5" />}
                  </Button>
                  <Button type="button" variant="ghost" className="btn-glass" onClick={() => setShowServiceModal(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Services;