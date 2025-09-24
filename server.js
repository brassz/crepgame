const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(cors());
app.use(express.static('.'));
app.use(express.json());

// Estrutura para armazenar dados das salas
const rooms = new Map();
const playerSockets = new Map(); // socket.id -> player info

// Configurações das salas
const ROOM_CONFIGS = {
    'principal': {
        name: 'Mesa Principal',
        min_bet: 50,
        max_bet: null,
        max_players: 8,
        description: 'Mesa principal do jogo'
    },
    'vip': {
        name: 'Mesa VIP',
        min_bet: 500,
        max_bet: null,
        max_players: 6,
        description: 'Mesa VIP para apostas altas'
    },
    'iniciante': {
        name: 'Mesa Iniciante',
        min_bet: 10,
        max_bet: 1000,
        max_players: 10,
        description: 'Mesa para iniciantes'
    }
};

// Classe para gerenciar uma sala
class GameRoom {
    constructor(roomId, config) {
        this.roomId = roomId;
        this.config = config;
        this.players = new Map();
        this.gameState = {
            phase: 'waiting_for_bet', // waiting_for_bet, come_out, come_point
            pointNumber: -1,
            currentBets: new Map(),
            diceResult: [],
            isRolling: false,
            lastRollTime: null
        };
        this.gameHistory = [];
        this.currentDealer = null; // Jogador que é o dealer atual
    }

    addPlayer(socket, playerData) {
        if (this.players.size >= this.config.max_players) {
            return { success: false, error: 'Sala lotada' };
        }

        const player = {
            id: socket.id,
            name: playerData.name || `Jogador${this.players.size + 1}`,
            balance: playerData.balance || 1000,
            currentBets: new Map(),
            isDealer: this.players.size === 0, // Primeiro jogador vira dealer
            joinedAt: Date.now()
        };

        this.players.set(socket.id, player);

        // Se é o primeiro jogador, vira dealer
        if (this.players.size === 1) {
            this.currentDealer = socket.id;
        }

        return { success: true, player };
    }

    removePlayer(socketId) {
        const player = this.players.get(socketId);
        if (!player) return;

        // Se o dealer saiu, escolhe um novo dealer
        if (this.currentDealer === socketId && this.players.size > 1) {
            const remainingPlayers = Array.from(this.players.keys()).filter(id => id !== socketId);
            this.currentDealer = remainingPlayers[0];
            
            // Notifica o novo dealer
            if (this.currentDealer) {
                const dealerSocket = playerSockets.get(this.currentDealer);
                if (dealerSocket) {
                    dealerSocket.emit('dealer_assigned', { isDealer: true });
                }
            }
        }

        this.players.delete(socketId);
    }

    placeBet(socketId, betData) {
        const player = this.players.get(socketId);
        if (!player) return { success: false, error: 'Jogador não encontrado' };

        const betAmount = betData.amount;
        const betType = betData.type || 'main_bet';

        // Verificar se o jogador tem saldo suficiente
        if (player.balance < betAmount) {
            return { success: false, error: 'Saldo insuficiente' };
        }

        // Verificar limites da mesa
        if (betAmount < this.config.min_bet) {
            return { success: false, error: `Aposta mínima: ${this.config.min_bet}` };
        }

        if (this.config.max_bet && betAmount > this.config.max_bet) {
            return { success: false, error: `Aposta máxima: ${this.config.max_bet}` };
        }

        // Verificar se pode apostar no estado atual do jogo
        if (this.gameState.isRolling) {
            return { success: false, error: 'Não é possível apostar durante o lançamento' };
        }

        // Registrar a aposta
        const currentBet = player.currentBets.get(betType) || 0;
        player.currentBets.set(betType, currentBet + betAmount);
        player.balance -= betAmount;

        return { 
            success: true, 
            newBalance: player.balance,
            totalBet: player.currentBets.get(betType)
        };
    }

    rollDice(socketId) {
        // Só o dealer pode rolar os dados
        if (socketId !== this.currentDealer) {
            return { success: false, error: 'Apenas o dealer pode rolar os dados' };
        }

        // Verificar se há apostas ativas
        let hasActiveBets = false;
        for (const player of this.players.values()) {
            if (player.currentBets.size > 0) {
                hasActiveBets = true;
                break;
            }
        }

        if (!hasActiveBets) {
            return { success: false, error: 'Não há apostas ativas' };
        }

        if (this.gameState.isRolling) {
            return { success: false, error: 'Dados já estão sendo lançados' };
        }

        // Gerar resultado dos dados
        const dice1 = Math.floor(Math.random() * 6) + 1;
        const dice2 = Math.floor(Math.random() * 6) + 1;
        const sum = dice1 + dice2;

        this.gameState.diceResult = [dice1, dice2];
        this.gameState.isRolling = true;
        this.gameState.lastRollTime = Date.now();

        // Processar resultado baseado na fase do jogo
        this.processGameResult(sum);

        return { 
            success: true, 
            diceResult: [dice1, dice2],
            sum: sum,
            gameState: this.gameState
        };
    }

