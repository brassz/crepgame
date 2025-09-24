function CSocketManager() {
    var _socket;
    var _bConnected = false;
    var _sCurrentRoom = null;
    var _oCurrentPlayer = null;
    var _oRoomInfo = null;
    var _aEventListeners = {};

    this._init = function() {
        if (typeof io === 'undefined') {
            console.error('Socket.IO não encontrado! Certifique-se de que o servidor está rodando.');
            return;
        }

        // Conectar ao servidor
        _socket = io();
        
        this._setupEventHandlers();
    };

    this._setupEventHandlers = function() {
        var self = this;

        _socket.on('connect', function() {
            console.log('Conectado ao servidor Socket.IO');
            _bConnected = true;
            self._dispatchEvent('connected', {});
        });

        _socket.on('disconnect', function() {
            console.log('Desconectado do servidor Socket.IO');
            _bConnected = false;
            _sCurrentRoom = null;
            _oCurrentPlayer = null;
            _oRoomInfo = null;
            self._dispatchEvent('disconnected', {});
        });

        // Eventos de sala
        _socket.on('room_joined', function(data) {
            console.log('Entrou na sala:', data);
            _sCurrentRoom = data.room.roomId;
            _oCurrentPlayer = data.player;
            _oRoomInfo = data.room;
            self._dispatchEvent('room_joined', data);
        });

        _socket.on('room_join_error', function(data) {
            console.error('Erro ao entrar na sala:', data.error);
            self._dispatchEvent('room_join_error', data);
        });

        _socket.on('player_joined', function(data) {
            console.log('Novo jogador na sala:', data.player.name);
            _oRoomInfo = data.room;
            self._dispatchEvent('player_joined', data);
        });

        _socket.on('player_left', function(data) {
            console.log('Jogador saiu da sala:', data.playerId);
            _oRoomInfo = data.room;
            self._dispatchEvent('player_left', data);
        });

        _socket.on('player_disconnected', function(data) {
            console.log('Jogador desconectado:', data.playerId);
            _oRoomInfo = data.room;
            self._dispatchEvent('player_disconnected', data);
        });

        // Eventos de apostas
        _socket.on('bet_placed', function(data) {
            console.log('Aposta confirmada:', data);
            self._dispatchEvent('bet_placed', data);
        });

        _socket.on('bet_error', function(data) {
            console.error('Erro na aposta:', data.error);
            self._dispatchEvent('bet_error', data);
        });

        _socket.on('player_bet_placed', function(data) {
            console.log('Outro jogador fez aposta:', data);
            _oRoomInfo = data.room;
            self._dispatchEvent('player_bet_placed', data);
        });

        _socket.on('bets_cleared', function(data) {
            console.log('Apostas limpas:', data);
            self._dispatchEvent('bets_cleared', data);
        });

        _socket.on('player_bets_cleared', function(data) {
            console.log('Outro jogador limpou apostas:', data);
            _oRoomInfo = data.room;
            self._dispatchEvent('player_bets_cleared', data);
        });

        // Eventos de dados
        _socket.on('dice_rolled', function(data) {
            console.log('Dados lançados:', data.diceResult, 'Soma:', data.sum);
            _oRoomInfo = data.room;
            self._dispatchEvent('dice_rolled', data);
        });

        _socket.on('roll_error', function(data) {
            console.error('Erro ao rolar dados:', data.error);
            self._dispatchEvent('roll_error', data);
        });

        _socket.on('dice_animation_complete', function(data) {
            console.log('Animação dos dados completa');
            _oRoomInfo = data.room;
            self._dispatchEvent('dice_animation_complete', data);
        });

        // Eventos do dealer
        _socket.on('dealer_assigned', function(data) {
            console.log('Você é o novo dealer!');
            if (_oCurrentPlayer) {
                _oCurrentPlayer.isDealer = data.isDealer;
            }
            self._dispatchEvent('dealer_assigned', data);
        });

        // Informações da sala
        _socket.on('room_info', function(data) {
            _oRoomInfo = data;
            self._dispatchEvent('room_info_updated', data);
        });
    };

    // Sistema de eventos
    this.addEventListener = function(sEvent, fCallback) {
        if (!_aEventListeners[sEvent]) {
            _aEventListeners[sEvent] = [];
        }
        _aEventListeners[sEvent].push(fCallback);
    };

    this.removeEventListener = function(sEvent, fCallback) {
        if (_aEventListeners[sEvent]) {
            var iIndex = _aEventListeners[sEvent].indexOf(fCallback);
            if (iIndex > -1) {
                _aEventListeners[sEvent].splice(iIndex, 1);
            }
        }
    };

    this._dispatchEvent = function(sEvent, oData) {
        if (_aEventListeners[sEvent]) {
            for (var i = 0; i < _aEventListeners[sEvent].length; i++) {
                _aEventListeners[sEvent][i](oData);
            }
        }
    };

    // Métodos públicos para interação com o servidor
    this.joinRoom = function(sRoomId, oPlayerData) {
        if (!_bConnected) {
            console.error('Não conectado ao servidor');
            return false;
        }

        var playerData = {
            name: oPlayerData.name || 'Jogador',
            balance: oPlayerData.balance || 1000
        };

        _socket.emit('join_room', {
            roomId: sRoomId,
            playerData: playerData
        });

        return true;
    };

    this.leaveRoom = function() {
        if (!_bConnected || !_sCurrentRoom) {
            return false;
        }

        _socket.emit('leave_room');
        return true;
    };

    this.placeBet = function(iAmount, sBetType) {
        if (!_bConnected || !_sCurrentRoom) {
            console.error('Não está em uma sala');
            return false;
        }

        _socket.emit('place_bet', {
            amount: iAmount,
            type: sBetType || 'main_bet'
        });

        return true;
    };

    this.rollDice = function() {
        if (!_bConnected || !_sCurrentRoom) {
            console.error('Não está em uma sala');
            return false;
        }

        if (!_oCurrentPlayer || !_oCurrentPlayer.isDealer) {
            console.error('Apenas o dealer pode rolar os dados');
            return false;
        }

        _socket.emit('roll_dice');
        return true;
    };

    this.clearBets = function() {
        if (!_bConnected || !_sCurrentRoom) {
            return false;
        }

        _socket.emit('clear_bets');
        return true;
    };

    this.getRoomInfo = function() {
        if (!_bConnected || !_sCurrentRoom) {
            return null;
        }

        _socket.emit('get_room_info');
        return _oRoomInfo;
    };

    // Getters
    this.isConnected = function() {
        return _bConnected;
    };

    this.getCurrentRoom = function() {
        return _sCurrentRoom;
    };

    this.getCurrentPlayer = function() {
        return _oCurrentPlayer;
    };

    this.getRoomData = function() {
        return _oRoomInfo;
    };

    this.isDealer = function() {
        return _oCurrentPlayer && _oCurrentPlayer.isDealer;
    };

    this.getSocket = function() {
        return _socket;
    };

    // Método para buscar salas disponíveis
    this.fetchAvailableRooms = function(callback) {
        fetch('/api/rooms')
            .then(response => response.json())
            .then(data => {
                if (callback) callback(data);
            })
            .catch(error => {
                console.error('Erro ao buscar salas:', error);
                if (callback) callback(null);
            });
    };

    this._init();
    return this;
}

// Instância global
var s_oSocketManager = null;