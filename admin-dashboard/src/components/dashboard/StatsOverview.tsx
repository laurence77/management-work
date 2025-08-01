import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Star, DollarSign, Settings } from 'lucide-react';
import { Celebrity } from '@/types';

interface StatsOverviewProps {
  celebrities: Celebrity[];
  loading?: boolean;
}

export const StatsOverview = ({ celebrities, loading }: StatsOverviewProps) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 w-24 bg-gray-200 animate-pulse rounded" />
              <div className="h-4 w-4 bg-gray-200 animate-pulse rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-16 bg-gray-200 animate-pulse rounded mb-1" />
              <div className="h-3 w-20 bg-gray-200 animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const totalCelebrities = celebrities.length;
  const availableCelebrities = celebrities.filter(c => c.availability).length;
  const totalBookings = celebrities.reduce((sum, c) => sum + (c.bookings || 0), 0);
  const averageRating = celebrities.length > 0 
    ? celebrities.reduce((sum, c) => sum + (c.rating || 0), 0) / celebrities.length 
    : 0;

  const stats = [
    {
      title: 'Total Celebrities',
      value: totalCelebrities,
      subtitle: `${availableCelebrities} available`,
      icon: Users,
      color: 'text-blue-600',
    },
    {
      title: 'Total Bookings',
      value: totalBookings,
      subtitle: 'Across all celebrities',
      icon: DollarSign,
      color: 'text-green-600',
    },
    {
      title: 'Average Rating',
      value: averageRating.toFixed(1),
      subtitle: 'Out of 5.0 stars',
      icon: Star,
      color: 'text-yellow-600',
    },
    {
      title: 'Platform Status',
      value: 'Active',
      subtitle: 'All systems operational',
      icon: Settings,
      color: 'text-green-600',
      valueColor: 'text-green-600',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <Icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${stat.valueColor || ''}`}>
                {stat.value}
              </div>
              <p className="text-xs text-slate-600">
                {stat.subtitle}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};