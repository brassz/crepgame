const path = require('path');
const os = require('os');
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://iwjdwpaulonjrlyvudgo.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3amR3cGF1bG9uanJseXZ1ZGdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxOTgxNzYsImV4cCI6MjA3NDc3NDE3Nn0.IJ8NKn2HTND1JDoQqTTmqomDdf-I3wsxjsIzoSZ-5A4';

const app = express();
const server = createServer(app);

const isProduction = process.env.NODE_ENV === 'production';

/** Em desenvolvimento/LAN: aceita qualquer origem (celular, outro PC na rede) */
const corsOptions = isProduction
  ? {
      origin: ['https://your-domain.com'],
      credentials: true
    }
  : {
      origin: true,
      credentials: true
    };

// Configure CORS
app.use(cors(corsOptions));

// Socket.IO setup with CORS - FORCE WEBSOCKET ONLY FOR ZERO DELAY
const io = new Server(server, {
  cors: {
    ...corsOptions,
    methods: ['GET', 'POST']
  },
  transports: ['websocket'],
  allowUpgrades: false
});

app.use(express.json());

async function verifyAdminId(adminId) {
  if (!adminId || !SUPABASE_URL || !SUPABASE_ANON_KEY) return false;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/painel_verify_admin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({ p_admin_id: adminId })
    });
    if (!res.ok) return false;
    const data = await res.json();
    return data === true;
  } catch (err) {
    console.error('Erro ao verificar admin:', err.message);
    return false;
  }
}

function pushBalanceUpdateToPlayer(userId, balanceAfter) {
  const total = Math.round(parseFloat(balanceAfter) * 100) / 100;
  if (isNaN(total) || total < 0) return 0;

  for (const gameState of gameRooms.values()) {
    const player = gameState.players.get(userId);
    if (player) {
      const curBet = player.currentBet || 0;
      player.credit = Math.max(0, Math.round((total - curBet) * 100) / 100);
    }
  }

  let notified = 0;
  for (const [socketId, user] of connectedUsers.entries()) {
    if (user.userId === userId) {
      io.to(socketId).emit('balance_updated', {
        userId,
        balance: total,
        balanceAfter: total
      });
      notified++;
    }
  }
  return notified;
}

// Desconectar jogadores excluídos no painel (sessão no jogo)
app.post('/api/disconnect-players', async (req, res) => {
  try {
    const { adminId, userIds } = req.body || {};
    if (!adminId || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ success: false, error: 'adminId e userIds são obrigatórios' });
    }

    const isAdmin = await verifyAdminId(adminId);
    if (!isAdmin) {
      return res.status(403).json({ success: false, error: 'Admin não autorizado' });
    }

    const idSet = new Set(userIds.map(String));
    let disconnected = 0;

    for (const [socketId, user] of connectedUsers.entries()) {
      if (user.userId && idSet.has(String(user.userId))) {
        const socket = io.sockets.sockets.get(socketId);
        if (socket) {
          socket.emit('account_deleted', {
            message: 'Seu cadastro foi removido pelo administrador.'
          });
          socket.disconnect(true);
          disconnected++;
        }
      }
    }

    res.json({ success: true, disconnected });
  } catch (err) {
    console.error('Erro em /api/disconnect-players:', err);
    res.status(500).json({ success: false, error: 'Falha ao desconectar jogadores' });
  }
});

