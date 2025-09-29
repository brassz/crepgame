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
const roomState = {
  bronze: { players: new Set(), lastRoll: null },
  prata: { players: new Set(), lastRoll: null },
  ouro: { players: new Set(), lastRoll: null },
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
    roomState[room].players.add(socket.id);
    socket.emit('room_config', cfg);
    io.to(room).emit('players_update', getRoomPlayerCount(room));

    // send last roll to newcomer (optional)
    if (roomState[room].lastRoll) {
      socket.emit('dice_result', roomState[room].lastRoll);
    }
  });

  // Authoritative roll from server
  socket.on('request_roll', () => {
    if (!currentRoom) return;
    // Simple random dice
    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;
    const roll = { d1, d2, ts: Date.now() };
    roomState[currentRoom].lastRoll = roll;
    io.to(currentRoom).emit('dice_result', roll);
  });

  socket.on('disconnect', () => {
    if (currentRoom) {
      roomState[currentRoom].players.delete(socket.id);
      io.to(currentRoom).emit('players_update', getRoomPlayerCount(currentRoom));
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});

