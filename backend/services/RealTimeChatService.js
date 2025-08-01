const { logger } = require('./LoggingService');
const cacheService = require('./CacheService');
const chatService = require('./chatService');

/**
 * Real-time Chat Service with WebSocket Integration
 * Enhances the existing chat service with real-time functionality
 */

class RealTimeChatService {
  constructor(io) {
    this.io = io;
    this.activeUsers = new Map(); // userId -> socket info
    this.userRooms = new Map(); // userId -> Set of roomIds
    this.roomUsers = new Map(); // roomId -> Set of userIds
    this.messageQueue = new Map(); // userId -> queued messages for offline users
    this.typingUsers = new Map(); // roomId -> Set of typing userIds
    
    this.setupSocketHandlers();
    this.setupCleanupInterval();
    
    logger.info('💬 Real-time chat service initialized');
  }
  
  setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      logger.debug('Socket connected', { socketId: socket.id });
      
      // User authentication and registration
      socket.on('chat:authenticate', async (data) => {
        await this.handleUserAuthentication(socket, data);
      });
      
      // Join/leave rooms
      socket.on('chat:join_room', async (data) => {
        await this.handleJoinRoom(socket, data);
      });
      
      socket.on('chat:leave_room', async (data) => {
        await this.handleLeaveRoom(socket, data);
      });
      
      // Message handling
      socket.on('chat:send_message', async (data) => {
        await this.handleSendMessage(socket, data);
      });
      
      socket.on('chat:edit_message', async (data) => {
        await this.handleEditMessage(socket, data);
      });
      
      socket.on('chat:delete_message', async (data) => {
        await this.handleDeleteMessage(socket, data);
      });
      
      socket.on('chat:message_read', async (data) => {
        await this.handleMessageRead(socket, data);
      });
      
      // Reactions
      socket.on('chat:add_reaction', async (data) => {
        await this.handleAddReaction(socket, data);
      });
      
      socket.on('chat:remove_reaction', async (data) => {
        await this.handleRemoveReaction(socket, data);
      });
      
      // Typing indicators
      socket.on('chat:typing_start', async (data) => {
        await this.handleTypingStart(socket, data);
      });
      
      socket.on('chat:typing_stop', async (data) => {
        await this.handleTypingStop(socket, data);
      });
      
      // File sharing
      socket.on('chat:share_file', async (data) => {
        await this.handleFileShare(socket, data);
      });
      
      // User status
      socket.on('chat:status_update', async (data) => {
        await this.handleStatusUpdate(socket, data);
      });
      
      // Get chat history
      socket.on('chat:get_history', async (data) => {
        await this.handleGetHistory(socket, data);
      });
      
      // Get online users
      socket.on('chat:get_online_users', async (data) => {
        await this.handleGetOnlineUsers(socket, data);
      });
      
      // Get room list
      socket.on('chat:get_rooms', async (data) => {
        await this.handleGetRooms(socket, data);
      });
      
      // Room management
      socket.on('chat:create_room', async (data) => {
        await this.handleCreateRoom(socket, data);
      });
      
      // Disconnect handling
      socket.on('disconnect', () => {
        this.handleUserDisconnect(socket);
      });
      
