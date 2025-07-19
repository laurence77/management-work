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
                {settings.site_name}
              </span>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              {settings.footer_company_description}
            </p>
            <div className="flex space-x-4">
              {settings.social_instagram && (
                <a href={settings.social_instagram} className="glass p-3 rounded-lg hover:bg-white/10 transition-colors">
                  <Instagram className="h-5 w-5 text-primary" />
                </a>
              )}
              {settings.social_twitter && (
                <a href={settings.social_twitter} className="glass p-3 rounded-lg hover:bg-white/10 transition-colors">
                  <Twitter className="h-5 w-5 text-primary" />
                </a>
              )}
              {settings.social_facebook && (
                <a href={settings.social_facebook} className="glass p-3 rounded-lg hover:bg-white/10 transition-colors">
                  <Facebook className="h-5 w-5 text-primary" />
                </a>
              )}
              {settings.social_linkedin && (
                <a href={settings.social_linkedin} className="glass p-3 rounded-lg hover:bg-white/10 transition-colors">
                  <Linkedin className="h-5 w-5 text-primary" />
                </a>
              )}
            </div>
          </div>

          {/* Services */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-foreground">{settings.footer_services_title}</h3>
            <ul className="space-y-3">
              {settings.footer_services_links.map((link, index) => (
                <li key={index}>
                  <a href={link.url} className="text-muted-foreground hover:text-primary transition-colors">
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-foreground">{settings.footer_support_title}</h3>
            <ul className="space-y-3">
              {settings.footer_support_links.map((link, index) => (
                <li key={index}>
                  <a href={link.url} className="text-muted-foreground hover:text-primary transition-colors">
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-foreground">Contact</h3>
            <div className="space-y-4">
              <div className="flex items-center space-x-3 text-muted-foreground">
                <Mail className="h-5 w-5 text-primary" />
                <span>{settings.contact_email}</span>
              </div>
              <div className="flex items-center space-x-3 text-muted-foreground">
                <Phone className="h-5 w-5 text-primary" />
                <span>{settings.contact_phone}</span>
              </div>
              <div className="flex items-center space-x-3 text-muted-foreground">
                <MapPin className="h-5 w-5 text-primary" />
                <span>{settings.address}</span>
              </div>
            </div>
            
            {/* Newsletter */}
            {settings.newsletter_enabled && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-foreground">{settings.newsletter_title}</h4>
                <p className="text-xs text-muted-foreground">{settings.newsletter_description}</p>
                <div className="flex space-x-2">
                  <input
                    type="email"
                    placeholder="Your email"
                    className="flex-1 glass px-4 py-2 rounded-lg border border-white/10 bg-white/5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <button className="btn-glass px-4 py-2 text-sm">
                    Subscribe
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <p className="text-muted-foreground text-sm">
            {settings.footer_copyright}
          </p>
          <div className="flex items-center space-x-6 text-sm text-muted-foreground">
            {settings.footer_legal_links.map((link, index) => (
              <a key={index} href={link.url} className="hover:text-primary transition-colors">
                {link.name}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};