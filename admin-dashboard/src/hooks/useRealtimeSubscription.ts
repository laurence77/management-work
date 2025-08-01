import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

interface UseRealtimeSubscriptionOptions {
  table: string;
  filter?: string;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  schema?: string;
}

interface RealtimePayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: any;
  old: any;
  table: string;
  commit_timestamp: string;
}

export const useRealtimeSubscription = (
  options: UseRealtimeSubscriptionOptions,
  callback: (payload: RealtimePayload) => void
) => {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    const {
      table,
      filter = '*',
      event = '*',
      schema = 'public'
    } = options;

    // Create unique channel name
    const channelName = `realtime:${schema}:${table}:${filter}:${Date.now()}`;

    // Create the channel
    const channel = supabase.channel(channelName);

    // Subscribe to changes
    channel
      .on(
        'postgres_changes' as any,
        {
          event,
          schema,
          table,
          filter: filter !== '*' ? filter : undefined,
        },
        (payload: any) => {
          console.log('Realtime update:', payload);
          callback({
            eventType: payload.eventType,
            new: payload.new,
            old: payload.old,
            table: payload.table,
            commit_timestamp: payload.commit_timestamp,
          });
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status);
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          setError(null);
        } else if (status === 'CHANNEL_ERROR') {
          setIsConnected(false);
          setError('Failed to connect to realtime channel');
        } else if (status === 'TIMED_OUT') {
          setIsConnected(false);
          setError('Realtime connection timed out');
        } else if (status === 'CLOSED') {
          setIsConnected(false);
        }
      });

    channelRef.current = channel;

    // Cleanup on unmount
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      setIsConnected(false);
    };
  }, [options.table, options.filter, options.event, options.schema]);

  const disconnect = () => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
      setIsConnected(false);
    }
  };

  return {
    isConnected,
    error,
    disconnect,
  };
};

// Hook for multiple table subscriptions
export const useMultipleRealtimeSubscriptions = (
  subscriptions: Array<{
    options: UseRealtimeSubscriptionOptions;
    callback: (payload: RealtimePayload) => void;
  }>
) => {
  const [connections, setConnections] = useState<
    Array<{ table: string; isConnected: boolean; error: string | null }>
  >([]);

  const channelsRef = useRef<RealtimeChannel[]>([]);

  useEffect(() => {
    // Clean up existing channels
    channelsRef.current.forEach(channel => {
      supabase.removeChannel(channel);
    });
    channelsRef.current = [];

    const newConnections = subscriptions.map(({ options, callback }) => {
      const {
        table,
        filter = '*',
        event = '*',
        schema = 'public'
      } = options;

      const channelName = `realtime:${schema}:${table}:${filter}:${Date.now()}`;
      const channel = supabase.channel(channelName);

      let connectionState = {
        table,
        isConnected: false,
        error: null as string | null,
      };

      channel
        .on(
          'postgres_changes' as any,
          {
            event,
            schema,
            table,
            filter: filter !== '*' ? filter : undefined,
          },
          callback
        )
        .subscribe((status) => {
          setConnections(prev => 
            prev.map(conn => 
              conn.table === table
                ? {
                    ...conn,
                    isConnected: status === 'SUBSCRIBED',
                    error: status === 'CHANNEL_ERROR' ? 'Connection failed' : null,
                  }
                : conn
            )
          );
        });

      channelsRef.current.push(channel);
      return connectionState;
    });

    setConnections(newConnections);

    return () => {
      channelsRef.current.forEach(channel => {
        supabase.removeChannel(channel);
      });
      channelsRef.current = [];
    };
  }, [JSON.stringify(subscriptions.map(s => s.options))]);

  return {
    connections,
    disconnectAll: () => {
      channelsRef.current.forEach(channel => {
        supabase.removeChannel(channel);
      });
      channelsRef.current = [];
      setConnections([]);
    },
  };
};

// Hook for realtime presence (who's online)
export const useRealtimePresence = (roomId: string, userInfo: any) => {
  const [presenceState, setPresenceState] = useState<Record<string, any>>({});
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    const channel = supabase.channel(`presence:${roomId}`);

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        setPresenceState(state);
        
        // Extract online users
        const users = Object.values(state).flat();
        setOnlineUsers(users);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined:', key, newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left:', key, leftPresences);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Track this user's presence
          await channel.track(userInfo);
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [roomId, JSON.stringify(userInfo)]);

  const updatePresence = async (newInfo: any) => {
    if (channelRef.current) {
      await channelRef.current.track({ ...userInfo, ...newInfo });
    }
  };

  return {
    presenceState,
    onlineUsers,
    updatePresence,
  };
};

// Hook for realtime broadcast (send messages)
export const useRealtimeBroadcast = (channelName: string) => {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const channel = supabase.channel(channelName);

    channel.subscribe((status) => {
      setIsConnected(status === 'SUBSCRIBED');
    });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      setIsConnected(false);
    };
  }, [channelName]);

  const broadcast = async (event: string, payload: any) => {
    if (channelRef.current && isConnected) {
      await channelRef.current.send({
        type: 'broadcast',
        event,
        payload,
      });
    }
  };

  const onBroadcast = (event: string, callback: (payload: any) => void) => {
    if (channelRef.current) {
      channelRef.current.on('broadcast', { event }, callback);
    }
  };

  return {
    isConnected,
    broadcast,
    onBroadcast,
  };
};