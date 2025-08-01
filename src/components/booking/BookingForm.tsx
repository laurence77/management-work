import { useState, useEffect } from "react";
import { Calendar, Clock, MapPin, DollarSign, User, Mail, Phone, MessageSquare, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AuthModal } from "@/components/auth/AuthModal";
import CryptoPayment from "@/components/payment/CryptoPayment";

interface BookingFormProps {
  celebrity: {
    id: number;
    name: string;
    image: string;
    price: string;
    rating: number;
  };
  onSubmit: (bookingData: any) => void;
  onClose: () => void;
}

export const BookingForm = ({ celebrity, onSubmit, onClose }: BookingFormProps) => {
  const [step, setStep] = useState(1);
  const [user, setUser] = useState<any>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [showPayment, setShowPayment] = useState(false);
  const [depositAmount, setDepositAmount] = useState(0);
  const [formData, setFormData] = useState({
    eventType: "",
    eventDate: "",
    eventTime: "",
    duration: "",
    location: "",
    attendees: "",
    budget: "",
    clientName: "",
    clientEmail: "",
    clientPhone: "",
    company: "",
    specialRequests: "",
    preferredContact: "email"
  });

  const eventTypes = [
    "Corporate Event",
    "Private Party",
    "Wedding",
    "Birthday Party",
    "Charity Event",
    "Product Launch",
    "Conference",
    "Award Ceremony",
    "Virtual Event",
    "Other"
  ];

  const durations = [
    "1 Hour",
    "2 Hours",
    "3 Hours",
    "4 Hours",
    "Half Day (4-6 Hours)",
    "Full Day (8+ Hours)",
    "Multiple Days"
  ];

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser && savedUser !== 'undefined') {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        setFormData(prev => ({
          ...prev,
          clientName: `${parsedUser.firstName || ''} ${parsedUser.lastName || ''}`.trim(),
          clientEmail: parsedUser.email || '',
          clientPhone: parsedUser.phone || '',
          company: parsedUser.company || ''
        }));
      } catch (error) {
        console.error('Error parsing saved user data:', error);
        localStorage.removeItem('user'); // Remove invalid data
      }
    }
  }, []);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNextStep = () => {
    if (step < 3) setStep(step + 1);
  };

  const handlePrevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  const calculateDeposit = (budget: string): number => {
    const budgetRanges = {
      'under-25k': 5000,
      '25k-50k': 10000,
      '50k-100k': 20000,
      '100k-250k': 25000,
      '250k-500k': 50000,
      '500k+': 75000
    };
    return budgetRanges[budget as keyof typeof budgetRanges] || 10000;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    
    // Calculate deposit and show payment modal
    const deposit = calculateDeposit(formData.budget);
    setDepositAmount(deposit);
    setShowPayment(true);
  };

  const handlePaymentSuccess = (paymentData: any) => {
    onSubmit({
      ...formData,
      celebrityId: celebrity.id,
      celebrityName: celebrity.name,
      userId: user.id,
      paymentData,
      depositAmount: depositAmount,
      status: 'pending_approval'
    });
    setShowPayment(false);
  };

  const handleAuthSuccess = (userData: any) => {
    setUser(userData);
    setFormData(prev => ({
      ...prev,
      clientName: `${userData.firstName || ''} ${userData.lastName || ''}`.trim(),
      clientEmail: userData.email || '',
      clientPhone: userData.phone || '',
      company: userData.company || ''
    }));
    setShowAuthModal(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card w-full max-w-4xl max-h-[90vh] rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary/20 to-accent/20 p-6 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <img
                src={celebrity.image}
                alt={celebrity.name}
                className="w-16 h-16 rounded-full object-cover border-2 border-primary/30"
              />
              <div>
                <h2 className="text-2xl font-bold text-foreground">Book {celebrity.name}</h2>
                <div className="flex items-center space-x-2 text-muted-foreground">
                  <Star className="h-4 w-4 text-primary fill-current" />
                  <span>{celebrity.rating} Rating</span>
                  <span>•</span>
                  <span>{celebrity.price}</span>
                </div>
              </div>
            </div>
            <Button variant="ghost" onClick={onClose} className="text-muted-foreground hover:text-foreground">
              ×
            </Button>
          </div>

          {/* Progress Indicator */}
          <div className="flex items-center justify-center mt-6 space-x-2">
            {[1, 2, 3].map((stepNumber) => (
              <div key={stepNumber} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step >= stepNumber 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-white/10 text-muted-foreground'
                }`}>
                  {stepNumber}
                </div>
                {stepNumber < 3 && (
                  <div className={`w-12 h-1 mx-2 ${
                    step > stepNumber ? 'bg-primary' : 'bg-white/10'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          <form onSubmit={handleSubmit}>
            {/* Step 1: Event Details */}
            {step === 1 && (
              <div className="space-y-6">
                <h3 className="text-xl font-semibold text-foreground mb-6">Event Details</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      <MessageSquare className="h-4 w-4 inline mr-2" />
                      Event Type *
                    </label>
                    <select
                      value={formData.eventType}
                      onChange={(e) => handleInputChange("eventType", e.target.value)}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      required
                    >
                      <option value="">Select event type</option>
                      {eventTypes.map(type => (
                        <option key={type} value={type} className="bg-card text-card-foreground">{type}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      <Calendar className="h-4 w-4 inline mr-2" />
                      Event Date *
                    </label>
                    <input
                      type="date"
                      value={formData.eventDate}
                      onChange={(e) => handleInputChange("eventDate", e.target.value)}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      <Clock className="h-4 w-4 inline mr-2" />
                      Event Time *
                    </label>
                    <input
                      type="time"
                      value={formData.eventTime}
                      onChange={(e) => handleInputChange("eventTime", e.target.value)}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      <Clock className="h-4 w-4 inline mr-2" />
                      Duration *
                    </label>
                    <select
                      value={formData.duration}
                      onChange={(e) => handleInputChange("duration", e.target.value)}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      required
                    >
                      <option value="">Select duration</option>
                      {durations.map(duration => (
                        <option key={duration} value={duration} className="bg-card text-card-foreground">{duration}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      <MapPin className="h-4 w-4 inline mr-2" />
                      Event Location *
                    </label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => handleInputChange("location", e.target.value)}
                      placeholder="City, State/Country or Venue Name"
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      <User className="h-4 w-4 inline mr-2" />
                      Expected Attendees *
                    </label>
                    <select
                      value={formData.attendees}
                      onChange={(e) => handleInputChange("attendees", e.target.value)}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      required
                    >
                      <option value="">Select attendees</option>
                      <option value="1-50" className="bg-card text-card-foreground">1-50 people</option>
                      <option value="51-100" className="bg-card text-card-foreground">51-100 people</option>
                      <option value="101-500" className="bg-card text-card-foreground">101-500 people</option>
                      <option value="501-1000" className="bg-card text-card-foreground">501-1,000 people</option>
                      <option value="1000+" className="bg-card text-card-foreground">1,000+ people</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    <DollarSign className="h-4 w-4 inline mr-2" />
                    Budget Range *
                  </label>
                  <select
                    value={formData.budget}
                    onChange={(e) => handleInputChange("budget", e.target.value)}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  >
                    <option value="">Select budget range</option>
                    <option value="under-25k" className="bg-card text-card-foreground">Under $25,000</option>
                    <option value="25k-50k" className="bg-card text-card-foreground">$25,000 - $50,000</option>
                    <option value="50k-100k" className="bg-card text-card-foreground">$50,000 - $100,000</option>
                    <option value="100k-250k" className="bg-card text-card-foreground">$100,000 - $250,000</option>
                    <option value="250k-500k" className="bg-card text-card-foreground">$250,000 - $500,000</option>
                    <option value="500k+" className="bg-card text-card-foreground">$500,000+</option>
                  </select>
                </div>
              </div>
            )}

            {/* Step 2: Contact Information */}
            {step === 2 && (
              <div className="space-y-6">
                <h3 className="text-xl font-semibold text-foreground mb-6">Contact Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      <User className="h-4 w-4 inline mr-2" />
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={formData.clientName}
                      onChange={(e) => handleInputChange("clientName", e.target.value)}
                      placeholder="Your full name"
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      <Mail className="h-4 w-4 inline mr-2" />
                      Email Address *
                    </label>
                    <input
                      type="email"
                      value={formData.clientEmail}
                      onChange={(e) => handleInputChange("clientEmail", e.target.value)}
                      placeholder="your.email@example.com"
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      <Phone className="h-4 w-4 inline mr-2" />
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      value={formData.clientPhone}
                      onChange={(e) => handleInputChange("clientPhone", e.target.value)}
                      placeholder="+1 (555) 123-4567"
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Company/Organization</label>
                    <input
                      type="text"
                      value={formData.company}
                      onChange={(e) => handleInputChange("company", e.target.value)}
                      placeholder="Company name (optional)"
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Preferred Contact Method</label>
                  <div className="flex space-x-4">
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="preferredContact"
                        value="email"
                        checked={formData.preferredContact === "email"}
                        onChange={(e) => handleInputChange("preferredContact", e.target.value)}
                        className="text-primary"
                      />
                      <span>Email</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="preferredContact"
                        value="phone"
                        checked={formData.preferredContact === "phone"}
                        onChange={(e) => handleInputChange("preferredContact", e.target.value)}
                        className="text-primary"
                      />
                      <span>Phone</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Special Requests */}
            {step === 3 && (
              <div className="space-y-6">
                <h3 className="text-xl font-semibold text-foreground mb-6">Special Requests & Review</h3>
                
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Special Requests or Requirements
                  </label>
                  <textarea
                    value={formData.specialRequests}
                    onChange={(e) => handleInputChange("specialRequests", e.target.value)}
                    placeholder="Any special requests, themes, or requirements for the event..."
                    rows={4}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  />
                </div>

                {/* Booking Summary */}
                <Card className="glass-card p-6">
                  <h4 className="text-lg font-semibold text-foreground mb-4">Booking Summary</h4>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Celebrity:</span>
                      <span className="text-foreground font-medium">{celebrity.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Event:</span>
                      <span className="text-foreground">{formData.eventType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Date & Time:</span>
                      <span className="text-foreground">{formData.eventDate} at {formData.eventTime}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Duration:</span>
                      <span className="text-foreground">{formData.duration}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Location:</span>
                      <span className="text-foreground">{formData.location}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Budget:</span>
                      <span className="text-foreground">{formData.budget}</span>
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-white/10">
              <div>
                {step > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handlePrevStep}
                    className="btn-glass"
                  >
                    Previous Step
                  </Button>
                )}
              </div>
              
              <div className="flex space-x-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={onClose}
                  className="btn-glass"
                >
                  Cancel
                </Button>
                {step < 3 ? (
                  <Button
                    type="button"
                    onClick={handleNextStep}
                    className="btn-luxury"
                  >
                    Next Step
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    className="btn-luxury"
                  >
                    Submit Booking Request
                  </Button>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Authentication Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onAuthSuccess={handleAuthSuccess}
        mode={authMode}
      />

      {/* Payment Modal */}
      {showPayment && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <CryptoPayment
            amount={formData.totalAmount || 0}
            onPaymentSuccess={(paymentData) => {
              console.log('Payment successful:', paymentData);
              setShowPayment(false);
              // Handle successful payment
            }}
            onPaymentError={(error) => {
              console.error('Payment error:', error);
              // Handle payment error
            }}
          />
        </div>
      )}
    </div>
  );
};