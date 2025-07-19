import { useState } from "react";
import { Search, Filter, Grid, List, Star, MapPin, Calendar, ArrowRight } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { LiveChat } from "@/components/shared/LiveChat";
import { Button } from "@/components/ui/button";

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

const CelebrityPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All Categories");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showFilters, setShowFilters] = useState(false);

  return (
    <div className="min-h-screen">
      <Header />
      
      {/* Hero Section */}
      <section className="pt-32 pb-16 bg-gradient-hero">
        <div className="container mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Browse Our
              <span className="text-gradient-primary"> Celebrity Roster</span>
            </h1>
            <p className="text-xl text-muted-foreground">
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
              <div className="mt-6 pt-6 border-t border-white/10 grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  <label className="block text-sm font-medium text-foreground mb-2">Location</label>
                  <select className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-foreground">
                    <option>Any Location</option>
                    <option>Los Angeles</option>
                    <option>New York</option>
                    <option>London</option>
                    <option>Toronto</option>
                  </select>
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
                    <Button className="btn-luxury">
                      View Profile
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
    </div>
  );
};

export default CelebrityPage;