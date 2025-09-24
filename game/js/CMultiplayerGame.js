function CMultiplayerGame() {
    var _bMultiplayerEnabled = true;
    var _bIsMultiplayer = false;
    var _oOriginalGame = null;
    var _aOtherPlayers = [];
    var _oRoomSelector = null;
    
    this._init = function() {
        console.log('Inicializando sistema multiplayer...');
        
        // Criar gerenciador Socket.IO
        if (!s_oSocketManager) {
            s_oSocketManager = new CSocketManager();
        }
        
        this._setupSocketEvents();
    };
    
    this._setupSocketEvents = function() {
        var self = this;
        
        // Eventos de conexão
        s_oSocketManager.addEventListener('connected', function(data) {
            console.log('Multiplayer: Conectado ao servidor');
            self._showRoomSelector();
        });
        
        s_oSocketManager.addEventListener('disconnected', function(data) {
            console.log('Multiplayer: Desconectado do servidor');
            _bIsMultiplayer = false;
            if (_oRoomSelector) {
                _oRoomSelector.hide();
            }
        });
        
        // Eventos de sala
        s_oSocketManager.addEventListener('room_joined', function(data) {
            console.log('Multiplayer: Entrou na sala', data.room.config.name);
            _bIsMultiplayer = true;
            self._onRoomJoined(data);
            if (_oRoomSelector) {
                _oRoomSelector.hide();
            }
        });
        
        s_oSocketManager.addEventListener('room_join_error', function(data) {
            console.error('Multiplayer: Erro ao entrar na sala:', data.error);
            self._showMessage('Erro', data.error);
        });
        
        s_oSocketManager.addEventListener('player_joined', function(data) {
            console.log('Multiplayer: Novo jogador:', data.player.name);
            self._addOtherPlayer(data.player);
            self._updateRoomInfo(data.room);
        });
        
        s_oSocketManager.addEventListener('player_left', function(data) {
            console.log('Multiplayer: Jogador saiu:', data.playerId);
            self._removeOtherPlayer(data.playerId);
            self._updateRoomInfo(data.room);
        });
        
        // Eventos de apostas
        s_oSocketManager.addEventListener('bet_placed', function(data) {
            console.log('Multiplayer: Aposta confirmada pelo servidor');
            // A aposta já foi processada localmente, apenas confirma
        });
        
        s_oSocketManager.addEventListener('bet_error', function(data) {
            console.error('Multiplayer: Erro na aposta:', data.error);
            self._showMessage('Erro na Aposta', data.error);
            // Reverter aposta local se necessário
        });
        
        s_oSocketManager.addEventListener('player_bet_placed', function(data) {
            console.log('Multiplayer: Outro jogador apostou:', data.amount);
            self._showOtherPlayerBet(data);
        });
        
        // Eventos de dados
        s_oSocketManager.addEventListener('dice_rolled', function(data) {
            console.log('Multiplayer: Dados lançados pelo servidor:', data.diceResult);
            self._processDiceResult(data);
        });
        
        s_oSocketManager.addEventListener('roll_error', function(data) {
            console.error('Multiplayer: Erro ao rolar dados:', data.error);
            self._showMessage('Erro', data.error);
        });
        
        s_oSocketManager.addEventListener('dice_animation_complete', function(data) {
            console.log('Multiplayer: Animação dos dados completa');
            self._onDiceAnimationComplete(data);
        });
        
        // Eventos do dealer
        s_oSocketManager.addEventListener('dealer_assigned', function(data) {
            console.log('Multiplayer: Você é o dealer agora!');
            self._updateDealerStatus(true);
        });
    };
    
    this._showRoomSelector = function() {
        if (_oRoomSelector) {
            _oRoomSelector.show();
            return;
        }
        
        // Criar seletor de salas
        _oRoomSelector = new CRoomSelector();
    };
    
    this._onRoomJoined = function(data) {
        var roomInfo = data.room;
        var player = data.player;
        
        console.log('Configurando jogo multiplayer para sala:', roomInfo.config.name);
        
        // Atualizar configurações do jogo baseadas na sala
        if (s_oGame) {
            MIN_BET = roomInfo.config.min_bet;
            MAX_BET = roomInfo.config.max_bet;
            
            // Atualizar saldo do jogador
            if (s_oGame._oMySeat) {
                s_oGame._oMySeat.setCredit(player.balance);
            }
            
            // Atualizar interface
            if (s_oGame._oInterface) {
                s_oGame._oInterface.setMoney(player.balance);
                s_oGame._oInterface.updateMultiplayerInfo(roomInfo, player.isDealer);
            }
        }
        
        // Armazenar outros jogadores
        _aOtherPlayers = [];
        if (roomInfo.players) {
            for (var i = 0; i < roomInfo.players.length; i++) {
                var roomPlayer = roomInfo.players[i];
                if (roomPlayer.id !== player.id) {
                    _aOtherPlayers.push(roomPlayer);
                }
            }
        }
        
        this._updateDealerStatus(player.isDealer);
    };
    
    this._updateDealerStatus = function(bIsDealer) {
        if (s_oGame && s_oGame._oInterface) {
            s_oGame._oInterface.updateDealerStatus(bIsDealer);
        }
        
        if (bIsDealer) {
            this._showMessage('Dealer', 'Você é o dealer! Pode rolar os dados quando houver apostas.');
        }
    };
    
    this._addOtherPlayer = function(player) {
        // Verificar se já existe
        for (var i = 0; i < _aOtherPlayers.length; i++) {
            if (_aOtherPlayers[i].id === player.id) {
                _aOtherPlayers[i] = player;
                return;
            }
        }
        
        _aOtherPlayers.push(player);
        this._showMessage('Novo Jogador', player.name + ' entrou na mesa!');
    };
    
    this._removeOtherPlayer = function(playerId) {
        for (var i = 0; i < _aOtherPlayers.length; i++) {
            if (_aOtherPlayers[i].id === playerId) {
                var playerName = _aOtherPlayers[i].name;
                _aOtherPlayers.splice(i, 1);
                this._showMessage('Jogador Saiu', playerName + ' saiu da mesa.');
                break;
            }
        }
    };
    
    this._updateRoomInfo = function(roomInfo) {
        if (s_oGame && s_oGame._oInterface) {
            var currentPlayer = s_oSocketManager.getCurrentPlayer();
            s_oGame._oInterface.updateMultiplayerInfo(roomInfo, currentPlayer ? currentPlayer.isDealer : false);
        }
    };
    
    this._showOtherPlayerBet = function(data) {
        var playerName = 'Jogador';
        
        // Encontrar nome do jogador
        for (var i = 0; i < _aOtherPlayers.length; i++) {
            if (_aOtherPlayers[i].id === data.playerId) {
                playerName = _aOtherPlayers[i].name;
                break;
            }
        }
        
        // Mostrar notificação visual
        if (s_oGame) {
            new CScoreText(playerName + ' apostou R$' + data.amount, 
                          CANVAS_WIDTH/2, 150, '#FFD700');
        }
        
        this._updateRoomInfo(data.room);
    };
    
    this._processDiceResult = function(data) {
        if (!s_oGame) return;
        
        console.log('Processando resultado dos dados:', data.diceResult, 'Estado:', data.gameState.phase);
        
        // Aplicar resultado dos dados recebido do servidor
        s_oGame.setDiceResult(data.diceResult);
        s_oGame.setGameState(this._convertServerStateToLocal(data.gameState.phase));
        
        // Iniciar animação local
        var oDicesAnim = s_oGame.getDicesAnim();
        if (oDicesAnim) {
            oDicesAnim.startRolling(data.diceResult);
        }
        
        // Atualizar ponto se necessário
        var oPuck = s_oGame.getPuck();
        if (data.gameState.pointNumber > 0) {
            s_oGame.setPointNumber(data.gameState.pointNumber);
            if (oPuck && s_oGameSettings) {
                var iPuckX = s_oGameSettings.getPuckXByNumber(data.gameState.pointNumber);
                oPuck.switchOn(iPuckX);
            }
        } else {
            s_oGame.setPointNumber(-1);
            if (oPuck) {
                oPuck.switchOff();
            }
        }
        
        // Atualizar interface
        var oInterface = s_oGame.getInterface();
        if (oInterface) {
            var sum = data.diceResult[0] + data.diceResult[1];
            var message = "Dados lançados: " + data.diceResult[0] + " + " + data.diceResult[1] + " = " + sum;
            oInterface.showMultiplayerMessage(message, "#FFD700");
        }
        
        // Sincronizar estado do jogo com outros jogadores
        this._syncGameState(data);
    };
    
    this._onDiceAnimationComplete = function(data) {
        if (!s_oGame) return;
        
        console.log('Animação dos dados completa, processando resultados...');
        
        // Processar resultados do servidor
        var currentPlayer = s_oSocketManager.getCurrentPlayer();
        if (currentPlayer) {
            // Atualizar saldo baseado nos dados do servidor
            s_oGame.setMoney(currentPlayer.balance);
        }
        
        // Processar resultados para todos os jogadores
        this._processGameResults(data.room);
        
        this._updateRoomInfo(data.room);
        
        // Reabilitar interface se não está rolando
        var oInterface = s_oGame.getInterface();
        if (oInterface && !data.room.gameState.isRolling) {
            oInterface.hideBlock();
            oInterface.enableBetFiches();
            
            // Habilitar botão de rolar apenas se é dealer
            if (this.isDealer()) {
                oInterface.enableRoll(true);
            }
        }
    };
    
    this._syncGameState = function(data) {
        // Sincronizar apostas e estado de jogo
        if (data.room && data.room.players) {
            var aOtherPlayers = [];
            var currentPlayerId = s_oSocketManager.getCurrentPlayer().id;
            
            for (var i = 0; i < data.room.players.length; i++) {
                var player = data.room.players[i];
                if (player.id !== currentPlayerId) {
                    aOtherPlayers.push(player);
                }
            }
            
            // Atualizar lista de outros jogadores
            _aOtherPlayers = aOtherPlayers;
            
            // Atualizar display dos jogadores na interface
            var oInterface = s_oGame.getInterface();
            if (oInterface) {
                oInterface.updatePlayersDisplay(aOtherPlayers);
            }
        }
    };
    
    this._processGameResults = function(roomInfo) {
        if (!roomInfo || !roomInfo.players) return;
        
        var currentPlayerId = s_oSocketManager.getCurrentPlayer().id;
        
        // Mostrar resultados para todos os jogadores
        for (var i = 0; i < roomInfo.players.length; i++) {
            var player = roomInfo.players[i];
            if (player.id !== currentPlayerId) {
                // Mostrar mudanças de saldo de outros jogadores (se implementado no servidor)
                this._showPlayerResult(player);
            }
        }
        
        // Atualizar estado do jogo local
        var gameState = roomInfo.gameState;
        if (gameState) {
            s_oGame.setGameState(this._convertServerStateToLocal(gameState.phase));
            
            if (gameState.pointNumber > 0) {
                s_oGame.setPointNumber(gameState.pointNumber);
            } else {
                s_oGame.setPointNumber(-1);
            }
        }
    };
    
    this._showPlayerResult = function(player) {
        // Mostrar resultado visual para outros jogadores
        var oInterface = s_oGame.getInterface();
        if (oInterface) {
            var oIndicator = s_oStage.getChildByName("player_" + player.id);
            if (oIndicator) {
                // Animação simples de resultado
                createjs.Tween.get(oIndicator)
                    .to({scaleX: 1.2, scaleY: 1.2}, 200)
                    .to({scaleX: 1, scaleY: 1}, 200);
            }
        }
    };
    
    this._convertServerStateToLocal = function(serverPhase) {
        switch(serverPhase) {
            case 'waiting_for_bet':
                return STATE_GAME_WAITING_FOR_BET;
            case 'come_out':
                return STATE_GAME_COME_OUT;
            case 'come_point':
                return STATE_GAME_COME_POINT;
            default:
                return STATE_GAME_WAITING_FOR_BET;
        }
    };
    
    this._showMessage = function(title, message) {
        if (s_oGame && s_oGame._oMsgBox) {
            s_oGame._oMsgBox.show(title + ': ' + message);
        } else {
            console.log('[' + title + '] ' + message);
        }
    };
    
    // Métodos públicos para integração com o jogo
    this.isMultiplayer = function() {
        return _bIsMultiplayer;
    };
    
    this.isDealer = function() {
        return s_oSocketManager ? s_oSocketManager.isDealer() : false;
    };
    
    this.placeBet = function(amount, betType) {
        if (!_bIsMultiplayer) return false;
        
        return s_oSocketManager.placeBet(amount, betType || 'main_bet');
    };
    
    this.rollDice = function() {
        if (!_bIsMultiplayer) return false;
        
        return s_oSocketManager.rollDice();
    };
    
    this.clearBets = function() {
        if (!_bIsMultiplayer) return false;
        
        return s_oSocketManager.clearBets();
    };
    
    this.getOtherPlayers = function() {
        return _aOtherPlayers;
    };
    
    this.getRoomInfo = function() {
        return s_oSocketManager ? s_oSocketManager.getRoomData() : null;
    };
    
    this.leaveRoom = function() {
        if (!_bIsMultiplayer) return false;
        
        _bIsMultiplayer = false;
        return s_oSocketManager.leaveRoom();
    };
    
    this._init();
    return this;
}

