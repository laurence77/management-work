import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { showSuccess, showError, showBookingSuccess, showBookingError } from "@/utils/toast-helpers";
import { 
  Crown, 
  Star, 
  Diamond, 
  Zap, 
  Shield, 
  Clock, 
  Phone,
  Calendar,
  Users,
  Award,
  Sparkles,
  CheckCircle,
  ArrowRight,
  Gift,
  Heart,
  Lock,
  Gem
} from "lucide-react";

const VIP = () => {
  const [selectedTier, setSelectedTier] = useState("platinum");
  const [showEnrollmentModal, setShowEnrollmentModal] = useState(false);
  const [enrollmentData, setEnrollmentData] = useState({
    fullName: '',
    email: '',
    phone: '',
    company: '',
    tier: 'platinum'
  });

  const vipTiers = [
    {
      id: "gold",
      name: "Gold Elite",
      icon: Crown,
      color: "from-yellow-400 to-yellow-600",
      price: "$50,000",
      period: "/year",
      description: "Premium access to A-list celebrities",
      features: [
        "Priority booking for all celebrities",
        "24/7 concierge support",
        "Exclusive event invitations",
        "Professional photography included",
        "Private transportation arranged",
        "Flexible cancellation policy",
        "Personal account manager"
      ],
      perks: [
        "Skip waitlists",
        "VIP lounge access",
        "Complimentary upgrades"
      ]
    },
    {
      id: "platinum",
      name: "Platinum Royalty",
      icon: Diamond,
      color: "from-gray-400 to-gray-600",
      price: "$150,000",
      period: "/year",
      description: "Ultimate celebrity experience package",
      popular: true,
      features: [
        "Everything in Gold Elite",
        "Private jet arrangements",
        "Luxury accommodation booking",
        "Celebrity home visits",
        "Extended meeting durations",
        "Multi-celebrity group sessions",
        "Red carpet event access",
        "Custom experience design"
      ],
      perks: [
        "Unlimited rebookings",
        "Global concierge service",
        "Celebrity gift exchanges"
      ]
    },
    {
      id: "diamond",
      name: "Diamond Imperial",
      icon: Gem,
      color: "from-blue-400 to-purple-600",
      price: "$500,000",
      period: "/year",
      description: "The ultimate celebrity lifestyle experience",
      features: [
        "Everything in Platinum Royalty",
        "Celebrity friendship programs",
        "Exclusive vacation experiences",
        "Personal celebrity appearances",
        "Movie set visits",
        "Award show attendance",
        "Celebrity collaboration projects",
        "Lifetime membership benefits"
      ],
      perks: [
        "Celebrity phone contacts",
        "Private island experiences",
        "Custom celebrity content"
      ]
    }
  ];

  const exclusiveCelebrities = [
    {
      name: "Leonardo DiCaprio",
      category: "A-List Actor",
      availability: "VIP Only",
      startingPrice: "$100,000",
      image: "/placeholder.svg",
      verified: true,
      tier: "diamond"
    },
    {
      name: "Taylor Swift",
      category: "Global Superstar",
      availability: "Limited VIP",
      startingPrice: "$200,000",
      image: "/placeholder.svg",
      verified: true,
      tier: "diamond"
    },
    {
      name: "Robert Downey Jr.",
      category: "Marvel Icon",
      availability: "Platinum+",
      startingPrice: "$75,000",
      image: "/placeholder.svg",
      verified: true,
      tier: "platinum"
    },
    {
      name: "Oprah Winfrey",
      category: "Media Mogul",
      availability: "Gold+",
      startingPrice: "$150,000",
      image: "/placeholder.svg",
      verified: true,
      tier: "gold"
    }
  ];

  const vipServices = [
    {
      icon: Shield,
      title: "Absolute Privacy",
      description: "Complete discretion and confidentiality guaranteed for all VIP members"
    },
    {
      icon: Clock,
      title: "Priority Access",
      description: "Skip all waitlists and get instant access to celebrity availability"
    },
    {
      icon: Phone,
      title: "24/7 Concierge",
      description: "Dedicated support team available around the clock for all requests"
    },
    {
      icon: Calendar,
      title: "Flexible Scheduling",
      description: "Last-minute changes and priority rebooking at no additional cost"
    },
    {
      icon: Gift,
      title: "Exclusive Experiences",
      description: "Access to private events, premieres, and celebrity-hosted gatherings"
    },
    {
      icon: Heart,
      title: "Personal Touch",
      description: "Customized experiences tailored to your preferences and interests"
    }
  ];

  const handleEnrollment = async (e: React.FormEvent) => {
    e.preventDefault();
    // Handle VIP enrollment
    console.log("VIP Enrollment:", enrollmentData);
    showSuccess("Thank you for your VIP application. Our team will contact you within 24 hours.");
    setShowEnrollmentModal(false);
  };

  const selectedTierData = vipTiers.find(tier => tier.id === selectedTier);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Header />
      
      {/* Hero Section */}
      <section className="pt-20 min-h-screen flex items-center justify-center relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-transparent to-gold/20"></div>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gold/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        
        <div className="container mx-auto px-6 relative z-10">
          <div className="text-center max-w-4xl mx-auto space-y-8">
            {/* Badge */}
            <div className="inline-flex items-center space-x-2 glass-card px-6 py-3 fade-in">
              <Crown className="h-5 w-5 text-yellow-500" />
              <span className="text-sm text-muted-foreground">Exclusive VIP Access</span>
              <Badge className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-white">Elite Only</Badge>
            </div>

            {/* Main Headline */}
            <div className="space-y-4 md:space-y-6 slide-up">
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight">
                VIP Celebrity
                <span className="text-gradient-primary block">
                  Experience
                </span>
              </h1>
              <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed px-4 sm:px-0">
                Unlock exclusive access to A-list celebrities, private events, and once-in-a-lifetime 
                experiences reserved only for our VIP members.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center fade-in" style={{ animationDelay: '0.3s' }}>
              <Button 
                className="btn-luxury text-lg px-8 py-4"
                onClick={() => setShowEnrollmentModal(true)}
              >
                <Crown className="mr-2 h-5 w-5" />
                Apply for VIP Access
              </Button>
              <Button variant="ghost" className="btn-glass text-lg px-8 py-4">
                <Diamond className="mr-2 h-5 w-5" />
                View Membership Tiers
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 md:gap-8 max-w-2xl mx-auto mt-12 px-4 fade-in" style={{ animationDelay: '0.5s' }}>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-gradient-primary">500+</div>
                <div className="text-sm text-muted-foreground">VIP Members</div>
              </div>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-gradient-primary">100+</div>
                <div className="text-sm text-muted-foreground">A-List Celebrities</div>
              </div>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-gradient-primary">24/7</div>
                <div className="text-sm text-muted-foreground">Concierge Service</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* VIP Services */}
      <section className="py-20 bg-slate-50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              VIP <span className="text-gradient-primary">Services</span>
            </h2>
            <p className="text-xl text-muted-foreground">
              Exclusive benefits and services available only to our VIP members
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {vipServices.map((service, index) => {
              const Icon = service.icon;
              return (
                <Card key={index} className="glass-card hover:scale-105 transition-all duration-300">
                  <CardHeader>
                    <div className="w-12 h-12 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center mb-4">
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <CardTitle className="text-xl">{service.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{service.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* VIP Membership Tiers */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Membership <span className="text-gradient-primary">Tiers</span>
            </h2>
            <p className="text-xl text-muted-foreground">
              Choose the VIP experience that matches your lifestyle
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {vipTiers.map((tier) => {
              const Icon = tier.icon;
              return (
                <Card 
                  key={tier.id}
                  className={`glass-card relative hover:scale-105 transition-all duration-300 ${
                    tier.popular ? 'ring-2 ring-primary scale-105' : ''
                  }`}
                >
                  {tier.popular && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                      <Badge className="bg-gradient-to-r from-primary to-accent text-white px-6 py-2">
                        Most Popular
                      </Badge>
                    </div>
                  )}
                  
                  <CardHeader className="text-center pb-8">
                    <div className={`w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br ${tier.color} flex items-center justify-center`}>
                      <Icon className="h-8 w-8 text-white" />
                    </div>
                    <CardTitle className="text-2xl">{tier.name}</CardTitle>
                    <CardDescription className="text-lg">{tier.description}</CardDescription>
                    <div className="flex items-baseline justify-center mt-4">
                      <span className="text-4xl font-bold">{tier.price}</span>
                      <span className="text-muted-foreground ml-2">{tier.period}</span>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-6">
                    <div>
                      <h4 className="font-semibold mb-3 text-center">Features</h4>
                      <ul className="space-y-2">
                        {tier.features.map((feature, index) => (
                          <li key={index} className="flex items-center text-sm">
                            <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-3 text-center">Exclusive Perks</h4>
                      <div className="flex flex-wrap gap-2 justify-center">
                        {tier.perks.map((perk, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {perk}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <Button 
                      className="w-full btn-luxury"
                      onClick={() => setShowEnrollmentModal(true)}
                    >
                      Apply Now
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Exclusive Celebrities */}
      <section className="py-20 bg-slate-50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              VIP-Only <span className="text-gradient-primary">Celebrities</span>
            </h2>
            <p className="text-xl text-muted-foreground">
              Access to celebrities available exclusively to VIP members
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {exclusiveCelebrities.map((celebrity, index) => (
              <Card key={index} className="glass-card overflow-hidden group hover:scale-105 transition-all duration-300">
                <div className="aspect-square bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center relative">
                  <Users className="h-16 w-16 text-primary" />
                  <div className="absolute top-4 right-4">
                    <Badge className="bg-red-500 text-white">
                      <Lock className="h-3 w-3 mr-1" />
                      VIP Only
                    </Badge>
                  </div>
                  {celebrity.verified && (
                    <div className="absolute top-4 left-4">
                      <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                        <CheckCircle className="h-4 w-4 text-white" />
                      </div>
                    </div>
                  )}
                </div>
                
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{celebrity.name}</CardTitle>
                  <CardDescription>{celebrity.category}</CardDescription>
                </CardHeader>
                
                <CardContent>
                  <div className="flex items-center justify-between">
                    <Badge className={`${
                      celebrity.tier === 'diamond' ? 'bg-blue-100 text-blue-800' :
                      celebrity.tier === 'platinum' ? 'bg-gray-100 text-gray-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {celebrity.availability}
                    </Badge>
                    <span className="font-semibold text-primary">
                      From {celebrity.startingPrice}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Enrollment Modal */}
      {showEnrollmentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="glass-card max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold flex items-center">
                  <Crown className="h-6 w-6 mr-2 text-yellow-500" />
                  VIP Membership Application
                </h2>
                <Button 
                  variant="ghost" 
                  onClick={() => setShowEnrollmentModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  ×
                </Button>
              </div>

              <form onSubmit={handleEnrollment} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Full Name *</label>
                    <Input
                      type="text"
                      required
                      value={enrollmentData.fullName}
                      onChange={(e) => setEnrollmentData(prev => ({ ...prev, fullName: e.target.value }))}
                      placeholder="Enter your full name"
                      className="glass bg-white/5 border-white/10"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Email Address *</label>
                    <Input
                      type="email"
                      required
                      value={enrollmentData.email}
                      onChange={(e) => setEnrollmentData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="Enter your email"
                      className="glass bg-white/5 border-white/10"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Phone Number *</label>
                    <Input
                      type="tel"
                      required
                      value={enrollmentData.phone}
                      onChange={(e) => setEnrollmentData(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="Enter your phone number"
                      className="glass bg-white/5 border-white/10"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Company (Optional)</label>
                    <Input
                      type="text"
                      value={enrollmentData.company}
                      onChange={(e) => setEnrollmentData(prev => ({ ...prev, company: e.target.value }))}
                      placeholder="Company name"
                      className="glass bg-white/5 border-white/10"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Preferred Membership Tier</label>
                  <select
                    value={enrollmentData.tier}
                    onChange={(e) => setEnrollmentData(prev => ({ ...prev, tier: e.target.value }))}
                    className="w-full p-3 glass bg-white/5 border border-white/10 rounded-lg"
                  >
                    <option value="gold">Gold Elite - $50,000/year</option>
                    <option value="platinum">Platinum Royalty - $150,000/year</option>
                    <option value="diamond">Diamond Imperial - $500,000/year</option>
                  </select>
                </div>

                <div className="glass-card p-4 bg-blue-50 border-blue-200">
                  <h4 className="font-semibold text-blue-900 mb-2">Next Steps</h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Application review within 24 hours</li>
                    <li>• Personal consultation call scheduled</li>
                    <li>• Background verification process</li>
                    <li>• Membership activation upon approval</li>
                  </ul>
                </div>

                <div className="flex gap-4">
                  <Button 
                    type="button" 
                    variant="ghost" 
                    onClick={() => setShowEnrollmentModal(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    className="btn-luxury flex-1"
                  >
                    <Crown className="h-4 w-4 mr-2" />
                    Submit Application
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default VIP;