import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  HelpCircle, 
  Star, 
  MessageCircle, 
  Phone, 
  Mail,
  Clock,
  Users,
  Shield,
  CreditCard,
  Calendar,
  CheckCircle
} from "lucide-react";

const FAQ = () => {
  const faqCategories = [
    {
      title: "Booking & Reservations",
      icon: Calendar,
      questions: [
        {
          q: "How far in advance should I book a celebrity?",
          a: "We recommend booking 3-6 months in advance for major celebrities, though some may be available on shorter notice. Popular celebrities and peak seasons require earlier booking."
        },
        {
          q: "What's included in a celebrity booking?",
          a: "Each booking includes the celebrity appearance, meet & greet time, photo opportunities, and basic technical requirements. Specific inclusions vary by package and celebrity."
        },
        {
          q: "Can I customize my celebrity experience?",
          a: "Absolutely! We specialize in creating bespoke experiences. Use our Custom Events page or contact our concierge team to discuss your unique requirements."
        },
        {
          q: "What if my event date changes?",
          a: "Date changes are subject to celebrity availability and our change policy. Contact us as soon as possible to discuss alternatives. Some fees may apply."
        }
      ]
    },
    {
      title: "Pricing & Payments",
      icon: CreditCard,
      questions: [
        {
          q: "How is celebrity pricing determined?",
          a: "Pricing depends on celebrity tier, event type, duration, location, and current demand. Our AI-powered system provides real-time pricing optimization."
        },
        {
          q: "What payment methods do you accept?",
          a: "We accept all major credit cards, bank transfers, and can arrange escrow services for high-value bookings. Payment plans are available for qualifying events."
        },
        {
          q: "When is payment due?",
          a: "Typically, a 50% deposit is required to secure the booking, with the balance due 30 days before the event. Payment terms may vary for premium bookings."
        },
        {
          q: "Are there additional fees?",
          a: "Our quotes are comprehensive. Additional costs may include travel, accommodation, special technical requirements, or last-minute changes as outlined in your contract."
        }
      ]
    },
    {
      title: "Event Management",
      icon: Users,
      questions: [
        {
          q: "Do you provide event planning services?",
          a: "Yes! Our concierge team offers full event planning, from venue selection to technical setup. We handle all logistics so you can focus on enjoying your event."
        },
        {
          q: "What technical requirements are needed?",
          a: "Requirements vary by celebrity and event type. We provide detailed technical riders and can arrange all equipment, staging, and audio-visual needs."
        },
        {
          q: "Can celebrities travel internationally?",
          a: "Most celebrities can travel globally. We handle all travel arrangements, visa requirements, and international logistics. Additional travel time and costs apply."
        },
        {
          q: "What security measures are in place?",
          a: "We coordinate with professional security teams, venue security, and can arrange VIP transportation. Security requirements are assessed for each event."
        }
      ]
    },
    {
      title: "Platform & Support",
      icon: Shield,
      questions: [
        {
          q: "How does your AI-powered system work?",
          a: "Our DeepSeek AI analyzes celebrity availability, market trends, and your preferences to provide smart recommendations, pricing optimization, and instant support."
        },
        {
          q: "Is my information secure?",
          a: "Yes, we use enterprise-grade security, encrypted connections, and comply with all data protection regulations. Your privacy and confidentiality are our top priority."
        },
        {
          q: "How can I contact support?",
          a: "Our 24/7 Elite Concierge team is available via live chat, phone (+1 555-123-ELITE), or email (concierge@bookmyreservation.org). Average response time is under 30 seconds."
        },
        {
          q: "Do you offer mobile apps?",
          a: "Our platform is fully responsive and optimized for mobile devices. We're also developing native mobile apps for iOS and Android, launching in 2024."
        }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Header />
      
      {/* Hero Section */}
      <section className="pt-32 pb-16">
        <div className="container mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center space-x-2 bg-slate-800/50 backdrop-blur border border-slate-700 px-6 py-3 rounded-full mb-6">
              <HelpCircle className="h-5 w-5 text-primary" />
              <span className="text-sm text-slate-300">Frequently Asked Questions</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold mb-6 text-white">
              Get Answers to Your
              <span className="text-gradient-primary"> Questions</span>
            </h1>
            <p className="text-xl text-slate-300">
              Everything you need to know about booking celebrities and using our platform
            </p>
          </div>

          {/* Quick Contact */}
          <div className="text-center mb-16">
            <p className="text-slate-300 mb-6">Can't find what you're looking for? Our team is here to help!</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button 
                className="btn-luxury" 
                onClick={() => {
                  window.location.href = '/chat';
                }}
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Live Chat Support
              </Button>
              <div className="flex items-center gap-4 text-slate-300">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  <span className="text-sm">+1 (555) 123-ELITE</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm">24/7 Support</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Categories */}
      <section className="pb-20">
        <div className="container mx-auto px-6">
          <div className="space-y-12">
            {faqCategories.map((category, categoryIndex) => (
              <div key={categoryIndex}>
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center">
                    <category.icon className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold text-white">{category.title}</h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {category.questions.map((faq, index) => (
                    <Card key={index} className="bg-slate-800/50 backdrop-blur border border-slate-700 hover:border-slate-600 transition-all duration-300">
                      <CardHeader>
                        <CardTitle className="text-lg text-white flex items-start gap-3">
                          <HelpCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                          {faq.q}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-start gap-3">
                          <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                          <p className="text-slate-300 leading-relaxed">{faq.a}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-20 relative">
        <div className="container mx-auto px-6">
          <Card className="bg-slate-800/50 backdrop-blur border border-slate-700 max-w-4xl mx-auto">
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-6">
                <MessageCircle className="h-8 w-8 text-primary-foreground" />
              </div>
              <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">
                Still Have Questions?
              </h3>
              <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
                Our expert concierge team is standing by to help you create the perfect celebrity experience.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="text-center">
                  <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                    <MessageCircle className="h-6 w-6 text-white" />
                  </div>
                  <h4 className="font-semibold text-white mb-2">Live Chat</h4>
                  <p className="text-sm text-slate-300">Instant support, 24/7</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Phone className="h-6 w-6 text-white" />
                  </div>
                  <h4 className="font-semibold text-white mb-2">Phone Support</h4>
                  <p className="text-sm text-slate-300">+1 (555) 123-ELITE</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Mail className="h-6 w-6 text-white" />
                  </div>
                  <h4 className="font-semibold text-white mb-2">Email Support</h4>
                  <p className="text-sm text-slate-300">concierge@bookmyreservation.org</p>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  className="btn-luxury" 
                  onClick={() => {
                    window.location.href = '/chat';
                  }}
                >
                  Start Live Chat
                </Button>
                <Button 
                  className="btn-glass" 
                  onClick={() => {
                    window.location.href = '/contact';
                  }}
                >
                  Contact Form
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default FAQ;