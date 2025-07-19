import { Star, Quote, Shield, Users, Award } from "lucide-react";

const testimonials = [
  {
    name: "Sarah Chen",
    title: "CEO, Tech Innovations Inc.",
    content: "EliteConnect made our product launch unforgettable. Having Emma Stone at our event brought incredible media attention and credibility to our brand.",
    rating: 5,
    image: "https://images.unsplash.com/photo-1494790108755-2616b4bbaa41?w=100&h=100&fit=crop&crop=face",
    event: "Product Launch Event"
  },
  {
    name: "Marcus Rodriguez",
    title: "Wedding Planner, Luxury Events Co.",
    content: "The level of professionalism and attention to detail exceeded all expectations. Our clients were thrilled with their celebrity appearance.",
    rating: 5,
    image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face",
    event: "Celebrity Wedding Appearance"
  },
  {
    name: "Jennifer Walsh",
    title: "Marketing Director, Fortune 500",
    content: "Working with EliteConnect was seamless. The celebrity management team handled everything professionally, making our campaign a huge success.",
    rating: 5,
    image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face",
    event: "Brand Campaign"
  },
  {
    name: "David Kim",
    title: "Event Coordinator, Global Corp",
    content: "From booking to execution, everything was flawless. The celebrity was punctual, professional, and our attendees loved the experience.",
    rating: 5,
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face",
    event: "Corporate Conference"
  }
];

const stats = [
  {
    icon: Shield,
    value: "100%",
    label: "Success Rate",
    description: "Every booking delivered as promised"
  },
  {
    icon: Users,
    value: "50K+",
    label: "Happy Clients",
    description: "Worldwide customer satisfaction"
  },
  {
    icon: Award,
    value: "99.8%",
    label: "On-Time Rate",
    description: "Punctual celebrity appearances"
  }
];

export const Testimonials = () => {
  return (
    <section className="py-20">
      <div className="container mx-auto px-6">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Trusted by
            <span className="text-gradient-primary"> Industry Leaders</span>
          </h2>
          <p className="text-xl text-muted-foreground">
            Join thousands of satisfied clients who have created unforgettable experiences 
            with our world-class celebrity booking services.
          </p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {stats.map((stat, index) => {
            const IconComponent = stat.icon;
            return (
              <div
                key={stat.label}
                className="glass-card text-center p-8 fade-in"
                style={{ animationDelay: `${index * 0.2}s` }}
              >
                <IconComponent className="h-12 w-12 text-primary mx-auto mb-4" />
                <div className="text-4xl font-bold text-gradient-primary mb-2">
                  {stat.value}
                </div>
                <div className="text-xl font-semibold text-foreground mb-2">
                  {stat.label}
                </div>
                <p className="text-muted-foreground">
                  {stat.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {testimonials.map((testimonial, index) => (
            <div
              key={testimonial.name}
              className="glass-hover p-8 space-y-6 fade-in"
              style={{ animationDelay: `${index * 0.1 + 0.3}s` }}
            >
              {/* Quote Icon */}
              <Quote className="h-8 w-8 text-primary" />

              {/* Content */}
              <blockquote className="text-lg text-foreground leading-relaxed">
                "{testimonial.content}"
              </blockquote>

              {/* Rating */}
              <div className="flex items-center space-x-1">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 text-primary fill-current" />
                ))}
              </div>

              {/* Author */}
              <div className="flex items-center space-x-4 pt-4 border-t border-white/10">
                <img
                  src={testimonial.image}
                  alt={testimonial.name}
                  className="w-12 h-12 rounded-full object-cover ring-2 ring-primary/20"
                />
                <div>
                  <div className="font-semibold text-foreground">
                    {testimonial.name}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {testimonial.title}
                  </div>
                  <div className="text-xs text-primary">
                    {testimonial.event}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Trust Badges */}
        <div className="glass-card p-8 text-center space-y-6">
          <h3 className="text-2xl font-bold text-foreground">Certified & Trusted</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 items-center opacity-60">
            <div className="glass p-4 rounded-lg">
              <div className="text-primary font-bold">ISO 27001</div>
              <div className="text-xs text-muted-foreground">Security Certified</div>
            </div>
            <div className="glass p-4 rounded-lg">
              <div className="text-primary font-bold">BBB A+</div>
              <div className="text-xs text-muted-foreground">Business Rating</div>
            </div>
            <div className="glass p-4 rounded-lg">
              <div className="text-primary font-bold">SAG-AFTRA</div>
              <div className="text-xs text-muted-foreground">Union Approved</div>
            </div>
            <div className="glass p-4 rounded-lg">
              <div className="text-primary font-bold">PCI DSS</div>
              <div className="text-xs text-muted-foreground">Payment Secure</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};