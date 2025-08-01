// Site Branding Configuration
// You can easily change these values to rebrand your entire website

export const SITE_CONFIG = {
  // Website Identity
  name: "Celebrity Connect", // Change this to your preferred name
  tagline: "Connect with Celebrity Icons Worldwide",
  description: "The world's most exclusive celebrity booking platform. From intimate meetings to grand events, we make the impossible possible.",
  
  // Contact Information
  contact: {
    email: "hello@celebrityconnect.com",
    phone: "(555) 123-4567",
    address: {
      street: "1234 Entertainment Blvd",
      city: "Los Angeles",
      state: "CA",
      zip: "90210",
      country: "USA"
    }
  },
  
  // Social Media
  social: {
    twitter: "https://twitter.com/celebrityconnect",
    instagram: "https://instagram.com/celebrityconnect",
    linkedin: "https://linkedin.com/company/celebrityconnect",
    facebook: "https://facebook.com/celebrityconnect"
  },
  
  // Business Information
  business: {
    founded: "2024",
    employees: "50+",
    headquarters: "Los Angeles, CA",
    description: "Leading celebrity booking platform trusted by Fortune 500 companies"
  },
  
  // Platform Statistics (you can update these as your platform grows)
  stats: {
    celebrities: "2000+",
    bookings: "50K+",
    countries: "150+",
    successRate: "99.9%"
  },
  
  // Features & Benefits
  features: {
    security: {
      title: "Verified & Secure",
      description: "All celebrities verified with bank-grade security protocols"
    },
    support: {
      title: "24/7 Concierge",
      description: "Dedicated support team available around the clock"
    },
    access: {
      title: "Exclusive Access",
      description: "Direct connections to A-list celebrities and rising stars"
    }
  },
  
  // Legal
  legal: {
    companyName: "Celebrity Connect Inc.",
    termsUrl: "/terms",
    privacyUrl: "/privacy",
    cookieUrl: "/cookies"
  },
  
  // SEO & Meta
  seo: {
    title: "Celebrity Connect - Book A-List Celebrities for Your Event",
    metaDescription: "Book verified celebrities for corporate events, private parties, and special occasions. Trusted by Fortune 500 companies worldwide.",
    keywords: "celebrity booking, event planning, corporate events, celebrity appearances, entertainment booking"
  }
};

// You can also create different themes/styles
export const THEME_CONFIG = {
  colors: {
    primary: "#8B5CF6", // Purple
    secondary: "#EC4899", // Pink
    accent: "#F59E0B", // Amber
    success: "#10B981", // Green
    warning: "#F59E0B", // Amber
    error: "#EF4444", // Red
  },
  
  // Logo/Brand Assets (you can change these paths)
  assets: {
    logo: "/logo.svg",
    logoLight: "/logo-light.svg",
    logoDark: "/logo-dark.svg",
    favicon: "/favicon.ico",
    appleTouchIcon: "/apple-touch-icon.png"
  }
};

// Easy rebranding function
export const rebrandSite = (newBranding: Partial<typeof SITE_CONFIG>) => {
  return { ...SITE_CONFIG, ...newBranding };
};