      // Error handling
      socket.on('error', (error) => {
        logger.error('Socket error', error, { socketId: socket.id, userId: socket.userId });
      });
    });
  }
  
  async handleUserAuthentication(socket, data) {
    try {
      const { userId, userRole, userName, token } = data;
      
      if (!userId || !userName) {
        socket.emit('chat:error', { message: 'Invalid authentication data' });
        return;
      }
      
      // Validate token if provided (integrate with your auth system)
      // const isValidToken = await this.validateToken(token, userId);
      // if (!isValidToken) {
      //   socket.emit('chat:error', { message: 'Invalid authentication token' });
      //   return;
      // }
      
      // Store user information
      const userInfo = {
        userId,
        userName,
        userRole: userRole || 'customer',
        socketId: socket.id,
        status: 'online',
        lastSeen: new Date(),
        joinedAt: new Date()
      };
      
      this.activeUsers.set(userId, userInfo);
      socket.userId = userId;
      socket.userRole = userRole;
      socket.userName = userName;
      
      // Join user to their personal room
      const personalRoom = `user:${userId}`;
      socket.join(personalRoom);
      
      // Load user's existing rooms from database
      await this.loadUserRooms(socket, userId);
      
      // Deliver queued messages
      await this.deliverQueuedMessages(userId);
      
      // Get user's rooms
      const userRoomsResult = await chatService.getRooms(userId);
      const rooms = userRoomsResult.success ? userRoomsResult.rooms : [];
      
      // Notify user of successful authentication
      socket.emit('chat:authenticated', {
        userId,
        userName,
        status: 'online',
        rooms: rooms,
        connectedAt: new Date()
      });
      
      // Update user status in cache
      await cacheService.set(`chat:user_status:${userId}`, userInfo, 3600);
      
      // Notify contacts about user coming online
      await this.notifyUserStatusChange(userId, 'online');
      
      logger.info('User authenticated in chat', { userId, userName, socketId: socket.id });
      
    } catch (error) {
      logger.error('Chat authentication failed', error, { socketId: socket.id });
      socket.emit('chat:error', { message: 'Authentication failed' });
    }
  }
  
  async handleJoinRoom(socket, data) {
    try {
      const { roomId } = data;
      const userId = socket.userId;
      
      if (!userId || !roomId) {
        socket.emit('chat:error', { message: 'Invalid room join data' });
        return;
      }
      
      // Join room in database first
      const joinResult = await chatService.joinRoom(userId, roomId);
      if (!joinResult.success) {
        socket.emit('chat:error', { message: joinResult.error });
        return;
      }
      
      // Join socket to room
      socket.join(roomId);
      
      // Update user-room mappings
      if (!this.userRooms.has(userId)) {
        this.userRooms.set(userId, new Set());
      }
      this.userRooms.get(userId).add(roomId);
      
      if (!this.roomUsers.has(roomId)) {
        this.roomUsers.set(roomId, new Set());
      }
      this.roomUsers.get(roomId).add(userId);
      
      // Get room info and recent messages
      const messagesResult = await chatService.getMessages(roomId, userId, 50, 0);
      const messages = messagesResult.success ? messagesResult.messages : [];
      
      // Notify user of successful join
      socket.emit('chat:room_joined', {
        roomId,
        messages,
        joinedAt: new Date()
      });
      
      // Notify other users in room
      socket.to(roomId).emit('chat:user_joined_room', {
        userId,
        userName: socket.userName,
        joinedAt: new Date()
      });
      
      // Update room membership cache
      await cacheService.set(
        `chat:room_users:${roomId}`, 
        Array.from(this.roomUsers.get(roomId)), 
        1800
      );
      
      logger.info('User joined chat room', { userId, roomId });
      
    } catch (error) {
      logger.error('Failed to join chat room', error, { 
        userId: socket.userId, 
        roomId: data.roomId 
      });
      socket.emit('chat:error', { message: 'Failed to join room' });
    }
  }
  
  async handleLeaveRoom(socket, data) {
    try {
      const { roomId } = data;
      const userId = socket.userId;
      
      if (!userId || !roomId) {
        return;
      }
      
      // Leave room in database
      await chatService.leaveRoom(userId, roomId);
      
      // Leave socket room
      socket.leave(roomId);
      
      // Update mappings
      if (this.userRooms.has(userId)) {
        this.userRooms.get(userId).delete(roomId);
      }
      
      if (this.roomUsers.has(roomId)) {
        this.roomUsers.get(roomId).delete(userId);
        
        // Clean up empty rooms
        if (this.roomUsers.get(roomId).size === 0) {
          this.roomUsers.delete(roomId);
        }
      }
      
      // Stop typing if user was typing
      await this.handleTypingStop(socket, { roomId });
      
      // Notify other users
      socket.to(roomId).emit('chat:user_left_room', {
        userId,
        userName: socket.userName,
        leftAt: new Date()
      });
      
      // Update cache
      if (this.roomUsers.has(roomId)) {
        await cacheService.set(
          `chat:room_users:${roomId}`, 
          Array.from(this.roomUsers.get(roomId)), 
          1800
        );
      } else {
        await cacheService.del(`chat:room_users:${roomId}`);
      }
      
      logger.info('User left chat room', { userId, roomId });
      
    } catch (error) {
      logger.error('Failed to leave chat room', error, { 
        userId: socket.userId, 
        roomId: data.roomId 
      });
    }
  }
  
  async handleSendMessage(socket, data) {
    try {
      const { roomId, content, messageType = 'text', replyTo = null, metadata = {} } = data;
      const userId = socket.userId;
      
      if (!userId || !roomId || !content?.trim()) {
        socket.emit('chat:error', { message: 'Invalid message data' });
        return;
      }
      
      // Send message via database service
      const messageResult = await chatService.sendMessage(userId, roomId, {
        content: content.trim(),
        messageType,
        replyTo,
        metadata: {
          ...metadata,
          socketId: socket.id,
          userAgent: socket.handshake.headers['user-agent'],
          ip: socket.handshake.address
        }
      });
      
      if (!messageResult.success) {
        socket.emit('chat:error', { message: messageResult.error });
        return;
      }
      
      const message = messageResult.message;
      
      // Emit to all users in room (including sender for confirmation)
      this.io.to(roomId).emit('chat:new_message', {
        ...message,
        timestamp: new Date(message.created_at)
      });
      
      // Handle mentions and notifications
      await this.handleMessageMentions(message, roomId);
      
      // Update room's last activity
      await this.updateRoomLastActivity(roomId, message);
      
      // Stop typing indicator for sender
      await this.handleTypingStop(socket, { roomId });
      
      logger.info('Chat message sent', { 
        messageId: message.id, 
        userId, 
        roomId, 
        messageType 
      });
      
    } catch (error) {
      logger.error('Failed to send chat message', error, { 
        userId: socket.userId, 
        roomId: data.roomId 
      });
      socket.emit('chat:error', { message: 'Failed to send message' });
    }
  }
  
  async handleEditMessage(socket, data) {
    try {
      const { messageId, content } = data;
      const userId = socket.userId;
      
      if (!userId || !messageId || !content?.trim()) {
        socket.emit('chat:error', { message: 'Invalid edit data' });
        return;
      }
      
      const result = await chatService.editMessage(userId, messageId, content.trim());
      
      if (!result.success) {
        socket.emit('chat:error', { message: result.error });
        return;
      }
      
      // Get room ID from message to broadcast the edit
      // In a real implementation, you'd get the room ID from the message
      const roomId = data.roomId; // You'd need to pass this or look it up
      
      if (roomId) {
        this.io.to(roomId).emit('chat:message_edited', {
          messageId,
          content: content.trim(),
          editedAt: new Date(),
          editedBy: userId
        });
      }
      
      logger.info('Chat message edited', { messageId, userId });
      
    } catch (error) {
      logger.error('Failed to edit chat message', error, { 
        userId: socket.userId, 
        messageId: data.messageId 
      });
      socket.emit('chat:error', { message: 'Failed to edit message' });
    }
  }
  
  async handleDeleteMessage(socket, data) {
    try {
      const { messageId, roomId } = data;
      const userId = socket.userId;
      
      if (!userId || !messageId) {
        socket.emit('chat:error', { message: 'Invalid delete data' });
        return;
      }
      
      const result = await chatService.deleteMessage(userId, messageId);
      
      if (!result.success) {
        socket.emit('chat:error', { message: result.error });
        return;
      }
      
      if (roomId) {
        this.io.to(roomId).emit('chat:message_deleted', {
          messageId,
          deletedAt: new Date(),
          deletedBy: userId
        });
      }
      
      logger.info('Chat message deleted', { messageId, userId });
      
    } catch (error) {
      logger.error('Failed to delete chat message', error, { 
        userId: socket.userId, 
        messageId: data.messageId 
      });
      socket.emit('chat:error', { message: 'Failed to delete message' });
    }
  }
  
  async handleMessageRead(socket, data) {
    try {
      const { messageId, roomId } = data;
      const userId = socket.userId;
      
      if (!userId || !messageId || !roomId) {
        return;
      }
      
      // Update last seen for the room
      await chatService.updateLastSeen(userId, roomId);
      
      // Notify sender and other room members
      socket.to(roomId).emit('chat:message_read', {
        messageId,
        userId,
        userName: socket.userName,
        readAt: new Date()
      });
      
      logger.debug('Message marked as read', { messageId, userId, roomId });
      
    } catch (error) {
      logger.error('Failed to mark message as read', error, { 
        messageId: data.messageId, 
        userId: socket.userId 
      });
    }
  }
  
  async handleAddReaction(socket, data) {
    try {
      const { messageId, emoji, roomId } = data;
      const userId = socket.userId;
      
      if (!userId || !messageId || !emoji) {
        socket.emit('chat:error', { message: 'Invalid reaction data' });
        return;
      }
      
      const result = await chatService.addReaction(userId, messageId, emoji);
      
      if (!result.success) {
        socket.emit('chat:error', { message: result.error });
        return;
      }
      
      if (roomId) {
        this.io.to(roomId).emit('chat:reaction_added', {
          messageId,
          emoji,
          userId,
          userName: socket.userName,
          addedAt: new Date()
        });
      }
      
      logger.debug('Reaction added', { messageId, emoji, userId });
      
    } catch (error) {
      logger.error('Failed to add reaction', error, { 
        messageId: data.messageId, 
        userId: socket.userId 
      });
      socket.emit('chat:error', { message: 'Failed to add reaction' });
    }
  }
  
  async handleRemoveReaction(socket, data) {
    try {
      const { messageId, emoji, roomId } = data;
      const userId = socket.userId;
      
      if (!userId || !messageId || !emoji) {
        return;
      }
      
      const result = await chatService.removeReaction(userId, messageId, emoji);
      
      if (result.success && roomId) {
        this.io.to(roomId).emit('chat:reaction_removed', {
          messageId,
          emoji,
          userId,
          userName: socket.userName,
          removedAt: new Date()
        });
      }
      
      logger.debug('Reaction removed', { messageId, emoji, userId });
      
    } catch (error) {
      logger.error('Failed to remove reaction', error, { 
        messageId: data.messageId, 
        userId: socket.userId 
      });
    }
  }
  
  async handleTypingStart(socket, data) {
    try {
      const { roomId } = data;
      const userId = socket.userId;
      const userName = socket.userName;
      
      if (!userId || !roomId) {
        return;
      }
      
      // Update database typing status
      await chatService.setTyping(userId, roomId, true);
      
      // Update local typing tracking
      if (!this.typingUsers.has(roomId)) {
        this.typingUsers.set(roomId, new Set());
      }
      this.typingUsers.get(roomId).add(userId);
      
      // Cache typing status with expiration
      const typingKey = `chat:typing:${roomId}:${userId}`;
      await cacheService.set(typingKey, { 
        userId, 
        userName, 
        startedAt: Date.now() 
      }, 10); // 10 seconds
      
      // Notify other users in room
      socket.to(roomId).emit('chat:user_typing', {
        userId,
        userName,
        isTyping: true,
        startedAt: new Date()
      });
      
      // Auto-stop typing after 5 seconds
      setTimeout(() => {
        this.handleTypingStop(socket, { roomId });
      }, 5000);
      
    } catch (error) {
      logger.error('Failed to handle typing start', error, { 
        userId: socket.userId, 
        roomId: data.roomId 
      });
    }
  }
  
  async handleTypingStop(socket, data) {
    try {
      const { roomId } = data;
      const userId = socket.userId;
      const userName = socket.userName;
      
      if (!userId || !roomId) {
        return;
      }
      
      // Update database
      await chatService.setTyping(userId, roomId, false);
      
      // Update local tracking
      if (this.typingUsers.has(roomId)) {
        this.typingUsers.get(roomId).delete(userId);
        if (this.typingUsers.get(roomId).size === 0) {
          this.typingUsers.delete(roomId);
        }
      }
      
      // Remove from cache
      const typingKey = `chat:typing:${roomId}:${userId}`;
      await cacheService.del(typingKey);
      
      // Notify other users in room
      socket.to(roomId).emit('chat:user_typing', {
        userId,
        userName,
        isTyping: false,
        stoppedAt: new Date()
      });
      
    } catch (error) {
      logger.error('Failed to handle typing stop', error, { 
        userId: socket.userId, 
        roomId: data.roomId 
      });
    }
  }
  
  async handleFileShare(socket, data) {
    try {
      const { roomId, fileData } = data;
      const userId = socket.userId;
      
      if (!userId || !roomId || !fileData) {
        socket.emit('chat:error', { message: 'Invalid file share data' });
        return;
      }
      
      // Send file message
      const messageData = {
        content: `Shared file: ${fileData.originalName}`,
        messageType: 'file',
        metadata: {
          fileInfo: fileData
        }
      };
      
      await this.handleSendMessage(socket, { roomId, ...messageData });
      
    } catch (error) {
      logger.error('Failed to handle file share', error, { 
        userId: socket.userId, 
        roomId: data.roomId 
      });
      socket.emit('chat:error', { message: 'Failed to share file' });
    }
  }
  
  async handleStatusUpdate(socket, data) {
    try {
      const { status } = data;
      const userId = socket.userId;
      
      if (!userId || !['online', 'away', 'busy', 'invisible'].includes(status)) {
        return;
      }
      
      // Update user status
      if (this.activeUsers.has(userId)) {
        this.activeUsers.get(userId).status = status;
        this.activeUsers.get(userId).lastSeen = new Date();
      }
      
      // Update cache
      await cacheService.set(`chat:user_status:${userId}`, { 
        status, 
        lastSeen: new Date() 
      }, 3600);
      
      // Notify contacts about status change
      await this.notifyUserStatusChange(userId, status);
      
      logger.debug('User status updated', { userId, status });
      
    } catch (error) {
      logger.error('Failed to update user status', error, { 
        userId: socket.userId 
      });
    }
  }
  
  async handleGetHistory(socket, data) {
    try {
      const { roomId, limit = 50, offset = 0 } = data;
      const userId = socket.userId;
      
      if (!userId || !roomId) {
        socket.emit('chat:error', { message: 'Invalid history request' });
        return;
      }
      
      const result = await chatService.getMessages(roomId, userId, limit, offset);
      
      if (!result.success) {
        socket.emit('chat:error', { message: result.error });
        return;
      }
      
      socket.emit('chat:history', {
        roomId,
        messages: result.messages,
        hasMore: result.messages.length === limit,
        offset: offset + result.messages.length
      });
      
    } catch (error) {
      logger.error('Failed to get chat history', error, { 
        userId: socket.userId, 
        roomId: data.roomId 
      });
      socket.emit('chat:error', { message: 'Failed to load chat history' });
    }
  }
  
  async handleGetOnlineUsers(socket, data) {
    try {
      const { roomId } = data;
      const userId = socket.userId;
      
      if (!userId) {
        return;
      }
      
      let onlineUsers = [];
      
      if (roomId) {
        // Get online users in specific room
        const roomUserIds = this.roomUsers.get(roomId) || new Set();
        onlineUsers = Array.from(roomUserIds)
          .map(uid => this.activeUsers.get(uid))
          .filter(user => user && user.status !== 'invisible')
          .map(user => ({
            userId: user.userId,
            userName: user.userName,
            status: user.status,
            lastSeen: user.lastSeen
          }));
      } else {
        // Get all online users visible to this user
        onlineUsers = Array.from(this.activeUsers.values())
          .filter(user => user.status !== 'invisible')
          .map(user => ({
            userId: user.userId,
            userName: user.userName,
            status: user.status,
            lastSeen: user.lastSeen
          }));
      }
      
      socket.emit('chat:online_users', {
        roomId,
        users: onlineUsers,
        timestamp: new Date()
      });
      
    } catch (error) {
      logger.error('Failed to get online users', error, { 
        userId: socket.userId 
      });
    }
  }
  
  async handleGetRooms(socket, data) {
    try {
      const userId = socket.userId;
      
      if (!userId) {
        socket.emit('chat:error', { message: 'Authentication required' });
        return;
      }
      
      const result = await chatService.getRooms(userId);
      
      if (!result.success) {
        socket.emit('chat:error', { message: result.error });
        return;
      }
      
      socket.emit('chat:rooms_list', {
        rooms: result.rooms,
        timestamp: new Date()
      });
      
    } catch (error) {
      logger.error('Failed to get rooms list', error, { 
        userId: socket.userId 
      });
      socket.emit('chat:error', { message: 'Failed to load rooms' });
    }
  }
  
  async handleCreateRoom(socket, data) {
    try {
      const { name, type, bookingId, members = [] } = data;
      const userId = socket.userId;
      
      if (!userId || !name) {
        socket.emit('chat:error', { message: 'Invalid room data' });
        return;
      }
      
      const result = await chatService.createRoom(userId, {
        name,
        type,
        bookingId
      });
      
      if (!result.success) {
        socket.emit('chat:error', { message: result.error });
        return;
      }
      
      const room = result.room;
      
      // Auto-join creator to room
      await this.handleJoinRoom(socket, { roomId: room.id });
      
      // Invite members if specified
      for (const memberId of members) {
        await chatService.joinRoom(memberId, room.id);
        
        // Notify member if online
        const memberSocket = this.getUserSocket(memberId);
        if (memberSocket) {
          memberSocket.emit('chat:room_invitation', {
            room,
            invitedBy: {
              userId,
              userName: socket.userName
            },
            invitedAt: new Date()
          });
        }
      }
      
      socket.emit('chat:room_created', {
        room,
        createdAt: new Date()
      });
      
      logger.info('Chat room created', { 
        roomId: room.id, 
        name, 
        type, 
        createdBy: userId 
      });
      
    } catch (error) {
      logger.error('Failed to create chat room', error, { 
        userId: socket.userId 
      });
      socket.emit('chat:error', { message: 'Failed to create room' });
    }
  }
  
  handleUserDisconnect(socket) {
    try {
      const userId = socket.userId;
      
      if (!userId) {
        return;
      }
      
      // Update user status
      if (this.activeUsers.has(userId)) {
        this.activeUsers.get(userId).status = 'offline';
        this.activeUsers.get(userId).lastSeen = new Date();
      }
      
      // Stop all typing indicators
      const userRooms = this.userRooms.get(userId) || new Set();
      for (const roomId of userRooms) {
        this.handleTypingStop(socket, { roomId });
      }
      
      // Notify rooms about user going offline
      for (const roomId of userRooms) {
        socket.to(roomId).emit('chat:user_offline', {
          userId,
          userName: socket.userName,
          lastSeen: new Date()
        });
      }
      
      // Clean up after delay (user might reconnect quickly)
      setTimeout(() => {
        this.cleanupDisconnectedUser(userId);
      }, 30000); // 30 seconds
      
      logger.info('User disconnected from chat', { 
        userId, 
        socketId: socket.id 
      });
      
    } catch (error) {
      logger.error('Failed to handle user disconnect', error, { 
        socketId: socket.id 
      });
    }
  }
  
  cleanupDisconnectedUser(userId) {
    try {
      // Only cleanup if user hasn't reconnected
      const user = this.activeUsers.get(userId);
      if (!user || user.status === 'offline') {
        // Remove from active users
        this.activeUsers.delete(userId);
        
        // Clean up room memberships
        const userRoomSet = this.userRooms.get(userId);
        if (userRoomSet) {
          for (const roomId of userRoomSet) {
            const roomUserSet = this.roomUsers.get(roomId);
            if (roomUserSet) {
              roomUserSet.delete(userId);
              if (roomUserSet.size === 0) {
                this.roomUsers.delete(roomId);
              }
            }
          }
          this.userRooms.delete(userId);
        }
        
        // Clean up typing indicators
        for (const [roomId, typingSet] of this.typingUsers) {
          typingSet.delete(userId);
          if (typingSet.size === 0) {
            this.typingUsers.delete(roomId);
          }
        }
        
        logger.debug('Cleaned up disconnected user', { userId });
      }
    } catch (error) {
      logger.error('Failed to cleanup disconnected user', error, { userId });
    }
  }
  
  setupCleanupInterval() {
    // Clean up expired data every 60 seconds
    setInterval(async () => {
      try {
        // Clean up expired typing indicators
        const now = Date.now();
        for (const [roomId, typingSet] of this.typingUsers.entries()) {
          for (const userId of typingSet) {
            const typingKey = `chat:typing:${roomId}:${userId}`;
            const typingData = await cacheService.get(typingKey);
            
            if (!typingData || (now - typingData.startedAt) > 10000) {
              typingSet.delete(userId);
              await cacheService.del(typingKey);
              
              const user = this.activeUsers.get(userId);
              if (user) {
                this.io.to(roomId).emit('chat:user_typing', {
                  userId,
                  userName: user.userName,
                  isTyping: false,
                  expiredAt: new Date()
                });
              }
            }
          }
          
          if (typingSet.size === 0) {
            this.typingUsers.delete(roomId);
          }
        }
      } catch (error) {
        logger.error('Cleanup interval error', error);
      }
    }, 60000);
  }
  
  // Helper methods
  
  getUserSocket(userId) {
    const user = this.activeUsers.get(userId);
    return user ? this.io.sockets.sockets.get(user.socketId) : null;
  }
  
  async loadUserRooms(socket, userId) {
    try {
      const roomsResult = await chatService.getRooms(userId);
      if (roomsResult.success) {
        for (const room of roomsResult.rooms) {
          socket.join(room.id);
          
          if (!this.userRooms.has(userId)) {
            this.userRooms.set(userId, new Set());
          }
          this.userRooms.get(userId).add(room.id);
          
          if (!this.roomUsers.has(room.id)) {
            this.roomUsers.set(room.id, new Set());
          }
          this.roomUsers.get(room.id).add(userId);
        }
      }
    } catch (error) {
      logger.error('Failed to load user rooms', error, { userId });
    }
  }
  
  async deliverQueuedMessages(userId) {
    try {
      const queuedMessages = this.messageQueue.get(userId) || [];
      
      if (queuedMessages.length > 0) {
        const user = this.activeUsers.get(userId);
        if (user) {
          const socket = this.io.sockets.sockets.get(user.socketId);
          if (socket) {
            for (const message of queuedMessages) {
              socket.emit('chat:queued_message', message);
            }
          }
        }
        
        this.messageQueue.delete(userId);
        logger.info('Delivered queued messages', { userId, count: queuedMessages.length });
      }
    } catch (error) {
      logger.error('Failed to deliver queued messages', error, { userId });
    }
  }
  
  async handleMessageMentions(message, roomId) {
    try {
      const mentions = this.extractMentions(message.content);
      
      for (const mentionedUsername of mentions) {
        // Find user by username (you'd need to implement this lookup)
        const mentionedUserId = await this.getUserIdByUsername(mentionedUsername);
        
        if (mentionedUserId) {
          const mentionedUser = this.activeUsers.get(mentionedUserId);
          
          if (mentionedUser) {
            // Send real-time mention notification
            const socket = this.getUserSocket(mentionedUserId);
            if (socket) {
              socket.emit('chat:mention', {
                message,
                mentionedBy: message.app_users,
                roomId,
                timestamp: new Date()
              });
            }
          } else {
            // Queue mention for offline user
            if (!this.messageQueue.has(mentionedUserId)) {
              this.messageQueue.set(mentionedUserId, []);
            }
            this.messageQueue.get(mentionedUserId).push({
              type: 'mention',
              message,
              roomId,
              timestamp: new Date()
            });
          }
        }
      }
    } catch (error) {
      logger.error('Failed to handle message mentions', error, { messageId: message.id });
    }
  }
  
  async updateRoomLastActivity(roomId, message) {
    try {
      const activityKey = `chat:room_activity:${roomId}`;
      await cacheService.set(activityKey, {
        lastMessage: {
          id: message.id,
          content: message.content.substring(0, 100),
          sender: message.app_users,
          timestamp: message.created_at
        },
        lastActivity: new Date()
      }, 7200); // 2 hours
    } catch (error) {
      logger.error('Failed to update room activity', error, { roomId });
    }
  }
  
  async notifyUserStatusChange(userId, status) {
    try {
      const userRooms = this.userRooms.get(userId) || new Set();
      const user = this.activeUsers.get(userId);
      
      if (!user) return;
      
      for (const roomId of userRooms) {
        this.io.to(roomId).emit('chat:user_status_change', {
          userId,
          userName: user.userName,
          status,
          updatedAt: new Date()
        });
      }
    } catch (error) {
      logger.error('Failed to notify status change', error, { userId, status });
    }
  }
  
  extractMentions(content) {
    const mentionRegex = /@(\w+)/g;
    const mentions = [];
    let match;
    
    while ((match = mentionRegex.exec(content)) !== null) {
      mentions.push(match[1]);
    }
    
    return mentions;
  }
  
  async getUserIdByUsername(username) {
    // This would query your database to find user by username
    // For now, return null - implement based on your user system
    return null;
  }
  
  // Public API methods
  
  getServiceStats() {
    return {
      activeUsers: this.activeUsers.size,
      activeRooms: this.roomUsers.size,
      totalConnections: this.io.engine.clientsCount,
      queuedMessages: Array.from(this.messageQueue.values())
        .reduce((sum, queue) => sum + queue.length, 0),
      typingUsers: Array.from(this.typingUsers.values())
        .reduce((sum, set) => sum + set.size, 0)
    };
  }
  
  async broadcastToRoom(roomId, event, data) {
    this.io.to(roomId).emit(event, data);
  }
  
  async broadcastToUser(userId, event, data) {
    const socket = this.getUserSocket(userId);
    if (socket) {
      socket.emit(event, data);
    } else {
      // Queue for offline user
      if (!this.messageQueue.has(userId)) {
        this.messageQueue.set(userId, []);
      }
      this.messageQueue.get(userId).push({
        type: 'broadcast',
        event,
        data,
        timestamp: new Date()
      });
    }
  }
  
  async healthCheck() {
    try {
      const stats = this.getServiceStats();
      
      return {
        status: 'healthy',
        ...stats,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date()
      };
    }
  }
}

module.exports = RealTimeChatService;