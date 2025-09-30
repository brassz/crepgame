const path = require('path');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { 
    origin: process.env.NODE_ENV === 'production' 
      ? [process.env.FRONTEND_URL || '*'] 
      : '*',
    methods: ['GET', 'POST']
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true
});

// Static files (serve the game)
app.use('/', express.static(path.join(__dirname, 'game')));

// Room configs (must match client)
const ROOM_CONFIGS = {
  bronze: { name: 'BRONZE', min_bet: 50, max_bet: 1000, max_players: 8, banker: true },
  prata: { name: 'PRATA', min_bet: 100, max_bet: 3000, max_players: 8, banker: true },
  ouro: { name: 'OURO', min_bet: 200, max_bet: 5000, max_players: 8, banker: true },
};

// State
const TURN_MS = 25000;
const roomState = {
  bronze: { players: new Set(), order: [], currentIndex: -1, turnEndsAt: null, timer: null, lastRoll: null },
  prata: { players: new Set(), order: [], currentIndex: -1, turnEndsAt: null, timer: null, lastRoll: null },
  ouro: { players: new Set(), order: [], currentIndex: -1, turnEndsAt: null, timer: null, lastRoll: null },
};

function getRoomPlayerCount(room) {
  return roomState[room] ? roomState[room].players.size : 0;
}

io.on('connection', (socket) => {
  console.log('Cliente conectado:', socket.id);
  let currentRoom = null;

  socket.on('join_room', (room) => {
    console.log('Cliente', socket.id, 'tentando entrar na sala:', room);
    if (!ROOM_CONFIGS[room]) {
      console.log('Sala inválida:', room);
      return;
    }
    if (currentRoom) {
      socket.leave(currentRoom);
      roomState[currentRoom].players.delete(socket.id);
      io.to(currentRoom).emit('players_update', getRoomPlayerCount(currentRoom));
    }

    const cfg = ROOM_CONFIGS[room];
    if (getRoomPlayerCount(room) >= cfg.max_players) {
      socket.emit('room_full');
      return;
    }

    currentRoom = room;
    socket.join(room);
    const state = roomState[room];
    state.players.add(socket.id);
    if (!state.order.includes(socket.id)) state.order.push(socket.id);
    socket.emit('room_config', cfg);
    io.to(room).emit('players_update', getRoomPlayerCount(room));

    // start turn cycle if not running
    if (state.currentIndex === -1 && state.order.length > 0){
      startNextTurn(room);
    } else {
      // sync current turn to the newcomer
      emitTurnUpdate(room);
    }

    // send last roll to newcomer (optional)
    if (roomState[room].lastRoll) {
      socket.emit('dice_result', roomState[room].lastRoll);
    }
  });

  // Authoritative roll from server
  socket.on('request_roll', () => {
    if (!currentRoom) return;
    const state = roomState[currentRoom];
    const currentPlayer = state.order[state.currentIndex];
    if (socket.id !== currentPlayer) return; // not your turn
    // check timer
    if (state.turnEndsAt && Date.now() > state.turnEndsAt) return;
    performRoll(currentRoom);
    startNextTurn(currentRoom);
  });

  socket.on('disconnect', () => {
    console.log('Cliente desconectado:', socket.id);
    if (currentRoom) {
      const state = roomState[currentRoom];
      state.players.delete(socket.id);
      const idx = state.order.indexOf(socket.id);
      if (idx !== -1) {
        state.order.splice(idx,1);
        if (idx <= state.currentIndex) state.currentIndex--;
      }
      io.to(currentRoom).emit('players_update', getRoomPlayerCount(currentRoom));
      if (state.order.length === 0){
        clearTimer(currentRoom);
        state.currentIndex = -1;
      } else {
        // if current index out of bounds or current player missing, advance
        const cur = state.order[state.currentIndex];
        if (!cur) startNextTurn(currentRoom);
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
const HOST = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';

server.listen(PORT, HOST, () => {
  console.log(`Server listening on http://${HOST}:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

function performRoll(room){
  const d1 = Math.floor(Math.random() * 6) + 1;
  const d2 = Math.floor(Math.random() * 6) + 1;
  const roll = { d1, d2, ts: Date.now() };
  roomState[room].lastRoll = roll;
  io.to(room).emit('dice_result', roll);
}

function clearTimer(room){
  const state = roomState[room];
  if (state.timer){
    clearInterval(state.timer);
    state.timer = null;
  }
}

function emitTurnUpdate(room){
  const state = roomState[room];
  const playerId = state.order[state.currentIndex] || null;
  io.to(room).emit('turn_update', { playerId, endsAt: state.turnEndsAt });
}

function startNextTurn(room){
  const state = roomState[room];
  if (state.order.length === 0){
    clearTimer(room);
    state.currentIndex = -1;
    state.turnEndsAt = null;
    return;
  }
  state.currentIndex = (state.currentIndex + 1) % state.order.length;
  state.turnEndsAt = Date.now() + TURN_MS;
  emitTurnUpdate(room);
  clearTimer(room);
  state.timer = setInterval(() => {
    const remaining = Math.max(0, Math.ceil((state.turnEndsAt - Date.now())/1000));
    io.to(room).emit('turn_tick', { remaining });
    if (Date.now() >= state.turnEndsAt){
      // auto-roll and advance
      performRoll(room);
      startNextTurn(room);
    }
  }, 1000);
}