    processGameResult(sum) {
        const results = [];

        if (this.gameState.phase === 'waiting_for_bet' || this.gameState.phase === 'come_out') {
            // Primeira jogada (come out roll)
            if (sum === 7 || sum === 11) {
                // Natural - Pass Line ganha
                this.processWinners('pass_line', sum);
                this.gameState.phase = 'waiting_for_bet';
                this.gameState.pointNumber = -1;
            } else if (sum === 2 || sum === 3 || sum === 12) {
                // Craps - Pass Line perde
                this.processLosers('pass_line', sum);
                this.gameState.phase = 'waiting_for_bet';
                this.gameState.pointNumber = -1;
            } else {
                // Estabelecer ponto
                this.gameState.pointNumber = sum;
                this.gameState.phase = 'come_point';
            }
        } else if (this.gameState.phase === 'come_point') {
            // Fase do ponto
            if (sum === this.gameState.pointNumber) {
                // Acertou o ponto - Pass Line ganha
                this.processWinners('point', sum);
                this.gameState.phase = 'waiting_for_bet';
                this.gameState.pointNumber = -1;
            } else if (sum === 7) {
                // Seven out - Pass Line perde
                this.processLosers('seven_out', sum);
                this.gameState.phase = 'waiting_for_bet';
                this.gameState.pointNumber = -1;
            }
            // Outros números continuam o jogo
        }

        // Registrar no histórico
        this.gameHistory.push({
            diceResult: this.gameState.diceResult,
            sum: sum,
            phase: this.gameState.phase,
            pointNumber: this.gameState.pointNumber,
            timestamp: Date.now()
        });

        // Limitar histórico
        if (this.gameHistory.length > 50) {
            this.gameHistory.shift();
        }
    }

    processWinners(winType, sum) {
        for (const [playerId, player] of this.players) {
            let winAmount = 0;

            // Processar apostas do jogador
            for (const [betType, betAmount] of player.currentBets) {
                if (betType === 'main_bet') {
                    // Lógica de ganho baseada no tipo de vitória
                    if (winType === 'pass_line' && (sum === 7 || sum === 11)) {
                        winAmount += betAmount * 2; // Dobra
                    } else if (winType === 'point') {
                        // Multiplicadores baseados no ponto
                        if (this.gameState.pointNumber === 4 || this.gameState.pointNumber === 10) {
                            winAmount += betAmount * 2; // 2:1
                        } else if (this.gameState.pointNumber === 5 || this.gameState.pointNumber === 9) {
                            winAmount += betAmount * 1.5; // 3:2
                        } else if (this.gameState.pointNumber === 6 || this.gameState.pointNumber === 8) {
                            winAmount += betAmount * 1.2; // 6:5
                        }
                    }
                }
            }

            if (winAmount > 0) {
                player.balance += winAmount;
                player.currentBets.clear(); // Limpa apostas após ganho
            }
        }
    }

    processLosers(loseType, sum) {
        for (const [playerId, player] of this.players) {
            // Todas as apostas são perdidas nos casos de derrota
            player.currentBets.clear();
        }
    }

    clearAllBets() {
        for (const player of this.players.values()) {
            // Devolver dinheiro das apostas
            for (const [betType, betAmount] of player.currentBets) {
                player.balance += betAmount;
            }
            player.currentBets.clear();
        }
    }

    getRoomInfo() {
        return {
            roomId: this.roomId,
            config: this.config,
            playerCount: this.players.size,
            maxPlayers: this.config.max_players,
            gameState: this.gameState,
            players: Array.from(this.players.values()).map(player => ({
                id: player.id,
                name: player.name,
                balance: player.balance,
                isDealer: player.id === this.currentDealer,
                hasBets: player.currentBets.size > 0
            }))
        };
    }
}

// Função para obter ou criar sala
function getOrCreateRoom(roomId) {
    if (!rooms.has(roomId)) {
        const config = ROOM_CONFIGS[roomId] || ROOM_CONFIGS['principal'];
        rooms.set(roomId, new GameRoom(roomId, config));
    }
    return rooms.get(roomId);
}

// Rota para servir o jogo
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'game', 'index.html'));
});

// Rota para informações das salas
app.get('/api/rooms', (req, res) => {
    const roomsInfo = {};
    for (const [roomId, room] of rooms) {
        roomsInfo[roomId] = room.getRoomInfo();
    }
    
    // Adicionar salas vazias
    for (const [roomId, config] of Object.entries(ROOM_CONFIGS)) {
        if (!roomsInfo[roomId]) {
            roomsInfo[roomId] = {
                roomId,
                config,
                playerCount: 0,
                maxPlayers: config.max_players,
                gameState: {
                    phase: 'waiting_for_bet',
                    pointNumber: -1,
                    isRolling: false
                },
                players: []
            };
        }
    }
    
    res.json(roomsInfo);
});

