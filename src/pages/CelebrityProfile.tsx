import { useState } from "react";
import { Star, MapPin, Calendar, Clock, Shield, Award, Users, Camera, ArrowLeft, Heart, Share2 } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { LiveChat } from "@/components/shared/LiveChat";
import { Button } from "@/components/ui/button";

const celebrity = {
  name: "Emma Stone",
  category: "Academy Award Winner",
  image: "https://images.unsplash.com/photo-1494790108755-2616b4bbaa41?w=600&h=800&fit=crop&crop=face",
  rating: 4.9,
  reviewCount: 247,
  location: "Los Angeles, CA",
  bio: "Academy Award-winning actress known for her versatility and charm in both comedy and drama. Emma has captivated audiences worldwide with her performances in films like 'La La Land,' 'Easy A,' and 'The Help.' Her warm personality and professional approach make her perfect for corporate events, private meetings, and brand collaborations.",
  specialties: ["Film & Events", "Brand Collaborations", "Corporate Speaking", "Charity Events"],
  languages: ["English", "Spanish"],
  availability: "Available",
  responseTime: "Within 24 hours",
  successRate: "99.8%"
};

const pricingTiers = [
  {
    title: "Meet & Greet",
    duration: "30 minutes",
    price: "$15,000",
    features: [
      "Personal conversation",
      "Professional photos",
      "Autographs",
      "VIP treatment"
    ],
    popular: false
  },
  {
    title: "Private Meeting",
    duration: "1 hour",
    price: "$50,000",
    features: [
      "Extended conversation",
      "Professional photos",
      "Autographs",
      "VIP treatment",
      "Personalized video message"
    ],
    popular: true
  },
  {
    title: "Event Appearance",
    duration: "2-4 hours",
    price: "$125,000",
    features: [
      "Event appearance",
      "Red carpet arrival",
      "Photo opportunities",
      "Brief speech/remarks",
      "Meet & greet sessions"
    ],
    popular: false
  }
];

const reviews = [
  {
    name: "Sarah Johnson",
    rating: 5,
    date: "2 weeks ago",
    content: "Emma was absolutely wonderful! She was professional, warm, and made our corporate event unforgettable. Highly recommend!",
    event: "Corporate Event"
  },
  {
    name: "Michael Chen",
    rating: 5,
    date: "1 month ago",
    content: "The private meeting exceeded all expectations. Emma was genuine and engaging throughout our conversation.",
    event: "Private Meeting"
  }
];

