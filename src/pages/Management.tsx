import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Users, 
  Star, 
  TrendingUp, 
  Award, 
  Briefcase,
  Phone,
  Mail,
  Calendar,
  Target,
  Zap,
  Crown,
  ArrowRight,
  CheckCircle,
  Globe,
  Camera,
  Mic,
  Trophy,
  Heart,
  Shield,
  Clock
} from "lucide-react";

const Management = () => {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    category: "",
    experience: "",
    currentRepresentation: "",
    goals: "",
    portfolio: "",
    socialFollowing: "",
    availableServices: [] as string[],
    additionalInfo: ""
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleServiceChange = (service: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      availableServices: checked 
        ? [...prev.availableServices, service]
        : prev.availableServices.filter(s => s !== service)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Form submission logic will be added when API is ready
    console.log("Form submitted:", formData);
    alert("Application submitted successfully! We'll be in touch within 48 hours.");
  };

  const managementServices = [
    {
      icon: Target,
      title: "Talent Representation",
      description: "Complete career management with strategic planning and industry connections.",
      features: ["Contract negotiation", "Brand partnerships", "Career strategy", "Industry networking"]
    },
    {
      icon: Globe,
      title: "PR & Media Coordination",
      description: "Professional media relations and public image management across all platforms.",
      features: ["Press releases", "Media interviews", "Crisis management", "Social media strategy"]
    },
    {
      icon: Calendar,
      title: "Event Negotiation",
      description: "Expert booking and event coordination for maximum exposure and compensation.",
      features: ["Event booking", "Fee negotiation", "Schedule coordination", "Venue relations"]
    },
    {
      icon: TrendingUp,
      title: "Long-term Career Support",
      description: "Comprehensive career development with focus on sustainable growth and success.",
      features: ["Brand development", "Market analysis", "Growth strategy", "Legacy planning"]
    }
  ];

  const successMetrics = [
    { icon: Users, value: "120+", label: "Careers Managed", description: "Talent under our management" },
    { icon: Star, value: "95%", label: "Satisfaction Rate", description: "Client satisfaction score" },
    { icon: Trophy, value: "$50M+", label: "Generated Revenue", description: "For our clients combined" },
    { icon: Award, value: "200+", label: "Industry Awards", description: "Won by our talent" }
  ];

  const testimonials = [
    {
      name: "Alexandra Morrison",
      role: "Actress",
      content: "EliteConnect transformed my career. Their strategic approach and industry connections opened doors I never imagined possible.",
      achievement: "3x Golden Globe Nominee",
      image: "/placeholder.svg"
    },
    {
      name: "Marcus Chen",
      role: "Musician",
      content: "The team's dedication to my vision and their expertise in the music industry has been invaluable to my success.",
      achievement: "Grammy Winner",
      image: "/placeholder.svg"
    },
    {
      name: "Sofia Rodriguez",
      role: "Influencer",
      content: "From 100K to 10M followers in 2 years. Their social media strategy and brand partnerships were game-changing.",
      achievement: "Top 10 Influencer",
      image: "/placeholder.svg"
    }
  ];

  const serviceCategories = [
    "Acting", "Music", "Sports", "Social Media", "Fashion", "Comedy", "Writing", "Directing", "Other"
  ];

  const serviceOptions = [
    "Personal appearances", "Brand endorsements", "Social media content", "Live performances", 
    "Speaking engagements", "Product placements", "Charity events", "Corporate events"
  ];

  return (
    <div className="min-h-screen">
      <Header />
      
      {/* Hero Section */}
      <section className="pt-20 min-h-screen flex items-center justify-center relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10"></div>
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        
        <div className="container mx-auto px-6 relative z-10">
          <div className="text-center max-w-4xl mx-auto space-y-8">
            {/* Badge */}
            <div className="inline-flex items-center space-x-2 glass-card px-6 py-3 fade-in">
              <Crown className="h-5 w-5 text-primary" />
              <span className="text-sm text-muted-foreground">Elite Celebrity Management</span>
              <div className="flex space-x-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 text-primary fill-current" />
                ))}
              </div>
            </div>

            {/* Main Headline */}
            <div className="space-y-4 md:space-y-6 slide-up">
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight">
                Elevate Your Career
                <span className="text-gradient-primary block">
                  To Stardom
                </span>
              </h1>
              <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed px-4 sm:px-0">
                Join the elite circle of celebrities we represent. Our comprehensive management 
                services transform talent into global success stories.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center px-4 fade-in" style={{ animationDelay: '0.3s' }}>
              <Button className="btn-luxury text-lg px-8 py-4">
                Apply for Representation
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button variant="ghost" className="btn-glass text-lg px-8 py-4">
                <Phone className="mr-2 h-5 w-5" />
                Schedule Consultation
              </Button>
            </div>

            {/* Trust Indicators */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 max-w-3xl mx-auto mt-12 px-4 fade-in" style={{ animationDelay: '0.5s' }}>
              {successMetrics.map((metric, index) => (
                <div key={index} className="text-center">
                  <metric.icon className="h-8 w-8 text-primary mx-auto mb-2" />
                  <div className="text-2xl sm:text-3xl font-bold text-gradient-primary">{metric.value}</div>
                  <div className="text-sm text-muted-foreground">{metric.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Management Services */}
      <section className="py-20 relative">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Our <span className="text-gradient-primary">Management Services</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Comprehensive career management designed to maximize your potential and accelerate your success.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {managementServices.map((service, index) => (
              <Card key={index} className="glass-card border-white/10 p-8 hover:scale-105 transition-all duration-300">
                <div className="flex items-start space-x-4">
                  <div className="glass-card w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0">
                    <service.icon className="h-8 w-8 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold mb-2">{service.title}</h3>
                    <p className="text-muted-foreground mb-4">{service.description}</p>
                    <div className="space-y-2">
                      {service.features.map((feature, featureIndex) => (
                        <div key={featureIndex} className="flex items-center space-x-2">
                          <CheckCircle className="h-4 w-4 text-primary" />
                          <span className="text-sm text-muted-foreground">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Success Metrics */}
      <section className="py-20 relative">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Our Track Record of <span className="text-gradient-primary">Success</span>
            </h2>
            <p className="text-xl text-muted-foreground">
              Numbers that speak to our commitment to your success.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {successMetrics.map((metric, index) => (
              <Card key={index} className="glass-card border-white/10 text-center p-8 hover:scale-105 transition-all duration-300">
                <metric.icon className="h-16 w-16 text-primary mx-auto mb-4" />
                <div className="text-4xl font-bold text-gradient-primary mb-2">{metric.value}</div>
                <h3 className="text-lg font-semibold mb-2">{metric.label}</h3>
                <p className="text-sm text-muted-foreground">{metric.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Client Testimonials */}
      <section className="py-20 relative">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Success <span className="text-gradient-primary">Stories</span>
            </h2>
            <p className="text-xl text-muted-foreground">
              Hear from the celebrities who trusted us with their careers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="glass-card border-white/10 p-8">
                <div className="flex items-center space-x-4 mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full flex items-center justify-center">
                    <Star className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold">{testimonial.name}</h4>
                    <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                    <p className="text-xs text-primary">{testimonial.achievement}</p>
                  </div>
                </div>
                <blockquote className="text-muted-foreground mb-4">
                  "{testimonial.content}"
                </blockquote>
                <div className="flex space-x-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 text-primary fill-current" />
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Application Form */}
      <section className="py-20 relative">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Apply for <span className="text-gradient-primary">Representation</span>
              </h2>
              <p className="text-xl text-muted-foreground">
                Take the first step towards elevating your career to new heights.
              </p>
            </div>

            <Card className="glass-card border-white/10">
              <CardHeader>
                <CardTitle className="text-2xl">Representation Application</CardTitle>
                <CardDescription>
                  Please provide detailed information about your background and career goals.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Personal Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Users className="h-5 w-5 text-primary" />
                      Personal Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="fullName">Full Name *</Label>
                        <Input
                          id="fullName"
                          value={formData.fullName}
                          onChange={(e) => handleInputChange('fullName', e.target.value)}
                          className="glass bg-white/5 border-white/10"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email Address *</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => handleInputChange('email', e.target.value)}
                          className="glass bg-white/5 border-white/10"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number *</Label>
                        <Input
                          id="phone"
                          value={formData.phone}
                          onChange={(e) => handleInputChange('phone', e.target.value)}
                          className="glass bg-white/5 border-white/10"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="category">Primary Category *</Label>
                        <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
                          <SelectTrigger className="glass bg-white/5 border-white/10">
                            <SelectValue placeholder="Select your category" />
                          </SelectTrigger>
                          <SelectContent>
                            {serviceCategories.map((category) => (
                              <SelectItem key={category} value={category}>{category}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Professional Background */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Briefcase className="h-5 w-5 text-primary" />
                      Professional Background
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="experience">Years of Experience *</Label>
                        <Select value={formData.experience} onValueChange={(value) => handleInputChange('experience', value)}>
                          <SelectTrigger className="glass bg-white/5 border-white/10">
                            <SelectValue placeholder="Select experience level" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1-2">1-2 years</SelectItem>
                            <SelectItem value="3-5">3-5 years</SelectItem>
                            <SelectItem value="6-10">6-10 years</SelectItem>
                            <SelectItem value="10+">10+ years</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="socialFollowing">Social Media Following</Label>
                        <Select value={formData.socialFollowing} onValueChange={(value) => handleInputChange('socialFollowing', value)}>
                          <SelectTrigger className="glass bg-white/5 border-white/10">
                            <SelectValue placeholder="Select following range" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="<10k">Less than 10K</SelectItem>
                            <SelectItem value="10k-100k">10K - 100K</SelectItem>
                            <SelectItem value="100k-1m">100K - 1M</SelectItem>
                            <SelectItem value="1m+">1M+</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="currentRepresentation">Current Representation</Label>
                      <Input
                        id="currentRepresentation"
                        value={formData.currentRepresentation}
                        onChange={(e) => handleInputChange('currentRepresentation', e.target.value)}
                        className="glass bg-white/5 border-white/10"
                        placeholder="Current agent/manager (if any)"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="portfolio">Portfolio/Website URL</Label>
                      <Input
                        id="portfolio"
                        value={formData.portfolio}
                        onChange={(e) => handleInputChange('portfolio', e.target.value)}
                        className="glass bg-white/5 border-white/10"
                        placeholder="https://yourportfolio.com"
                      />
                    </div>
                  </div>

                  {/* Services Offered */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Zap className="h-5 w-5 text-primary" />
                      Services You Can Offer
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {serviceOptions.map((service) => (
                        <div key={service} className="flex items-center space-x-2">
                          <Checkbox
                            checked={formData.availableServices.includes(service)}
                            onCheckedChange={(checked) => handleServiceChange(service, checked as boolean)}
                          />
                          <Label className="text-sm">{service}</Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Career Goals */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Target className="h-5 w-5 text-primary" />
                      Career Goals & Additional Information
                    </h3>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="goals">Career Goals *</Label>
                        <Textarea
                          id="goals"
                          value={formData.goals}
                          onChange={(e) => handleInputChange('goals', e.target.value)}
                          className="glass bg-white/5 border-white/10"
                          rows={3}
                          placeholder="Describe your short-term and long-term career goals..."
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="additionalInfo">Additional Information</Label>
                        <Textarea
                          id="additionalInfo"
                          value={formData.additionalInfo}
                          onChange={(e) => handleInputChange('additionalInfo', e.target.value)}
                          className="glass bg-white/5 border-white/10"
                          rows={3}
                          placeholder="Any additional information that would help us understand your career and goals..."
                        />
                      </div>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="flex flex-col sm:flex-row gap-4 pt-6">
                    <Button type="submit" className="btn-luxury flex-1">
                      Submit Application
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                    <Button type="button" variant="ghost" className="btn-glass">
                      Save as Draft
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Process Timeline */}
      <section className="py-20 relative">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Our <span className="text-gradient-primary">Process</span>
            </h2>
            <p className="text-xl text-muted-foreground">
              From application to stardom - here's how we work together.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { step: "01", title: "Application Review", description: "We carefully review your application and portfolio within 48 hours.", icon: Shield },
              { step: "02", title: "Initial Consultation", description: "One-on-one meeting to discuss your goals and our services.", icon: Users },
              { step: "03", title: "Strategy Development", description: "Custom career strategy and action plan creation.", icon: Target },
              { step: "04", title: "Active Management", description: "Ongoing representation and career development support.", icon: TrendingUp }
            ].map((item, index) => (
              <div key={index} className="text-center group">
                <div className="glass-card w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                  <item.icon className="h-8 w-8 text-primary" />
                </div>
                <div className="glass-card p-4 rounded-lg">
                  <div className="text-sm text-primary font-bold mb-2">{item.step}</div>
                  <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="py-20 relative">
        <div className="container mx-auto px-6">
          <div className="glass-card text-center p-12 md:p-16">
            <Crown className="h-16 w-16 text-primary mx-auto mb-6" />
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Take Your Career to the <span className="text-gradient-primary">Next Level?</span>
            </h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join the elite circle of celebrities we represent. Let's build your legacy together.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button className="btn-luxury text-lg px-8 py-4">
                <Mail className="mr-2 h-5 w-5" />
                Apply Now
              </Button>
              <Button variant="ghost" className="btn-glass text-lg px-8 py-4">
                <Phone className="mr-2 h-5 w-5" />
                Schedule Call
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Management;