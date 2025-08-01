import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Brain, Lightbulb, TrendingUp, Sparkles, MessageSquare } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/useToast';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface AISuggestion {
  celebrity: string;
  timeframe: string;
  eventType: string;
  reasoning: string;
  estimatedCost: string;
}

interface AIBookingAssistantProps {
  onSuggestionSelect?: (suggestion: AISuggestion) => void;
}

export const AIBookingAssistant = ({ onSuggestionSelect }: AIBookingAssistantProps) => {
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [preferences, setPreferences] = useState('');
  const [isAIGenerated, setIsAIGenerated] = useState(false);
  const { toast } = useToast();

  const generateSuggestions = async () => {
    try {
      setLoading(true);
      
      const response = await api.post('/ai/suggestions/booking', {
        preferences: preferences ? { description: preferences } : {},
        includeHistory: true
      });

      setSuggestions(response.data.data || []);
      setIsAIGenerated(response.data.aiGenerated);

      if (response.data.aiGenerated) {
        toast({
          title: 'AI Suggestions Generated',
          description: 'Smart booking recommendations based on your preferences.',
          type: 'success',
        });
      } else {
        toast({
          title: 'Suggestions Available',
          description: 'Showing general recommendations.',
          type: 'info',
        });
      }
    } catch (error: any) {
      console.error('Failed to get AI suggestions:', error);
      toast({
        title: 'Failed to generate suggestions',
        description: error.message || 'Something went wrong.',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: AISuggestion) => {
    onSuggestionSelect?.(suggestion);
    toast({
      title: 'Suggestion Applied',
      description: `Using suggestion for ${suggestion.celebrity}.`,
      type: 'success',
    });
  };

  return (
    <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
      <CardHeader>
        <div className="flex items-center space-x-2">
          <Brain className="h-6 w-6 text-blue-600" />
          <div>
            <CardTitle className="text-blue-900">AI Booking Assistant</CardTitle>
            <CardDescription>
              Get personalized recommendations powered by AI
            </CardDescription>
          </div>
          {isAIGenerated && (
            <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
              <Sparkles className="h-3 w-3 mr-1" />
              AI Powered
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Preferences Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            Tell me about your event preferences:
          </label>
          <Textarea
            placeholder="e.g., Corporate event for 100 people, need someone engaging and professional, budget around $50k..."
            value={preferences}
            onChange={(e) => setPreferences(e.target.value)}
            className="min-h-[80px]"
          />
        </div>

        {/* Generate Button */}
        <Button 
          onClick={generateSuggestions}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          {loading ? (
            <>
              <LoadingSpinner size="sm" className="mr-2" />
              Generating AI Suggestions...
            </>
          ) : (
            <>
              <Brain className="h-4 w-4 mr-2" />
              Get AI Recommendations
            </>
          )}
        </Button>

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Lightbulb className="h-4 w-4 text-yellow-600" />
              <h4 className="font-medium text-gray-900">Smart Recommendations</h4>
            </div>
            
            {suggestions.map((suggestion, index) => (
              <SuggestionCard
                key={index}
                suggestion={suggestion}
                onClick={() => handleSuggestionClick(suggestion)}
              />
            ))}
          </div>
        )}

        {/* Quick Tips */}
        <div className="bg-blue-100 rounded-lg p-3 space-y-2">
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-4 w-4 text-blue-600" />
            <h5 className="font-medium text-blue-900">AI Tips</h5>
          </div>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Be specific about your event type and requirements</li>
            <li>• Mention your budget range for better recommendations</li>
            <li>• Include preferred dates or time flexibility</li>
            <li>• The more details you provide, the better the AI suggestions</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

const SuggestionCard = ({ 
  suggestion, 
  onClick 
}: { 
  suggestion: AISuggestion; 
  onClick: () => void; 
}) => {
  return (
    <div
      className="border rounded-lg p-3 bg-white hover:bg-gray-50 cursor-pointer transition-colors"
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h5 className="font-medium text-gray-900">{suggestion.celebrity}</h5>
          <p className="text-sm text-gray-600 mt-1">{suggestion.reasoning}</p>
          
          <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
            <span>📅 {suggestion.timeframe}</span>
            <span>🎭 {suggestion.eventType}</span>
            <span>💰 {suggestion.estimatedCost}</span>
          </div>
        </div>
        
        <Button size="sm" variant="outline" className="ml-2">
          <MessageSquare className="h-3 w-3 mr-1" />
          Select
        </Button>
      </div>
    </div>
  );
};