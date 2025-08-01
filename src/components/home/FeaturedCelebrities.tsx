import { useState } from "react";
import { Star, Calendar, MapPin, ArrowRight, X, Phone, Mail, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { showBookingSuccess, showBookingError } from "@/utils/toast-helpers";

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
    specialty: "Film & Events"
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
    specialty: "Comedy & Brand Events"
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
    specialty: "Fashion & Entertainment"
  },
  {
    id: 4,
    name: "Michael B. Jordan",
    category: "Action Star",
    image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=500&fit=crop&crop=face",
    rating: 4.9,
    price: "From $80,000",
    availability: "Available",
    location: "Atlanta, GA",
    specialty: "Sports & Corporate Events"
  },
  {
    id: 5,
    name: "Margot Robbie",
    category: "International Sensation",
    image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=500&fit=crop&crop=face",
    rating: 4.9,
    price: "From $90,000",
    availability: "Available",
    location: "Sydney, AU",
    specialty: "Film & International Events"
  },
  {
    id: 6,
    name: "Chris Evans",
    category: "Superhero Icon",
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=500&fit=crop&crop=face",
    rating: 4.8,
    price: "From $85,000",
    availability: "Limited",
    location: "Boston, MA",
    specialty: "Action & Charity Events"
  }
];

export const FeaturedCelebrities = () => {
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedCelebrity, setSelectedCelebrity] = useState(null);
  const [bookingData, setBookingData] = useState({
    name: '',
    email: '',
    phone: '',
    eventDate: '',
    eventType: '',
    budget: '',
    message: ''
  });

  const handleBookMeeting = (celebrity) => {
    setSelectedCelebrity(celebrity);
    setShowBookingModal(true);
  };

  const handleViewProfile = (celebrity) => {
    setSelectedCelebrity(celebrity);
    setShowProfileModal(true);
  };

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:3000/api/forms/consultation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...bookingData,
          celebrityName: selectedCelebrity?.name,
          celebrityPrice: selectedCelebrity?.price
        })
      });
      
      if (response.ok) {
        showBookingSuccess();
        setShowBookingModal(false);
        setBookingData({
          name: '',
          email: '',
          phone: '',
          eventDate: '',
          eventType: '',
          budget: '',
          message: ''
        });
      }
    } catch (error) {
      showBookingError();
    }
  };

  return (
    <section className="py-20">
      <div className="container mx-auto px-6">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Featured
            <span className="text-gradient-primary"> Celebrities</span>
          </h2>
          <p className="text-xl text-muted-foreground">
            Discover our most sought-after celebrities available for exclusive bookings, 
            private meetings, and luxury events worldwide.
          </p>
        </div>

        {/* Celebrity Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {celebrities.map((celebrity, index) => (
            <div
              key={celebrity.id}
              className="glass-hover group cursor-pointer"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Image */}
              <div className="relative overflow-hidden rounded-t-2xl">
                <img
                  src={celebrity.image}
                  alt={celebrity.name}
                  className="w-full h-80 object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                
                {/* Availability Badge */}
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

                {/* Rating */}
                <div className="absolute top-4 right-4 flex items-center space-x-1 glass px-3 py-1 rounded-full">
                  <Star className="h-4 w-4 text-primary fill-current" />
                  <span className="text-sm font-medium">{celebrity.rating}</span>
                </div>

                {/* Price */}
                <div className="absolute bottom-4 right-4 glass px-3 py-1 rounded-full">
                  <span className="text-sm font-medium text-primary">{celebrity.price}</span>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-4">
                <div>
                  <h3 className="text-2xl font-bold text-foreground mb-1">
                    {celebrity.name}
                  </h3>
                  <p className="text-primary font-medium">{celebrity.category}</p>
                </div>

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

                <div className="flex space-x-3 pt-4">
                  <Button 
                    className="btn-luxury flex-1"
                    onClick={() => handleBookMeeting(celebrity)}
                  >
                    Book Meeting
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="btn-glass"
                    onClick={() => handleViewProfile(celebrity)}
                  >
                    View Profile
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* View All Button */}
        <div className="text-center">
          <Button 
            className="btn-luxury text-lg px-12 py-4"
            onClick={() => window.location.href = '/celebrities'}
          >
            View All Celebrities
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>

        {/* Booking Modal */}
        {showBookingModal && selectedCelebrity && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="max-w-2xl w-full glass-card">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-2xl font-bold flex items-center gap-2">
                      <Heart className="h-6 w-6 text-red-500" />
                      Book Meeting with {selectedCelebrity.name}
                    </CardTitle>
                    <CardDescription className="text-lg">
                      {selectedCelebrity.category} • {selectedCelebrity.price}
                    </CardDescription>
                  </div>
                  <Button 
                    variant="ghost" 
                    onClick={() => setShowBookingModal(false)}
                    className="text-gray-400 hover:text-white"
                  >
                    <X className="h-6 w-6" />
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent>
                <form onSubmit={handleBookingSubmit} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Full Name *</Label>
                      <Input
                        required
                        value={bookingData.name}
                        onChange={(e) => setBookingData({...bookingData, name: e.target.value})}
                        className="glass"
                      />
                    </div>
                    <div>
                      <Label>Email *</Label>
                      <Input
                        type="email"
                        required
                        value={bookingData.email}
                        onChange={(e) => setBookingData({...bookingData, email: e.target.value})}
                        className="glass"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Phone</Label>
                      <Input
                        value={bookingData.phone}
                        onChange={(e) => setBookingData({...bookingData, phone: e.target.value})}
                        className="glass"
                      />
                    </div>
                    <div>
                      <Label>Budget Range</Label>
                      <Input
                        placeholder={`Starting from ${selectedCelebrity.price}`}
                        value={bookingData.budget}
                        onChange={(e) => setBookingData({...bookingData, budget: e.target.value})}
                        className="glass"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Event Date</Label>
                      <Input
                        type="date"
                        value={bookingData.eventDate}
                        onChange={(e) => setBookingData({...bookingData, eventDate: e.target.value})}
                        className="glass"
                      />
                    </div>
                    <div>
                      <Label>Event Type</Label>
                      <Input
                        placeholder="e.g. Private meeting, Corporate event"
                        value={bookingData.eventType}
                        onChange={(e) => setBookingData({...bookingData, eventType: e.target.value})}
                        className="glass"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label>Additional Details</Label>
                    <Textarea
                      placeholder="Tell us more about your event or special requests..."
                      rows={4}
                      value={bookingData.message}
                      onChange={(e) => setBookingData({...bookingData, message: e.target.value})}
                      className="glass"
                    />
                  </div>
                  
                  <div className="flex gap-4">
                    <Button 
                      type="button" 
                      variant="ghost" 
                      onClick={() => setShowBookingModal(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button type="submit" className="btn-luxury flex-1 text-lg py-3">
                      <Heart className="h-4 w-4 mr-2" />
                      Send Booking Request
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Profile Modal */}
        {showProfileModal && selectedCelebrity && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="max-w-4xl w-full max-h-[90vh] overflow-y-auto glass-card">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex items-start gap-6">
                    <img
                      src={selectedCelebrity.image}
                      alt={selectedCelebrity.name}
                      className="w-32 h-32 object-cover rounded-2xl shadow-lg"
                    />
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <CardTitle className="text-3xl font-bold">{selectedCelebrity.name}</CardTitle>
                        <Badge className="bg-blue-100 text-blue-800">
                          <Star className="h-3 w-3 mr-1" />
                          Verified
                        </Badge>
                      </div>
                      <p className="text-xl text-primary font-semibold mb-2">{selectedCelebrity.category}</p>
                      <div className="flex items-center gap-4 text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          <span>{selectedCelebrity.location}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>{selectedCelebrity.specialty}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-3">
                        <div className="flex items-center">
                          {[...Array(5)].map((_, i) => (
                            <Star 
                              key={i} 
                              className={`h-4 w-4 ${
                                i < Math.floor(selectedCelebrity.rating) 
                                  ? 'text-yellow-400 fill-current' 
                                  : 'text-gray-300'
                              }`} 
                            />
                          ))}
                        </div>
                        <span className="font-semibold">{selectedCelebrity.rating}</span>
                        <span className="text-2xl font-bold text-primary ml-4">{selectedCelebrity.price}</span>
                      </div>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    onClick={() => setShowProfileModal(false)}
                    className="text-gray-400 hover:text-white"
                  >
                    <X className="h-6 w-6" />
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <h3 className="text-2xl font-bold mb-4">About {selectedCelebrity.name}</h3>
                    <p className="text-muted-foreground mb-4">
                      {selectedCelebrity.category} known for exceptional performances and professional dedication. 
                      Available for exclusive bookings, private meetings, and special events worldwide.
                    </p>
                    
                    <div className="space-y-3">
                      <h4 className="font-semibold">Specializes In:</h4>
                      <ul className="space-y-2">
                        <li className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-primary rounded-full" />
                          <span>{selectedCelebrity.specialty}</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-primary rounded-full" />
                          <span>Private meet & greets</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-primary rounded-full" />
                          <span>Corporate appearances</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-primary rounded-full" />
                          <span>Brand partnerships</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-2xl font-bold mb-4">Booking Information</h3>
                    <div className="space-y-4">
                      <div className="p-4 bg-green-50 rounded-lg">
                        <h4 className="font-semibold text-green-800 mb-2">Availability</h4>
                        <p className="text-green-700">{selectedCelebrity.availability}</p>
                      </div>
                      
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <h4 className="font-semibold text-blue-800 mb-2">Starting Rate</h4>
                        <p className="text-2xl font-bold text-blue-900">{selectedCelebrity.price}</p>
                      </div>
                      
                      <div className="p-4 bg-purple-50 rounded-lg">
                        <h4 className="font-semibold text-purple-800 mb-2">Location</h4>
                        <p className="text-purple-700">{selectedCelebrity.location}</p>
                      </div>
                    </div>
                    
                    <div className="mt-6 space-y-3">
                      <Button 
                        className="btn-luxury w-full"
                        onClick={() => {
                          setShowProfileModal(false);
                          handleBookMeeting(selectedCelebrity);
                        }}
                      >
                        <Heart className="h-4 w-4 mr-2" />
                        Book Meeting Now
                      </Button>
                      <div className="flex gap-3">
                        <Button variant="outline" className="flex-1">
                          <Phone className="h-4 w-4 mr-2" />
                          Call Agent
                        </Button>
                        <Button variant="outline" className="flex-1">
                          <Mail className="h-4 w-4 mr-2" />
                          Send Message
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </section>
  );
};