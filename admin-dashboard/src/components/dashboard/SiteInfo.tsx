import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Phone, Mail, MapPin } from 'lucide-react';
import { SiteSettings } from '@/types';
import { LoadingSkeleton } from '@/components/ui/loading-spinner';

interface SiteInfoProps {
  siteSettings: SiteSettings | null;
  loading?: boolean;
}

export const SiteInfo = ({ siteSettings, loading }: SiteInfoProps) => {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Site Information</CardTitle>
          <CardDescription>
            Current website contact details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-3">
                <LoadingSkeleton className="h-5 w-5 rounded" />
                <div className="space-y-2">
                  <LoadingSkeleton className="h-4 w-16" />
                  <LoadingSkeleton className="h-3 w-32" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!siteSettings) {
    return null;
  }

  const contactInfo = [
    {
      icon: Phone,
      label: 'Phone',
      value: siteSettings.contact_phone,
      href: `tel:${siteSettings.contact_phone}`,
    },
    {
      icon: Mail,
      label: 'Email',
      value: siteSettings.contact_email,
      href: `mailto:${siteSettings.contact_email}`,
    },
    {
      icon: MapPin,
      label: 'Address',
      value: siteSettings.address,
      href: `https://maps.google.com/?q=${encodeURIComponent(siteSettings.address)}`,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Site Information</CardTitle>
        <CardDescription>
          Current website contact details
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {contactInfo.map((info, index) => {
            const Icon = info.icon;
            return (
              <div key={index} className="flex items-center space-x-3">
                <Icon className="h-5 w-5 text-slate-600 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-900">{info.label}</p>
                  {info.href ? (
                    <a 
                      href={info.href}
                      className="text-sm text-slate-600 hover:text-blue-600 transition-colors break-words"
                      target={info.icon === MapPin ? '_blank' : undefined}
                      rel={info.icon === MapPin ? 'noopener noreferrer' : undefined}
                    >
                      {info.value}
                    </a>
                  ) : (
                    <p className="text-sm text-slate-600 break-words">{info.value}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};