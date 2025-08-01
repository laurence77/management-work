import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Star } from 'lucide-react';
import { Celebrity } from '@/types';
import { LoadingSkeleton } from '@/components/ui/loading-spinner';

interface RecentCelebritiesProps {
  celebrities: Celebrity[];
  loading?: boolean;
  limit?: number;
}

export const RecentCelebrities = ({ 
  celebrities, 
  loading, 
  limit = 5 
}: RecentCelebritiesProps) => {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Celebrities</CardTitle>
          <CardDescription>
            Latest celebrities added to the platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: limit }).map((_, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <LoadingSkeleton className="w-12 h-12 rounded-full" />
                  <div className="space-y-2">
                    <LoadingSkeleton className="h-4 w-32" />
                    <LoadingSkeleton className="h-3 w-24" />
                  </div>
                </div>
                <div className="text-right space-y-2">
                  <LoadingSkeleton className="h-4 w-20" />
                  <LoadingSkeleton className="h-6 w-16 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const recentCelebrities = celebrities.slice(0, limit);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Celebrities</CardTitle>
        <CardDescription>
          Latest celebrities added to the platform
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {recentCelebrities.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No celebrities found
            </div>
          ) : (
            recentCelebrities.map((celebrity) => (
              <CelebrityRow key={celebrity.id} celebrity={celebrity} />
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const CelebrityRow = ({ celebrity }: { celebrity: Celebrity }) => {
  return (
    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
      <div className="flex items-center space-x-4">
        <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center overflow-hidden">
          {celebrity.image ? (
            <img 
              src={celebrity.image} 
              alt={celebrity.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <Star className="h-6 w-6 text-slate-600" />
          )}
        </div>
        <div>
          <h4 className="font-medium text-slate-900">{celebrity.name}</h4>
          <p className="text-sm text-slate-600">{celebrity.category}</p>
        </div>
      </div>
      <div className="text-right">
        <div className="font-medium text-slate-900">
          ${celebrity.price.toLocaleString()}
        </div>
        <div className={`text-xs px-2 py-1 rounded-full font-medium ${
          celebrity.availability 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {celebrity.availability ? "Available" : "Unavailable"}
        </div>
      </div>
    </div>
  );
};