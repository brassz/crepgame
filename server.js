const path = require('path');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
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
  let currentRoom = null;

  socket.on('join_room', (room) => {
    if (!ROOM_CONFIGS[room]) return;
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
    
    const playerIndex = state.order.indexOf(socket.id) + 1;
    const playerName = `Jogador ${playerIndex}`;
    
    socket.emit('room_config', cfg);
    io.to(room).emit('players_update', getRoomPlayerCount(room));
    
    // Notify all players that someone joined
    io.to(room).emit('player_joined', { 
      playerName: playerName,
      playerCount: getRoomPlayerCount(room),
      maxPlayers: cfg.max_players
    });

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
    
    // Notify all players that this player is rolling
    io.to(currentRoom).emit('player_rolling', { 
      playerId: socket.id, 
      playerName: `Jogador ${state.order.indexOf(socket.id) + 1}` 
    });
    
    performRoll(currentRoom);
    startNextTurn(currentRoom);
  });

  socket.on('disconnect', () => {
    if (currentRoom) {
      const state = roomState[currentRoom];
      const playerIndex = state.order.indexOf(socket.id) + 1;
      const playerName = `Jogador ${playerIndex}`;
      
      state.players.delete(socket.id);
      const idx = state.order.indexOf(socket.id);
      if (idx !== -1) {
        state.order.splice(idx,1);
        if (idx <= state.currentIndex) state.currentIndex--;
      }
      
      // Notify remaining players
      io.to(currentRoom).emit('players_update', getRoomPlayerCount(currentRoom));
      io.to(currentRoom).emit('player_left', {
        playerName: playerName,
        playerCount: getRoomPlayerCount(currentRoom)
      });
      
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
server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});

function performRoll(room){
  const d1 = Math.floor(Math.random() * 6) + 1;
  const d2 = Math.floor(Math.random() * 6) + 1;
  const state = roomState[room];
  const currentPlayerId = state.order[state.currentIndex];
  const playerIndex = state.order.indexOf(currentPlayerId);
  
  const roll = { 
    d1, 
    d2, 
    ts: Date.now(), 
    playerId: currentPlayerId,
    playerName: `Jogador ${playerIndex + 1}`,
    total: d1 + d2
  };
  
  roomState[room].lastRoll = roll;
  
  // Send roll result to all players with player info
  io.to(room).emit('dice_result', roll);
  
  // Also send a message about who rolled
  io.to(room).emit('player_rolled', {
    playerName: roll.playerName,
    result: `${d1} + ${d2} = ${roll.total}`
  });
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
  const turnData = { playerId, endsAt: state.turnEndsAt };
  
  // Send turn update to all players in room
  io.to(room).emit('turn_update', turnData);
  
  // Send specific "your turn" message to the current player
  if (playerId) {
    io.to(playerId).emit('your_turn', { message: 'AGORA É SUA VEZ!' });
  }
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

