function CGame(oData){
    var _bUpdate = false;
    var _bDistributeFiches;
    var _iState;
    var _iTimeElaps;
    var _iNumberPoint;
    var _iContRolling;
    var _iMaxNumRolling;
    var _iCasinoCash;
    var _iHandCont;

    var _aDiceResultHistory;
    var _aDiceResult;
    var _aFichesToMove;
    var _aBetHistory;
    var _aBetsToRemove;
        
    var _oMySeat;
    var _oDicesAnim;
    var _oPuck;
    var _oInterface;
    var _oTableController;
    var _oMsgBox;
    var _oGameOverPanel;
    var _oAreYouSurePanel;
    var _oDiceHistory;
    var _sCurrentRoom = null;
    
    // NOVAS VARIÁVEIS PARA CONTROLE DE APOSTA E TURNO
    var _iLastWinAmount = 0;  // Último valor ganho
    var _bMustBetFullWin = false;  // Flag: deve apostar valor inteiro ganho
    var _bIsMyTurn = true;  // Flag: é minha vez de jogar (default true para single player)
    var _iLockedBalance = 0;  // Saldo travado (aposta obrigatória até passar o dado)
    
    // CONTROLE DE APOSTAS NA FASE POINT
    var _bPointBettingOpen = false;  // Flag: período de apostas no ponto está aberto
    var _iPointBettingTimer = null;  // Timer para fechar apostas após 7 segundos
    
    // APOSTAS ESPECÍFICAS NO PONTO E NO 7
    var _aPointBets = {};  // Objeto para armazenar apostas no ponto por jogador
    var _aSevenBets = {};  // Objeto para armazenar apostas no 7 por jogador
    
    
    this._init = function(){
        s_oTweenController = new CTweenController();
        s_oGameSettings = new CGameSettings();
        
        _oTableController = new CTableController();
        _oTableController.addEventListener(ON_SHOW_ENLIGHT,this._onShowEnlight);
        _oTableController.addEventListener(ON_HIDE_ENLIGHT,this._onHideEnlight);
        _oTableController.addEventListener(ON_SHOW_BET_ON_TABLE,this._onShowBetOnTable);
        
        _bDistributeFiches = false;
        _iHandCont = 0;
        _iState=-1;
        
        // Initialize rolling flag to prevent double-clicks
        this._isRolling = false;

        _iNumberPoint = -1;

        _aBetHistory = new Object();

        _oMySeat = new CSeat();
        _oPuck = new CPuck(375,108,s_oStage); // Ajustado para acompanhar a mesa (era 325)
        
        _oInterface = new CInterface();
        
        _oDicesAnim = new CDicesAnim(290,159); // Ajustado para acompanhar a mesa (era 240)
        
        _oAreYouSurePanel = new CAreYouSurePanel(s_oStage);
        _oGameOverPanel = new CGameOver();

        _oMsgBox = new CMsgBox();
        
        // Initialize dice history panel
        _oDiceHistory = new CDiceHistory();

        _aDiceResultHistory=new Array();

        _iTimeElaps=0;
        this._onSitDown();
	
        _bUpdate = true;
    };
    
    this.unload = function(){
        _oInterface.unload();
        _oTableController.unload();
        _oMsgBox.unload();
        _oGameOverPanel.unload();
        _oDicesAnim.unload();
        if (_oDiceHistory) {
            _oDiceHistory.unload();
        }

        s_oStage.removeAllChildren();
    };

    this._setState = function(iState){
        _iState=iState;

        switch(iState){
            case STATE_GAME_WAITING_FOR_BET:{
                if (_oMySeat.getCredit() < s_oGameSettings.getFicheValues(0)) {
                    _iState = -1;
                    setTimeout(function(){_oInterface.hideBlock();
                                            _oGameOverPanel.show();
                                        },2000);
                    return;
                }
                _iNumberPoint = -1;
                _iContRolling = 0;
                _iMaxNumRolling = Math.floor(Math.random() * (6 - 3) + 3);
                _oInterface.enableClearButton();

                if(_oMySeat.getCurBet() === 0){
                    _oInterface.enableRoll(false);
                }
                
                // Verificar se está em modo multiplayer ou single player
                var isMultiplayer = window.GameClientSocketIO && 
                                   window.GameClientSocketIO.isConnected && 
                                   window.GameClientSocketIO.isAuthenticated;
                
                // Em single player, sempre habilita fichas
                // Em multiplayer, só habilita se for o turno do jogador
                if (!isMultiplayer) {
                    _oInterface.enableBetFiches();
                    _bIsMyTurn = true; // Single player sempre é seu turno
                } else {
                    // Em multiplayer, resetar controle de fichas baseado no turno
                    if(_bIsMyTurn){
                        _oInterface.enableBetFiches();
                        _oInterface.enableClearButton();
                    } else {
                        _oInterface.disableBetFiches();
                        _oInterface.disableClearButton();
                        console.log("🔒 Fase POINT terminou - Aguarde sua vez para apostar");
                    }
                }
                
                _iHandCont++;
                if(_iHandCont > NUM_HAND_FOR_ADS){
                    _iHandCont = 0;
                    $(s_oMain).trigger("show_interlevel_ad");
                }
                
                _oInterface.hideBlock();
                break;
            }
        }
        
        _oTableController.setState(iState);
    };
    
    
    
    this._prepareForRolling = function(){
        _oInterface.disableBetFiches();
        _oInterface.disableClearButton();

        // Socket.IO Pure System - All dice rolling is handled by game-socketio-integration.js
        // That file overrides onRoll to intercept roll requests and send them to Socket.IO server
        // The server responds with dice_rolled event which is caught by the integration
        // This function just sets up the UI for rolling
        
        if (window.GameClientSocketIO && window.GameClientSocketIO.isConnected && window.GameClientSocketIO.isAuthenticated){
            console.log('🎲 Socket.IO conectado - lançamento de dados será tratado pelo servidor');
            _oInterface.showMessage("Aguardando resultado...");
            // The actual roll request is sent by game-socketio-integration.js override
            // Server will broadcast dice_rolled event to all players
            return;
        }

        // Fallback to local roll if Socket.IO not connected (offline mode)
        console.log('⚠️ Socket.IO não conectado - usando lançamento local');
        _iContRolling++;
        _aDiceResult = new Array();
        this._generateWinLoss();
        _aDiceResultHistory.push(_aDiceResult);
        _iTimeElaps = 0;
    };
    
    this._generateWinLoss = function(){
        // Para o novo sistema simplificado, vamos gerar dados aleatórios simples
        // sem a lógica complexa de ganho/perda baseada em apostas específicas
        var aDices = this._generateRandomDices();
        _aDiceResult[0] = aDices[0];
        _aDiceResult[1] = aDices[1];
    };
    
    this._generateRandomDices = function(){
        var aRandDices = new Array();
        var iRand = Math.floor(Math.random()*6) + 1;
        aRandDices.push(iRand);
        var iRand = Math.floor(Math.random()*6) + 1;
        aRandDices.push(iRand);
        
        return aRandDices;
    };
    
    this._checkHardwayWin = function(szBet){
        var iDice1 = 6;
        var iDice2 = 6;
        switch(szBet){
            case "hardway6":{
                iDice1 = 3;
                iDice2 = 3;    
                break;
            }
            case "hardway10":{
                iDice1 = 5;
                iDice2 = 5;
                break;
            }
            case "hardway8":{
                iDice1 = 4;
                iDice2 = 4;
                break;
            }
            case "hardway4":{
                iDice1 = 2;
                iDice2 = 2;
                break;
            }
        }

        do{
            var aDices = this._generateRandomDices();
        }while(aDices[0] !== iDice1 || aDices[1] !== iDice2);
        
        return aDices;
    };
    
    this._startRollingAnim = function(){
        // Validate dice result before starting animation
        if (!_aDiceResult || _aDiceResult.length !== 2 || 
            typeof _aDiceResult[0] !== 'number' || typeof _aDiceResult[1] !== 'number' ||
            _aDiceResult[0] < 1 || _aDiceResult[0] > 6 || 
            _aDiceResult[1] < 1 || _aDiceResult[1] > 6) {
            console.error('❌ Não é possível iniciar animação - resultado de dados inválido:', _aDiceResult);
            console.error('   Redefinindo estado do jogo...');
            _oInterface.hideBlock();
            
            // Só habilita fichas se for single player OU se for o turno do jogador
            var isMultiplayer = window.GameClientSocketIO && 
                               window.GameClientSocketIO.isConnected && 
                               window.GameClientSocketIO.isAuthenticated;
            if (!isMultiplayer || _bIsMyTurn) {
                _oInterface.enableBetFiches();
            }
            
            this._isRolling = false;
            return;
        }
        _oDicesAnim.startRolling(_aDiceResult);
    };

    // Recebe início da rolagem do servidor (todos os jogadores veem a animação)
    this.onDiceRollStart = function(data){
        console.log('onDiceRollStart called with data:', data);
        
        // Todos os jogadores na sala veem a animação começar
        var isMyRoll = false;
        var currentUserId = null;
        
        // Get current user synchronously if possible
        if (window.sb && window.sb.auth) {
            try {
                // Try to get cached user first
                var cachedUser = window.sb.auth.getUser();
                if (cachedUser && cachedUser.then) {
                    // It's a promise, handle async
                    cachedUser.then(function(response) {
                        var user = response.data && response.data.user;
                        if (user && data && data.shooter) {
                            var wasMyRoll = (user.id === data.shooter);
                            console.log('Async user check - isMyRoll:', wasMyRoll, 'user:', user.id, 'shooter:', data.shooter);
                        }
                    });
                } else if (cachedUser && cachedUser.data && cachedUser.data.user) {
                    // Synchronous result
                    currentUserId = cachedUser.data.user.id;
                    isMyRoll = (currentUserId === data.shooter);
                }
            } catch (error) {
                console.warn('Erro ao obter usuário atual:', error);
            }
        }
        
        // Mostrar mensagem indicando quem está lançando os dados
        var shooterMsg;
        if(isMyRoll){
            shooterMsg = "VOCÊ está lançando os dados!";
        } else {
            // Try to get player info from current turn data
            var playerNum = "outro jogador";
            if(this._currentTurnData && this._currentTurnData.playerIndex){
                playerNum = "JOGADOR " + this._currentTurnData.playerIndex;
            }
            shooterMsg = playerNum + " está lançando os dados...";
        }
        
        console.log('Showing dice roll message:', shooterMsg);
        _oInterface.showMessage(shooterMsg);
        
        // Preparar para animação (sem gerar resultado ainda)
        _oInterface.disableBetFiches();
        _oInterface.disableClearButton();
        _oInterface.showBlock();
        
        // Iniciar animação de rolagem sem resultado definido ainda
        console.log('Starting dice animation for all players');
        _oDicesAnim.startRollingWithoutResult();
    };

    // Recebe resultado da rolagem do servidor e finaliza a animação
    this.onServerRoll = function(roll){
        _aDiceResult = [roll.d1, roll.d2];
        _aDiceResultHistory.push(_aDiceResult);
        _iTimeElaps = 0;
        
        // Finalizar animação com o resultado
        _oDicesAnim.finishRollingWithResult(_aDiceResult);
    };

    // Atualizações de turno vindas do servidor
    this.onTurnUpdate = function(data){
        // Store turn data for use in other parts of the game
        this._currentTurnData = data;
        
        var isMyTurn = false;
        if (data && data.isMyTurn !== undefined) {
            isMyTurn = data.isMyTurn;
        } else if (window.sb && window.sb.auth && data && data.playerId) {
            window.sb.auth.getUser().then(function(response) {
                var user = response.data && response.data.user;
                if (user) {
                    isMyTurn = (user.id === data.playerId);
                }
            });
        }
        
        // ATUALIZAR FLAG DE TURNO
        _bIsMyTurn = isMyTurn;
        
        // Só permite rolar se for meu turno E se há aposta ativa
        var canRoll = isMyTurn && _oMySeat.getCurBet() > 0;
        _oInterface.enableRoll(canRoll);
        
        // Habilitar botão "Passar o Dado" apenas se for meu turno
        _oInterface.enablePassDice(isMyTurn);
        
        // CONTROLE DAS FICHAS E BOTÕES: Habilitar quando for o turno do jogador
        // OU durante os 7 SEGUNDOS de apostas no POINT
        if (isMyTurn || _bPointBettingOpen) {
            _oInterface.enableBetFiches();
            if (isMyTurn) {
                _oInterface.enableClearButton();
            } else if (_bPointBettingOpen) {
                _oInterface.enableClearButton(); // Pode limpar suas próprias apostas durante o período de apostas
            }
        } else {
            _oInterface.disableBetFiches();
            _oInterface.disableClearButton();
        }
        
        // Show clear feedback about turn status
        if (isMyTurn) {
            if (_oMySeat.getCurBet() > 0) {
                _oInterface.showMessage("SUA VEZ! Clique para lançar os dados");
                setTimeout(function() {
                    if (_oInterface && _oInterface.hideMessage) {
                        _oInterface.hideMessage();
                    }
                }, 2000);
            } else {
                _oInterface.showMessage("Faça uma aposta primeiro!");
                setTimeout(function() {
                    if (_oInterface && _oInterface.hideMessage) {
                        _oInterface.hideMessage();
                    }
                }, 2000);
            }
        } else {
            _oInterface.showMessage("AGUARDE SUA VEZ...");
        }
        
        // Update turn display immediately
        if(_oInterface && _oInterface.updateTurnTimer){
            var playerInfo = {
                isMyTurn: isMyTurn,
                playerIndex: data.playerIndex,
                totalPlayers: data.totalPlayers
            };
            // Show initial timer with full time if available
            var remainingTime = data.endsAt ? Math.max(0, Math.ceil((data.endsAt - Date.now())/1000)) : 45;
            _oInterface.updateTurnTimer(remainingTime, playerInfo);
        }
    };
    
    this.dicesAnimEnded = function(){
        try {
            var iSumDices = _aDiceResult[0] + _aDiceResult[1];
            
            // Inicializar arrays se não estiverem definidos
            if(!_aBetsToRemove) _aBetsToRemove = new Array();
            if(!_aFichesToMove) _aFichesToMove = new Array();
            
            // Verificar se estamos em um estado válido
            if(_iState < 0 || _iState > 2){
                console.error("Estado inválido:", _iState);
                _iState = STATE_GAME_WAITING_FOR_BET;
                return;
            }

        if(_iState === STATE_GAME_COME_OUT){

            //FIRST SHOOT
            if(iSumDices !== 2 && iSumDices !== 3 && iSumDices !== 12 && iSumDices !== 7 && iSumDices !== 11){
                //ASSIGN NUMBER
                this._assignNumber(iSumDices);
            }
            
            this._checkWinForBet();
            
            if(_aFichesToMove && _aFichesToMove.length > 0){
                _bDistributeFiches = true;
                
                if(_aBetsToRemove && _aBetsToRemove.length > 0){
                    for(var j=0;j<_aBetsToRemove.length;j++){
                        _oMySeat.removeBet(_aBetsToRemove[j]);
                        delete _aBetHistory[_aBetsToRemove[j]];
                    }
                }
                
                
                _oInterface.setCurBet(_oMySeat.getCurBet());
                
            }
            
            if(_iNumberPoint !== -1){
                this._setState(STATE_GAME_COME_POINT);
            }
        }else{
            this._checkWinForBet();
            
            // Verificar se ainda há apostas ativas na fase de ponto
            if(_iState === STATE_GAME_COME_POINT && Object.keys(_aBetHistory).length === 0){
                // Se não há apostas, volta para o estado de espera
                _iNumberPoint = -1;
                this._setState(STATE_GAME_WAITING_FOR_BET);
            }
            
            if(_aFichesToMove && _aFichesToMove.length > 0){
                _bDistributeFiches = true;
                
                if(_aBetsToRemove && _aBetsToRemove.length > 0){
                    for(var j=0;j<_aBetsToRemove.length;j++){
                        _oMySeat.removeBet(_aBetsToRemove[j]);
                        delete _aBetHistory[_aBetsToRemove[j]];
                    }
                }
                
                _oInterface.setCurBet(_oMySeat.getCurBet());
            }
            
            if(_iNumberPoint === iSumDices){
                //PASS LINE WINS
                _oPuck.switchOff();
                
                // FECHAR período de apostas do POINT
                _bPointBettingOpen = false;
                if(_iPointBettingTimer){
                    clearTimeout(_iPointBettingTimer);
                    _iPointBettingTimer = null;
                }
                
                // OCULTAR BOTÕES
                _oInterface.hidePointBettingButtons();
                
                this._setState(STATE_GAME_WAITING_FOR_BET);
                
            }else if(iSumDices === 7){
                //END TURN (SEVEN OUT)
                _oPuck.switchOff();
                
                // FECHAR período de apostas do POINT
                _bPointBettingOpen = false;
                if(_iPointBettingTimer){
                    clearTimeout(_iPointBettingTimer);
                    _iPointBettingTimer = null;
                }
                
                // OCULTAR BOTÕES
                _oInterface.hidePointBettingButtons();
                
                this._setState(STATE_GAME_WAITING_FOR_BET);
            }
        }
        
        
        _oInterface.setMoney(_oMySeat.getCredit());
        if(Object.keys(_aBetHistory).length > 0){
            _oInterface.enableRoll(true);
            _oInterface.enableClearButton();
        }
        
        _oInterface.hideBlock();
        
        // Só habilita fichas se for single player OU se for o turno do jogador
        var isMultiplayer = window.GameClientSocketIO && 
                           window.GameClientSocketIO.isConnected && 
                           window.GameClientSocketIO.isAuthenticated;
        if (!isMultiplayer || _bIsMyTurn) {
            _oInterface.enableBetFiches();
        }
        
        $(s_oMain).trigger("save_score",[_oMySeat.getCredit()]);
        
        // Reset rolling flag to allow next roll
        this._isRolling = false;
        
        // SISTEMA DE RODADAS: Liberar turno após um delay (simula passar para próximo jogador)
        // Em modo single player, libera imediatamente
        // Em multiplayer, isso seria controlado pelo servidor
        setTimeout(function(){
            _bIsMyTurn = true;
            if(_oMySeat.getCurBet() > 0){
                _oInterface.enableRoll(true);
            }
            console.log("✅ Turno liberado! Você pode jogar novamente.");
        }, 1000); // 1 segundo de delay para dar tempo de ver o resultado
        
        } catch(error) {
            console.error("Erro em dicesAnimEnded:", error);
            // Reset do estado em caso de erro
            _aBetsToRemove = new Array();
            _aFichesToMove = new Array();
            _iState = STATE_GAME_WAITING_FOR_BET;
            this._isRolling = false; // Reset flag on error too
            _bIsMyTurn = true; // Liberar turno em caso de erro
        }
    };
    
    this._assignNumber = function(iNumber){
        _iNumberPoint = iNumber;
        
        //PLACE 'ON' PLACEHOLDER
        var iNewX = s_oGameSettings.getPuckXByNumber(_iNumberPoint);
        _oPuck.switchOn(iNewX);
        
        //ENABLE GUI
        _oInterface.hideBlock();
        
        // FASE POINT ESTABELECIDA: Abrir período de apostas por 7 SEGUNDOS
        // Outros jogadores têm 7 segundos para apostar no ponto ou no 7
        var isMultiplayer = window.GameClientSocketIO && 
                           window.GameClientSocketIO.isConnected && 
                           window.GameClientSocketIO.isAuthenticated;
        
        if(isMultiplayer){
            // ABRIR período de apostas
            _bPointBettingOpen = true;
            
            // Habilitar fichas para TODOS os jogadores
            _oInterface.enableBetFiches();
            _oInterface.enableClearButton();
            
            // MOSTRAR BOTÕES DE APOSTA NO PONTO E NO 7
            _oInterface.showPointBettingButtons(iNumber);
            
            console.log("📊 PONTO ESTABELECIDO EM " + iNumber + " - 7 SEGUNDOS PARA APOSTAR!");
            
            // Limpar timer anterior se existir
            if(_iPointBettingTimer){
                clearTimeout(_iPointBettingTimer);
            }
            
            // CONTADOR VISUAL: Mostrar segundos restantes
            var secondsLeft = 7;
            _oInterface.showMessage("PONTO: " + iNumber + " | APOSTE NO PONTO OU NO 7! ⏰ " + secondsLeft + "s");
            
            var countdownInterval = setInterval(function() {
                secondsLeft--;
                if(secondsLeft > 0 && _bPointBettingOpen){
                    _oInterface.showMessage("PONTO: " + iNumber + " | APOSTE NO PONTO OU NO 7! ⏰ " + secondsLeft + "s");
                } else {
                    clearInterval(countdownInterval);
                }
            }, 1000);
            
            // TIMER DE 7 SEGUNDOS: Após isso, fecha as apostas
            _iPointBettingTimer = setTimeout(function() {
                _bPointBettingOpen = false;
                clearInterval(countdownInterval);
                
                // OCULTAR BOTÕES DE APOSTA
                _oInterface.hidePointBettingButtons();
                
                // Desabilitar fichas para jogadores que NÃO são o atirador
                if(!_bIsMyTurn){
                    _oInterface.disableBetFiches();
                    _oInterface.disableClearButton();
                    console.log("⏰ TEMPO ESGOTADO - Apostas fechadas!");
                    _oInterface.showMessage("APOSTAS FECHADAS! Aguarde o atirador jogar.");
                    
                    setTimeout(function() {
                        if (_oInterface && _oInterface.hideMessage) {
                            _oInterface.hideMessage();
                        }
                    }, 2000);
                }
            }, 7000); // 7 segundos
        }
    };
    
    // FUNÇÕES REMOVIDAS - Não são mais necessárias porque a aposta contra o 7 é automática
    /*
    this._showContinueDialog = function(iNumber){
        // Mostra janela de confirmação quando sai um número de ponto
        console.log("Mostrando diálogo para número:", iNumber);
        
        var szPayout = "";
        if(iNumber === 4 || iNumber === 10) szPayout = "dobra o valor";
        else if(iNumber === 5 || iNumber === 9) szPayout = "paga 50%";
        else if(iNumber === 6 || iNumber === 8) szPayout = "paga 25%";
        
        var szMessage = "Resultado: " + iNumber + "!\n\nDeseja continuar apostando contra o 7?\n\n• Se sair 7: PERDE TUDO\n• Se sair " + iNumber + ": " + szPayout + "\n• Outros números: continua jogando";
        
        _oAreYouSurePanel.showCustom(szMessage, this._onContinueConfirm.bind(this, iNumber), this._onContinueCancel.bind(this));
    };
    
    this._onContinueConfirm = function(iNumber){
        // Usuário escolheu continuar - implementa aposta contra o 7
        _oInterface.hideBlock();
        this._setState(STATE_GAME_COME_POINT);
        _iNumberPoint = iNumber; // Define o número como ponto
        
        // Mostra mensagem explicativa
        new CScoreText("APOSTA CONTRA O 7 ATIVA! Ponto: " + iNumber, CANVAS_WIDTH/2, CANVAS_HEIGHT/2 - 50);
        
        // Coloca o puck no número correspondente
        var iNewX = s_oGameSettings.getPuckXByNumber(iNumber);
        _oPuck.switchOn(iNewX);
    };
    
    this._onContinueCancel = function(){
        // Usuário escolheu não continuar - volta ao estado normal
        _oInterface.hideBlock();
        this._setState(STATE_GAME_WAITING_FOR_BET);
        new CScoreText("Jogo cancelado. Faça uma nova aposta.", CANVAS_WIDTH/2, CANVAS_HEIGHT/2);
    };
    */

    
    this._checkWinForBet = function(){
        var iSumDices = _aDiceResult[0] + _aDiceResult[1];
        console.log("Verificando resultado dos dados:", iSumDices, "Estado:", _iState);
        
        // NOVA LÓGICA CONFORME ESPECIFICAÇÕES
        if(_iState === STATE_GAME_COME_OUT){
            // PRIMEIRO LANÇAMENTO
            if(iSumDices === 7 || iSumDices === 11){
                // 7-11: GANHA DOBRO
                var iTotalActiveBets = _oMySeat.getCurBet();
                if(iTotalActiveBets > 0){
                    var iAutoWin = iTotalActiveBets * 2; // Dobro
                    
                    // NOVA LÓGICA: Saldo ganho fica TRAVADO até passar o dado
                    _iLockedBalance = iAutoWin; // Travar o saldo ganho
                    
                    // NÃO adiciona ao saldo disponível ainda
                    // _oMySeat.showWin(iAutoWin); // REMOVIDO - não vai para saldo disponível
                    _iCasinoCash -= iAutoWin;
                    
                    // Atualizar interface - mostra valor ganho
                    _oInterface.setCurBet(_iLockedBalance);
                    
                    new CScoreText("GANHOU! +" + iAutoWin + TEXT_CURRENCY + "\n⚠️ PASSE O DADO PARA LIBERAR!", CANVAS_WIDTH/2, CANVAS_HEIGHT/2);
                    playSound("win", 0.2, false);
                }
                // Remove as fichas visualmente
                _oMySeat.clearAllBetsVisualOnly();
                _aBetHistory = {};
            } else if(iSumDices === 2 || iSumDices === 3 || iSumDices === 12){
                // 2-3-12: PERDE TUDO
                var iTotalActiveBets = _oMySeat.getCurBet();
                if(iTotalActiveBets > 0){
                    _oMySeat.decreaseBet(iTotalActiveBets);
                    playSound("lose", 0.2, false);
                    new CScoreText("PERDEU TUDO!", CANVAS_WIDTH/2, CANVAS_HEIGHT/2);
                }
                // Remove todas as apostas ativas
                _oMySeat.clearAllBets();
                _aBetHistory = {};
                _oInterface.setCurBet(_oMySeat.getCurBet());
                
                // PERDER também perde o saldo travado
                _iLockedBalance = 0;
                _oInterface.setCurBet(0);
                
                // Reset flag de aposta obrigatória ao perder
                _bMustBetFullWin = false;
                _iLastWinAmount = 0;
            } else if(iSumDices === 4 || iSumDices === 5 || iSumDices === 6 || iSumDices === 8 || iSumDices === 9 || iSumDices === 10){
                // NÚMEROS DE PONTO: CONTINUA AUTOMATICAMENTE APOSTANDO CONTRA O 7
                console.log("Número de ponto detectado:", iSumDices, "- continuando automaticamente");
                
                // Determina o pagamento baseado no número
                var szPayout = "";
                if(iSumDices === 4 || iSumDices === 10) szPayout = "dobra o valor";
                else if(iSumDices === 5 || iSumDices === 9) szPayout = "paga 50%";
                else if(iSumDices === 6 || iSumDices === 8) szPayout = "paga 25%";
                
                // Configura automaticamente a aposta contra o 7
                _iNumberPoint = iSumDices;
                this._setState(STATE_GAME_COME_POINT);
                
                // Mostra mensagem explicativa
                new CScoreText("APOSTA CONTRA O 7!\n• Se sair 7: PERDE TUDO\n• Se sair " + iSumDices + ": " + szPayout, CANVAS_WIDTH/2, CANVAS_HEIGHT/2 - 50);
                
                // Coloca o puck no número correspondente
                var iNewX = s_oGameSettings.getPuckXByNumber(iSumDices);
                _oPuck.switchOn(iNewX);
                
                return;
            }
        } else if(_iState === STATE_GAME_COME_POINT){
            // FASE DE PONTO - APOSTA CONTRA O 7
            if(iSumDices === 7){
                // SAIU 7: SHOOTER PERDE, mas quem apostou no 7 ganha!
                var iTotalActiveBets = _oMySeat.getCurBet();
                
                // Se o shooter tinha apostas ativas, ele perde
                if(iTotalActiveBets > 0){
                    _oMySeat.decreaseBet(iTotalActiveBets);
                    playSound("lose", 0.2, false);
                }
                
                // PROCESSAR APOSTAS NO 7
                if(_aSevenBets['seven'] && _aSevenBets['seven'] > 0){
                    var iSevenWin = _aSevenBets['seven'] * 4; // Multiplicador 4x para quem apostou no 7
                    _oMySeat.showWin(_aSevenBets['seven'] + iSevenWin); // Devolve aposta + ganho
                    _oInterface.setMoney(_oMySeat.getCredit());
                    
                    new CScoreText("SAIU 7! VOCÊ GANHOU " + iSevenWin + TEXT_CURRENCY + "!", CANVAS_WIDTH/2, CANVAS_HEIGHT/2 - 50);
                    playSound("win", 0.5, false);
                } else if(iTotalActiveBets > 0) {
                    new CScoreText("7 - SHOOTER PERDEU!", CANVAS_WIDTH/2, CANVAS_HEIGHT/2);
                }
                
                // PROCESSAR APOSTAS NO PONTO (perdem)
                if(_aPointBets[_iNumberPoint] && _aPointBets[_iNumberPoint] > 0){
                    console.log("❌ Apostas no ponto perderam:", _aPointBets[_iNumberPoint]);
                }
                
                // Limpar apostas no ponto e no 7
                _aPointBets = {};
                _aSevenBets = {};
                
                // Remove todas as apostas ativas do shooter
                _oMySeat.clearAllBets();
                _aBetHistory = {};
                _oInterface.setCurBet(_oMySeat.getCurBet());
                
                // Volta para o estado de espera
                _iNumberPoint = -1;
                this._setState(STATE_GAME_WAITING_FOR_BET);
                
                // PERDER também perde o saldo travado do shooter
                _iLockedBalance = 0;
                _oInterface.setCurBet(0);
                
                // Reset flag de aposta obrigatória ao perder
                _bMustBetFullWin = false;
                _iLastWinAmount = 0;
                
                // OCULTAR BOTÕES
                _oInterface.hidePointBettingButtons();
            } else if(iSumDices === _iNumberPoint){
                // ACERTOU O PONTO: SHOOTER GANHA, quem apostou no ponto também ganha!
                var iTotalActiveBets = _oMySeat.getCurBet();
                
                // Determina o multiplicador baseado no número do ponto
                var iMultiplier = 1;
                if(_iNumberPoint === 4 || _iNumberPoint === 10) iMultiplier = 2; // Dobro
                else if(_iNumberPoint === 5 || _iNumberPoint === 9) iMultiplier = 1.5; // 50%
                else if(_iNumberPoint === 6 || _iNumberPoint === 8) iMultiplier = 1.25; // 25%
                
                // Se o SHOOTER tinha apostas ativas
                if(iTotalActiveBets > 0){
                    var iAutoWin = iTotalActiveBets * iMultiplier;
                    
                    // NOVA LÓGICA: Saldo ganho fica TRAVADO até passar o dado
                    _iLockedBalance += iAutoWin; // Adiciona ao saldo travado
                    
                    // NÃO adiciona ao saldo disponível ainda
                    // _oMySeat.showWin(iAutoWin); // REMOVIDO - não vai para saldo disponível
                    _iCasinoCash -= iAutoWin;
                    
                    // Atualizar interface - mostra valor ganho
                    _oInterface.setCurBet(_iLockedBalance);
                    
                    playSound("win", 0.2, false);
                }
                
                // PROCESSAR APOSTAS NO PONTO (ganham)
                if(_aPointBets[_iNumberPoint] && _aPointBets[_iNumberPoint] > 0){
                    var iPointWin = _aPointBets[_iNumberPoint] * iMultiplier;
                    _oMySeat.showWin(_aPointBets[_iNumberPoint] + iPointWin); // Devolve aposta + ganho
                    _oInterface.setMoney(_oMySeat.getCredit());
                    
                    new CScoreText("PONTO " + _iNumberPoint + "! VOCÊ GANHOU " + iPointWin + TEXT_CURRENCY + "!", CANVAS_WIDTH/2, CANVAS_HEIGHT/2 - 50);
                    playSound("win", 0.5, false);
                } else if(iTotalActiveBets > 0) {
                    new CScoreText("PONTO ACERTOU! +" + (iTotalActiveBets * iMultiplier).toFixed(2) + TEXT_CURRENCY + "\n⚠️ PASSE O DADO PARA LIBERAR!", CANVAS_WIDTH/2, CANVAS_HEIGHT/2);
                }
                
                // PROCESSAR APOSTAS NO 7 (perdem)
                if(_aSevenBets['seven'] && _aSevenBets['seven'] > 0){
                    console.log("❌ Apostas no 7 perderam:", _aSevenBets['seven']);
                }
                
                // Limpar apostas no ponto e no 7
                _aPointBets = {};
                _aSevenBets = {};
                
                // Remove as fichas visualmente do shooter
                _oMySeat.clearAllBetsVisualOnly();
                _aBetHistory = {};
                
                // Volta para o estado de espera
                _iNumberPoint = -1;
                this._setState(STATE_GAME_WAITING_FOR_BET);
                
                // OCULTAR BOTÕES
                _oInterface.hidePointBettingButtons();
            } else {
                // QUALQUER OUTRO NÚMERO: CONTINUA JOGANDO
                new CScoreText("CONTINUA... PONTO: " + _iNumberPoint, CANVAS_WIDTH/2, CANVAS_HEIGHT/2);
            }
        }
    };
    
    this.assignBetFromCome = function(iNumberAssigned,szOrigBet){
        var aFicheMc = _oMySeat.getFicheMc(szOrigBet);
        
        //MOVE FICHES
        for(var k=0;k<aFicheMc.length;k++){
            _aFichesToMove.push(aFicheMc[k]);
            var oEndPos = s_oGameSettings.getAttachOffset("number"+iNumberAssigned);

            aFicheMc[k].setEndPoint(oEndPos.x,oEndPos.y);
        }
        
        
        _aBetHistory["number"+iNumberAssigned] = _aBetHistory[szOrigBet];
        delete _aBetHistory[szOrigBet];
        
        _oMySeat.swapBet(szOrigBet,"number"+iNumberAssigned);
    };
    
    this.assignBetFromDontCome = function(iNumberAssigned,szOrigBet){
        var aFicheMc = _oMySeat.getFicheMc(szOrigBet);
        
        //MOVE FICHES
        for(var k=0;k<aFicheMc.length;k++){
            _aFichesToMove.push(aFicheMc[k]);
            var oEndPos = s_oGameSettings.getAttachOffset("lay_bet"+iNumberAssigned);

            aFicheMc[k].setEndPoint(oEndPos.x,oEndPos.y);
        }
        
        
        _aBetHistory["lay_bet"+iNumberAssigned] = _aBetHistory[szOrigBet];
        delete _aBetHistory[szOrigBet];
        
        _oMySeat.swapBet(szOrigBet,"lay_bet"+iNumberAssigned);
    };
    
    this.onRecharge = function(iMoney) {
        _oMySeat.recharge(iMoney);
        _oInterface.setMoney(_oMySeat.getCredit());

        this._setState(STATE_GAME_WAITING_FOR_BET);
        
        _oGameOverPanel.hide();
    };
    
    this.onRoll = function(){
        // Prevent multiple rapid clicks
        if (this._isRolling) {
            return;
        }
        
        // REGRA DE TURNO: Verificar se é a vez do jogador
        if(!_bIsMyTurn){
            _oMsgBox.show("AGUARDE SUA VEZ!\nO BOTÃO SERÁ LIBERADO QUANDO FOR SEU TURNO.");
            return;
        }
        
        if (_oMySeat.getCurBet() === 0) {
                return;
        }

        if(_oMySeat.getCurBet() < MIN_BET){
            _oMsgBox.show(TEXT_ERROR_MIN_BET);
            
            // Só habilita fichas se for single player OU se for o turno do jogador
            var isMultiplayer = window.GameClientSocketIO && 
                               window.GameClientSocketIO.isConnected && 
                               window.GameClientSocketIO.isAuthenticated;
            if (!isMultiplayer || _bIsMyTurn) {
                _oInterface.enableBetFiches();
                _oInterface.enableRoll(true);
            }
            
            return;
        }

        if(_oInterface.isBlockVisible()){
                return;
        }

        // Set rolling flag to prevent double-clicks
        this._isRolling = true;
        
        // BLOQUEAR O TURNO: Após lançar, não é mais sua vez
        _bIsMyTurn = false;
        _oInterface.enableRoll(false);
        
        _oInterface.showBlock();
        
        if(_iState === STATE_GAME_WAITING_FOR_BET){
            this._setState(STATE_GAME_COME_OUT);
        }
        
        $(s_oMain).trigger("bet_placed",_oMySeat.getCurBet());
        this._prepareForRolling();
        this._startRollingAnim();    
    };
    
    this._onSitDown = function(){
        this._setState(STATE_GAME_WAITING_FOR_BET);
        _oMySeat.setInfo(TOTAL_MONEY, _oTableController.getContainer());
        _oInterface.setMoney(TOTAL_MONEY);
        _oInterface.setCurBet(0);
        
        // Inicializar saldo travado (usa a caixa de aposta atual)
        _oInterface.setCurBet(0);
        
        // Inicialmente desabilitar botão de passar (até confirmar que é seu turno)
        _oInterface.enablePassDice(false);
        
        // Inicialmente desabilitar fichas (até confirmar que é seu turno no multiplayer)
        // Em modo single player, será habilitado automaticamente logo após
        _oInterface.disableBetFiches();
        
        // Sala padrão: BRONZE
        console.log('🏠 Setting up default room (bronze)...');
        this.changeRoom("bronze");
        
        // Socket.IO Pure System - Connection and authentication handled by game-socketio-integration.js
        console.log('✅ Socket.IO system will auto-connect via game-socketio-integration.js');
    };
    
    this.changeRoom = function(sRoomType){
        // Função para trocar de sala (útil para implementar seleção de salas)
        var oRoomConfig = s_oRoomConfig.getRoomConfig(sRoomType);
        
        // Atualizar configurações globais baseadas na sala
        MIN_BET = oRoomConfig.min_bet;
        MAX_BET = oRoomConfig.max_bet; // null se não há limite
        _sCurrentRoom = sRoomType;
        
        // Atualizar interface com nova configuração da sala
        _oInterface.updateRoomInfo(sRoomType, 1);
        _oInterface.updateBetLimits(MIN_BET, MAX_BET);
        
        // Limpar apostas atuais se necessário
        if(_oMySeat.getCurBet() > 0){
            _oMySeat.clearAllBets();
            _aBetHistory = {};
            _oInterface.setCurBet(0);
        }
        
        console.log("Sala alterada para:", oRoomConfig.name, "Aposta mínima:", oRoomConfig.min_bet, "Aposta máxima:", oRoomConfig.max_bet || "Sem limite");

        // Informar servidor para entrar na sala
        console.log('🔄 Changing to room:', sRoomType);
        // Socket.IO Pure System - Room changes handled automatically
        // The current room is managed by the server based on player's connection
        console.log('🏠 Room set to:', sRoomType);
        console.log('ℹ️ Socket.IO manages room connections automatically');
    };

    this.onRoomConfig = function(cfg){
        MIN_BET = cfg.min_bet;
        MAX_BET = cfg.max_bet;
        _oInterface.updateBetLimits(MIN_BET, MAX_BET);
    };

    this.getCurrentRoom = function(){
        return _sCurrentRoom || "bronze";
    };
    
    // Handler for turn changes (called by Socket.IO integration)
    this.onTurnChange = function(data){
        console.log('🔄 Turn change received:', data);
        
        const isMyTurn = data.isMyTurn;
        const playerId = data.playerId || null;
        
        // UPDATE TURN FLAG
        _bIsMyTurn = isMyTurn;
        
        // Only allow rolling if it's my turn AND there's an active bet
        const canRoll = isMyTurn && _oMySeat.getCurBet() > 0;
        _oInterface.enableRoll(canRoll);
        
        // Habilitar botão "Passar o Dado" apenas se for meu turno
        _oInterface.enablePassDice(isMyTurn);
        
        // CONTROLE DAS FICHAS E BOTÕES: Habilitar quando for o turno do jogador
        // OU durante os 7 SEGUNDOS de apostas no POINT
        if (isMyTurn || _bPointBettingOpen) {
            _oInterface.enableBetFiches();
            if (isMyTurn) {
                _oInterface.enableClearButton();
                console.log("✅ Fichas e Botões HABILITADOS - É seu turno!");
            } else if (_bPointBettingOpen) {
                _oInterface.enableClearButton();
                console.log("📊 Fichas HABILITADAS - 7 SEGUNDOS para apostar no POINT!");
            }
        } else {
            _oInterface.disableBetFiches();
            _oInterface.disableClearButton();
            console.log("🔒 Fichas e Botões DESABILITADOS - Aguarde sua vez!");
        }
        
        console.log(`✅ Turn updated - isMyTurn: ${isMyTurn}, canRoll: ${canRoll}`);
        
        // Show clear feedback about turn status
        if (isMyTurn) {
            if (_oMySeat.getCurBet() > 0) {
                console.log("🎲 É sua vez e você tem apostas - botão de lançar habilitado!");
            } else {
                console.log("⚠️ É sua vez mas você precisa fazer uma aposta primeiro!");
            }
        } else {
            console.log("⏳ Não é sua vez - aguarde...");
        }
    };
    
    this._onShowBetOnTable = function(oParams){
        if(_bDistributeFiches){
            return;
        }
        
        var szBut = oParams.button;

        // Só aceita apostas do botão principal
        if(szBut !== "main_bet"){
            return;
        }
        
        // BLOQUEIO DE APOSTAS: Não permite apostar se não for o turno do jogador
        // EXCEÇÃO: Durante os 7 SEGUNDOS após estabelecer o POINT, outros jogadores podem apostar
        var isMultiplayer = window.GameClientSocketIO && window.GameClientSocketIO.isConnected && window.GameClientSocketIO.isAuthenticated;
        
        // Verificar se o período de apostas no POINT está aberto (7 segundos)
        if(isMultiplayer && !_bIsMyTurn && !_bPointBettingOpen){
            _oMsgBox.show("AGUARDE SUA VEZ!\nVOCÊ SÓ PODE APOSTAR QUANDO FOR SEU TURNO\nOU NOS 7 SEGUNDOS APÓS O PONTO SER ESTABELECIDO.");
            playSound("lose", 0.3, false);
            return;
        }
        
        // Mensagem informativa durante o período de apostas do POINT
        if(isMultiplayer && !_bIsMyTurn && _bPointBettingOpen){
            console.log("📊 Jogador apostando durante os 7 segundos do POINT - permitido!");
        }

        var  iIndexFicheSelected = _oInterface.getCurFicheSelected();
        var iFicheValue=s_oGameSettings.getFicheValues(iIndexFicheSelected);
        
        var iCurBet=_oMySeat.getCurBet();
        
        // REGRA: Se deve apostar valor inteiro ganho, validar aposta
        if(_bMustBetFullWin && _iLastWinAmount > 0){
            var iNewTotalBet = iCurBet + iFicheValue;
            
            // Se ainda não chegou no valor mínimo
            if(iNewTotalBet < _iLastWinAmount){
                _oMsgBox.show("VOCÊ GANHOU " + _iLastWinAmount.toFixed(2) + TEXT_CURRENCY + "!\nDEVE APOSTAR O VALOR INTEIRO!\nAPOSTA ATUAL: " + iNewTotalBet.toFixed(2) + TEXT_CURRENCY);
                return;
            }
            
            // Se passou do valor exato
            if(iNewTotalBet > _iLastWinAmount){
                _oMsgBox.show("APOSTA DEVE SER EXATAMENTE " + _iLastWinAmount.toFixed(2) + TEXT_CURRENCY + "!\nNÃO PODE SER MAIOR!");
                return;
            }
            
            // Se chegou no valor exato, limpar a flag
            if(iNewTotalBet === _iLastWinAmount){
                _bMustBetFullWin = false;
                _oInterface.refreshMsgHelp("VALOR CORRETO! Agora lance os dados!",true);
            }
        }
        
        if( (_oMySeat.getCredit() - iFicheValue) < 0){
            //SHOW MSG BOX
            _oMsgBox.show(TEXT_ERROR_NO_MONEY_MSG);
            return;
        }
        
        if( MAX_BET && (iCurBet + iFicheValue) > MAX_BET ){
            _oMsgBox.show(TEXT_ERROR_MAX_BET_REACHED);
            return;
        }

        if(_aBetHistory[oParams.button] === undefined){
            _aBetHistory[oParams.button] = iFicheValue;
        }else{
            _aBetHistory[oParams.button] += iFicheValue;
        }
        
        // Coloca a ficha diretamente no botão "APOSTE AQUI"
        _oMySeat.addFicheOnButton(iFicheValue,iIndexFicheSelected,szBut);
        
        _oInterface.setMoney(_oMySeat.getCredit());
        _oInterface.setCurBet(_oMySeat.getCurBet());
        _oInterface.enableRoll(true);
        _oInterface.enableClearButton();
        
        // Mensagem personalizada se está apostando valor ganho
        if(_bMustBetFullWin && iCurBet + iFicheValue < _iLastWinAmount){
            _oInterface.refreshMsgHelp("CONTINUE APOSTANDO ATÉ " + _iLastWinAmount.toFixed(2) + TEXT_CURRENCY,true);
        } else {
            _oInterface.refreshMsgHelp("APOSTE AQUI - Clique para apostar e lançar os dados",true);
        }
        
        playSound("chip", 1, false);
    };

    this._onShowEnlight = function(oParams){
        var szEnlight=oParams.enlight;
        if(szEnlight){
            _oTableController.enlight(szEnlight);
            
            _oInterface.refreshMsgHelp(TEXT_HELP_MSG[szEnlight],false);
        }
    };
    
    this._onHideEnlight = function(oParams){
        var szEnlight=oParams.enlight;
        if(szEnlight){
            _oTableController.enlightOff(szEnlight);
            _oInterface.clearMsgHelp();
        }
    };
    
    this.onBetOnPoint = function(){
        console.log('🎲 Jogador quer apostar no PONTO:', _iNumberPoint);
        
        // Verificar se o período de apostas está aberto
        if(!_bPointBettingOpen){
            _oMsgBox.show("PERÍODO DE APOSTAS ENCERRADO!");
            return;
        }
        
        // Verificar se há fichas selecionadas
        var iIndexFicheSelected = _oInterface.getCurFicheSelected();
        var iFicheValue = s_oGameSettings.getFicheValues(iIndexFicheSelected);
        
        // Verificar se jogador tem crédito
        if(_oMySeat.getCredit() < iFicheValue){
            _oMsgBox.show(TEXT_ERROR_NO_MONEY_MSG);
            return;
        }
        
        // Adicionar aposta ao ponto
        if(!_aPointBets[_iNumberPoint]){
            _aPointBets[_iNumberPoint] = 0;
        }
        _aPointBets[_iNumberPoint] += iFicheValue;
        
        // Descontar do crédito
        _oMySeat.decreaseBet(iFicheValue);
        _oInterface.setMoney(_oMySeat.getCredit());
        
        // Feedback visual
        new CScoreText("APOSTOU " + iFicheValue + TEXT_CURRENCY + " NO PONTO " + _iNumberPoint, CANVAS_WIDTH/2, CANVAS_HEIGHT/2 + 30);
        playSound("chip", 1, false);
        
        console.log("✅ Aposta no ponto registrada:", iFicheValue, "Total no ponto:", _aPointBets[_iNumberPoint]);
    };
    
    this.onBetOnSeven = function(){
        console.log('🎲 Jogador quer apostar no 7');
        
        // Verificar se o período de apostas está aberto
        if(!_bPointBettingOpen){
            _oMsgBox.show("PERÍODO DE APOSTAS ENCERRADO!");
            return;
        }
        
        // Verificar se há fichas selecionadas
        var iIndexFicheSelected = _oInterface.getCurFicheSelected();
        var iFicheValue = s_oGameSettings.getFicheValues(iIndexFicheSelected);
        
        // Verificar se jogador tem crédito
        if(_oMySeat.getCredit() < iFicheValue){
            _oMsgBox.show(TEXT_ERROR_NO_MONEY_MSG);
            return;
        }
        
        // Adicionar aposta no 7
        if(!_aSevenBets['seven']){
            _aSevenBets['seven'] = 0;
        }
        _aSevenBets['seven'] += iFicheValue;
        
        // Descontar do crédito
        _oMySeat.decreaseBet(iFicheValue);
        _oInterface.setMoney(_oMySeat.getCredit());
        
        // Feedback visual
        new CScoreText("APOSTOU " + iFicheValue + TEXT_CURRENCY + " NO 7", CANVAS_WIDTH/2, CANVAS_HEIGHT/2 + 30);
        playSound("chip", 1, false);
        
        console.log("✅ Aposta no 7 registrada:", iFicheValue, "Total no 7:", _aSevenBets['seven']);
    };
    
    this.onPassDice = function(){
        console.log('🎲 Jogador solicitou passar o dado');
        
        // Verificar se está conectado ao Socket.IO
        if(!window.GameClientSocketIO || !window.GameClientSocketIO.isConnected){
            _oMsgBox.show("VOCÊ PRECISA ESTAR CONECTADO PARA PASSAR O DADO!");
            return;
        }
        
        // Verificar se é realmente a vez do jogador
        if(!_bIsMyTurn){
            _oMsgBox.show("NÃO É SUA VEZ!");
            return;
        }
        
        // LIBERAR SALDO TRAVADO ao passar o dado
        if(_iLockedBalance > 0){
            console.log('💰 Liberando saldo travado:', _iLockedBalance);
            var valorLiberado = _iLockedBalance; // Salva o valor para mostrar depois
            
            _oMySeat.showWin(_iLockedBalance); // Adiciona ao saldo disponível
            _oInterface.setMoney(_oMySeat.getCredit()); // Atualiza display
            
            // Mostrar mensagem de saldo liberado
            new CScoreText("SALDO LIBERADO! +" + valorLiberado.toFixed(2) + TEXT_CURRENCY, CANVAS_WIDTH/2, CANVAS_HEIGHT/2 - 100);
            playSound("win", 0.3, false);
            
            // Resetar saldo travado internamente MAS manter visível na interface
            _iLockedBalance = 0;
            // NÃO zera o display - mantém o valor ganho visível
            _oInterface.setCurBet(valorLiberado);
        }
        
        // Emitir evento para o servidor
        if(window.GameClientSocketIO.socket){
            console.log('📤 Enviando pedido para passar o dado ao servidor...');
            window.GameClientSocketIO.socket.emit('pass_dice');
            
            // Desabilitar botões localmente (o servidor vai confirmar)
            _bIsMyTurn = false;
            _oInterface.enableRoll(false);
            _oInterface.enablePassDice(false);
            
            // Mostrar mensagem
            _oInterface.showMessage("Você passou o dado para o próximo jogador!");
            
            setTimeout(function(){
                if(_oInterface && _oInterface.hideMessage){
                    _oInterface.hideMessage();
                }
            }, 2000);
        }
    };
    
    this.onClearAllBets = function(){
        // BLOQUEIO: Não permite limpar apostas se não for o turno do jogador
        // EXCEÇÃO: Durante os 7 SEGUNDOS de apostas no POINT, jogadores podem limpar suas apostas
        var isMultiplayer = window.GameClientSocketIO && 
                           window.GameClientSocketIO.isConnected && 
                           window.GameClientSocketIO.isAuthenticated;
        
        if(isMultiplayer && !_bIsMyTurn && !_bPointBettingOpen){
            _oMsgBox.show("AGUARDE SUA VEZ!\nVOCÊ SÓ PODE GERENCIAR APOSTAS QUANDO FOR SEU TURNO\nOU NOS 7 SEGUNDOS APÓS O PONTO.");
            playSound("lose", 0.3, false);
            return;
        }
        
        $(s_oMain).trigger("clear_bet",_oMySeat.getCurBet());
        
        if(_iState === STATE_GAME_COME_POINT){
            _oMySeat.clearAllBetsInComePoint();
            for(var i in _aBetHistory){
                if( i !== "pass_line" && i!== "dont_pass1" && i!== "dont_pass2"){
                    delete _aBetHistory[i];
                }
            }
        }else{
            _oMySeat.clearAllBets();
            _aBetHistory = new Object();
            _oInterface.enableRoll(false);
        }
        
        // Limpar flag de aposta obrigatória ao limpar apostas
        _bMustBetFullWin = false;
        _iLastWinAmount = 0;
        
        _oInterface.setMoney(_oMySeat.getCredit());
        _oInterface.setCurBet(_oMySeat.getCurBet());
        _oInterface.enableRoll(false);
        _oInterface.disableClearButton();
        
        
    };
   
    this.onExit = function(bForceExit){
        if(bForceExit){
            this.unload();
            s_oMain.gotoMenu();
        }else{
            _oAreYouSurePanel.show();  
        }
        
    };
    
    this.onConfirmExit = function(){
        this.unload();
        s_oMain.gotoMenu();
        $(s_oMain).trigger("end_session");
        $(s_oMain).trigger("share_event",_oMySeat.getCredit());
    };
    
    this._updateDistributeFiches = function(){
        _iTimeElaps += s_iTimeElaps;
        if(_iTimeElaps > TIME_FICHES_MOV){
            _iTimeElaps = 0;
            _bDistributeFiches = false;
            playSound("fiche_collect", 1, false);
        }else{
            var fLerp = s_oTweenController.easeInOutCubic( _iTimeElaps, 0, 1, TIME_FICHES_MOV);
            for(var i=0;i<_aFichesToMove.length;i++){
                _aFichesToMove[i].updatePos(fLerp);
            }
        }
    };
    
    this.update = function(){
        if(_bUpdate === false){
            return;
        }
        
        if(_bDistributeFiches){
            this._updateDistributeFiches();
        }
        
        if(_oDicesAnim.isVisible()){
            _oDicesAnim.update();
        }
        
    };
    
    // Public accessors for Socket.IO integration
    // These expose private variables so multiplayer features can access them
    Object.defineProperty(this, '_oDicesAnim', {
        get: function() { return _oDicesAnim; }
    });
    
    Object.defineProperty(this, '_oInterface', {
        get: function() { return _oInterface; }
    });
    
    Object.defineProperty(this, '_oMySeat', {
        get: function() { return _oMySeat; }
    });
    
    /**
     * Add a dice roll to the history panel
     */
    this.addRollToHistory = function(dice1, dice2, shooterName) {
        if (_oDiceHistory) {
            _oDiceHistory.addRoll(dice1, dice2, shooterName);
        }
    };
    
    Object.defineProperty(this, '_oDiceHistory', {
        get: function() { return _oDiceHistory; }
    });
    
    Object.defineProperty(this, '_oPuck', {
        get: function() { return _oPuck; }
    });
    
    Object.defineProperty(this, '_isRolling', {
        get: function() { return _bUpdate && _oDicesAnim && _oDicesAnim.isVisible(); },
        set: function(value) { 
            // Control the rolling state by showing/hiding animation if needed
            // Note: This is a simplified setter - the actual state is managed internally
        }
    });
    
    Object.defineProperty(this, '_aDiceResult', {
        get: function() { return _aDiceResult; },
        set: function(value) { _aDiceResult = value; }
    });
    
    Object.defineProperty(this, '_aDiceResultHistory', {
        get: function() { return _aDiceResultHistory; }
    });
    
    Object.defineProperty(this, '_iState', {
        get: function() { return _iState; }
    });
    
    Object.defineProperty(this, '_iNumberPoint', {
        get: function() { return _iNumberPoint; },
        set: function(value) { _iNumberPoint = value; }
    });
    
    s_oGame = this;
    
    TOTAL_MONEY = oData.money;
    MIN_BET = oData.min_bet;
    MAX_BET = oData.max_bet;
    WIN_OCCURRENCE = oData.win_occurrence;
    TIME_SHOW_DICES_RESULT = oData.time_show_dice_result;
    NUM_HAND_FOR_ADS = oData.num_hand_before_ads;
    _iCasinoCash = oData.casino_cash;
    
    this._init();
}

var s_oGame;
var s_oTweenController;
var s_oGameSettings;