import React, { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { showSuccess, showError, showBookingSuccess, showBookingError } from "@/utils/toast-helpers";
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

const Events: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCity, setSelectedCity] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [bookingData, setBookingData] = useState({
    fullName: '',
    email: '',
    phone: '',
    ticketQuantity: 1,
    specialRequests: ''
  });
  const [loading, setLoading] = useState(false);

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

  const handleBookTickets = (event: any) => {
    setSelectedEvent(event);
    setShowBookingModal(true);
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('http://localhost:3000/api/bookings/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventId: selectedEvent.id,
          eventTitle: selectedEvent.title,
          eventDate: selectedEvent.date,
          eventTime: selectedEvent.time,
          eventLocation: selectedEvent.location,
          celebrity: selectedEvent.celebrity,
          price: selectedEvent.price,
          ...bookingData
        })
      });

      const result = await response.json();
      
      if (result.success) {
        showBookingSuccess(result.data.bookingId);
        showSuccess('You will receive a confirmation email shortly.');
        setShowBookingModal(false);
        setBookingData({
          fullName: '',
          email: '',
          phone: '',
          ticketQuantity: 1,
          specialRequests: ''
        });
      } else {
        showBookingError();
      }
    } catch (error) {
      console.error('Booking error:', error);
      showBookingError();
    } finally {
      setLoading(false);
    }
  };

  const BookingModal = () => {
    if (!showBookingModal || !selectedEvent) return null;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="glass-card max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Book Tickets - {selectedEvent.title}</h2>
              <Button 
                variant="ghost" 
                onClick={() => setShowBookingModal(false)}
                className="text-gray-400 hover:text-white"
              >
                ×
              </Button>
            </div>

            {/* Event Details */}
            <div className="glass-card p-4 mb-6">
              <div className="flex items-center space-x-4 mb-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{formatDate(selectedEvent.date).day}</div>
                  <div className="text-sm text-muted-foreground">{formatDate(selectedEvent.date).month}</div>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{selectedEvent.title}</h3>
                  <p className="text-sm text-muted-foreground">{selectedEvent.celebrity}</p>
                  <p className="text-sm text-muted-foreground">{selectedEvent.location}, {selectedEvent.city}</p>
                  <p className="text-sm text-muted-foreground">{selectedEvent.time}</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-primary">{selectedEvent.price}</div>
                  <div className="text-sm text-muted-foreground">{selectedEvent.ticketsLeft} tickets left</div>
                </div>
              </div>
            </div>

            {/* Booking Form */}
            <form onSubmit={handleBookingSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Full Name *</label>
                  <Input
                    type="text"
                    required
                    value={bookingData.fullName}
                    onChange={(e) => setBookingData(prev => ({ ...prev, fullName: e.target.value }))}
                    placeholder="Enter your full name"
                    className="glass bg-white/5 border-white/10"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Email Address *</label>
                  <Input
                    type="email"
                    required
                    value={bookingData.email}
                    onChange={(e) => setBookingData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Enter your email"
                    className="glass bg-white/5 border-white/10"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Phone Number</label>
                  <Input
                    type="tel"
                    value={bookingData.phone}
                    onChange={(e) => setBookingData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="Enter your phone number"
                    className="glass bg-white/5 border-white/10"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Number of Tickets</label>
                  <select
                    value={bookingData.ticketQuantity}
                    onChange={(e) => setBookingData(prev => ({ ...prev, ticketQuantity: parseInt(e.target.value) }))}
                    className="w-full p-3 glass bg-white/5 border border-white/10 rounded-lg"
                  >
                    {[1,2,3,4,5,6,7,8,9,10].map(num => (
                      <option key={num} value={num}>{num} ticket{num > 1 ? 's' : ''}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Special Requests (Optional)</label>
                <textarea
                  value={bookingData.specialRequests}
                  onChange={(e) => setBookingData(prev => ({ ...prev, specialRequests: e.target.value }))}
                  placeholder="Any special requirements or requests..."
                  rows={3}
                  className="w-full p-3 glass bg-white/5 border border-white/10 rounded-lg resize-none"
                />
              </div>

              {/* Total Price */}
              <div className="glass-card p-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-medium">Total Price:</span>
                  <span className="text-2xl font-bold text-primary">
                    ${(parseInt(selectedEvent.price.replace('$', '').replace(',', '')) * bookingData.ticketQuantity).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  {bookingData.ticketQuantity} ticket{bookingData.ticketQuantity > 1 ? 's' : ''} × {selectedEvent.price} each
                </p>
              </div>

              <div className="flex gap-4 pt-4">
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={() => setShowBookingModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={loading}
                  className="btn-luxury flex-1"
                >
                  {loading ? 'Processing...' : 'Confirm Booking'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
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
                    
                    <Button 
                      className="btn-luxury w-full group"
                      onClick={() => handleBookTickets(event)}
                    >
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
                    
                    <Button 
                      className="btn-luxury w-full"
                      onClick={() => handleBookTickets(event)}
                    >
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
      <BookingModal />
    </div>
  );
};

export default Events;