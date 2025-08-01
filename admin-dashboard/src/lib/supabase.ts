import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10, // Rate limit for realtime events
    },
  },
});

// Database types for better TypeScript support
export type Database = {
  public: {
    Tables: {
      app_users: {
        Row: {
          id: string;
          auth_id: string;
          email: string;
          first_name: string;
          last_name: string;
          role: string;
          organization_id: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          auth_id: string;
          email: string;
          first_name: string;
          last_name: string;
          role?: string;
          organization_id?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          auth_id?: string;
          email?: string;
          first_name?: string;
          last_name?: string;
          role?: string;
          organization_id?: string | null;
          is_active?: boolean;
          updated_at?: string;
        };
      };
      bookings: {
        Row: {
          id: string;
          event_name: string;
          event_date: string;
          celebrity_id: string;
          created_by: string;
          organization_id: string | null;
          status: string;
          total_amount: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          event_name: string;
          event_date: string;
          celebrity_id: string;
          created_by: string;
          organization_id?: string | null;
          status?: string;
          total_amount?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          event_name?: string;
          event_date?: string;
          celebrity_id?: string;
          status?: string;
          total_amount?: number;
          updated_at?: string;
        };
      };
      celebrities: {
        Row: {
          id: string;
          name: string;
          category: string;
          description: string;
          base_price: number;
          organization_id: string | null;
          is_available: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          category: string;
          description?: string;
          base_price: number;
          organization_id?: string | null;
          is_available?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          category?: string;
          description?: string;
          base_price?: number;
          is_available?: boolean;
          updated_at?: string;
        };
      };
      chat_messages: {
        Row: {
          id: string;
          room_id: string;
          sender_id: string;
          content: string;
          message_type: string;
          metadata: any;
          reply_to: string | null;
          is_edited: boolean;
          edited_at: string | null;
          is_deleted: boolean;
          deleted_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          room_id: string;
          sender_id: string;
          content: string;
          message_type?: string;
          metadata?: any;
          reply_to?: string | null;
          is_edited?: boolean;
          edited_at?: string | null;
          is_deleted?: boolean;
          deleted_at?: string | null;
          created_at?: string;
        };
        Update: {
          content?: string;
          metadata?: any;
          is_edited?: boolean;
          edited_at?: string | null;
          is_deleted?: boolean;
          deleted_at?: string | null;
        };
      };
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          domain: string | null;
          settings: any;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          domain?: string | null;
          settings?: any;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          slug?: string;
          domain?: string | null;
          settings?: any;
          is_active?: boolean;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      check_user_permission: {
        Args: {
          user_auth_id: string;
          permission_name: string;
        };
        Returns: boolean;
      };
      get_user_organization: {
        Args: {
          user_auth_id: string;
        };
        Returns: string;
      };
      is_super_admin: {
        Args: {
          user_auth_id: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      [_ in never]: never;
    };
  };
};

// Helper functions for common realtime operations
export const realtimeHelpers = {
  // Subscribe to table changes
  subscribeToTable: (
    table: string,
    callback: (payload: any) => void,
    filter?: string
  ) => {
    const channel = supabase.channel(`table-${table}-${Date.now()}`);
    
    const subscription = channel
      .on(
        'postgres_changes' as any,
        {
          event: '*',
          schema: 'public',
          table,
          filter,
        },
        callback
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  },

  // Subscribe to user's data changes
  subscribeToUserData: (userId: string, callback: (payload: any) => void) => {
    return realtimeHelpers.subscribeToTable(
      'bookings',
      callback,
      `created_by=eq.${userId}`
    );
  },

  // Subscribe to organization data changes
  subscribeToOrganizationData: (
    orgId: string,
    table: string,
    callback: (payload: any) => void
  ) => {
    return realtimeHelpers.subscribeToTable(
      table,
      callback,
      `organization_id=eq.${orgId}`
    );
  },

  // Real-time presence for online users
  trackPresence: (roomId: string, userInfo: any) => {
    const channel = supabase.channel(`presence-${roomId}`);
    
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        console.log('Online users:', state);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track(userInfo);
        }
      });

    return () => supabase.removeChannel(channel);
  },

  // Real-time broadcasting
  createBroadcastChannel: (channelName: string) => {
    const channel = supabase.channel(channelName);
    
    const broadcast = async (event: string, payload: any) => {
      await channel.send({
        type: 'broadcast',
        event,
        payload,
      });
    };

    const onBroadcast = (event: string, callback: (payload: any) => void) => {
      channel.on('broadcast', { event }, callback);
    };

    channel.subscribe();

    return {
      broadcast,
      onBroadcast,
      cleanup: () => supabase.removeChannel(channel),
    };
  },
};

// Auth helpers
export const authHelpers = {
  // Get current user with profile
  getCurrentUser: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
      .from('app_users')
      .select('*')
      .eq('auth_id', user.id)
      .single();

    return { user, profile };
  },

  // Sign in with email/password
  signIn: async (email: string, password: string) => {
    return await supabase.auth.signInWithPassword({ email, password });
  },

  // Sign up with email/password
  signUp: async (email: string, password: string, metadata?: any) => {
    return await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    });
  },

  // Sign out
  signOut: async () => {
    return await supabase.auth.signOut();
  },

  // Listen to auth changes
  onAuthChange: (callback: (event: string, session: any) => void) => {
    return supabase.auth.onAuthStateChange(callback);
  },
};

export default supabase;