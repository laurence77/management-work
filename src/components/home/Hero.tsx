import { useState } from "react";
import { Search, Star, ArrowRight, Play, Shield, Clock, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { SITE_CONFIG } from "@/config/branding";

export const Hero = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  const handleSearch = () => {
    navigate(`/celebrities?search=${encodeURIComponent(searchTerm)}`);
  };

  const handleExploreCelebrities = () => {
    navigate('/celebrities');
  };

  return (
    <section className="min-h-screen flex items-center justify-center relative overflow-hidden pt-20">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10"></div>
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
      
      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center max-w-5xl mx-auto space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center space-x-2 glass-card px-6 py-3 fade-in">
            <Crown className="h-5 w-5 text-primary" />
            <span className="text-sm text-muted-foreground">Trusted by Fortune 500 Companies</span>
            <div className="flex space-x-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-4 w-4 text-primary fill-current" />
              ))}
            </div>
          </div>

          {/* Main Headline */}
          <div className="space-y-4 md:space-y-6 slide-up">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold leading-tight">
              {SITE_CONFIG.tagline.split(' ').slice(0, 2).join(' ')}
              <span className="text-gradient-primary block">
                {SITE_CONFIG.tagline.split(' ').slice(2, 4).join(' ')}
              </span>
              {SITE_CONFIG.tagline.split(' ').slice(4).join(' ')}
            </h1>
            <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed px-4 sm:px-0">
              {SITE_CONFIG.description}
            </p>
          </div>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto px-4 fade-in" style={{ animationDelay: '0.3s' }}>
            <div className="glass-card p-2">
              <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-2">
                <div className="flex-1 relative w-full">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search celebrities, actors, musicians..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 sm:py-4 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none text-base sm:text-lg"
                  />
                </div>
                <Button 
                  className="btn-luxury h-12 px-6 sm:px-8 w-full sm:w-auto"
                  onClick={handleSearch}
                >
                  <Search className="h-5 w-5 mr-2" />
                  Search
                </Button>
              </div>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 px-4 fade-in" style={{ animationDelay: '0.5s' }}>
            <Button 
              className="btn-luxury text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 w-full sm:w-auto"
              onClick={handleExploreCelebrities}
            >
              Explore Celebrities
              <ArrowRight className="ml-2 h-4 sm:h-5 w-4 sm:w-5" />
            </Button>
            <Button variant="ghost" className="btn-glass text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 w-full sm:w-auto">
              <Play className="mr-2 h-4 sm:h-5 w-4 sm:w-5" />
              Watch Demo
            </Button>
          </div>

          {/* Trust Indicators */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 max-w-4xl mx-auto mt-12 md:mt-16 px-4 fade-in" style={{ animationDelay: '0.7s' }}>
            <div className="glass-card text-center p-6 md:p-8 hover:bg-white/10 transition-all duration-300">
              <Shield className="h-10 md:h-12 w-10 md:w-12 text-primary mx-auto mb-3 md:mb-4" />
              <h3 className="text-lg md:text-xl font-semibold mb-2">{SITE_CONFIG.features.security.title}</h3>
              <p className="text-sm md:text-base text-muted-foreground">
                {SITE_CONFIG.features.security.description}
              </p>
            </div>
            
            <div className="glass-card text-center p-6 md:p-8 hover:bg-white/10 transition-all duration-300">
              <Clock className="h-10 md:h-12 w-10 md:w-12 text-primary mx-auto mb-3 md:mb-4" />
              <h3 className="text-lg md:text-xl font-semibold mb-2">{SITE_CONFIG.features.support.title}</h3>
              <p className="text-sm md:text-base text-muted-foreground">
                {SITE_CONFIG.features.support.description}
              </p>
            </div>
            
            <div className="glass-card text-center p-6 md:p-8 hover:bg-white/10 transition-all duration-300">
              <Crown className="h-10 md:h-12 w-10 md:w-12 text-primary mx-auto mb-3 md:mb-4" />
              <h3 className="text-lg md:text-xl font-semibold mb-2">{SITE_CONFIG.features.access.title}</h3>
              <p className="text-sm md:text-base text-muted-foreground">
                {SITE_CONFIG.features.access.description}
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 max-w-3xl mx-auto mt-12 md:mt-16 px-4 fade-in" style={{ animationDelay: '0.9s' }}>
            <div className="text-center">
              <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-gradient-primary">{SITE_CONFIG.stats.celebrities}</div>
              <div className="text-sm md:text-base text-muted-foreground">Celebrities</div>
            </div>
            <div className="text-center">
              <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-gradient-primary">{SITE_CONFIG.stats.bookings}</div>
              <div className="text-sm md:text-base text-muted-foreground">Bookings</div>
            </div>
            <div className="text-center">
              <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-gradient-primary">{SITE_CONFIG.stats.countries}</div>
              <div className="text-sm md:text-base text-muted-foreground">Countries</div>
            </div>
            <div className="text-center">
              <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-gradient-primary">{SITE_CONFIG.stats.successRate}</div>
              <div className="text-sm md:text-base text-muted-foreground">Success Rate</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};