import { Star, Calendar, MapPin, ArrowRight } from "lucide-react";
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
                  <Button className="btn-luxury flex-1">
                    Book Meeting
                  </Button>
                  <Button variant="ghost" className="btn-glass">
                    View Profile
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* View All Button */}
        <div className="text-center">
          <Button className="btn-luxury text-lg px-12 py-4">
            View All Celebrities
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>
    </section>
  );
};