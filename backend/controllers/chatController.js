const chatService = require('../services/chatService');
const { logger } = require('../utils/logger');

const chatController = {
  // Create a new chat room
  async createRoom(req, res) {
    try {
      const userId = req.user.id;
      const { name, type, bookingId } = req.body;

      const result = await chatService.createRoom(userId, {
        name,
        type,
        bookingId
      });

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      res.status(201).json({
        success: true,
        data: result.room
      });
    } catch (error) {
      logger.error('Create room error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create chat room'
      });
    }
  },

  // Get all chat rooms for the user
  async getRooms(req, res) {
    try {
      const userId = req.user.id;

      const result = await chatService.getRooms(userId);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      res.json({
        success: true,
        data: result.rooms
      });
    } catch (error) {
      logger.error('Get rooms error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get chat rooms'
      });
    }
  },

  // Join a chat room
  async joinRoom(req, res) {
    try {
      const userId = req.user.id;
      const { roomId } = req.params;

      const result = await chatService.joinRoom(userId, roomId);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      res.json({
        success: true,
        data: result.participant
      });
    } catch (error) {
      logger.error('Join room error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to join chat room'
      });
    }
  },

  // Leave a chat room
  async leaveRoom(req, res) {
    try {
      const userId = req.user.id;
      const { roomId } = req.params;

      const result = await chatService.leaveRoom(userId, roomId);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      res.json({
        success: true,
        message: 'Left chat room successfully'
      });
    } catch (error) {
      logger.error('Leave room error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to leave chat room'
      });
    }
  },

  // Get messages for a chat room
  async getMessages(req, res) {
    try {
      const userId = req.user.id;
      const { roomId } = req.params;
      const { limit = 50, offset = 0 } = req.query;

      const result = await chatService.getMessages(
        roomId,
        userId,
        parseInt(limit),
        parseInt(offset)
      );

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      res.json({
        success: true,
        data: result.messages
      });
    } catch (error) {
      logger.error('Get messages error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get messages'
      });
    }
  },

  // Send a message
  async sendMessage(req, res) {
    try {
      const userId = req.user.id;
      const { roomId } = req.params;
      const { content, messageType, replyTo, metadata } = req.body;

      const result = await chatService.sendMessage(userId, roomId, {
        content,
        messageType,
        replyTo,
        metadata
      });

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      res.status(201).json({
        success: true,
        data: result.message
      });
    } catch (error) {
      logger.error('Send message error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to send message'
      });
    }
  },

  // Edit a message
  async editMessage(req, res) {
    try {
      const userId = req.user.id;
      const { messageId } = req.params;
      const { content } = req.body;

      const result = await chatService.editMessage(userId, messageId, content);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      res.json({
        success: true,
        data: result.message
      });
    } catch (error) {
      logger.error('Edit message error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to edit message'
      });
    }
  },

  // Delete a message
  async deleteMessage(req, res) {
    try {
      const userId = req.user.id;
      const { messageId } = req.params;

      const result = await chatService.deleteMessage(userId, messageId);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      res.json({
        success: true,
        data: result.message
      });
    } catch (error) {
      logger.error('Delete message error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete message'
      });
    }
  },

  // Add reaction to a message
  async addReaction(req, res) {
    try {
      const userId = req.user.id;
      const { messageId } = req.params;
      const { emoji } = req.body;

      const result = await chatService.addReaction(userId, messageId, emoji);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      res.status(201).json({
        success: true,
        data: result.reaction
      });
    } catch (error) {
      logger.error('Add reaction error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to add reaction'
      });
    }
  },

  // Remove reaction from a message
  async removeReaction(req, res) {
    try {
      const userId = req.user.id;
      const { messageId } = req.params;
      const { emoji } = req.body;

      const result = await chatService.removeReaction(userId, messageId, emoji);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      res.json({
        success: true,
        message: 'Reaction removed successfully'
      });
    } catch (error) {
      logger.error('Remove reaction error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to remove reaction'
      });
    }
  },

  // Set typing status
  async setTyping(req, res) {
    try {
      const userId = req.user.id;
      const { roomId } = req.params;
      const { isTyping = true } = req.body;

      const result = await chatService.setTyping(userId, roomId, isTyping);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      res.json({
        success: true,
        message: 'Typing status updated'
      });
    } catch (error) {
      logger.error('Set typing error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to set typing status'
      });
    }
  },

  // Get typing users
  async getTypingUsers(req, res) {
    try {
      const { roomId } = req.params;

      const result = await chatService.getTypingUsers(roomId);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      res.json({
        success: true,
        data: result.typing
      });
    } catch (error) {
      logger.error('Get typing users error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get typing users'
      });
    }
  },

  // Update last seen timestamp
  async updateLastSeen(req, res) {
    try {
      const userId = req.user.id;
      const { roomId } = req.params;

      const result = await chatService.updateLastSeen(userId, roomId);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      res.json({
        success: true,
        message: 'Last seen updated'
      });
    } catch (error) {
      logger.error('Update last seen error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update last seen'
      });
    }
  },

  // Get room settings
  async getRoomSettings(req, res) {
    try {
      const { roomId } = req.params;

      const result = await chatService.getRoomSettings(roomId);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      res.json({
        success: true,
        data: result.settings
      });
    } catch (error) {
      logger.error('Get room settings error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get room settings'
      });
    }
  },

  // Update room settings
  async updateRoomSettings(req, res) {
    try {
      const userId = req.user.id;
      const { roomId } = req.params;
      const settings = req.body;

      const result = await chatService.updateRoomSettings(roomId, userId, settings);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      res.json({
        success: true,
        data: result.settings
      });
    } catch (error) {
      logger.error('Update room settings error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update room settings'
      });
    }
  }
};

module.exports = chatController;