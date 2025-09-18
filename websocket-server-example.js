// Exemplo de servidor WebSocket para o sistema multiplayer
// Este arquivo é apenas um exemplo de referência
// Para usar em produção, você precisa configurar um servidor Node.js

const WebSocket = require('ws');
const http = require('http');

class CrapsMultiplayerServer {
    constructor(port = 8080) {
        this.port = port;
        this.rooms = {
            'principal': { rooms: [] },
            'vip': { rooms: [] },
            'iniciante': { rooms: [] }
        };
        this.players = new Map();
        this.roomConfigs = {
            'principal': { max_players: 8, min_bet: 50, max_bet: null },
            'vip': { max_players: 6, min_bet: 500, max_bet: null },
            'iniciante': { max_players: 10, min_bet: 10, max_bet: 1000 }
        };
        
        this.init();
    }
    
    init() {
        const server = http.createServer();
        this.wss = new WebSocket.Server({ server });
        
        this.wss.on('connection', (ws) => {
            console.log('Nova conexão estabelecida');
            
            ws.on('message', (message) => {
                try {
                    const data = JSON.parse(message);
                    this.handleMessage(ws, data);
                } catch (error) {
                    console.error('Erro ao processar mensagem:', error);
                }
            });
            
            ws.on('close', () => {
                this.handleDisconnection(ws);
            });
        });
        
        server.listen(this.port, () => {
            console.log(`Servidor WebSocket rodando na porta ${this.port}`);
        });
    }
    
    handleMessage(ws, data) {
        switch (data.type) {
            case 'player_join':
                this.handlePlayerJoin(ws, data);
                break;
            case 'request_room':
                this.handleRoomRequest(ws, data);
                break;
            case 'leave_room':
                this.handleLeaveRoom(ws, data);
                break;
            case 'game_action':
                this.handleGameAction(ws, data);
                break;
        }
    }
    
    handlePlayerJoin(ws, data) {
        const playerId = data.player_id;
        this.players.set(playerId, {
            id: playerId,
            socket: ws,
            room_id: null,
            joined_at: Date.now()
        });
        
        ws.player_id = playerId;
        console.log(`Jogador ${playerId} conectado`);
    }
    
    handleRoomRequest(ws, data) {
        const playerId = data.player_id;
        const roomType = data.room_type;
        
        if (!this.players.has(playerId)) {
            console.error(`Jogador ${playerId} não encontrado`);
            return;
        }
        
        const room = this.findOrCreateRoom(roomType);
        this.addPlayerToRoom(playerId, room);
        
        // Enviar confirmação de sala para o jogador
        ws.send(JSON.stringify({
            type: 'room_assigned',
            room: {
                id: room.id,
                type: roomType,
                players: room.players,
                max_players: room.max_players
            }
        }));
        
        // Notificar outros jogadores na sala
        this.broadcastToRoom(room.id, {
            type: 'player_joined',
            room_id: room.id,
            player_id: playerId
        }, playerId);
        
        console.log(`Jogador ${playerId} adicionado à sala ${room.id}`);
    }
    
    findOrCreateRoom(roomType) {
        const roomGroup = this.rooms[roomType];
        const config = this.roomConfigs[roomType];
        
        // Procurar sala disponível
        for (let room of roomGroup.rooms) {
            if (room.players.length < room.max_players) {
                return room;
            }
        }
        
        // Criar nova sala se não encontrou disponível
        const newRoom = {
            id: `${roomType}_room_${roomGroup.rooms.length + 1}`,
            type: roomType,
            players: [],
            max_players: config.max_players,
            created_at: Date.now(),
            game_state: {
                current_player: null,
                dice_result: null,
                bets: {},
                round_active: false
            }
        };
        
        roomGroup.rooms.push(newRoom);
        console.log(`Nova sala criada: ${newRoom.id}`);
        
        return newRoom;
    }
    
