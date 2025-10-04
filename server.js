const path = require('path');
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = createServer(app);

// Configure CORS
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-domain.com'] 
    : ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
}));

// Socket.IO setup with CORS
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? ['https://your-domain.com'] 
      : ['http://localhost:3000', 'http://127.0.0.1:3000'],
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Static files (serve the game)
app.use('/', express.static(path.join(__dirname, 'game')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Craps game server running with Supabase Realtime + Socket.IO',
    socketio: true,
    supabase: true,
    timestamp: new Date().toISOString()
  });
});

// Socket.IO connection handling
const connectedUsers = new Map();
const roomUsers = new Map();
const roomChats = new Map();

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);
  
  // Handle user authentication and identification
  socket.on('authenticate', (userData) => {
    try {
      const { userId, username, roomId } = userData;
      
      // Store user info
      connectedUsers.set(socket.id, {
        userId,
        username,
        roomId,
        connectedAt: new Date(),
        lastActivity: new Date()
      });
      
      console.log(`User authenticated: ${username} (${userId}) in room ${roomId}`);
      
      // Join the room
      if (roomId) {
        socket.join(`room_${roomId}`);
        
        // Update room users
        if (!roomUsers.has(roomId)) {
          roomUsers.set(roomId, new Set());
        }
        roomUsers.get(roomId).add(socket.id);
        
        // Notify room about new user
        socket.to(`room_${roomId}`).emit('user_joined', {
          userId,
          username,
          timestamp: new Date().toISOString()
        });
        
        // Send current room users to the new user
        const currentUsers = Array.from(roomUsers.get(roomId))
          .map(socketId => connectedUsers.get(socketId))
          .filter(user => user && user.userId !== userId)
          .map(user => ({
            userId: user.userId,
            username: user.username
          }));
        
        socket.emit('room_users', currentUsers);
        
        // Send recent chat messages
        const recentMessages = roomChats.get(roomId) || [];
        socket.emit('chat_history', recentMessages.slice(-20)); // Last 20 messages
      }
      
      socket.emit('authenticated', { success: true });
      
    } catch (error) {
      console.error('Authentication error:', error);
      socket.emit('authenticated', { success: false, error: error.message });
    }
  });
  
  // Handle chat messages
  socket.on('chat_message', (messageData) => {
    try {
      const user = connectedUsers.get(socket.id);
      if (!user) {
        socket.emit('error', { message: 'User not authenticated' });
        return;
      }
      
      const message = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: user.userId,
        username: user.username,
        message: messageData.message,
        timestamp: new Date().toISOString(),
        roomId: user.roomId
      };
      
      // Store message in room chat history
      if (!roomChats.has(user.roomId)) {
        roomChats.set(user.roomId, []);
      }
      const roomMessages = roomChats.get(user.roomId);
      roomMessages.push(message);
      
      // Keep only last 100 messages per room
      if (roomMessages.length > 100) {
        roomMessages.splice(0, roomMessages.length - 100);
      }
      
      // Broadcast message to room
      io.to(`room_${user.roomId}`).emit('chat_message', message);
      
      console.log(`Chat message in room ${user.roomId}: ${user.username}: ${messageData.message}`);
      
    } catch (error) {
      console.error('Chat message error:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });
  
  // Handle typing indicators
  socket.on('typing_start', () => {
    const user = connectedUsers.get(socket.id);
    if (user) {
      socket.to(`room_${user.roomId}`).emit('user_typing', {
        userId: user.userId,
        username: user.username
      });
    }
  });
  
  socket.on('typing_stop', () => {
    const user = connectedUsers.get(socket.id);
    if (user) {
      socket.to(`room_${user.roomId}`).emit('user_stopped_typing', {
        userId: user.userId,
        username: user.username
      });
    }
  });
  
  // Handle room notifications (complementing Supabase events)
  socket.on('notify_room', (notificationData) => {
    const user = connectedUsers.get(socket.id);
    if (user) {
      const notification = {
        ...notificationData,
        fromUserId: user.userId,
        fromUsername: user.username,
        timestamp: new Date().toISOString()
      };
      
      socket.to(`room_${user.roomId}`).emit('room_notification', notification);
    }
  });
  
  // Handle lobby events
  socket.on('join_lobby', () => {
    socket.join('lobby');
    
    // Send lobby stats
    const lobbyStats = {
      totalConnected: connectedUsers.size,
      roomStats: {}
    };
    
    // Calculate room statistics
    for (const [roomId, users] of roomUsers.entries()) {
      lobbyStats.roomStats[roomId] = {
        playerCount: users.size,
        lastActivity: new Date().toISOString()
      };
    }
    
    socket.emit('lobby_stats', lobbyStats);
  });
  
  socket.on('leave_lobby', () => {
    socket.leave('lobby');
  });
  
  // Handle activity updates
  socket.on('activity', () => {
    const user = connectedUsers.get(socket.id);
    if (user) {
      user.lastActivity = new Date();
    }
  });
  
  // Handle disconnection
  socket.on('disconnect', (reason) => {
    console.log(`Socket disconnected: ${socket.id} (${reason})`);
    
    const user = connectedUsers.get(socket.id);
    if (user) {
      // Remove from room users
      if (user.roomId && roomUsers.has(user.roomId)) {
        roomUsers.get(user.roomId).delete(socket.id);
        
        // Clean up empty room
        if (roomUsers.get(user.roomId).size === 0) {
          roomUsers.delete(user.roomId);
          roomChats.delete(user.roomId); // Clean up old chat history
        } else {
          // Notify room about user leaving
          socket.to(`room_${user.roomId}`).emit('user_left', {
            userId: user.userId,
            username: user.username,
            timestamp: new Date().toISOString()
          });
        }
      }
      
      // Update lobby stats
      io.to('lobby').emit('lobby_stats', {
        totalConnected: connectedUsers.size - 1,
        roomStats: Object.fromEntries(
          Array.from(roomUsers.entries()).map(([roomId, users]) => [
            roomId,
            {
              playerCount: users.size,
              lastActivity: new Date().toISOString()
            }
          ])
        )
      });
    }
    
    // Remove user from connected users
    connectedUsers.delete(socket.id);
  });
  
  // Handle errors
  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
});

// Periodic cleanup of inactive connections
setInterval(() => {
  const now = new Date();
  const timeout = 30 * 60 * 1000; // 30 minutes
  
  for (const [socketId, user] of connectedUsers.entries()) {
    if (now - user.lastActivity > timeout) {
      console.log(`Cleaning up inactive user: ${user.username}`);
      const socket = io.sockets.sockets.get(socketId);
      if (socket) {
        socket.disconnect(true);
      }
    }
  }
}, 5 * 60 * 1000); // Check every 5 minutes

// Periodic lobby stats broadcast
setInterval(() => {
  const lobbyStats = {
    totalConnected: connectedUsers.size,
    roomStats: Object.fromEntries(
      Array.from(roomUsers.entries()).map(([roomId, users]) => [
        roomId,
        {
          playerCount: users.size,
          lastActivity: new Date().toISOString()
        }
      ])
    )
  };
  
  io.to('lobby').emit('lobby_stats', lobbyStats);
}, 30000); // Every 30 seconds

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
  console.log('✅ Supabase Realtime: Game state & persistence');
  console.log('✅ Socket.IO: Chat, notifications & lobby');
  console.log('🎮 Hybrid multiplayer system ready!');
});

