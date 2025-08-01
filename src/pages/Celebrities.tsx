import { useState } from "react";
import { Search, Filter, Grid, List, Star, MapPin, Calendar, ArrowRight } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { LiveChat } from "@/components/shared/LiveChat";
import { Button } from "@/components/ui/button";
import { BookingForm } from "@/components/booking/BookingForm";
import { showSuccess, showError, showBookingSuccess, showBookingError } from "@/utils/toast-helpers";

const celebrities = [
  {
    id: 1,
    name: "Emma Stone",
    category: "Academy Award Winner",
    image: "https://images.unsplash.com/photo-1494790108755-2616b4bbaa41?w=400&h=500&fit=crop&crop=face",
    rating: 4.9,
    price: "From $50,000",
    availability: "Available",
    location: "Los Angeles, CA",
    specialty: "Film & Events",
    bio: "Academy Award-winning actress known for her versatility and charm in both comedy and drama."
  },
  {
    id: 2,
    name: "Ryan Reynolds",
    category: "Hollywood A-Lister",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=500&fit=crop&crop=face",
    rating: 4.8,
    price: "From $75,000",
    availability: "Limited",
    location: "Vancouver, CA",
    specialty: "Comedy & Brand Events",
    bio: "Charismatic actor and entrepreneur known for his wit and business acumen."
  },
  {
    id: 3,
    name: "Zendaya",
    category: "Multi-Talented Star",
    image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=500&fit=crop&crop=face",
    rating: 5.0,
    price: "From $100,000",
    availability: "Booking Soon",
    location: "New York, NY",
    specialty: "Fashion & Entertainment",
    bio: "Emmy-winning actress, singer, and fashion icon with global influence."
  },
  // Add more celebrities...
];

const categories = [
  "All Categories",
  "Actors",
  "Musicians",
  "Athletes",
  "Influencers",
  "Directors",
  "Authors"
];

const locations = {
  "United States": {
    "California": ["Los Angeles", "San Francisco", "San Diego", "Sacramento", "Oakland", "Fresno"],
    "New York": ["New York City", "Buffalo", "Rochester", "Syracuse", "Albany"],
    "Texas": ["Houston", "Dallas", "Austin", "San Antonio", "Fort Worth"],
    "Florida": ["Miami", "Orlando", "Tampa", "Jacksonville", "Fort Lauderdale"],
    "Illinois": ["Chicago", "Aurora", "Peoria", "Rockford"],
    "Nevada": ["Las Vegas", "Reno", "Henderson"],
    "Georgia": ["Atlanta", "Augusta", "Columbus", "Savannah"],
    "Tennessee": ["Nashville", "Memphis", "Knoxville", "Chattanooga"],
    "Colorado": ["Denver", "Colorado Springs", "Aurora", "Fort Collins"],
    "Arizona": ["Phoenix", "Tucson", "Mesa", "Chandler"]
  },
  "Canada": {
    "Ontario": ["Toronto", "Ottawa", "Hamilton", "London", "Windsor"],
    "British Columbia": ["Vancouver", "Victoria", "Surrey", "Burnaby"],
    "Quebec": ["Montreal", "Quebec City", "Laval", "Gatineau"],
    "Alberta": ["Calgary", "Edmonton", "Red Deer"]
  },
  "United Kingdom": {
    "England": ["London", "Manchester", "Birmingham", "Leeds", "Liverpool", "Bristol"],
    "Scotland": ["Edinburgh", "Glasgow", "Aberdeen", "Dundee"],
    "Wales": ["Cardiff", "Swansea", "Newport"],
    "Northern Ireland": ["Belfast", "Londonderry"]
  },
  "Australia": {
    "New South Wales": ["Sydney", "Newcastle", "Wollongong"],
    "Victoria": ["Melbourne", "Geelong", "Ballarat"],
    "Queensland": ["Brisbane", "Gold Coast", "Cairns"],
    "Western Australia": ["Perth", "Fremantle"]
  },
  "Germany": {
    "Bavaria": ["Munich", "Nuremberg", "Augsburg"],
    "North Rhine-Westphalia": ["Cologne", "Düsseldorf", "Dortmund"],
    "Berlin": ["Berlin"],
    "Hamburg": ["Hamburg"]
  },
  "France": {
    "Île-de-France": ["Paris", "Versailles"],
    "Provence-Alpes-Côte d'Azur": ["Nice", "Marseille", "Cannes"],
    "Auvergne-Rhône-Alpes": ["Lyon", "Grenoble"]
  }
};

const CelebrityPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All Categories");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCelebrity, setSelectedCelebrity] = useState<any>(null);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState("Any Country");
  const [selectedState, setSelectedState] = useState("Any State");
  const [selectedCity, setSelectedCity] = useState("Any City");

  // Get available states based on selected country
  const getAvailableStates = () => {
    if (selectedCountry === "Any Country") return [];
    return Object.keys(locations[selectedCountry as keyof typeof locations] || {});
  };

  // Get available cities based on selected state
  const getAvailableCities = () => {
    if (selectedCountry === "Any Country" || selectedState === "Any State") return [];
    const countryData = locations[selectedCountry as keyof typeof locations];
    return countryData?.[selectedState as keyof typeof countryData] || [];
  };

  // Reset dependent dropdowns when parent changes
  const handleCountryChange = (country: string) => {
    setSelectedCountry(country);
    setSelectedState("Any State");
    setSelectedCity("Any City");
  };

  const handleStateChange = (state: string) => {
    setSelectedState(state);
    setSelectedCity("Any City");
  };

  const handleBookingSubmit = async (bookingData: any) => {
    try {
      const response = await fetch('/api/bookings/with-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify(bookingData)
      });
      
      if (response.ok) {
        showBookingSuccess();
        showSuccess('We will contact you within 24 hours.');
        setShowBookingForm(false);
        setSelectedCelebrity(null);
      } else {
        const error = await response.json();
        showBookingError();
      }
    } catch (error) {
      console.error('Booking submission error:', error);
      showBookingError();
    }
  };

  const handleBookCelebrity = (celebrity: any) => {
    setSelectedCelebrity(celebrity);
    setShowBookingForm(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Header />
      
      {/* Hero Section */}
      <section className="pt-32 pb-16">
        <div className="container mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 text-white">
              Browse Our
              <span className="text-gradient-primary"> Celebrity Roster</span>
            </h1>
            <p className="text-xl text-slate-300">
              Discover and connect with over 2,000 verified celebrities worldwide
            </p>
          </div>

          {/* Search and Filters */}
          <div className="glass-card p-6 max-w-4xl mx-auto">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search Bar */}
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search by name, category, or location..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Category Filter */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {categories.map((category) => (
                  <option key={category} value={category} className="bg-card text-card-foreground">
                    {category}
                  </option>
                ))}
              </select>

              {/* Filter Button */}
              <Button
                variant="ghost"
                onClick={() => setShowFilters(!showFilters)}
                className="btn-glass"
              >
                <Filter className="h-5 w-5 mr-2" />
                Filters
              </Button>

              {/* View Toggle */}
              <div className="flex bg-white/5 rounded-lg p-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  className={viewMode === "grid" ? "bg-primary text-primary-foreground" : ""}
                >
                  <Grid className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className={viewMode === "list" ? "bg-primary text-primary-foreground" : ""}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Advanced Filters */}
            {showFilters && (
              <div className="mt-6 pt-6 border-t border-white/10 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Price Range</label>
                    <select className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-foreground">
                      <option>Any Price</option>
                      <option>Under $25K</option>
                      <option>$25K - $50K</option>
                      <option>$50K - $100K</option>
                      <option>$100K+</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Availability</label>
                    <select className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-foreground">
                      <option>Any Availability</option>
                      <option>Available Now</option>
                      <option>Limited Availability</option>
                      <option>Booking Soon</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Event Type</label>
                    <select className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-foreground">
                      <option>Any Event Type</option>
                      <option>Corporate Events</option>
                      <option>Private Parties</option>
                      <option>Weddings</option>
                      <option>Product Launches</option>
                      <option>Charity Events</option>
                      <option>Virtual Events</option>
                    </select>
                  </div>
                </div>
                
                {/* Location Filters */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-3">Location Filters</label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Country</label>
                      <select 
                        value={selectedCountry}
                        onChange={(e) => handleCountryChange(e.target.value)}
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-foreground"
                      >
                        <option>Any Country</option>
                        {Object.keys(locations).map(country => (
                          <option key={country} value={country}>{country}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">State/Province</label>
                      <select 
                        value={selectedState}
                        onChange={(e) => handleStateChange(e.target.value)}
                        disabled={selectedCountry === "Any Country"}
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-foreground disabled:opacity-50"
                      >
                        <option>Any State</option>
                        {getAvailableStates().map(state => (
                          <option key={state} value={state}>{state}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">City</label>
                      <select 
                        value={selectedCity}
                        onChange={(e) => setSelectedCity(e.target.value)}
                        disabled={selectedState === "Any State"}
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-foreground disabled:opacity-50"
                      >
                        <option>Any City</option>
                        {getAvailableCities().map(city => (
                          <option key={city} value={city}>{city}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Results */}
      <section className="py-12">
        <div className="container mx-auto px-6">
          {/* Results Header */}
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold">
              {celebrities.length} Celebrities Found
            </h2>
            <select className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-foreground">
              <option>Sort by Popularity</option>
              <option>Sort by Price (Low to High)</option>
              <option>Sort by Price (High to Low)</option>
              <option>Sort by Rating</option>
              <option>Sort by Availability</option>
            </select>
          </div>

          {/* Celebrity Grid */}
          <div className={`grid gap-8 ${
            viewMode === "grid" 
              ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" 
              : "grid-cols-1"
          }`}>
            {celebrities.map((celebrity, index) => (
              <div
                key={celebrity.id}
                className={`glass-hover group cursor-pointer ${
                  viewMode === "list" ? "flex space-x-6" : ""
                }`}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {/* Image */}
                <div className={`relative overflow-hidden ${
                  viewMode === "list" 
                    ? "w-48 h-64 flex-shrink-0 rounded-l-2xl" 
                    : "rounded-t-2xl"
                }`}>
                  <img
                    src={celebrity.image}
                    alt={celebrity.name}
                    className={`object-cover transition-transform duration-500 group-hover:scale-110 ${
                      viewMode === "list" ? "w-full h-full" : "w-full h-80"
                    }`}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                  
                  {/* Badges */}
                  <div className="absolute top-4 left-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      celebrity.availability === 'Available' 
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                        : celebrity.availability === 'Limited'
                        ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                        : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    }`}>
                      {celebrity.availability}
                    </span>
                  </div>

                  <div className="absolute top-4 right-4 flex items-center space-x-1 glass px-3 py-1 rounded-full">
                    <Star className="h-4 w-4 text-primary fill-current" />
                    <span className="text-sm font-medium">{celebrity.rating}</span>
                  </div>
                </div>

                {/* Content */}
                <div className={`p-6 space-y-4 ${viewMode === "list" ? "flex-1" : ""}`}>
                  <div>
                    <h3 className="text-2xl font-bold text-foreground mb-1">
                      {celebrity.name}
                    </h3>
                    <p className="text-primary font-medium">{celebrity.category}</p>
                  </div>

                  {viewMode === "list" && (
                    <p className="text-muted-foreground leading-relaxed">
                      {celebrity.bio}
                    </p>
                  )}

                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span className="text-sm">{celebrity.location}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span className="text-sm">{celebrity.specialty}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-white/10">
                    <span className="text-xl font-bold text-gradient-primary">
                      {celebrity.price}
                    </span>
                    <Button 
                      className="btn-luxury"
                      onClick={() => handleBookCelebrity(celebrity)}
                    >
                      Book Now
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="mt-12 flex items-center justify-center space-x-2">
            <Button variant="ghost" className="btn-glass">Previous</Button>
            <Button className="btn-luxury">1</Button>
            <Button variant="ghost" className="btn-glass">2</Button>
            <Button variant="ghost" className="btn-glass">3</Button>
            <Button variant="ghost" className="btn-glass">Next</Button>
          </div>
        </div>
      </section>

      <Footer />
      <LiveChat />
      
      {/* Booking Form Modal */}
      {showBookingForm && selectedCelebrity && (
        <BookingForm
          celebrity={selectedCelebrity}
          onSubmit={handleBookingSubmit}
          onClose={() => {
            setShowBookingForm(false);
            setSelectedCelebrity(null);
          }}
        />
      )}
    </div>
  );
};

export default CelebrityPage;