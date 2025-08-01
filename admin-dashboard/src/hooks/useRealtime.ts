import { useEffect } from 'react'

export type RealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE'

export interface RealtimeOptions {
  onCelebrityChange?: (event: RealtimeEvent, payload: any) => void
  onBookingChange?: (event: RealtimeEvent, payload: any) => void
  onSettingsChange?: (event: RealtimeEvent, payload: any) => void
}

export const useRealtime = (options: RealtimeOptions) => {
  // Disabled realtime for simple backend - no-op implementation
  // Just return empty hooks to prevent errors
  useEffect(() => {
    // No-op - realtime disabled for simple backend
  }, []);
  
  return null;
};