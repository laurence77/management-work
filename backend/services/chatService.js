const { supabase } = require('../config/supabase');
const { logger } = require('./LoggingService');
const cacheService = require('./CacheService');

class ChatService {
  async createRoom(userId, data) {
    try {
      const { name, type = 'support', bookingId } = data;
      
      const { data: room, error } = await supabase
        .from('chat_rooms')
        .insert({
          name,
          type,
          booking_id: bookingId,
          created_by: userId,
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;

      return { success: true, room };
    } catch (error) {
      logger.error('Failed to create chat room:', error);
      return { success: false, error: error.message };
    }
  }

  async getRooms(userId) {
    try {
      const { data: rooms, error } = await supabase
        .from('chat_rooms')
        .select(`
          *,
          chat_participants!inner(user_id, role, last_seen),
          chat_messages(
            id,
            content,
            sender_id,
            message_type,
            created_at
          )
        `)
        .eq('chat_participants.user_id', userId)
        .eq('chat_participants.is_active', true)
        .eq('is_active', true)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      // Get latest message for each room
      const roomsWithLatestMessage = rooms.map(room => ({
        ...room,
        latest_message: room.chat_messages
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0] || null,
        chat_messages: undefined
      }));

      return { success: true, rooms: roomsWithLatestMessage };
    } catch (error) {
      logger.error('Failed to get chat rooms:', error);
      return { success: false, error: error.message };
    }
  }

  async joinRoom(userId, roomId) {
    try {
      const { data: participant, error } = await supabase
        .from('chat_participants')
        .insert({
          room_id: roomId,
          user_id: userId,
          role: 'participant',
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;

      return { success: true, participant };
    } catch (error) {
      logger.error('Failed to join chat room:', error);
      return { success: false, error: error.message };
    }
  }

  async leaveRoom(userId, roomId) {
    try {
      const { error } = await supabase
        .from('chat_participants')
        .update({ is_active: false })
        .eq('room_id', roomId)
        .eq('user_id', userId);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      logger.error('Failed to leave chat room:', error);
      return { success: false, error: error.message };
    }
  }

  async getMessages(roomId, userId, limit = 50, offset = 0) {
    try {
      // Verify user has access to this room
      const { data: participant } = await supabase
        .from('chat_participants')
        .select('id')
        .eq('room_id', roomId)
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      if (!participant) {
        return { success: false, error: 'Access denied to this chat room' };
      }

      const { data: messages, error } = await supabase
        .from('chat_messages')
        .select(`
          *,
          chat_attachments(*),
          chat_reactions(*),
          app_users:sender_id(id, first_name, last_name, email)
        `)
        .eq('room_id', roomId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      return { success: true, messages: messages.reverse() };
    } catch (error) {
      logger.error('Failed to get chat messages:', error);
      return { success: false, error: error.message };
    }
  }

  async sendMessage(userId, roomId, data) {
    try {
      const { content, messageType = 'text', replyTo, metadata } = data;

      // Verify user has access to this room
      const { data: participant } = await supabase
        .from('chat_participants')
        .select('id')
        .eq('room_id', roomId)
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      if (!participant) {
        return { success: false, error: 'Access denied to this chat room' };
      }

      const { data: message, error } = await supabase
        .from('chat_messages')
        .insert({
          room_id: roomId,
          sender_id: userId,
          content,
          message_type: messageType,
          reply_to: replyTo,
          metadata
        })
        .select(`
          *,
          app_users:sender_id(id, first_name, last_name, email)
        `)
        .single();

      if (error) throw error;

      // Update room's updated_at timestamp
      await supabase
        .from('chat_rooms')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', roomId);

      return { success: true, message };
    } catch (error) {
      logger.error('Failed to send chat message:', error);
      return { success: false, error: error.message };
    }
  }

  async editMessage(userId, messageId, content) {
    try {
      const { data: message, error } = await supabase
        .from('chat_messages')
        .update({
          content,
          is_edited: true,
          edited_at: new Date().toISOString()
        })
        .eq('id', messageId)
        .eq('sender_id', userId)
        .select()
        .single();

      if (error) throw error;

      return { success: true, message };
    } catch (error) {
      logger.error('Failed to edit chat message:', error);
      return { success: false, error: error.message };
    }
  }

  async deleteMessage(userId, messageId) {
    try {
      const { data: message, error } = await supabase
        .from('chat_messages')
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString()
        })
        .eq('id', messageId)
        .eq('sender_id', userId)
        .select()
        .single();

      if (error) throw error;

      return { success: true, message };
    } catch (error) {
      logger.error('Failed to delete chat message:', error);
      return { success: false, error: error.message };
    }
  }

  async addReaction(userId, messageId, emoji) {
    try {
      const { data: reaction, error } = await supabase
        .from('chat_reactions')
        .insert({
          message_id: messageId,
          user_id: userId,
          emoji
        })
        .select()
        .single();

      if (error) throw error;

      return { success: true, reaction };
    } catch (error) {
      logger.error('Failed to add reaction:', error);
      return { success: false, error: error.message };
    }
  }

  async removeReaction(userId, messageId, emoji) {
    try {
      const { error } = await supabase
        .from('chat_reactions')
        .delete()
        .eq('message_id', messageId)
        .eq('user_id', userId)
        .eq('emoji', emoji);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      logger.error('Failed to remove reaction:', error);
      return { success: false, error: error.message };
    }
  }

  async setTyping(userId, roomId, isTyping = true) {
    try {
      if (isTyping) {
        const { error } = await supabase
          .from('chat_typing')
          .upsert({
            room_id: roomId,
            user_id: userId,
            started_at: new Date().toISOString()
          });

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('chat_typing')
          .delete()
          .eq('room_id', roomId)
          .eq('user_id', userId);

        if (error) throw error;
      }

      return { success: true };
    } catch (error) {
      logger.error('Failed to set typing status:', error);
      return { success: false, error: error.message };
    }
  }

  async getTypingUsers(roomId) {
    try {
      const { data: typing, error } = await supabase
        .from('chat_typing')
        .select(`
          *,
          app_users:user_id(id, first_name, last_name)
        `)
        .eq('room_id', roomId)
        .gte('started_at', new Date(Date.now() - 5 * 60 * 1000).toISOString()); // Last 5 minutes

      if (error) throw error;

      return { success: true, typing };
    } catch (error) {
      logger.error('Failed to get typing users:', error);
      return { success: false, error: error.message };
    }
  }

  async uploadAttachment(userId, messageId, fileData) {
    try {
      const { filename, originalName, fileSize, mimeType, fileUrl } = fileData;

      const { data: attachment, error } = await supabase
        .from('chat_attachments')
        .insert({
          message_id: messageId,
          filename,
          original_name: originalName,
          file_size: fileSize,
          mime_type: mimeType,
          file_url: fileUrl
        })
        .select()
        .single();

      if (error) throw error;

      return { success: true, attachment };
    } catch (error) {
      logger.error('Failed to save attachment:', error);
      return { success: false, error: error.message };
    }
  }

  async updateLastSeen(userId, roomId) {
    try {
      const { error } = await supabase
        .from('chat_participants')
        .update({ last_seen: new Date().toISOString() })
        .eq('room_id', roomId)
        .eq('user_id', userId);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      logger.error('Failed to update last seen:', error);
      return { success: false, error: error.message };
    }
  }

  async getRoomSettings(roomId) {
    try {
      const { data: settings, error } = await supabase
        .from('chat_room_settings')
        .select('*')
        .eq('room_id', roomId)
        .single();

      if (error) throw error;

      return { success: true, settings };
    } catch (error) {
      logger.error('Failed to get room settings:', error);
      return { success: false, error: error.message };
    }
  }

  async updateRoomSettings(roomId, userId, settings) {
    try {
      // Check if user is admin of the room
      const { data: participant } = await supabase
        .from('chat_participants')
        .select('role')
        .eq('room_id', roomId)
        .eq('user_id', userId)
        .single();

      if (!participant || participant.role !== 'admin') {
        return { success: false, error: 'Admin access required' };
      }

      const { data: updatedSettings, error } = await supabase
        .from('chat_room_settings')
        .update({
          ...settings,
          updated_at: new Date().toISOString()
        })
        .eq('room_id', roomId)
        .select()
        .single();

      if (error) throw error;

      return { success: true, settings: updatedSettings };
    } catch (error) {
      logger.error('Failed to update room settings:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new ChatService();