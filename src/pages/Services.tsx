import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  Sparkles
} from "lucide-react";

const Services = () => {
  const [selectedCategory, setSelectedCategory] = useState("all");

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
    <div className="min-h-screen">
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
                  
                  <Button className="btn-luxury w-full group">
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
              <Button className="btn-luxury text-lg px-8 py-4">
                Start Your Journey
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button variant="ghost" className="btn-glass text-lg px-8 py-4">
                Schedule Consultation
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Services;