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

// Socket.IO setup with CORS - FORCE WEBSOCKET ONLY FOR ZERO DELAY
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? ['https://your-domain.com'] 
      : ['http://localhost:3000', 'http://127.0.0.1:3000'],
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket'],
  allowUpgrades: false
});

// Static files (serve the game)
app.use('/', express.static(path.join(__dirname, 'game')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Craps game server running with Pure Socket.IO',
    socketio: true,
    supabase: false,
    timestamp: new Date().toISOString()
  });
});

// Socket.IO connection handling
const connectedUsers = new Map();
const roomUsers = new Map();
const roomChats = new Map();

// Game state management
const gameRooms = new Map();

// Game state structure for each room
function createGameState(roomId) {
  return {
    roomId,
    players: new Map(),
    gameState: 'WAITING', // WAITING, BETTING, ROLLING, ENDED
    currentShooter: null,
    point: null,
    lastRoll: null,
    bets: new Map(),
    history: [],
    createdAt: new Date()
  };
}

io.on('connection', (socket) => {
  console.log(`Socket conectado: ${socket.id}`);
  
  // Handle user authentication and identification
  socket.on('authenticate', (userData) => {
    try {
      const { userId, username, roomId, credit } = userData;
      
      // Store user info
      connectedUsers.set(socket.id, {
        userId,
        username,
        roomId,
        connectedAt: new Date(),
        lastActivity: new Date()
      });
      
      console.log(`Usuário autenticado: ${username} (${userId}) na sala ${roomId}`);
      
      // Join the room
      if (roomId) {
        socket.join(`room_${roomId}`);
        
        // Initialize game state for room if needed
        if (!gameRooms.has(roomId)) {
          gameRooms.set(roomId, createGameState(roomId));
        }
        
        const gameState = gameRooms.get(roomId);
        
        // Add player to game
        gameState.players.set(userId, {
          userId,
          username,
          socketId: socket.id,
          credit: credit || 1000,
          currentBet: 0,
          isShooter: false,
          joinedAt: new Date()
        });
        
        // Set first player as shooter if no shooter exists
        if (!gameState.currentShooter && gameState.players.size === 1) {
          gameState.currentShooter = userId;
          gameState.players.get(userId).isShooter = true;
        }
        
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
        
        // Send current game state to the new user
        socket.emit('game_state', {
          gameState: gameState.gameState,
          players: Array.from(gameState.players.values()),
          currentShooter: gameState.currentShooter,
          point: gameState.point,
          lastRoll: gameState.lastRoll,
          history: gameState.history.slice(-10)
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
        
        // Notify others about updated player list
        io.to(`room_${roomId}`).emit('players_updated', {
          players: Array.from(gameState.players.values())
        });
      }
      
      socket.emit('authenticated', { success: true });
      
    } catch (error) {
      console.error('Erro de autenticação:', error);
      socket.emit('authenticated', { success: false, error: error.message });
    }
  });
  
  // Handle dice roll - OPTIMIZED FOR ZERO LATENCY
  socket.on('roll_dice', (data) => {
    try {
      const user = connectedUsers.get(socket.id);
      if (!user) {
        socket.emit('error', { message: 'Usuário não autenticado' });
        return;
      }
      
      const roomId = user.roomId;
      const gameState = gameRooms.get(roomId);
      
      if (!gameState) {
        socket.emit('error', { message: 'Sala de jogo não encontrada' });
        return;
      }
      
      // ===== STEP 1: GET DICE VALUES FROM CLIENT (generated locally for instant animation) =====
      const dice1 = data.dice1 || Math.floor(Math.random() * 6) + 1;
      const dice2 = data.dice2 || Math.floor(Math.random() * 6) + 1;
      
      console.log(`🎲 Dados recebidos do lançador: ${dice1} + ${dice2}`);
      
      // ===== STEP 2: BROADCAST TO OTHER PLAYERS ONLY (NOT back to shooter) =====
      // Shooter already started animation locally, so only notify observers
      const instantRollData = {
        dice1,
        dice2,
        shooter: user.userId,
        shooterName: user.username
      };
      
      // FIRST: Broadcast dice_roll_start to OTHER players so they start animation IMMEDIATELY
      socket.to(`room_${roomId}`).emit('dice_roll_start', instantRollData);
      console.log(`⚡ Transmitindo dice_roll_start para OUTROS jogadores na sala ${roomId}`);
      
      // THEN: Broadcast dice_rolled with the result (for finishing animation)
      socket.to(`room_${roomId}`).emit('dice_rolled', instantRollData);
      console.log(`📡 Transmitindo dice_rolled para OUTROS jogadores na sala ${roomId} - Dados ${dice1} + ${dice2}`);
      
      // ===== STEP 3: VALIDATE AND PROCESS GAME LOGIC (ASYNC, NON-BLOCKING) =====
      // Do this AFTER broadcasting so it doesn't delay the event
      setImmediate(() => {
        try {
          const player = gameState.players.get(user.userId);
          if (!player) {
            console.warn('Jogador não encontrado após lançamento dos dados');
            return;
          }
          
          // Validate shooter (log warning but don't block)
          if (gameState.currentShooter !== user.userId) {
            console.warn(`Não-lançador ${user.userId} lançou dados na sala ${roomId}`);
          }
          
          // Validate bet (log warning but don't block)
          if (player.currentBet <= 0) {
            console.warn(`Jogador ${user.userId} lançou sem apostar na sala ${roomId}`);
          }
          
          const total = dice1 + dice2;
          
          const rollData = {
            dice1,
            dice2,
            total,
            shooter: user.userId,
            shooterName: user.username,
            timestamp: new Date().toISOString(),
            point: gameState.point
          };
          
          // Update last roll
          gameState.lastRoll = rollData;
          gameState.history.push(rollData);
          
          // Keep only last 50 rolls in history
          if (gameState.history.length > 50) {
            gameState.history.shift();
          }
          
          console.log(`🎮 Lógica do jogo processada: ${dice1} + ${dice2} = ${total}`);
          
          // Determine game logic
          if (!gameState.point) {
            // Come out roll
            if (total === 7 || total === 11) {
              // Natural win
              io.to(`room_${roomId}`).emit('game_result', {
                type: 'natural_win',
                total,
                message: `Natural ${total}! Lançador vence!`
              });
              // Reset for next round
              gameState.point = null;
            } else if (total === 2 || total === 3 || total === 12) {
              // Craps
              io.to(`room_${roomId}`).emit('game_result', {
                type: 'craps',
                total,
                message: `Craps! Lançador perde!`
              });
              // Pass dice to next player
              passShooter(roomId);
            } else {
              // Establish point
              gameState.point = total;
              io.to(`room_${roomId}`).emit('point_established', {
                point: total,
                message: `Ponto é ${total}`,
                shooter: gameState.currentShooter // Incluir quem é o shooter
              });
            }
          } else {
            // Point has been established
            if (total === gameState.point) {
              // Made the point
              io.to(`room_${roomId}`).emit('game_result', {
                type: 'point_made',
                total,
                point: gameState.point,
                message: `Ponto ${gameState.point} feito! Lançador vence!`
              });
              gameState.point = null;
            } else if (total === 7) {
              // Seven out
              io.to(`room_${roomId}`).emit('game_result', {
                type: 'seven_out',
                total,
                message: `Sete fora! Lançador perde!`
              });
              gameState.point = null;
              passShooter(roomId);
            }
          }
          
          // Update game state
          gameState.gameState = gameState.point ? 'POINT' : 'COMEOUT';
          
          // Broadcast updated game state
          io.to(`room_${roomId}`).emit('game_state_updated', {
            gameState: gameState.gameState,
            point: gameState.point,
            currentShooter: gameState.currentShooter
          });
          
        } catch (error) {
          console.error('Erro ao processar lógica do jogo:', error);
        }
      });
      
    } catch (error) {
      console.error('Erro ao lançar dados:', error);
      socket.emit('error', { message: 'Falha ao lançar dados' });
    }
  });
  
  // Handle placing bets
  socket.on('place_bet', (betData) => {
    try {
      const user = connectedUsers.get(socket.id);
      if (!user) {
        socket.emit('error', { message: 'Usuário não autenticado' });
        return;
      }
      
      const roomId = user.roomId;
      const gameState = gameRooms.get(roomId);
      
      if (!gameState) {
        socket.emit('error', { message: 'Sala de jogo não encontrada' });
        return;
      }
      
      const player = gameState.players.get(user.userId);
      if (!player) {
        socket.emit('error', { message: 'Jogador não encontrado no jogo' });
        return;
      }
      
      const { betType, amount } = betData;
      
      // Validate bet amount
      if (amount <= 0 || amount > player.credit) {
        socket.emit('error', { message: 'Valor de aposta inválido' });
        return;
      }
      
      // Create bet key
      const betKey = `${user.userId}_${betType}`;
      
      // Get existing bet or create new
      let currentBetAmount = 0;
      if (gameState.bets.has(betKey)) {
        currentBetAmount = gameState.bets.get(betKey).amount;
      }
      
      // Update bet
      const newBetAmount = currentBetAmount + amount;
      
      gameState.bets.set(betKey, {
        userId: user.userId,
        username: user.username,
        betType,
        amount: newBetAmount,
        timestamp: new Date().toISOString()
      });
      
      // Update player credit and current bet
      player.credit -= amount;
      player.currentBet += amount;
      
      // Broadcast bet to room
      io.to(`room_${roomId}`).emit('bet_placed', {
        userId: user.userId,
        username: user.username,
        betType,
        amount: newBetAmount,
        remainingCredit: player.credit
      });
      
      // Send confirmation to player
      socket.emit('bet_confirmed', {
        betType,
        amount: newBetAmount,
        remainingCredit: player.credit,
        totalBet: player.currentBet
      });
      
      console.log(`Aposta feita na sala ${roomId}: ${user.username} apostou ${amount} em ${betType}`);
      
    } catch (error) {
      console.error('Erro ao fazer aposta:', error);
      socket.emit('error', { message: 'Falha ao fazer aposta' });
    }
  });
  
  // Handle clearing bets
  socket.on('clear_bets', () => {
    try {
      const user = connectedUsers.get(socket.id);
      if (!user) {
        socket.emit('error', { message: 'Usuário não autenticado' });
        return;
      }
      
      const roomId = user.roomId;
      const gameState = gameRooms.get(roomId);
      
      if (!gameState) {
        socket.emit('error', { message: 'Sala de jogo não encontrada' });
        return;
      }
      
      const player = gameState.players.get(user.userId);
      if (!player) {
        socket.emit('error', { message: 'Jogador não encontrado no jogo' });
        return;
      }
      
      // Return credit from all bets
      let refundAmount = 0;
      const betsToRemove = [];
      
      for (const [betKey, bet] of gameState.bets.entries()) {
        if (bet.userId === user.userId) {
          refundAmount += bet.amount;
          betsToRemove.push(betKey);
        }
      }
      
      // Remove bets
      betsToRemove.forEach(betKey => gameState.bets.delete(betKey));
      
      // Refund credit
      player.credit += refundAmount;
      player.currentBet = 0;
      
      // Notify player
      socket.emit('bets_cleared', {
        refundAmount,
        remainingCredit: player.credit
      });
      
      // Notify room
      io.to(`room_${roomId}`).emit('player_cleared_bets', {
        userId: user.userId,
        username: user.username
      });
      
      console.log(`Apostas limpas na sala ${roomId}: ${user.username} reembolsado ${refundAmount}`);
      
    } catch (error) {
      console.error('Erro ao limpar apostas:', error);
      socket.emit('error', { message: 'Falha ao limpar apostas' });
    }
  });
  
  // Handle getting game state
  socket.on('get_game_state', () => {
    try {
      const user = connectedUsers.get(socket.id);
      if (!user) {
        socket.emit('error', { message: 'Usuário não autenticado' });
        return;
      }
      
      const roomId = user.roomId;
      const gameState = gameRooms.get(roomId);
      
      if (!gameState) {
        socket.emit('error', { message: 'Sala de jogo não encontrada' });
        return;
      }
      
      socket.emit('game_state', {
        gameState: gameState.gameState,
        players: Array.from(gameState.players.values()),
        currentShooter: gameState.currentShooter,
        point: gameState.point,
        lastRoll: gameState.lastRoll,
        bets: Array.from(gameState.bets.values()),
        history: gameState.history.slice(-10)
      });
      
    } catch (error) {
      console.error('Erro ao obter estado do jogo:', error);
      socket.emit('error', { message: 'Falha ao obter estado do jogo' });
    }
  });
  
  // Helper function to pass shooter to next player
  function passShooter(roomId) {
    const gameState = gameRooms.get(roomId);
    if (!gameState) return;
    
    const playerIds = Array.from(gameState.players.keys());
    if (playerIds.length === 0) return;
    
    const currentIndex = playerIds.indexOf(gameState.currentShooter);
    const nextIndex = (currentIndex + 1) % playerIds.length;
    const nextShooterId = playerIds[nextIndex];
    
    console.log(`🔄 Passing shooter from ${gameState.currentShooter} to ${nextShooterId} in room ${roomId}`);
    
    // Update shooter
    if (gameState.currentShooter) {
      const oldShooter = gameState.players.get(gameState.currentShooter);
      if (oldShooter) oldShooter.isShooter = false;
    }
    
    gameState.currentShooter = nextShooterId;
    const newShooter = gameState.players.get(nextShooterId);
    if (newShooter) newShooter.isShooter = true;
    
    // Notify room - CRITICAL: This enables the roll button for the next player
    io.to(`room_${roomId}`).emit('shooter_changed', {
      newShooter: nextShooterId,
      shooterName: newShooter ? newShooter.username : 'Unknown'
    });
    
    console.log(`✅ Shooter changed event emitted to room ${roomId} - new shooter: ${newShooter ? newShooter.username : 'Unknown'}`);
  }
  
  // Handle manual pass dice request
  socket.on('pass_dice', () => {
    try {
      const user = connectedUsers.get(socket.id);
      if (!user) {
        socket.emit('error', { message: 'Usuário não autenticado' });
        return;
      }
      
      const roomId = user.roomId;
      const gameState = gameRooms.get(roomId);
      
      if (!gameState) {
        socket.emit('error', { message: 'Sala de jogo não encontrada' });
        return;
      }
      
      // Verify it's the current shooter
      if (gameState.currentShooter !== user.userId) {
        socket.emit('error', { message: 'Não é sua vez de lançar!' });
        console.warn(`⚠️ Jogador ${user.username} tentou passar o dado mas não é o lançador`);
        return;
      }
      
      console.log(`🎲 Jogador ${user.username} está passando o dado manualmente na sala ${roomId}`);
      
      // Notify the room that the player passed
      io.to(`room_${roomId}`).emit('player_passed_dice', {
        userId: user.userId,
        username: user.username,
        message: `${user.username} passou o dado!`
      });
      
      // Pass shooter to next player
      passShooter(roomId);
      
      console.log(`✅ Dado passou manualmente de ${user.username} para o próximo jogador`);
      
    } catch (error) {
      console.error('Erro ao passar o dado:', error);
      socket.emit('error', { message: 'Falha ao passar o dado' });
    }
  });
  
  // Handle chat messages
  socket.on('chat_message', (messageData) => {
    try {
      const user = connectedUsers.get(socket.id);
      if (!user) {
        socket.emit('error', { message: 'Usuário não autenticado' });
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
      
      console.log(`Mensagem de chat na sala ${user.roomId}: ${user.username}: ${messageData.message}`);
      
    } catch (error) {
      console.error('Erro de mensagem de chat:', error);
      socket.emit('error', { message: 'Falha ao enviar mensagem' });
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
    console.log(`Socket desconectado: ${socket.id} (${reason})`);
    
    const user = connectedUsers.get(socket.id);
    if (user) {
      // Remove from game state
      if (user.roomId) {
        const gameState = gameRooms.get(user.roomId);
        if (gameState) {
          // Remove player from game
          gameState.players.delete(user.userId);
          
          // If player was shooter, pass to next player
          if (gameState.currentShooter === user.userId) {
            if (gameState.players.size > 0) {
              passShooter(user.roomId);
            } else {
              gameState.currentShooter = null;
            }
          }
          
          // Remove player's bets
          const betsToRemove = [];
          for (const [betKey, bet] of gameState.bets.entries()) {
            if (bet.userId === user.userId) {
              betsToRemove.push(betKey);
            }
          }
          betsToRemove.forEach(betKey => gameState.bets.delete(betKey));
          
          // Clean up empty game room
          if (gameState.players.size === 0) {
            gameRooms.delete(user.roomId);
            console.log(`Sala de jogo ${user.roomId} limpa (vazia)`);
          } else {
            // Notify others about updated player list
            io.to(`room_${user.roomId}`).emit('players_updated', {
              players: Array.from(gameState.players.values())
            });
          }
        }
        
        // Remove from room users
        if (roomUsers.has(user.roomId)) {
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
    console.error('Erro de socket:', error);
  });
});

// Periodic cleanup of inactive connections
setInterval(() => {
  const now = new Date();
  const timeout = 30 * 60 * 1000; // 30 minutes
  
  for (const [socketId, user] of connectedUsers.entries()) {
    if (now - user.lastActivity > timeout) {
      console.log(`Limpando usuário inativo: ${user.username}`);
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
  console.log(`Servidor ouvindo em http://localhost:${PORT}`);
  console.log('✅ Socket.IO Puro: Gerenciamento completo do jogo');
  console.log('🎮 Jogo multiplayer de Craps em tempo real pronto!');
  console.log('📊 Funcionalidades: Lançamento de dados, apostas, chat, lobby');
});

