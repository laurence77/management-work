/**
 * Responsive Footer Component
 * Mobile-optimized footer with collapsible sections
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Star, 
  Mail, 
  Phone, 
  MapPin, 
  Facebook, 
  Twitter, 
  Instagram, 
  Youtube,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useScreenSize, containerClasses, mobileUtils } from '@/utils/responsive-utils';

interface FooterSection {
  title: string;
  links: Array<{
    label: string;
    href: string;
    external?: boolean;
  }>;
}

interface SocialLink {
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  label: string;
}

interface ResponsiveFooterProps {
  onNewsletterSignup?: (email: string) => void;
  className?: string;
}

const footerSections: FooterSection[] = [
  {
    title: 'Services',
    links: [
      { label: 'Celebrity Bookings', href: '/celebrities' },
      { label: 'Private Meetings', href: '/services/meetings' },
      { label: 'Event Appearances', href: '/services/events' },
      { label: 'Brand Consulting', href: '/services/consulting' },
      { label: 'VIP Experiences', href: '/vip' }
    ]
  },
  {
    title: 'Company',
    links: [
      { label: 'About Us', href: '/about' },
      { label: 'How It Works', href: '/how-it-works' },
      { label: 'Success Stories', href: '/testimonials' },
      { label: 'Press & Media', href: '/press' },
      { label: 'Careers', href: '/careers' }
    ]
  },
  {
    title: 'Support',
    links: [
      { label: 'Help Center', href: '/help' },
      { label: 'Contact Us', href: '/contact' },
      { label: 'FAQ', href: '/faq' },
      { label: 'Booking Guide', href: '/guide' },
      { label: 'Safety & Security', href: '/safety' }
    ]
  },
  {
    title: 'Legal',
    links: [
      { label: 'Terms of Service', href: '/terms' },
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Cookie Policy', href: '/cookies' },
      { label: 'Cancellation Policy', href: '/cancellation' },
      { label: 'Accessibility', href: '/accessibility' }
    ]
  }
];

const socialLinks: SocialLink[] = [
  { icon: Facebook, href: 'https://facebook.com', label: 'Facebook' },
  { icon: Twitter, href: 'https://twitter.com', label: 'Twitter' },
  { icon: Instagram, href: 'https://instagram.com', label: 'Instagram' },
  { icon: Youtube, href: 'https://youtube.com', label: 'YouTube' }
];

const contactInfo = {
  email: 'hello@celebritybooking.com',
  phone: '+1 (555) 123-4567',
  address: '123 Celebrity Way, Los Angeles, CA 90210'
};

export function ResponsiveFooter({ onNewsletterSignup, className }: ResponsiveFooterProps) {
  const { isMobile } = useScreenSize();
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const toggleSection = (title: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(title)) {
      newExpanded.delete(title);
    } else {
      newExpanded.add(title);
    }
    setExpandedSections(newExpanded);
  };

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newsletterEmail.trim() && onNewsletterSignup) {
      onNewsletterSignup(newsletterEmail.trim());
      setNewsletterEmail('');
    }
  };

  // Mobile collapsible section
  const CollapsibleSection = ({ section }: { section: FooterSection }) => {
    const isExpanded = expandedSections.has(section.title);

    return (
      <div className="border-b border-gray-200 last:border-b-0">
        <Button
          variant="ghost"
          onClick={() => toggleSection(section.title)}
          className="w-full justify-between h-12 px-0 font-semibold text-gray-900"
        >
          {section.title}
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
        
        {isExpanded && (
          <div className="pb-4 space-y-2">
            {section.links.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className="block text-sm text-gray-600 hover:text-gray-900 py-1"
                {...(link.external && { target: '_blank', rel: 'noopener noreferrer' })}
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <footer className={cn('bg-gray-50 border-t', className)}>
      <div className={containerClasses.container}>
        {/* Main Footer Content */}
        <div className="py-8 lg:py-12">
          {/* Newsletter Section */}
          <div className={cn(
            'mb-8 lg:mb-12',
            'bg-white rounded-lg p-6 lg:p-8',
            'border border-gray-200'
          )}>
            <div className={cn(
              'flex items-center justify-between',
              'flex-col space-y-4',
              'lg:flex-row lg:space-y-0 lg:space-x-8'
            )}>
              <div className="text-center lg:text-left">
                <h3 className="text-lg lg:text-xl font-semibold text-gray-900 mb-2">
                  Stay Updated
                </h3>
                <p className="text-sm lg:text-base text-gray-600">
                  Get exclusive access to new celebrities and special offers
                </p>
              </div>
              
              <form 
                onSubmit={handleNewsletterSubmit}
                className={cn(
                  'flex w-full max-w-md',
                  'flex-col space-y-2',
                  'sm:flex-row sm:space-y-0 sm:space-x-2'
                )}
              >
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  className={cn(
                    'flex-1',
                    isMobile && 'h-12 text-base'
                  )}
                  required
                />
                <Button 
                  type="submit"
                  className={cn(
                    'whitespace-nowrap',
                    isMobile && 'h-12 w-full'
                  )}
                >
                  Subscribe
                </Button>
              </form>
            </div>
          </div>

          {/* Footer Links - Desktop */}
          {!isMobile && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
              {footerSections.map((section) => (
                <div key={section.title}>
                  <h3 className="font-semibold text-gray-900 mb-4">
                    {section.title}
                  </h3>
                  <ul className="space-y-2">
                    {section.links.map((link) => (
                      <li key={link.href}>
                        <Link
                          to={link.href}
                          className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                          {...(link.external && { target: '_blank', rel: 'noopener noreferrer' })}
                        >
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}

          {/* Footer Links - Mobile */}
          {isMobile && (
            <div className="mb-8">
              {footerSections.map((section) => (
                <CollapsibleSection key={section.title} section={section} />
              ))}
            </div>
          )}

          {/* Contact Info & Social */}
          <div className={cn(
            'flex items-center justify-between',
            'flex-col space-y-6',
            'lg:flex-row lg:space-y-0'
          )}>
            {/* Contact Information */}
            <div className="text-center lg:text-left">
              <h3 className="font-semibold text-gray-900 mb-4">
                Get in Touch
              </h3>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center justify-center lg:justify-start">
                  <Mail className="h-4 w-4 mr-2" />
                  <a 
                    href={`mailto:${contactInfo.email}`}
                    className="hover:text-gray-900 transition-colors"
                  >
                    {contactInfo.email}
                  </a>
                </div>
                <div className="flex items-center justify-center lg:justify-start">
                  <Phone className="h-4 w-4 mr-2" />
                  <a 
                    href={`tel:${contactInfo.phone}`}
                    className="hover:text-gray-900 transition-colors"
                  >
                    {contactInfo.phone}
                  </a>
                </div>
                <div className="flex items-center justify-center lg:justify-start">
                  <MapPin className="h-4 w-4 mr-2" />
                  <span>{contactInfo.address}</span>
                </div>
              </div>
            </div>

            {/* Social Media Links */}
            <div className="text-center lg:text-right">
              <h3 className="font-semibold text-gray-900 mb-4">
                Follow Us
              </h3>
              <div className="flex items-center justify-center lg:justify-end space-x-4">
                {socialLinks.map((social) => (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      'p-2 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors',
                      mobileUtils.touchTarget
                    )}
                    aria-label={social.label}
                  >
                    <social.icon className="h-5 w-5 text-gray-600" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Footer Bottom */}
        <div className={cn(
          'py-6',
          'flex items-center justify-between',
          'flex-col space-y-4',
          'sm:flex-row sm:space-y-0'
        )}>
          {/* Logo & Copyright */}
          <div className="flex items-center space-x-2">
            <div className="flex items-center justify-center w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded">
              <Star className="h-3 w-3 text-white" />
            </div>
            <span className="text-sm text-gray-600">
              © 2024 Celebrity Booking Platform. All rights reserved.
            </span>
          </div>

          {/* Legal Links */}
          <div className="flex items-center space-x-4 text-xs text-gray-500">
            <Link to="/terms" className="hover:text-gray-700 transition-colors">
              Terms
            </Link>
            <span>•</span>
            <Link to="/privacy" className="hover:text-gray-700 transition-colors">
              Privacy
            </Link>
            <span>•</span>
            <Link to="/cookies" className="hover:text-gray-700 transition-colors">
              Cookies
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}