// Seletor de salas
function CRoomSelector() {
    var _oContainer;
    var _oBg;
    var _oTitleText;
    var _aRoomButtons = [];
    var _bVisible = false;
    
    this._init = function() {
        _oContainer = new createjs.Container();
        s_oStage.addChild(_oContainer);
        
        // Background semi-transparente
        _oBg = new createjs.Shape();
        _oBg.graphics.beginFill("rgba(0,0,0,0.8)").drawRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        _oContainer.addChild(_oBg);
        
        // Título
        _oTitleText = new createjs.Text("ESCOLHA UMA MESA", "bold 32px " + FONT1, "#FFFFFF");
        _oTitleText.x = CANVAS_WIDTH/2;
        _oTitleText.y = 100;
        _oTitleText.textAlign = "center";
        _oContainer.addChild(_oTitleText);
        
        this._loadRooms();
    };
    
    this._loadRooms = function() {
        var self = this;
        
        // Buscar salas disponíveis
        if (s_oSocketManager) {
            s_oSocketManager.fetchAvailableRooms(function(rooms) {
                if (rooms) {
                    self._createRoomButtons(rooms);
                }
            });
        }
    };
    
    this._createRoomButtons = function(rooms) {
        var roomIds = Object.keys(rooms);
        var startY = 200;
        var buttonHeight = 120;
        var margin = 20;
        
        for (var i = 0; i < roomIds.length; i++) {
            var roomId = roomIds[i];
            var room = rooms[roomId];
            var y = startY + (i * (buttonHeight + margin));
            
            this._createRoomButton(roomId, room, y);
        }
    };
    
    this._createRoomButton = function(roomId, room, y) {
        var self = this;
        
        // Container do botão
        var oButtonContainer = new createjs.Container();
        oButtonContainer.x = CANVAS_WIDTH/2 - 300;
        oButtonContainer.y = y;
        _oContainer.addChild(oButtonContainer);
        
        // Background do botão
        var oButtonBg = new createjs.Shape();
        oButtonBg.graphics.beginFill("#2B5D31").drawRoundRect(0, 0, 600, 100, 10);
        oButtonContainer.addChild(oButtonBg);
        
        // Border
        var oBorder = new createjs.Shape();
        oBorder.graphics.beginStroke("#4CAF50").setStrokeStyle(2).drawRoundRect(0, 0, 600, 100, 10);
        oButtonContainer.addChild(oBorder);
        
        // Nome da sala
        var oRoomName = new createjs.Text(room.config.name, "bold 24px " + FONT1, "#FFFFFF");
        oRoomName.x = 20;
        oRoomName.y = 15;
        oButtonContainer.addChild(oRoomName);
        
        // Informações da sala
        var sInfo = "Jogadores: " + room.playerCount + "/" + room.maxPlayers;
        sInfo += " | Aposta mín: R$" + room.config.min_bet;
        if (room.config.max_bet) {
            sInfo += " | Aposta máx: R$" + room.config.max_bet;
        } else {
            sInfo += " | Sem limite máximo";
        }
        
        var oRoomInfo = new createjs.Text(sInfo, "16px " + FONT1, "#CCCCCC");
        oRoomInfo.x = 20;
        oRoomInfo.y = 45;
        oButtonContainer.addChild(oRoomInfo);
        
        // Status do jogo
        var sStatus = "Estado: " + this._getGameStateText(room.gameState.phase);
        if (room.gameState.pointNumber > 0) {
            sStatus += " | Ponto: " + room.gameState.pointNumber;
        }
        
        var oGameStatus = new createjs.Text(sStatus, "14px " + FONT1, "#FFD700");
        oGameStatus.x = 20;
        oGameStatus.y = 70;
        oButtonContainer.addChild(oGameStatus);
        
        // Indicador de sala lotada
        if (room.playerCount >= room.maxPlayers) {
            var oFullIndicator = new createjs.Text("LOTADA", "bold 16px " + FONT1, "#FF4444");
            oFullIndicator.x = 520;
            oFullIndicator.y = 40;
            oButtonContainer.addChild(oFullIndicator);
        }
        
        // Interatividade
        oButtonContainer.cursor = "pointer";
        oButtonContainer.addEventListener("click", function() {
            if (room.playerCount < room.maxPlayers) {
                self._joinRoom(roomId);
            } else {
                self._showMessage("Sala Lotada", "Esta sala está cheia no momento.");
            }
        });
        
        // Hover effect
        oButtonContainer.addEventListener("mouseover", function() {
            oButtonBg.graphics.clear().beginFill("#356B3D").drawRoundRect(0, 0, 600, 100, 10);
        });
        
        oButtonContainer.addEventListener("mouseout", function() {
            oButtonBg.graphics.clear().beginFill("#2B5D31").drawRoundRect(0, 0, 600, 100, 10);
        });
        
        _aRoomButtons.push(oButtonContainer);
    };
    
    this._getGameStateText = function(phase) {
        switch(phase) {
            case 'waiting_for_bet': return 'Aguardando Apostas';
            case 'come_out': return 'Primeira Jogada';
            case 'come_point': return 'Fase do Ponto';
            default: return 'Aguardando';
        }
    };
    
    this._joinRoom = function(roomId) {
        if (!s_oSocketManager) return;
        
        var playerData = {
            name: 'Jogador' + Math.floor(Math.random() * 1000),
            balance: 1000
        };
        
        // Tentar obter nome do usuário autenticado
        if (window.sb && window.sb.auth) {
            window.sb.auth.getUser().then(function(u) {
                var user = u.data && u.data.user;
                if (user && user.email) {
                    playerData.name = user.email.split('@')[0];
                }
                
                s_oSocketManager.joinRoom(roomId, playerData);
            }).catch(function() {
                s_oSocketManager.joinRoom(roomId, playerData);
            });
        } else {
            s_oSocketManager.joinRoom(roomId, playerData);
        }
    };
    
    this._showMessage = function(title, message) {
        alert(title + ': ' + message);
    };
    
    this.show = function() {
        if (_bVisible) return;
        
        _oContainer.visible = true;
        _bVisible = true;
        
        // Recarregar salas quando mostrar
        this._loadRooms();
    };
    
    this.hide = function() {
        if (!_bVisible) return;
        
        _oContainer.visible = false;
        _bVisible = false;
    };
    
    this._init();
    return this;
}

// Instância global
var s_oMultiplayerGame = null;