// Sincronizar saldo do painel admin → jogador online no jogo
app.post('/api/sync-balance', async (req, res) => {
  try {
    const { adminId, userId, balanceAfter } = req.body || {};
    if (!adminId || !userId || balanceAfter === undefined) {
      return res.status(400).json({ success: false, error: 'adminId, userId e balanceAfter são obrigatórios' });
    }

    const isAdmin = await verifyAdminId(adminId);
    if (!isAdmin) {
      return res.status(403).json({ success: false, error: 'Admin não autorizado' });
    }

    const notified = pushBalanceUpdateToPlayer(userId, balanceAfter);
    console.log(`💰 Saldo sincronizado para ${userId}: ${balanceAfter} (${notified} cliente(s) online)`);
    res.json({ success: true, notified, balanceAfter: parseFloat(balanceAfter) });
  } catch (err) {
    console.error('Erro em /api/sync-balance:', err);
    res.status(500).json({ success: false, error: 'Falha ao sincronizar saldo' });
  }
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

// Polegar - painel de controle (ver tudo e manipular dados)
app.get('/polegar', (req, res) => {
  res.sendFile(path.join(__dirname, 'game', 'polegar.html'));
});

// Painel admin – jogadores, saldos e histórico
app.get('/painel', (req, res) => {
  res.sendFile(path.join(__dirname, 'game', 'painel.html'));
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
    createdAt: new Date(),
    // Controle da FASE PRÉ-ROLAGEM (APOSTAS CONTRA O SHOOTER)
    preRoll: {
      phase: 'IDLE', // IDLE, SHOOTER_BETTING, COVERAGE
      shooterId: null,
      shooterBetAmount: 0,
      coverageRemaining: 0,
      coverageBets: new Map(), // userId -> amount total apostado contra o shooter
      queue: [],              // ordem dos jogadores (sem o shooter)
      currentIndex: -1,
      currentPlayerId: null,
      shooterTimer: null,
      playerTimer: null,
      attemptedPlayers: new Set(), // jogadores que já tiveram sua vez na cobertura
      shooterMayRoll: false // true somente após pre_roll_done nesta rodada de aposta
    }
  };
}

/** Acrescenta ganho do shooter à aposta na mesa (fichas ficam até passar ou perder) */
function addShooterWinToTableBet(gameState, totalMultiplier) {
  const shooterId = gameState.currentShooter;
  if (!shooterId) return;

  const shooterPlayer = gameState.players.get(shooterId);
  if (!shooterPlayer) return;

  const betKey = `${shooterId}_main_bet`;
  const bet = gameState.bets.get(betKey);
  if (!bet || bet.amount <= 0) return;

  const winAmount = bet.amount * (totalMultiplier - 1);
  if (winAmount <= 0) return;

  bet.amount += winAmount;
  shooterPlayer.currentBet += winAmount;

  console.log(`💰 Shooter manteve fichas na mesa: +${winAmount} (total na mesa: ${bet.amount})`);
}

/** Paga cobertura no come-out: quem cobriu recebe o dobro (100x200) no crédito */
function payCoverageBetsDouble(gameState, roomId) {
  if (!gameState || !gameState.preRoll) return [];

  const winners = [];
  const coverageBets = gameState.preRoll.coverageBets || new Map();

  for (const [userId, coveredAmount] of coverageBets.entries()) {
    const amount = Math.round(parseFloat(coveredAmount) * 100) / 100;
    if (!amount || amount <= 0) continue;

    const player = gameState.players.get(userId);
    if (!player) continue;

    const payout = Math.round(amount * 2 * 100) / 100;
    // No servidor o crédito não é debitado ao cobrir — credita só o lucro (1x)
    const profit = amount;
    player.credit = Math.round(((player.credit || 0) + profit) * 100) / 100;
    player.currentBet = Math.max(0, (player.currentBet || 0) - amount);

    // Remover apostas de cobertura do mapa de bets
    for (const [betKey, bet] of gameState.bets.entries()) {
      if (bet.userId === userId && (bet.betType === 'coverage' || bet.betType === 'main_bet')) {
        if (String(userId) !== String(gameState.currentShooter)) {
          gameState.bets.delete(betKey);
        }
      }
    }

    winners.push({
      userId,
      username: player.username,
      covered: amount,
      received: payout,
      credit: player.credit
    });

    console.log(`💰 Cobertura paga 2x para ${player.username}: cobriu ${amount} → recebeu ${payout}`);
  }

  if (winners.length > 0 && roomId) {
    io.to(`room_${roomId}`).emit('coverage_paid', {
      type: 'come_out_seven',
      winners,
      message: 'Saiu 7 no come-out! Quem cobriu recebe o dobro.'
    });
    io.to(`room_${roomId}`).emit('players_updated', {
      players: Array.from(gameState.players.values()),
      currentShooter: gameState.currentShooter,
      point: gameState.point
    });
  }

  return winners;
}

/** Shooter perde a mesa no come-out 7 */
function clearShooterMainBet(gameState) {
  const shooterId = gameState.currentShooter;
  if (!shooterId) return;

  const shooter = gameState.players.get(shooterId);
  if (shooter) {
    shooter.currentBet = 0;
  }

  for (const [betKey, bet] of gameState.bets.entries()) {
    if (bet.userId === shooterId && bet.betType === 'main_bet') {
      gameState.bets.delete(betKey);
    }
  }
}

/** Reinicia fase de cobertura — obriga novo APOSTAR antes de lançar */
function resetPreRollState(gameState) {
  if (!gameState || !gameState.preRoll) return;
  const preRoll = gameState.preRoll;
  if (preRoll.shooterTimer) {
    clearTimeout(preRoll.shooterTimer);
    preRoll.shooterTimer = null;
  }
  if (preRoll.playerTimer) {
    clearTimeout(preRoll.playerTimer);
    preRoll.playerTimer = null;
  }
  preRoll.phase = 'IDLE';
  preRoll.shooterId = null;
  preRoll.shooterBetAmount = 0;
  preRoll.coverageRemaining = 0;
  preRoll.coverageBets = new Map();
  preRoll.queue = [];
  preRoll.currentIndex = -1;
  preRoll.currentPlayerId = null;
  preRoll.attemptedPlayers = new Set();
  preRoll.shooterMayRoll = false;
}

function completePreRollCoverage(roomId) {
  const gameState = gameRooms.get(roomId);
  if (!gameState) return;
  const preRoll = gameState.preRoll;
  if (preRoll.playerTimer) {
    clearTimeout(preRoll.playerTimer);
    preRoll.playerTimer = null;
  }

  const remaining = Math.max(0, Math.round((preRoll.coverageRemaining || 0) * 100) / 100);
  const fullyCovered = remaining <= 0;

  // NUNCA liberar lançamento sem cobertura total
  if (!fullyCovered) {
    console.log(`⛔ Cobertura incompleta na sala ${roomId} (resta ${remaining}) — NÃO liberar lançamento`);
    preRoll.phase = 'COVERAGE';
    preRoll.shooterMayRoll = false;
    io.to(`room_${roomId}`).emit('pre_roll_coverage_incomplete', {
      shooterId: preRoll.shooterId,
      shooterBetAmount: preRoll.shooterBetAmount,
      coverageRemaining: remaining,
      message: `Aguarde a cobertura total! Ainda faltam R$ ${remaining.toFixed(2)}`
    });
    // Continuar pedindo cobertura
    if (preRoll.queue && preRoll.queue.length > 0) {
      advanceCoveragePlayerGlobal(roomId);
    }
    return;
  }

  preRoll.phase = 'IDLE';
  preRoll.shooterMayRoll = true;
  preRoll.currentPlayerId = null;

  io.to(`room_${roomId}`).emit('pre_roll_done', {
    shooterId: preRoll.shooterId,
    shooterBetAmount: preRoll.shooterBetAmount,
    totalCoverage: preRoll.shooterBetAmount,
    coverageRemaining: 0,
    fullyCovered: true
  });

  console.log(`✅ Cobertura COMPLETA na sala ${roomId} — lançamento liberado`);
}

/** Avança fila de cobertura (nível módulo — usado por completePreRollCoverage) */
function advanceCoveragePlayerGlobal(roomId) {
  const gameState = gameRooms.get(roomId);
  if (!gameState || !gameState.preRoll) return;
  const preRoll = gameState.preRoll;

  if ((preRoll.coverageRemaining || 0) <= 0) {
    completePreRollCoverage(roomId);
    return;
  }

  if (!preRoll.queue || preRoll.queue.length === 0) {
    // Sem outros jogadores: não libera lançamento
    preRoll.phase = 'COVERAGE';
    preRoll.shooterMayRoll = false;
    io.to(`room_${roomId}`).emit('pre_roll_coverage_incomplete', {
      shooterId: preRoll.shooterId,
      shooterBetAmount: preRoll.shooterBetAmount,
      coverageRemaining: preRoll.coverageRemaining,
      message: 'Aguarde outros jogadores cobrirem a aposta antes de lançar!'
    });
    console.log(`⛔ Sala ${roomId}: sem jogadores para cobrir — lançamento bloqueado`);
    return;
  }

  if (preRoll.playerTimer) {
    clearTimeout(preRoll.playerTimer);
    preRoll.playerTimer = null;
  }

  preRoll.currentIndex = (preRoll.currentIndex + 1) % preRoll.queue.length;
  const nextPlayerId = preRoll.queue[preRoll.currentIndex];
  preRoll.currentPlayerId = nextPlayerId;
  preRoll.phase = 'COVERAGE';
  preRoll.shooterMayRoll = false;

  const nextPlayer = gameState.players.get(nextPlayerId);
  if (!nextPlayer) {
    preRoll.queue = preRoll.queue.filter(id => id !== nextPlayerId);
    return advanceCoveragePlayerGlobal(roomId);
  }

  const PLAYER_SECONDS = 10;
  console.log(`⏱️ Cobertura sala ${roomId}: vez de ${nextPlayer.username} (${PLAYER_SECONDS}s). Resta: ${preRoll.coverageRemaining}`);

  io.to(`room_${roomId}`).emit('pre_roll_player_turn', {
    playerId: nextPlayer.userId,
    playerName: nextPlayer.username,
    seconds: PLAYER_SECONDS,
    coverageRemaining: preRoll.coverageRemaining
  });

  if (!preRoll.attemptedPlayers) preRoll.attemptedPlayers = new Set();
  preRoll.attemptedPlayers.add(nextPlayerId);

  preRoll.playerTimer = setTimeout(() => {
    try {
      const gs = gameRooms.get(roomId);
      if (!gs || !gs.preRoll) return;
      const pr = gs.preRoll;
      if (pr.phase !== 'COVERAGE') return;
      if ((pr.coverageRemaining || 0) <= 0) {
        completePreRollCoverage(roomId);
        return;
      }
      // Tempo esgotou: passa para o próximo — NÃO libera sem cobertura total
      console.log(`⏭️ Tempo esgotado para ${nextPlayer.username} — continua cobertura (resta ${pr.coverageRemaining})`);
      advanceCoveragePlayerGlobal(roomId);
    } catch (err) {
      console.error('Erro ao avançar cobertura:', err);
    }
  }, PLAYER_SECONDS * 1000);
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
          credit: (credit != null && !isNaN(parseFloat(credit))) ? Math.max(0, parseFloat(credit)) : 0,
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
        
        // Notify others about updated player list (including current user)
        io.to(`room_${roomId}`).emit('players_updated', {
          players: Array.from(gameState.players.values()),
          currentShooter: gameState.currentShooter,
          point: gameState.point
        });
      }
      
      socket.emit('authenticated', { success: true });
      
    } catch (error) {
      console.error('Erro de autenticação:', error);
      socket.emit('authenticated', { success: false, error: error.message });
    }
  });
  
  // ======== CONTROLE DA FASE PRÉ-ROLAGEM (SHOOTER x OUTROS JOGADORES) ========

  // Shooter clicou em APOSTAR → iniciar fase de pré-rolagem
  socket.on('pre_roll_start', (data) => {
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

      // Apenas o shooter atual pode iniciar a fase de pré-rolagem
      if (gameState.currentShooter !== user.userId) {
        socket.emit('error', { message: 'Apenas o shooter pode iniciar as apostas pré-lançamento.' });
        return;
      }

      const preRoll = gameState.preRoll;

      // Se já estiver em alguma fase de pré-rolagem, ignorar
      if (preRoll.phase !== 'IDLE') {
        socket.emit('error', { message: 'Fase de apostas pré-lançamento já está em andamento.' });
        return;
      }

      // Shooter deve ter uma aposta já feita antes de clicar em APOSTAR
      // Priorizar valor enviado pelo cliente (aposta local), com fallback para currentBet do servidor
      let shooterBet = 0;
      if (data && typeof data.amount === 'number') {
        shooterBet = data.amount;
      } else {
        shooterBet = player.currentBet || 0;
      }
      if (shooterBet <= 0) {
        socket.emit('error', { message: 'Você precisa ter uma aposta antes de clicar em APOSTAR.' });
        return;
      }

      // Preparar estado de pré-rolagem para COBERTURA IMEDIATA
      preRoll.phase = 'COVERAGE';
      preRoll.shooterId = user.userId;
      preRoll.shooterBetAmount = shooterBet;
      preRoll.coverageRemaining = shooterBet;
      preRoll.coverageBets = new Map();
      preRoll.queue = [];
      preRoll.currentIndex = -1;
      preRoll.currentPlayerId = null;
      preRoll.attemptedPlayers = new Set();
      preRoll.shooterMayRoll = false;
      player.currentBet = shooterBet;

      // Garantir que timers antigos foram limpos
      if (preRoll.shooterTimer) {
        clearTimeout(preRoll.shooterTimer);
        preRoll.shooterTimer = null;
      }
      if (preRoll.playerTimer) {
        clearTimeout(preRoll.playerTimer);
        preRoll.playerTimer = null;
      }

      console.log(`🚦 Shooter ${player.username} iniciou fase de pré-lançamento na sala ${roomId}. Aposta travada em ${shooterBet}. Iniciando cobertura dos outros jogadores.`);

      // Opcional: notificar que o shooter travou a aposta (mantém evento para feedback de UI, mas sem esperar 15s)
      io.to(`room_${roomId}`).emit('pre_roll_shooter_betting', {
        shooterId: user.userId,
        shooterName: player.username,
        seconds: 15
      });

      // Iniciar fase de cobertura IMEDIATAMENTE (jogadores, um por vez, com 10 segundos cada)
      startCoveragePhase(roomId);
    } catch (error) {
      console.error('Erro ao iniciar pré-rolagem:', error);
      socket.emit('error', { message: 'Falha ao iniciar apostas pré-lançamento' });
    }
  });

  // Zera fase de pré-rolagem (passar dado, trocar shooter, etc.)
  function resetPreRollState(gameState) {
    if (!gameState || !gameState.preRoll) return;
    const pr = gameState.preRoll;
    if (pr.playerTimer) {
      clearTimeout(pr.playerTimer);
      pr.playerTimer = null;
    }
    if (pr.shooterTimer) {
      clearTimeout(pr.shooterTimer);
      pr.shooterTimer = null;
    }
    pr.phase = 'IDLE';
    pr.shooterId = null;
    pr.shooterBetAmount = 0;
    pr.coverageRemaining = 0;
    pr.coverageBets = new Map();
    pr.queue = [];
    pr.currentIndex = -1;
    pr.currentPlayerId = null;
    pr.attemptedPlayers = new Set();
    pr.shooterMayRoll = false;
  }

  // Função auxiliar: iniciar fase de cobertura (outros jogadores apostam contra o shooter)
  function startCoveragePhase(roomId) {
    const gameState = gameRooms.get(roomId);
    if (!gameState) return;

    const preRoll = gameState.preRoll;
    const shooterId = preRoll.shooterId;

    if (!shooterId || preRoll.shooterBetAmount <= 0) {
      preRoll.phase = 'IDLE';
      preRoll.shooterMayRoll = false;
      return;
    }

    // Construir fila de jogadores (ordem de entrada), excluindo o shooter
    const playerIds = Array.from(gameState.players.keys());
    preRoll.queue = playerIds.filter(id => id !== shooterId);
    preRoll.currentIndex = -1;
    preRoll.currentPlayerId = null;
    preRoll.phase = 'COVERAGE';
    preRoll.shooterMayRoll = false;
    preRoll.attemptedPlayers = new Set();

    console.log(`🚦 Iniciando fase de cobertura na sala ${roomId} - valor a cobrir: ${preRoll.coverageRemaining}`);

    if (preRoll.queue.length === 0) {
      io.to(`room_${roomId}`).emit('pre_roll_coverage_incomplete', {
        shooterId,
        shooterBetAmount: preRoll.shooterBetAmount,
        coverageRemaining: preRoll.coverageRemaining,
        message: 'Aguarde outros jogadores entrarem na mesa para cobrir a aposta!'
      });
      console.log(`⛔ Sala ${roomId}: nenhum outro jogador — lançamento bloqueado até haver cobertura`);
      return;
    }

    io.to(`room_${roomId}`).emit('pre_roll_coverage_start', {
      shooterId,
      shooterBetAmount: preRoll.shooterBetAmount,
      coverageRemaining: preRoll.coverageRemaining
    });

    advanceCoveragePlayerGlobal(roomId);
  }

  // Compat: chamadas locais usam a função global
  function advanceCoveragePlayer(roomId) {
    advanceCoveragePlayerGlobal(roomId);
  }

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

      // Validar shooter e aposta ANTES de transmitir animação (para não "rolar" sem aposta)
      const player = gameState.players.get(user.userId);
      if (!player) {
        socket.emit('error', { message: 'Jogador não encontrado no jogo' });
        return;
      }
      if (gameState.currentShooter !== user.userId) {
        socket.emit('error', { message: 'Não é sua vez de lançar!' });
        return;
      }
      if (!player.currentBet || player.currentBet <= 0) {
        socket.emit('error', { message: 'Você precisa fazer uma aposta antes de lançar os dados.' });
        return;
      }
      const preRoll = gameState.preRoll;
      // Em come-out (sem ponto): EXIGE cobertura total antes de lançar
      const needsCoverage = !gameState.point;
      if (needsCoverage) {
        if (!preRoll || !preRoll.shooterMayRoll) {
          socket.emit('error', {
            message: 'As apostas precisam estar 100% cobertas antes de lançar os dados! Clique em APOSTAR e aguarde a cobertura.'
          });
          return;
        }
        if (preRoll.phase === 'COVERAGE' || (preRoll.coverageRemaining != null && preRoll.coverageRemaining > 0)) {
          socket.emit('error', {
            message: `Aguarde a cobertura total! Ainda faltam R$ ${Number(preRoll.coverageRemaining || 0).toFixed(2)}`
          });
          return;
        }
      } else {
        // Com ponto aberto: ainda bloqueia se cobertura de pré-rolagem estiver ativa
        if (preRoll && preRoll.phase === 'COVERAGE') {
          socket.emit('error', { message: 'Aguarde a cobertura das apostas antes de lançar.' });
          return;
        }
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
            if (total === 7) {
              // 7 no come-out: quem cobriu ganha o dobro; lançador perde
              payCoverageBetsDouble(gameState, roomId);
              clearShooterMainBet(gameState);
              io.to(`room_${roomId}`).emit('game_result', {
                type: 'come_out_seven',
                total,
                message: `Saiu 7! Quem cobriu a aposta recebe o dobro. Lançador perde!`
              });
              gameState.point = null;
              resetPreRollState(gameState);
              passShooter(roomId);
            } else if (total === 11) {
              // Natural 11 — lançador vence; cobertura perde
              addShooterWinToTableBet(gameState, 2);
              io.to(`room_${roomId}`).emit('game_result', {
                type: 'natural_win',
                total,
                message: `Natural ${total}! Lançador vence!`
              });
              gameState.point = null;
              resetPreRollState(gameState);
            } else if (total === 2 || total === 3 || total === 12) {
              // Craps: perde a aposta, mas MANTÉM os dados e joga de novo
              clearShooterMainBet(gameState);
              // Limpar apostas de cobertura (não pagam no craps)
              if (gameState.preRoll && gameState.preRoll.coverageBets) {
                for (const [userId] of gameState.preRoll.coverageBets.entries()) {
                  const p = gameState.players.get(userId);
                  if (p) p.currentBet = 0;
                  for (const [betKey, bet] of gameState.bets.entries()) {
                    if (bet.userId === userId && String(userId) !== String(gameState.currentShooter)) {
                      gameState.bets.delete(betKey);
                    }
                  }
                }
              }
              io.to(`room_${roomId}`).emit('game_result', {
                type: 'craps',
                total,
                message: `Craps ${total}! Lançador perde a aposta, mas mantém os dados — pode jogar de novo!`,
                keepShooter: true
              });
              gameState.point = null;
              resetPreRollState(gameState);
              // NÃO passa o dado — mesmo shooter continua
              io.to(`room_${roomId}`).emit('players_updated', {
                players: Array.from(gameState.players.values()),
                currentShooter: gameState.currentShooter,
                point: gameState.point
              });
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
              // Made the point — ganho permanece na mesa até passar o dado ou perder
              addShooterWinToTableBet(gameState, 2);
              io.to(`room_${roomId}`).emit('game_result', {
                type: 'point_made',
                total,
                point: gameState.point,
                message: `Ponto ${gameState.point} feito! Lançador vence!`
              });
              gameState.point = null;
              resetPreRollState(gameState);
            } else if (total === 7) {
              // Seven out
              io.to(`room_${roomId}`).emit('game_result', {
                type: 'seven_out',
                total,
                message: `Sete fora! Lançador perde!`
              });
              gameState.point = null;
              resetPreRollState(gameState);
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
      // Em multiplayer com lógica híbrida, o crédito é controlado no cliente.
      // Aqui só validamos valor positivo para registrar a aposta e liberar o roll.
      if (amount <= 0) {
        socket.emit('error', { message: 'Valor de aposta inválido' });
        return;
      }

      // Se estamos na fase de COBERTURA PRÉ-ROLAGEM, só o jogador da vez pode apostar
      const preRoll = gameState.preRoll;
      if (preRoll && preRoll.phase === 'COVERAGE') {
        const shooterId = gameState.currentShooter;

        // Shooter NÃO pode apostar nessa fase
        if (player.userId === shooterId) {
          socket.emit('error', { message: 'Shooter não pode apostar durante a cobertura dos outros jogadores.' });
          return;
        }

        // Apenas o jogador atual da fila pode apostar
        if (preRoll.currentPlayerId && String(preRoll.currentPlayerId) !== String(player.userId)) {
          socket.emit('error', { message: 'Aguarde a sua vez. Cada jogador tem 10 segundos para apostar contra o shooter.' });
          return;
        }
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
      
      // Update player current bet (não debitar crédito no servidor)
      player.currentBet += amount;

      // Se estamos na fase de COBERTURA, acumular valor apostado contra o shooter
      if (preRoll && preRoll.phase === 'COVERAGE') {
        const shooterId = gameState.currentShooter;
        if (player.userId !== shooterId) {
          // Atualizar mapa de cobertura por jogador
          const prev = preRoll.coverageBets.get(player.userId) || 0;
          const newTotal = prev + amount;
          preRoll.coverageBets.set(player.userId, newTotal);

          // Diminuir o valor restante a cobrir
          preRoll.coverageRemaining = Math.max(0, preRoll.coverageRemaining - amount);

          console.log(`💥 Cobertura contra o shooter na sala ${roomId}: jogador ${player.username} apostou ${amount}. Restante a cobrir: ${preRoll.coverageRemaining}`);

          // Se já cobriu o valor do shooter, finalizar imediatamente a fase de cobertura
          if (preRoll.coverageRemaining <= 0) {
            console.log(`✅ Cobertura COMPLETA na sala ${roomId} - liberando lançamento do shooter`);
            completePreRollCoverage(roomId);
          }
        }
      }
      
      // Broadcast bet to room
      io.to(`room_${roomId}`).emit('bet_placed', {
        userId: user.userId,
        username: user.username,
        betType,
        amount: newBetAmount,
        remainingCredit: player.credit,
        totalBet: player.currentBet
      });

      io.to(`room_${roomId}`).emit('players_updated', {
        players: Array.from(gameState.players.values()),
        currentShooter: gameState.currentShooter,
        point: gameState.point
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
  
  // Acrescenta ganho à aposta do shooter na mesa (fichas ficam até passar o dado ou perder)
  function addShooterWinToTableBet(gameState, payoutMultiplier) {
    const shooterId = gameState.currentShooter;
    if (!shooterId) return 0;

    const shooterPlayer = gameState.players.get(shooterId);
    if (!shooterPlayer) return 0;

    let totalWinAdded = 0;
    for (const [, bet] of gameState.bets.entries()) {
      if (bet.userId === shooterId && bet.betType === 'main_bet') {
        const winAmount = Math.round(bet.amount * (payoutMultiplier - 1) * 10) / 10;
        if (winAmount > 0) {
          bet.amount += winAmount;
          shooterPlayer.currentBet += winAmount;
          totalWinAdded += winAmount;
        }
      }
    }

    if (totalWinAdded > 0) {
      console.log(`🎉 Shooter ${shooterPlayer.username} ganhou ${totalWinAdded} – fichas na mesa (total: ${shooterPlayer.currentBet})`);
    }
    return totalWinAdded;
  }

  // Helper function to pass shooter to next player
  function passShooter(roomId) {
    const gameState = gameRooms.get(roomId);
    if (!gameState) return;

    resetPreRollState(gameState);
    
    const playerIds = Array.from(gameState.players.keys());
    if (playerIds.length === 0) return;
    
    const currentIndex = playerIds.indexOf(gameState.currentShooter);
    const nextIndex = (currentIndex + 1) % playerIds.length;
    const nextShooterId = playerIds[nextIndex];
    
    console.log(`🔄 Passing shooter from ${gameState.currentShooter} to ${nextShooterId} in room ${roomId}`);

    resetPreRollState(gameState);
    
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

    io.to(`room_${roomId}`).emit('players_updated', {
      players: Array.from(gameState.players.values()),
      currentShooter: gameState.currentShooter,
      point: gameState.point
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

      resetPreRollState(gameState);

      // DEVOLVE TODO O VALOR APOSTADO AO JOGADOR AO PASSAR O DADO
      const player = gameState.players.get(user.userId);
      if (player) {
        let refundAmount = 0;
        const betsToRemove = [];

        for (const [betKey, bet] of gameState.bets.entries()) {
          if (bet.userId === user.userId) {
            refundAmount += bet.amount;
            betsToRemove.push(betKey);
          }
        }

        // Remover apostas desse jogador da sala
        betsToRemove.forEach(betKey => gameState.bets.delete(betKey));

        // Devolver crédito e zerar aposta atual
        player.credit += refundAmount;
        player.currentBet = 0;

        // Notificar o próprio jogador sobre o reembolso
        socket.emit('bets_cleared', {
          refundAmount,
          remainingCredit: player.credit
        });

        console.log(`💰 ${user.username} passou o dado e recebeu de volta ${refundAmount} em créditos (novo saldo: ${player.credit})`);
      }
      
      // Notify the room that the player passed
      io.to(`room_${roomId}`).emit('player_passed_dice', {
        userId: user.userId,
        username: user.username,
        message: `${user.username} passou o dado!`
      });
      
      // Pass shooter to next player (resetPreRollState é chamado dentro de passShooter)
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
  // Painel admin: receber saldo em tempo real dos jogadores na mesa
  socket.on('admin_panel_join', async (data) => {
    try {
      const adminId = data && data.adminId;
      if (!adminId || !(await verifyAdminId(adminId))) {
        socket.emit('error', { message: 'Admin não autorizado' });
        return;
      }
      socket.join('admin_panel');
      console.log(`📊 Painel admin conectado: ${adminId}`);
    } catch (err) {
      console.error('Erro admin_panel_join:', err);
    }
  });

  socket.on('report_player_wealth', (data) => {
    try {
      const user = connectedUsers.get(socket.id);
      if (!user || !data || String(data.userId) !== String(user.userId)) return;

      const totalWealth = Math.round(parseFloat(data.totalWealth) * 100) / 100;
      const credit = Math.round(parseFloat(data.credit) * 100) / 100;
      const currentBet = Math.round(parseFloat(data.currentBet) * 100) / 100;

      const gameState = user.roomId ? gameRooms.get(user.roomId) : null;
      if (gameState) {
        const player = gameState.players.get(user.userId);
        if (player) {
          player.credit = Math.max(0, credit);
          player.currentBet = Math.max(0, currentBet);
        }
      }

      io.to('admin_panel').emit('player_wealth_update', {
        userId: data.userId,
        username: user.username,
        totalWealth: isNaN(totalWealth) ? 0 : totalWealth,
        credit: isNaN(credit) ? 0 : credit,
        currentBet: isNaN(currentBet) ? 0 : currentBet,
        bets: data.bets || null,
        roomId: user.roomId || null
      });
    } catch (err) {
      console.error('Erro report_player_wealth:', err);
    }
  });

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
              players: Array.from(gameState.players.values()),
              currentShooter: gameState.currentShooter,
              point: gameState.point
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
const HOST = process.env.HOST || '0.0.0.0';

function getLanAddresses() {
  const urls = [];
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        urls.push(`http://${net.address}:${PORT}`);
      }
    }
  }
  return urls;
}

server.listen(PORT, HOST, () => {
  console.log('');
  console.log(`Servidor ouvindo em todas as interfaces (${HOST}:${PORT})`);
  console.log(`  Local:  http://localhost:${PORT}`);
  console.log(`  Local:  http://127.0.0.1:${PORT}`);
  const lanUrls = getLanAddresses();
  if (lanUrls.length) {
    console.log('  LAN (outros dispositivos na mesma rede Wi‑Fi/Ethernet):');
    lanUrls.forEach((url) => console.log(`    → ${url}`));
  } else {
    console.log('  LAN: nenhum IPv4 detectado — use ipconfig para ver seu IP');
  }
  console.log('');
  console.log('✅ Socket.IO Puro: Gerenciamento completo do jogo');
  console.log('🎮 Jogo multiplayer de Craps em tempo real pronto!');
  console.log('📊 Funcionalidades: Lançamento de dados, apostas, chat, lobby');
  console.log('');
});

