const express = require('express');
const chatController = require('../controllers/chatController');
const { authenticateToken } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const Joi = require('joi');

const router = express.Router();

// Validation schemas
const createRoomSchema = Joi.object({
  name: Joi.string().required().min(1).max(255),
  type: Joi.string().valid('support', 'booking', 'general').default('support'),
  bookingId: Joi.string().uuid().optional()
});

const sendMessageSchema = Joi.object({
  content: Joi.string().required().min(1).max(4000),
  messageType: Joi.string().valid('text', 'image', 'file', 'system').default('text'),
  replyTo: Joi.string().uuid().optional(),
  metadata: Joi.object().optional()
});

const editMessageSchema = Joi.object({
  content: Joi.string().required().min(1).max(4000)
});

const reactionSchema = Joi.object({
  emoji: Joi.string().required().min(1).max(10)
});

const typingSchema = Joi.object({
  isTyping: Joi.boolean().default(true)
});

const roomSettingsSchema = Joi.object({
  allow_file_uploads: Joi.boolean().optional(),
  max_file_size: Joi.number().integer().min(1).max(104857600).optional(), // Max 100MB
  allowed_file_types: Joi.array().items(Joi.string()).optional(),
  message_retention_days: Joi.number().integer().min(1).max(3650).optional(),
  auto_close_after_hours: Joi.number().integer().min(1).max(8760).optional()
});

// Apply authentication to all chat routes
router.use(authenticateToken);

// Room management routes
router.post('/', validate(createRoomSchema), chatController.createRoom);
router.get('/', chatController.getRooms);
router.post('/:roomId/join', chatController.joinRoom);
router.post('/:roomId/leave', chatController.leaveRoom);

// Message routes
router.get('/:roomId/messages', chatController.getMessages);
router.post('/:roomId/messages', validate(sendMessageSchema), chatController.sendMessage);
router.put('/messages/:messageId', validate(editMessageSchema), chatController.editMessage);
router.delete('/messages/:messageId', chatController.deleteMessage);

// Reaction routes
router.post('/messages/:messageId/reactions', validate(reactionSchema), chatController.addReaction);
router.delete('/messages/:messageId/reactions', validate(reactionSchema), chatController.removeReaction);

// Typing status routes
router.post('/:roomId/typing', validate(typingSchema), chatController.setTyping);
router.get('/:roomId/typing', chatController.getTypingUsers);

// Activity routes
router.post('/:roomId/seen', chatController.updateLastSeen);

// Room settings routes
router.get('/:roomId/settings', chatController.getRoomSettings);
router.put('/:roomId/settings', validate(roomSettingsSchema), chatController.updateRoomSettings);

// WebSocket-like endpoints for real-time features
// These will be enhanced when we add WebSocket support
router.get('/:roomId/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  // Send initial connection message
  res.write('data: {"type":"connected","message":"Chat events stream connected"}\n\n');
  
  // Keep connection alive
  const keepAlive = setInterval(() => {
    res.write('data: {"type":"ping"}\n\n');
  }, 30000);
  
  req.on('close', () => {
    clearInterval(keepAlive);
  });
});

module.exports = router;