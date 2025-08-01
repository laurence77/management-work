import { Star, Instagram, Twitter, Facebook, Linkedin, Mail, Phone, MapPin } from "lucide-react";
import { useState, useEffect } from "react";
import { api, SiteSettings } from "@/lib/api";

export const Footer = () => {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = await api.getPublicSettings();
        setSettings(data);
      } catch (error) {
        console.error('Failed to fetch settings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  if (loading) {
    return (
      <footer className="glass-card mt-20 rounded-none border-x-0 border-b-0">
        <div className="container mx-auto px-6 py-16">
          <div className="text-center text-muted-foreground">Loading...</div>
        </div>
      </footer>
    );
  }

  if (!settings) {
    return null;
  }
  return (
    <footer className="glass-card mt-20 rounded-none border-x-0 border-b-0">
      <div className="container mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="space-y-6">
            <div className="flex items-center space-x-3">
              <Star className="h-8 w-8 text-primary fill-current" />
              <span className="text-2xl font-bold text-gradient-primary">
                {settings.siteName}
              </span>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              {settings.siteDescription}
            </p>
            <div className="flex space-x-4">
              {settings.socialMedia?.instagram && (
                <a href={settings.socialMedia.instagram} className="glass p-3 rounded-lg hover:bg-white/10 transition-colors">
                  <Instagram className="h-5 w-5 text-primary" />
                </a>
              )}
              {settings.socialMedia?.twitter && (
                <a href={settings.socialMedia.twitter} className="glass p-3 rounded-lg hover:bg-white/10 transition-colors">
                  <Twitter className="h-5 w-5 text-primary" />
                </a>
              )}
              {settings.socialMedia?.facebook && (
                <a href={settings.socialMedia.facebook} className="glass p-3 rounded-lg hover:bg-white/10 transition-colors">
                  <Facebook className="h-5 w-5 text-primary" />
                </a>
              )}
              {settings.socialMedia?.linkedin && (
                <a href={settings.socialMedia.linkedin} className="glass p-3 rounded-lg hover:bg-white/10 transition-colors">
                  <Linkedin className="h-5 w-5 text-primary" />
                </a>
              )}
            </div>
          </div>

          {/* Services */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-foreground">Services</h3>
            <ul className="space-y-3">
              <li>
                <a href="/celebrities" className="text-muted-foreground hover:text-primary transition-colors">
                  Celebrity Booking
                </a>
              </li>
              <li>
                <a href="/events" className="text-muted-foreground hover:text-primary transition-colors">
                  Event Management
                </a>
              </li>
              <li>
                <a href="/services" className="text-muted-foreground hover:text-primary transition-colors">
                  Consultation
                </a>
              </li>
              <li>
                <a href="/management" className="text-muted-foreground hover:text-primary transition-colors">
                  Artist Management
                </a>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-foreground">Support</h3>
            <ul className="space-y-3">
              <li>
                <a href="/contact" className="text-muted-foreground hover:text-primary transition-colors">
                  Contact Us
                </a>
              </li>
              <li>
                <a href="/faq" className="text-muted-foreground hover:text-primary transition-colors">
                  FAQ
                </a>
              </li>
              <li>
                <a href="/help" className="text-muted-foreground hover:text-primary transition-colors">
                  Help Center
                </a>
              </li>
              <li>
                <a href="/support" className="text-muted-foreground hover:text-primary transition-colors">
                  24/7 Support
                </a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-foreground">Contact</h3>
            <div className="space-y-4">
              <div className="flex items-center space-x-3 text-muted-foreground">
                <Mail className="h-5 w-5 text-primary" />
                <span>{settings.contactEmail}</span>
              </div>
              <div className="flex items-center space-x-3 text-muted-foreground">
                <Phone className="h-5 w-5 text-primary" />
                <span>{settings.contactPhone}</span>
              </div>
              <div className="flex items-center space-x-3 text-muted-foreground">
                <MapPin className="h-5 w-5 text-primary" />
                <span>Los Angeles, CA</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <p className="text-muted-foreground text-sm">
            © {new Date().getFullYear()} {settings.siteName}. All rights reserved.
          </p>
          <div className="flex items-center space-x-6 text-sm text-muted-foreground">
            <a href="/privacy" className="hover:text-primary transition-colors">
              Privacy Policy
            </a>
            <a href="/terms" className="hover:text-primary transition-colors">
              Terms of Service
            </a>
            <a href="/cookies" className="hover:text-primary transition-colors">
              Cookie Policy
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};