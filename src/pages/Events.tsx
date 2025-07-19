import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Calendar, 
  MapPin, 
  Clock, 
  Users, 
  Star, 
  Search,
  Filter,
  ArrowRight,
  Ticket,
  Heart,
  Music,
  Camera,
  Award,
  Sparkles
} from "lucide-react";

const Events = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCity, setSelectedCity] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedMonth, setSelectedMonth] = useState("all");

  const cities = ["Los Angeles", "New York", "London", "Paris", "Tokyo", "Dubai"];
  const categories = ["Concert", "Gala", "Premiere", "Awards", "Fashion", "Charity"];
  const months = ["January", "February", "March", "April", "May", "June"];

  const featuredEvents = [
    {
      id: 1,
      title: "Hollywood Gala Night",
      date: "2024-02-15",
      time: "19:00",
      location: "Beverly Hills Hotel",
      city: "Los Angeles",
      category: "Gala",
      celebrity: "Emma Stone",
      description: "An exclusive evening celebrating cinema's finest with A-list celebrities.",
      image: "/placeholder.svg",
      price: "$2,500",
      ticketsLeft: 12,
      isFeatured: true
    },
    {
      id: 2,
      title: "Music Legends Concert",
      date: "2024-02-20",
      time: "20:00",
      location: "Madison Square Garden",
      city: "New York",
      category: "Concert",
      celebrity: "John Legend",
      description: "A night of unforgettable music with Grammy-winning artists.",
      image: "/placeholder.svg",
      price: "$1,800",
      ticketsLeft: 25,
      isFeatured: true
    },
    {
      id: 3,
      title: "Fashion Week Afterparty",
      date: "2024-02-25",
      time: "22:00",
      location: "The Shard",
      city: "London",
      category: "Fashion",
      celebrity: "Zendaya",
      description: "Exclusive afterparty with top models and fashion icons.",
      image: "/placeholder.svg",
      price: "$1,200",
      ticketsLeft: 8,
      isFeatured: true
    }
  ];

  const upcomingEvents = [
    {
      id: 4,
      title: "Charity Auction Dinner",
      date: "2024-03-05",
      time: "18:30",
      location: "Four Seasons",
      city: "Los Angeles",
      category: "Charity",
      celebrity: "Leonardo DiCaprio",
      description: "Supporting environmental causes with celebrity auction.",
      image: "/placeholder.svg",
      price: "$5,000",
      ticketsLeft: 15,
      isFeatured: false
    },
    {
      id: 5,
      title: "Film Premiere & Red Carpet",
      date: "2024-03-12",
      time: "19:30",
      location: "TCL Chinese Theatre",
      city: "Los Angeles",
      category: "Premiere",
      celebrity: "Ryan Gosling",
      description: "World premiere with exclusive red carpet access.",
      image: "/placeholder.svg",
      price: "$3,200",
      ticketsLeft: 6,
      isFeatured: false
    },
    {
      id: 6,
      title: "Jazz Night with Legends",
      date: "2024-03-18",
      time: "20:30",
      location: "Blue Note",
      city: "New York",
      category: "Concert",
      celebrity: "Norah Jones",
      description: "Intimate jazz performance in iconic venue.",
      image: "/placeholder.svg",
      price: "$800",
      ticketsLeft: 32,
      isFeatured: false
    },
    {
      id: 7,
      title: "Art Gallery Opening",
      date: "2024-03-22",
      time: "18:00",
      location: "Tate Modern",
      city: "London",
      category: "Gala",
      celebrity: "Banksy",
      description: "Exclusive art exhibition with celebrity collectors.",
      image: "/placeholder.svg",
      price: "$1,500",
      ticketsLeft: 20,
      isFeatured: false
    },
    {
      id: 8,
      title: "Awards Night Celebration",
      date: "2024-03-28",
      time: "21:00",
      location: "Hotel Plaza Athénée",
      city: "Paris",
      category: "Awards",
      celebrity: "Marion Cotillard",
      description: "Celebrating excellence in French cinema.",
      image: "/placeholder.svg",
      price: "$2,800",
      ticketsLeft: 18,
      isFeatured: false
    }
  ];

  const allEvents = [...featuredEvents, ...upcomingEvents];

  const filteredEvents = allEvents.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.celebrity.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCity = selectedCity === "all" || event.city === selectedCity;
    const matchesCategory = selectedCategory === "all" || event.category === selectedCategory;
    const matchesMonth = selectedMonth === "all" || 
                        new Date(event.date).toLocaleString('default', { month: 'long' }) === selectedMonth;
    
    return matchesSearch && matchesCity && matchesCategory && matchesMonth;
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      day: date.getDate(),
      month: date.toLocaleString('default', { month: 'short' }),
      weekday: date.toLocaleString('default', { weekday: 'short' })
    };
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Concert": return Music;
      case "Premiere": return Camera;
      case "Awards": return Award;
      case "Gala": return Sparkles;
      case "Fashion": return Heart;
      default: return Calendar;
    }
  };

  return (
    <div className="min-h-screen">
      <Header />
      
      {/* Hero Section */}
      <section className="pt-20 min-h-screen flex items-center justify-center relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-transparent to-primary/10"></div>
        <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/3 right-1/3 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        
        <div className="container mx-auto px-6 relative z-10">
          <div className="text-center max-w-4xl mx-auto space-y-8">
            {/* Badge */}
            <div className="inline-flex items-center space-x-2 glass-card px-6 py-3 fade-in">
              <Calendar className="h-5 w-5 text-primary" />
              <span className="text-sm text-muted-foreground">Exclusive Celebrity Events</span>
              <Badge className="bg-primary/20 text-primary">Live Now</Badge>
            </div>

            {/* Main Headline */}
            <div className="space-y-4 md:space-y-6 slide-up">
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight">
                Unforgettable
                <span className="text-gradient-primary block">
                  Celebrity Events
                </span>
              </h1>
              <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed px-4 sm:px-0">
                Get exclusive access to red carpet premieres, intimate concerts, and luxury galas 
                with your favorite celebrities.
              </p>
            </div>

            {/* Quick Search */}
            <div className="max-w-2xl mx-auto px-4 fade-in" style={{ animationDelay: '0.3s' }}>
              <div className="glass-card p-2">
                <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-2">
                  <div className="flex-1 relative w-full">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      placeholder="Search events or celebrities..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-12 bg-transparent border-none focus:ring-0"
                    />
                  </div>
                  <Button className="btn-luxury h-12 px-6 sm:px-8 w-full sm:w-auto">
                    <Search className="h-5 w-5 mr-2" />
                    Search Events
                  </Button>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 md:gap-8 max-w-2xl mx-auto mt-12 px-4 fade-in" style={{ animationDelay: '0.5s' }}>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-gradient-primary">150+</div>
                <div className="text-sm text-muted-foreground">Events This Year</div>
              </div>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-gradient-primary">50+</div>
                <div className="text-sm text-muted-foreground">Cities Worldwide</div>
              </div>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-gradient-primary">VIP</div>
                <div className="text-sm text-muted-foreground">Access Only</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Events Carousel */}
      <section className="py-20 relative">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Featured <span className="text-gradient-primary">Events</span>
            </h2>
            <p className="text-xl text-muted-foreground">
              Don't miss these exclusive, limited-availability celebrity events.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {featuredEvents.map((event) => {
              const dateInfo = formatDate(event.date);
              const CategoryIcon = getCategoryIcon(event.category);
              
              return (
                <Card key={event.id} className="glass-card border-white/10 overflow-hidden group hover:scale-105 transition-all duration-300">
                  <div className="relative">
                    <div className="aspect-video bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                      <CategoryIcon className="h-16 w-16 text-primary" />
                    </div>
                    <div className="absolute top-4 left-4">
                      <Badge className="bg-primary/90 text-primary-foreground">Featured</Badge>
                    </div>
                    <div className="absolute top-4 right-4 glass-card text-center p-3">
                      <div className="text-2xl font-bold text-primary">{dateInfo.day}</div>
                      <div className="text-xs text-muted-foreground">{dateInfo.month}</div>
                    </div>
                  </div>
                  
                  <CardHeader className="pb-4">
                    <CardTitle className="text-xl">{event.title}</CardTitle>
                    <CardDescription className="text-muted-foreground">
                      {event.description}
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <Star className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">{event.celebrity}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">{event.location}, {event.city}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">{event.time}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold text-primary">{event.price}</span>
                        <div className="flex items-center space-x-1">
                          <Ticket className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">{event.ticketsLeft} left</span>
                        </div>
                      </div>
                    </div>
                    
                    <Button className="btn-luxury w-full group">
                      Get Tickets
                      <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Filters & All Events */}
      <section className="py-20 relative">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              All <span className="text-gradient-primary">Events</span>
            </h2>
            <p className="text-xl text-muted-foreground">
              Browse our complete collection of upcoming celebrity events.
            </p>
          </div>

          {/* Filters */}
          <div className="glass-card p-6 mb-12">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="h-5 w-5 text-primary" />
              <span className="font-medium">Filter Events</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Select value={selectedCity} onValueChange={setSelectedCity}>
                <SelectTrigger className="glass bg-white/5 border-white/10">
                  <SelectValue placeholder="Select City" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cities</SelectItem>
                  {cities.map((city) => (
                    <SelectItem key={city} value={city}>{city}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="glass bg-white/5 border-white/10">
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="glass bg-white/5 border-white/10">
                  <SelectValue placeholder="Select Month" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Months</SelectItem>
                  {months.map((month) => (
                    <SelectItem key={month} value={month}>{month}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button 
                variant="outline" 
                onClick={() => {
                  setSelectedCity("all");
                  setSelectedCategory("all");
                  setSelectedMonth("all");
                  setSearchTerm("");
                }}
                className="glass-hover"
              >
                Clear Filters
              </Button>
            </div>
          </div>

          {/* Events Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredEvents.filter(event => !event.isFeatured).map((event) => {
              const dateInfo = formatDate(event.date);
              const CategoryIcon = getCategoryIcon(event.category);
              
              return (
                <Card key={event.id} className="glass-card border-white/10 overflow-hidden group hover:scale-105 transition-all duration-300">
                  <div className="relative">
                    <div className="aspect-video bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                      <CategoryIcon className="h-12 w-12 text-primary" />
                    </div>
                    <div className="absolute top-4 right-4 glass-card text-center p-2">
                      <div className="text-lg font-bold text-primary">{dateInfo.day}</div>
                      <div className="text-xs text-muted-foreground">{dateInfo.month}</div>
                    </div>
                    <Badge className="absolute top-4 left-4 bg-accent/20 text-accent">
                      {event.category}
                    </Badge>
                  </div>
                  
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg">{event.title}</CardTitle>
                    <CardDescription className="text-muted-foreground text-sm">
                      {event.description}
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Star className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">{event.celebrity}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">{event.location}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold text-primary">{event.price}</span>
                        <span className="text-sm text-muted-foreground">{event.ticketsLeft} tickets left</span>
                      </div>
                    </div>
                    
                    <Button className="btn-luxury w-full">
                      Get Tickets
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {filteredEvents.length === 0 && (
            <div className="text-center py-12">
              <Calendar className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-medium mb-2">No events found</h3>
              <p className="text-muted-foreground mb-4">
                Try adjusting your filters to see more events.
              </p>
              <Button 
                onClick={() => {
                  setSelectedCity("all");
                  setSelectedCategory("all");
                  setSelectedMonth("all");
                  setSearchTerm("");
                }}
                className="btn-luxury"
              >
                Clear All Filters
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 relative">
        <div className="container mx-auto px-6">
          <div className="glass-card text-center p-12 md:p-16">
            <Users className="h-16 w-16 text-primary mx-auto mb-6" />
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Don't Miss Out on <span className="text-gradient-primary">Exclusive Events</span>
            </h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join our VIP list to get early access to the most exclusive celebrity events before they sell out.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button className="btn-luxury text-lg px-8 py-4">
                Join VIP List
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button variant="ghost" className="btn-glass text-lg px-8 py-4">
                Browse All Events
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Events;