const CelebrityProfile = () => {
  const [selectedTier, setSelectedTier] = useState(1);
  const [selectedDate, setSelectedDate] = useState("");

  return (
    <div className="min-h-screen">
      <Header />
      
      <main className="pt-32">
        {/* Back Navigation */}
        <div className="container mx-auto px-6 mb-8">
          <Button variant="ghost" className="btn-glass">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Celebrities
          </Button>
        </div>

        {/* Profile Header */}
        <section className="container mx-auto px-6 mb-16">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Image and Basic Info */}
            <div className="lg:col-span-1">
              <div className="glass-card overflow-hidden">
                <div className="relative">
                  <img
                    src={celebrity.image}
                    alt={celebrity.name}
                    className="w-full h-96 object-cover"
                  />
                  <div className="absolute top-4 right-4 flex space-x-2">
                    <Button size="icon" variant="ghost" className="glass bg-white/10">
                      <Heart className="h-5 w-5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="glass bg-white/10">
                      <Share2 className="h-5 w-5" />
                    </Button>
                  </div>
                  
                  {/* Availability Badge */}
                  <div className="absolute bottom-4 left-4">
                    <span className="bg-green-500/20 text-green-400 border border-green-500/30 px-3 py-1 rounded-full text-sm font-medium">
                      {celebrity.availability}
                    </span>
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  {/* Rating */}
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-1">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-5 w-5 text-primary fill-current" />
                      ))}
                    </div>
                    <span className="text-lg font-semibold">{celebrity.rating}</span>
                    <span className="text-muted-foreground">({celebrity.reviewCount} reviews)</span>
                  </div>

                  {/* Quick Stats */}
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3 text-muted-foreground">
                      <MapPin className="h-5 w-5 text-primary" />
                      <span>{celebrity.location}</span>
                    </div>
                    <div className="flex items-center space-x-3 text-muted-foreground">
                      <Clock className="h-5 w-5 text-primary" />
                      <span>Responds {celebrity.responseTime}</span>
                    </div>
                    <div className="flex items-center space-x-3 text-muted-foreground">
                      <Shield className="h-5 w-5 text-primary" />
                      <span>{celebrity.successRate} Success Rate</span>
                    </div>
                  </div>

                  {/* Languages */}
                  <div>
                    <h4 className="font-semibold mb-2">Languages</h4>
                    <div className="flex flex-wrap gap-2">
                      {celebrity.languages.map((lang) => (
                        <span key={lang} className="glass px-3 py-1 rounded-full text-sm">
                          {lang}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Specialties */}
                  <div>
                    <h4 className="font-semibold mb-2">Specialties</h4>
                    <div className="flex flex-wrap gap-2">
                      {celebrity.specialties.map((specialty) => (
                        <span key={specialty} className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm">
                          {specialty}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Header */}
              <div>
                <h1 className="text-4xl font-bold mb-2">{celebrity.name}</h1>
                <p className="text-xl text-primary font-medium mb-4">{celebrity.category}</p>
                <p className="text-muted-foreground leading-relaxed text-lg">
                  {celebrity.bio}
                </p>
              </div>

              {/* Pricing Tiers */}
              <div className="glass-card p-8">
                <h3 className="text-2xl font-bold mb-6">Booking Options</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {pricingTiers.map((tier, index) => (
                    <div
                      key={tier.title}
                      className={`glass-hover cursor-pointer transition-all duration-300 ${
                        selectedTier === index ? 'ring-2 ring-primary shadow-glow' : ''
                      } ${tier.popular ? 'ring-2 ring-primary/50' : ''}`}
                      onClick={() => setSelectedTier(index)}
                    >
                      {tier.popular && (
                        <div className="bg-gradient-primary text-primary-foreground text-center py-2 font-bold text-sm rounded-t-2xl">
                          MOST POPULAR
                        </div>
                      )}
                      
                      <div className="p-6 space-y-4">
                        <div className="text-center">
                          <h4 className="text-xl font-bold">{tier.title}</h4>
                          <p className="text-muted-foreground">{tier.duration}</p>
                          <div className="text-3xl font-bold text-gradient-primary mt-2">
                            {tier.price}
                          </div>
                        </div>

                        <ul className="space-y-2">
                          {tier.features.map((feature) => (
                            <li key={feature} className="flex items-center space-x-2 text-sm">
                              <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Booking Form */}
                <div className="mt-8 pt-8 border-t border-white/10">
                  <h4 className="text-xl font-bold mb-4">Select Your Preferred Date</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium mb-2">Preferred Date</label>
                      <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="w-full glass px-4 py-3 rounded-lg border border-white/10 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Preferred Time</label>
                      <select className="w-full glass px-4 py-3 rounded-lg border border-white/10 text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                        <option>Morning (9AM - 12PM)</option>
                        <option>Afternoon (12PM - 5PM)</option>
                        <option>Evening (5PM - 9PM)</option>
                        <option>Flexible</option>
                      </select>
                    </div>
                  </div>

                  <div className="mt-6">
                    <label className="block text-sm font-medium mb-2">Special Requirements (Optional)</label>
                    <textarea
                      placeholder="Please describe any special requirements or requests..."
                      className="w-full glass px-4 py-3 rounded-lg border border-white/10 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary h-24 resize-none"
                    />
                  </div>

                  <div className="flex space-x-4 mt-8">
                    <Button className="btn-luxury flex-1 text-lg py-4">
                      Request Booking - {pricingTiers[selectedTier].price}
                    </Button>
                    <Button variant="ghost" className="btn-glass px-8">
                      Message First
                    </Button>
                  </div>
                </div>
              </div>

              {/* Reviews */}
              <div className="glass-card p-8">
                <h3 className="text-2xl font-bold mb-6">Recent Reviews</h3>
                <div className="space-y-6">
                  {reviews.map((review, index) => (
                    <div key={index} className="glass-hover p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h4 className="font-semibold">{review.name}</h4>
                          <p className="text-sm text-muted-foreground">{review.event} • {review.date}</p>
                        </div>
                        <div className="flex items-center space-x-1">
                          {[...Array(review.rating)].map((_, i) => (
                            <Star key={i} className="h-4 w-4 text-primary fill-current" />
                          ))}
                        </div>
                      </div>
                      <p className="text-muted-foreground">{review.content}</p>
                    </div>
                  ))}
                </div>
                
                <div className="text-center mt-6">
                  <Button variant="ghost" className="btn-glass">
                    View All Reviews
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
      <LiveChat />
    </div>
  );
};

export default CelebrityProfile;