// Conexões Socket.IO
io.on('connection', (socket) => {
    console.log('Novo jogador conectado:', socket.id);
    
    // Armazenar referência do socket
    playerSockets.set(socket.id, socket);

    // Entrar em uma sala
    socket.on('join_room', (data) => {
        const { roomId, playerData } = data;
        const room = getOrCreateRoom(roomId);
        
        // Sair de outras salas primeiro
        socket.rooms.forEach(roomName => {
            if (roomName !== socket.id) {
                socket.leave(roomName);
            }
        });

        const result = room.addPlayer(socket, playerData);
        
        if (result.success) {
            socket.join(roomId);
            socket.currentRoom = roomId;
            
            // Enviar confirmação para o jogador
            socket.emit('room_joined', {
                success: true,
                room: room.getRoomInfo(),
                player: result.player
            });
            
            // Notificar outros jogadores na sala
            socket.to(roomId).emit('player_joined', {
                player: {
                    id: result.player.id,
                    name: result.player.name,
                    balance: result.player.balance,
                    isDealer: result.player.isDealer
                },
                room: room.getRoomInfo()
            });
            
            console.log(`Jogador ${result.player.name} entrou na sala ${roomId}`);
        } else {
            socket.emit('room_join_error', { error: result.error });
        }
    });

    // Fazer aposta
    socket.on('place_bet', (data) => {
        const roomId = socket.currentRoom;
        if (!roomId) {
            socket.emit('bet_error', { error: 'Não está em uma sala' });
            return;
        }

        const room = rooms.get(roomId);
        if (!room) {
            socket.emit('bet_error', { error: 'Sala não encontrada' });
            return;
        }

        const result = room.placeBet(socket.id, data);
        
        if (result.success) {
            // Notificar o jogador
            socket.emit('bet_placed', {
                amount: data.amount,
                type: data.type,
                newBalance: result.newBalance,
                totalBet: result.totalBet
            });
            
            // Notificar outros jogadores
            socket.to(roomId).emit('player_bet_placed', {
                playerId: socket.id,
                amount: data.amount,
                type: data.type,
                room: room.getRoomInfo()
            });
        } else {
            socket.emit('bet_error', { error: result.error });
        }
    });

    // Rolar dados
    socket.on('roll_dice', () => {
        const roomId = socket.currentRoom;
        if (!roomId) {
            socket.emit('roll_error', { error: 'Não está em uma sala' });
            return;
        }

        const room = rooms.get(roomId);
        if (!room) {
            socket.emit('roll_error', { error: 'Sala não encontrada' });
            return;
        }

        const result = room.rollDice(socket.id);
        
        if (result.success) {
            // Notificar todos os jogadores na sala
            io.to(roomId).emit('dice_rolled', {
                diceResult: result.diceResult,
                sum: result.sum,
                gameState: result.gameState,
                room: room.getRoomInfo()
            });
            
            // Simular tempo de animação dos dados
            setTimeout(() => {
                room.gameState.isRolling = false;
                io.to(roomId).emit('dice_animation_complete', {
                    room: room.getRoomInfo()
                });
            }, 3000);
        } else {
            socket.emit('roll_error', { error: result.error });
        }
    });

    // Limpar apostas
    socket.on('clear_bets', () => {
        const roomId = socket.currentRoom;
        if (!roomId) return;

        const room = rooms.get(roomId);
        if (!room) return;

        const player = room.players.get(socket.id);
        if (!player) return;

        // Devolver dinheiro das apostas
        for (const [betType, betAmount] of player.currentBets) {
            player.balance += betAmount;
        }
        player.currentBets.clear();

        // Notificar jogador
        socket.emit('bets_cleared', {
            newBalance: player.balance
        });

        // Notificar outros jogadores
        socket.to(roomId).emit('player_bets_cleared', {
            playerId: socket.id,
            room: room.getRoomInfo()
        });
    });

    // Sair da sala
    socket.on('leave_room', () => {
        const roomId = socket.currentRoom;
        if (!roomId) return;

        const room = rooms.get(roomId);
        if (room) {
            room.removePlayer(socket.id);
            
            // Notificar outros jogadores
            socket.to(roomId).emit('player_left', {
                playerId: socket.id,
                room: room.getRoomInfo()
            });
            
            // Se a sala ficou vazia, pode removê-la após um tempo
            if (room.players.size === 0) {
                setTimeout(() => {
                    if (room.players.size === 0) {
                        rooms.delete(roomId);
                        console.log(`Sala ${roomId} removida (vazia)`);
                    }
                }, 60000); // Remove após 1 minuto
            }
        }

        socket.leave(roomId);
        socket.currentRoom = null;
    });

    // Desconexão
    socket.on('disconnect', () => {
        console.log('Jogador desconectado:', socket.id);
        
        const roomId = socket.currentRoom;
        if (roomId) {
            const room = rooms.get(roomId);
            if (room) {
                room.removePlayer(socket.id);
                
                // Notificar outros jogadores
                socket.to(roomId).emit('player_disconnected', {
                    playerId: socket.id,
                    room: room.getRoomInfo()
                });
            }
        }

        playerSockets.delete(socket.id);
    });

    // Solicitar informações da sala
    socket.on('get_room_info', () => {
        const roomId = socket.currentRoom;
        if (roomId) {
            const room = rooms.get(roomId);
            if (room) {
                socket.emit('room_info', room.getRoomInfo());
            }
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
    console.log(`Acesse: http://localhost:${PORT}`);
});