    addPlayerToRoom(playerId, room) {
        const player = this.players.get(playerId);
        
        // Remover jogador da sala anterior se existir
        if (player.room_id) {
            this.removePlayerFromRoom(playerId, player.room_id);
        }
        
        // Adicionar à nova sala
        room.players.push({
            id: playerId,
            joined_at: Date.now()
        });
        
        player.room_id = room.id;
    }
    
    removePlayerFromRoom(playerId, roomId) {
        // Encontrar sala
        for (let roomType in this.rooms) {
            for (let room of this.rooms[roomType].rooms) {
                if (room.id === roomId) {
                    room.players = room.players.filter(p => p.id !== playerId);
                    
                    // Notificar outros jogadores
                    this.broadcastToRoom(roomId, {
                        type: 'player_left',
                        room_id: roomId,
                        player_id: playerId
                    }, playerId);
                    
                    return;
                }
            }
        }
    }
    
    handleLeaveRoom(ws, data) {
        const playerId = data.player_id;
        const roomId = data.room_id;
        
        this.removePlayerFromRoom(playerId, roomId);
        
        const player = this.players.get(playerId);
        if (player) {
            player.room_id = null;
        }
        
        console.log(`Jogador ${playerId} saiu da sala ${roomId}`);
    }
    
    handleGameAction(ws, data) {
        const playerId = data.player_id;
        const roomId = data.room_id;
        const action = data.action;
        
        // Encontrar sala e atualizar estado do jogo
        for (let roomType in this.rooms) {
            for (let room of this.rooms[roomType].rooms) {
                if (room.id === roomId) {
                    // Atualizar estado baseado na ação
                    this.updateGameState(room, playerId, action);
                    
                    // Transmitir para outros jogadores na sala
                    this.broadcastToRoom(roomId, {
                        type: 'game_state_update',
                        room_id: roomId,
                        game_state: room.game_state,
                        action: action,
                        player_id: playerId
                    }, playerId);
                    
                    return;
                }
            }
        }
    }
    
    updateGameState(room, playerId, action) {
        switch (action.type) {
            case 'bet_placed':
                room.game_state.bets[playerId] = action.data;
                break;
            case 'dice_rolled':
                room.game_state.dice_result = action.data.dice_result;
                room.game_state.current_player = playerId;
                room.game_state.round_active = true;
                break;
            case 'round_ended':
                room.game_state.round_active = false;
                room.game_state.bets = {};
                break;
        }
    }
    
    broadcastToRoom(roomId, message, excludePlayerId = null) {
        // Encontrar sala
        for (let roomType in this.rooms) {
            for (let room of this.rooms[roomType].rooms) {
                if (room.id === roomId) {
                    // Enviar mensagem para todos os jogadores na sala
                    room.players.forEach(player => {
                        if (player.id !== excludePlayerId) {
                            const playerData = this.players.get(player.id);
                            if (playerData && playerData.socket.readyState === WebSocket.OPEN) {
                                playerData.socket.send(JSON.stringify(message));
                            }
                        }
                    });
                    return;
                }
            }
        }
    }
    
    handleDisconnection(ws) {
        const playerId = ws.player_id;
        if (!playerId) return;
        
        console.log(`Jogador ${playerId} desconectado`);
        
        const player = this.players.get(playerId);
        if (player && player.room_id) {
            this.removePlayerFromRoom(playerId, player.room_id);
        }
        
        this.players.delete(playerId);
    }
    
    // Método para obter estatísticas do servidor
    getStats() {
        const stats = {
            total_players: this.players.size,
            rooms_by_type: {}
        };
        
        for (let roomType in this.rooms) {
            stats.rooms_by_type[roomType] = {
                total_rooms: this.rooms[roomType].rooms.length,
                total_players: this.rooms[roomType].rooms.reduce((sum, room) => sum + room.players.length, 0)
            };
        }
        
        return stats;
    }
}

// Inicializar servidor
const server = new CrapsMultiplayerServer(8080);

// Log de estatísticas a cada 30 segundos
setInterval(() => {
    console.log('Estatísticas do servidor:', server.getStats());
}, 30000);

module.exports = CrapsMultiplayerServer;