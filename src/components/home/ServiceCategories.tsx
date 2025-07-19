import { Calendar, Users, Crown, Building, Coffee, Camera, Mic, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";

const services = [
  {
    icon: Coffee,
    title: "Private Meetings",
    description: "Intimate one-on-one conversations with your favorite celebrities in luxury settings.",
    features: ["Personal consultation", "Autographs & photos", "Flexible duration", "VIP treatment"],
    price: "From $5,000",
    popular: false
  },
  {
    icon: Calendar,
    title: "Event Appearances",
    description: "Celebrity appearances for corporate events, parties, and special occasions.",
    features: ["Red carpet arrivals", "Meet & greet sessions", "Photo opportunities", "Custom performances"],
    price: "From $25,000",
    popular: true
  },
  {
    icon: Crown,
    title: "Celebrity Management",
    description: "Full-service celebrity management for brands and entertainment companies.",
    features: ["Career guidance", "Brand partnerships", "Media relations", "Strategic planning"],
    price: "Custom pricing",
    popular: false
  },
  {
    icon: Camera,
    title: "Content Creation",
    description: "Professional content creation with celebrities for marketing campaigns.",
    features: ["Video testimonials", "Social media content", "Photography", "Brand endorsements"],
    price: "From $15,000",
    popular: false
  },
  {
    icon: Mic,
    title: "Speaking Engagements",
    description: "Celebrity speakers for conferences, corporate events, and motivational talks.",
    features: ["Keynote speeches", "Panel discussions", "Workshop facilitation", "Industry insights"],
    price: "From $20,000",
    popular: false
  },
  {
    icon: Heart,
    title: "Charity Events",
    description: "Celebrity participation in charitable causes and fundraising events.",
    features: ["Fundraising galas", "Awareness campaigns", "Community outreach", "Special pricing"],
    price: "From $10,000",
    popular: false
  }
];

export const ServiceCategories = () => {
  return (
    <section className="py-20">
      <div className="container mx-auto px-6">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Premium
            <span className="text-gradient-primary"> Services</span>
          </h2>
          <p className="text-xl text-muted-foreground">
            From intimate meetings to grand events, we offer comprehensive celebrity services 
            tailored to your unique needs and aspirations.
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service, index) => {
            const IconComponent = service.icon;
            return (
              <div
                key={service.title}
                className={`glass-hover relative overflow-hidden ${
                  service.popular ? 'ring-2 ring-primary/50 shadow-glow' : ''
                }`}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {/* Popular Badge */}
                {service.popular && (
                  <div className="absolute top-4 right-4 bg-gradient-primary px-3 py-1 rounded-full">
                    <span className="text-xs font-bold text-primary-foreground">MOST POPULAR</span>
                  </div>
                )}

                <div className="p-8 space-y-6">
                  {/* Icon */}
                  <div className="relative">
                    <div className="w-16 h-16 glass rounded-2xl flex items-center justify-center mb-4">
                      <IconComponent className="h-8 w-8 text-primary" />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-2xl font-bold text-foreground mb-2">
                        {service.title}
                      </h3>
                      <p className="text-muted-foreground leading-relaxed">
                        {service.description}
                      </p>
                    </div>

                    {/* Features */}
                    <ul className="space-y-2">
                      {service.features.map((feature, idx) => (
                        <li key={idx} className="flex items-center space-x-3 text-sm text-muted-foreground">
                          <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>

                    {/* Price */}
                    <div className="pt-4 border-t border-white/10">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-2xl font-bold text-gradient-primary">
                          {service.price}
                        </span>
                        <span className="text-xs text-muted-foreground">per booking</span>
                      </div>

                      <Button 
                        className={service.popular ? 'btn-luxury w-full' : 'btn-glass w-full'}
                      >
                        Learn More
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Custom Service CTA */}
        <div className="mt-16 text-center">
          <div className="glass-card max-w-2xl mx-auto p-12 space-y-6">
            <Building className="h-16 w-16 text-primary mx-auto" />
            <h3 className="text-3xl font-bold">Need Something Custom?</h3>
            <p className="text-xl text-muted-foreground">
              Our concierge team specializes in creating bespoke celebrity experiences 
              tailored to your exact requirements.
            </p>
            <Button className="btn-luxury text-lg px-8 py-4">
              Contact Our Concierge
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};