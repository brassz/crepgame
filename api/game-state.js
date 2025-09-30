// Vercel Function para gerenciar estado do jogo multiplayer
let gameState = {
  rooms: {
    bronze: { 
      players: [], 
      currentPlayerIndex: -1, 
      turnEndsAt: null, 
      lastRoll: null,
      config: { name: 'BRONZE', min_bet: 50, max_bet: 1000, max_players: 8 }
    },
    prata: { 
      players: [], 
      currentPlayerIndex: -1, 
      turnEndsAt: null, 
      lastRoll: null,
      config: { name: 'PRATA', min_bet: 100, max_bet: 3000, max_players: 8 }
    },
    ouro: { 
      players: [], 
      currentPlayerIndex: -1, 
      turnEndsAt: null, 
      lastRoll: null,
      config: { name: 'OURO', min_bet: 200, max_bet: 5000, max_players: 8 }
    }
  }
};

const TURN_DURATION = 25000; // 25 segundos

function cleanupExpiredPlayers() {
  const now = Date.now();
  Object.keys(gameState.rooms).forEach(roomId => {
    const room = gameState.rooms[roomId];
    // Remove players inactive for more than 60 seconds
    room.players = room.players.filter(player => 
      now - player.lastSeen < 60000
    );
    
    // Reset turn if current player is gone
    if (room.currentPlayerIndex >= room.players.length) {
      room.currentPlayerIndex = -1;
    }
  });
}

function startNextTurn(room) {
  if (room.players.length === 0) {
    room.currentPlayerIndex = -1;
    room.turnEndsAt = null;
    return;
  }
  
  room.currentPlayerIndex = (room.currentPlayerIndex + 1) % room.players.length;
  room.turnEndsAt = Date.now() + TURN_DURATION;
}

function performRoll(room) {
  const d1 = Math.floor(Math.random() * 6) + 1;
  const d2 = Math.floor(Math.random() * 6) + 1;
  room.lastRoll = { d1, d2, timestamp: Date.now() };
  return room.lastRoll;
}

export default function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  cleanupExpiredPlayers();

  const { method } = req;
  const { action, room: roomId, playerId } = req.method === 'GET' ? req.query : req.body;

  if (!roomId || !gameState.rooms[roomId]) {
    return res.status(400).json({ error: 'Invalid room' });
  }

  const room = gameState.rooms[roomId];

  switch (action) {
    case 'join':
      // Add or update player
      let player = room.players.find(p => p.id === playerId);
      if (!player) {
        if (room.players.length >= room.config.max_players) {
          return res.status(400).json({ error: 'Room full' });
        }
        player = { id: playerId, lastSeen: Date.now() };
        room.players.push(player);
        
        // Start first turn if this is the first player
        if (room.players.length === 1 && room.currentPlayerIndex === -1) {
          startNextTurn(room);
        }
      } else {
        player.lastSeen = Date.now();
      }
      
      return res.json({
        success: true,
        roomConfig: room.config,
        playerCount: room.players.length
      });

    case 'get_state':
      // Update player's last seen
      const existingPlayer = room.players.find(p => p.id === playerId);
      if (existingPlayer) {
        existingPlayer.lastSeen = Date.now();
      }

      // Check if turn expired
      if (room.turnEndsAt && Date.now() > room.turnEndsAt) {
        performRoll(room);
        startNextTurn(room);
      }

      const currentPlayer = room.players[room.currentPlayerIndex];
      const timeRemaining = room.turnEndsAt ? Math.max(0, Math.ceil((room.turnEndsAt - Date.now()) / 1000)) : 0;

      return res.json({
        playerCount: room.players.length,
        currentPlayer: currentPlayer ? currentPlayer.id : null,
        isMyTurn: currentPlayer && currentPlayer.id === playerId,
        timeRemaining,
        lastRoll: room.lastRoll
      });

    case 'roll':
      const rollingPlayer = room.players[room.currentPlayerIndex];
      if (!rollingPlayer || rollingPlayer.id !== playerId) {
        return res.status(400).json({ error: 'Not your turn' });
      }

      if (room.turnEndsAt && Date.now() > room.turnEndsAt) {
        return res.status(400).json({ error: 'Turn expired' });
      }

      const roll = performRoll(room);
      startNextTurn(room);

      return res.json({
        success: true,
        roll,
        nextPlayer: room.players[room.currentPlayerIndex]?.id || null
      });

    case 'leave':
      room.players = room.players.filter(p => p.id !== playerId);
      if (room.currentPlayerIndex >= room.players.length) {
        room.currentPlayerIndex = room.players.length > 0 ? 0 : -1;
        if (room.players.length > 0) {
          room.turnEndsAt = Date.now() + TURN_DURATION;
        } else {
          room.turnEndsAt = null;
        }
      }
      
      return res.json({ success: true });

    default:
      return res.status(400).json({ error: 'Invalid action' });
  }
}