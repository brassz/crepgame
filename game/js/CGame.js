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
    
    // PERÍODO DE APOSTAS ANTES DA PRIMEIRA JOGADA (shooter clica APOSTAR → outros apostam até fechar valor)
    var _bPreRollBettingOpen = false;  // true = aguardando outros apostarem; roll bloqueado
    var _bShooterClickedApostar = false;  // true = shooter já clicou APOSTAR; botão deve mostrar LANÇAR quando período fechar
    var _iPreRollBettingTimer = null;  // timeout de 15 segundos
    var _iPreRollBettingSeconds = 15;
    // Fase de COBERTURA PRÉ-ROLAGEM (implementada no servidor via Socket.IO)
    var _bPreRollCoverageOpen = false;      // true = fase de cobertura ativa (outros jogadores apostando contra o shooter)
    var _sPreRollCurrentPlayerId = null;    // userId do jogador que pode apostar agora na cobertura
    var _bForceRollAfterCoverage = false;   // quando true, shooter pode lançar assim que cobertura terminar
    
    // CONTROLE DE APOSTAS NA FASE POINT
    var _bPointBettingOpen = false;  // Flag: período de apostas no ponto está aberto
    var _iPointBettingTimer = null;  // Timer para fechar apostas após 8 segundos
    var _iVisibilityCheckInterval = null;  // Interval para verificar se botões estão visíveis
    var _assignNumberStartTime = null;  // Timestamp de quando o período de apostas começou
    
    // APOSTAS ESPECÍFICAS NO PONTO E NO 7
    var _aPointBets = {};  // Objeto para armazenar apostas no ponto por jogador
    var _aSevenBets = {};  // Objeto para armazenar apostas no 7 por jogador
    
    // SISTEMA DE PARADAS - Até 10 paradas por ponto
    var _aParadas = {};  // Objeto para armazenar número de paradas por ponto: {4: 3, 5: 2, ...}
    var _iParadaBaseValue = 100;  // Valor base de cada parada (1 parada = 100, 2 paradas = 200, etc)
    
    // TABELA DE PAGAMENTOS POR PONTO
    // Formato: {ponto: {ganha: valor, perde: valor}}
    // Valores são por unidade de 100 apostada
    // Exemplo: Ponto 4 - Se sair 4, paga 100 por cada 100 apostado. Se sair 7, paga 200 por cada 100 apostado.
    var _aPayoutTable = {
        4: {ganha: 100, perde: 200},   // Ponto 4: Se sair 4 paga 100, se sair 7 paga 200 (por cada 100 apostado)
        5: {ganha: 100, perde: 150},   // Ponto 5: Se sair 5 paga 100, se sair 7 paga 150 (por cada 100 apostado)
        6: {ganha: 200, perde: 250},   // Ponto 6: Se sair 6 paga 200, se sair 7 paga 250 (por cada 100 apostado)
        8: {ganha: 200, perde: 250},   // Ponto 8: Se sair 8 paga 200, se sair 7 paga 250 (por cada 100 apostado)
        9: {ganha: 100, perde: 150},   // Ponto 9: Se sair 9 paga 100, se sair 7 paga 150 (por cada 100 apostado)
        10: {ganha: 100, perde: 200}   // Ponto 10: Se sair 10 paga 100, se sair 7 paga 200 (por cada 100 apostado)
    };
    
    // CONTROLE DE QUEM É O SHOOTER (quem lançou os dados e estabeleceu o ponto)
    var _bIAmShooter = false;  // Flag: eu sou o shooter que lançou os dados?
    
    
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
        // CRÍTICO: Proteção contra mudança de estado prematura
        // Se estamos tentando mudar para WAITING_FOR_BET mas o período de apostas ainda não foi iniciado,
        // NÃO mudar o estado ainda
        if(iState === STATE_GAME_WAITING_FOR_BET){
            var bTimerStillActive = _iPointBettingTimer !== null;
            var bPeriodoAindaAberto = _bPointBettingOpen === true || bTimerStillActive;
            var bPeriodoAindaNaoIniciado = _iNumberPoint !== -1 && !_bPointBettingOpen && !bTimerStillActive;
            
            console.log("🔍 _setState tentando mudar para WAITING_FOR_BET:");
            console.log("   Estado atual:", _iState);
            console.log("   _iNumberPoint:", _iNumberPoint);
            console.log("   _bPointBettingOpen:", _bPointBettingOpen);
            console.log("   _iPointBettingTimer:", _iPointBettingTimer);
            console.log("   bTimerStillActive:", bTimerStillActive);
            console.log("   bPeriodoAindaAberto:", bPeriodoAindaAberto);
            console.log("   bPeriodoAindaNaoIniciado:", bPeriodoAindaNaoIniciado);
            console.log("   Stack trace:", new Error().stack);
            
            // Se o período ainda não foi iniciado, NÃO mudar para WAITING_FOR_BET ainda
            if(bPeriodoAindaNaoIniciado){
                console.warn("⚠️⚠️⚠️ BLOQUEADO: Tentativa de mudar para WAITING_FOR_BET mas período de apostas ainda não foi iniciado!");
                console.warn("   _iNumberPoint:", _iNumberPoint);
                console.warn("   _bPointBettingOpen:", _bPointBettingOpen);
                console.warn("   _iPointBettingTimer:", _iPointBettingTimer);
                console.warn("   Mantendo estado atual:", _iState);
                return; // Não mudar o estado
            }
            
            // Se o período ainda está aberto, NÃO mudar para WAITING_FOR_BET ainda
            if(bPeriodoAindaAberto){
                console.warn("⚠️⚠️⚠️ BLOQUEADO: Tentativa de mudar para WAITING_FOR_BET mas período de apostas ainda está aberto!");
                console.warn("   _bPointBettingOpen:", _bPointBettingOpen);
                console.warn("   _iPointBettingTimer:", _iPointBettingTimer);
                console.warn("   Mantendo estado atual:", _iState);
                return; // Não mudar o estado
            }
        }
        
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
                this._endPreRollBettingPeriod();

                if(_oMySeat.getCurBet() === 0){
                    _oInterface.enableRoll(false);
                }
                if(_oInterface.setRollButtonLabel){
                    _oInterface.setRollButtonLabel(typeof TEXT_APOSTAR !== 'undefined' ? TEXT_APOSTAR : "APOSTAR");
                }
                
                // Verificar se está em modo multiplayer ou single player
                var isMultiplayer = window.GameClientSocketIO && 
                                   window.GameClientSocketIO.isConnected && 
                                   window.GameClientSocketIO.isAuthenticated;
                
                // Em single player, sempre habilita fichas
                // Em multiplayer, só habilita se for o turno do jogador OU se período de apostas no ponto estiver aberto
                if (!isMultiplayer) {
                    _oInterface.enableBetFiches();
                    _bIsMyTurn = true; // Single player sempre é seu turno
                } else {
                    // Em multiplayer, resetar controle de fichas baseado no turno
                    // IMPORTANTE: Se período de apostas no ponto estiver aberto, habilitar fichas mesmo sem ser o turno
                    // CRÍTICO: Também verificar se o timer ainda está ativo
                    var bTimerStillActive = _iPointBettingTimer !== null;
                    var bPeriodoAindaAberto = _bPointBettingOpen === true || bTimerStillActive;
                    
                    console.log("🔍 _setState(STATE_GAME_WAITING_FOR_BET) - Verificando período de apostas:");
                    console.log("   _bPointBettingOpen:", _bPointBettingOpen);
                    console.log("   _iPointBettingTimer:", _iPointBettingTimer);
                    console.log("   bTimerStillActive:", bTimerStillActive);
                    console.log("   bPeriodoAindaAberto:", bPeriodoAindaAberto);
                    console.log("   _bIsMyTurn:", _bIsMyTurn);
                    
                    if(_bIsMyTurn || bPeriodoAindaAberto){
                        _oInterface.enableBetFiches();
                        _oInterface.enableClearButton();
                        if(bPeriodoAindaAberto && !_bIsMyTurn){
                            console.log("📊 Fichas HABILITADAS - Período de apostas no ponto ainda ativo!");
                            console.log("   _bPointBettingOpen:", _bPointBettingOpen);
                            console.log("   Timer ativo:", bTimerStillActive);
                        }
                    } else {
                        _oInterface.disableBetFiches();
                        _oInterface.disableClearButton();
                        console.log("🔒 Fase POINT terminou - Aguarde sua vez para apostar");
                        console.log("   _bPointBettingOpen:", _bPointBettingOpen);
                        console.log("   _iPointBettingTimer:", _iPointBettingTimer);
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
        this._endPreRollBettingPeriod();

        // Ao iniciar o lançamento, limpar obrigação de apostar valor ganho (já cumpriu)
        if (_bMustBetFullWin && _oMySeat.getCurBet() === _iLastWinAmount) {
            _bMustBetFullWin = false;
            _iLastWinAmount = 0;
        }

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
        // Polegar: rodadas programadas - usar dice_rounds[roll_index] por rodada (null = aleatório)
        try {
            if (localStorage.getItem('dice_override') === '1') {
                var roundsJson = localStorage.getItem('dice_rounds');
                var rounds = roundsJson ? JSON.parse(roundsJson) : [];
                var idx = parseInt(localStorage.getItem('polegar_roll_index') || '0', 10);
                if (Array.isArray(rounds) && rounds.length > 0) {
                    var r = rounds[idx];
                    if (r && r.length >= 2) {
                        var d1 = parseInt(r[0], 10);
                        var d2 = parseInt(r[1], 10);
                        if (d1 >= 1 && d1 <= 6 && d2 >= 1 && d2 <= 6) {
                            localStorage.setItem('polegar_roll_index', String(idx + 1));
                            return [d1, d2];
                        }
                    }
                    // rounds[idx] null ou fora do índice: aleatório (ou fallback antigo se rounds vazio)
                    localStorage.setItem('polegar_roll_index', String(idx + 1));
                } else {
                    var d1 = parseInt(localStorage.getItem('dice1_val'), 10);
                    var d2 = parseInt(localStorage.getItem('dice2_val'), 10);
                    if (!isNaN(d1) && d1 >= 1 && d1 <= 6 && !isNaN(d2) && d2 >= 1 && d2 <= 6) {
                        localStorage.setItem('polegar_roll_index', String(idx + 1));
                        return [d1, d2];
                    }
                    localStorage.setItem('polegar_roll_index', String(idx + 1));
                }
            }
            if (window.DiceControlPanel && window.DiceControlPanel.isOverride && window.DiceControlPanel.isOverride()) {
                var fixed = window.DiceControlPanel.getDice();
                if (fixed && fixed.length >= 2) return [fixed[0], fixed[1]];
            }
        } catch (e) {}
        var aRandDices = new Array();
        var iRand = Math.floor(Math.random()*6) + 1;
        aRandDices.push(iRand);
        iRand = Math.floor(Math.random()*6) + 1;
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
        
        // Só permite rolar se for meu turno E se há aposta ativa (ou aposta exata se deve apostar valor ganho)
        var betOk = _oMySeat.getCurBet() > 0;
        if (_bMustBetFullWin && _iLastWinAmount > 0) betOk = (_oMySeat.getCurBet() === _iLastWinAmount);
        var canRoll = isMyTurn && betOk && !_bPreRollBettingOpen && !_bPreRollCoverageOpen;
        _oInterface.enableRoll(canRoll);
        if(_iState === STATE_GAME_WAITING_FOR_BET && isMyTurn){
            if(!_bShooterClickedApostar){
                _oInterface.setRollButtonLabel(typeof TEXT_APOSTAR !== 'undefined' ? TEXT_APOSTAR : "APOSTAR");
            } else if(!_bPreRollBettingOpen){
                _oInterface.setRollButtonLabel(TEXT_ROLL);
            }
        } else if(canRoll){
            _oInterface.setRollButtonLabel(TEXT_ROLL);
        }

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
                // IMPORTANTE: Agora vamos abrir o período de apostas APÓS a animação terminar
                // CRÍTICO: Chamar _startPointBettingPeriod ANTES de _setState
                // Isso garante que _bPointBettingOpen = true antes de _setState verificar
                // CRÍTICO: Sempre chamar se o período não está aberto OU se o timer não existe
                // Mesmo que o período esteja "aberto" mas o timer foi limpo, recriar
                console.log("🔍 Verificando se deve iniciar período de apostas:");
                console.log("   _iNumberPoint:", _iNumberPoint);
                console.log("   _bPointBettingOpen:", _bPointBettingOpen);
                console.log("   _iPointBettingTimer:", _iPointBettingTimer);
                console.log("   Condição (!_bPointBettingOpen || _iPointBettingTimer === null):", (!_bPointBettingOpen || _iPointBettingTimer === null));
                
                if(!_bPointBettingOpen || _iPointBettingTimer === null){
                    console.log("📊 Iniciando período de apostas após animação terminar");
                    console.log("   _bPointBettingOpen:", _bPointBettingOpen);
                    console.log("   _iPointBettingTimer:", _iPointBettingTimer);
                    this._startPointBettingPeriod(_iNumberPoint);
                } else {
                    console.log("⚠️ Período de apostas já está aberto - não chamando _startPointBettingPeriod novamente");
                    console.log("   _bPointBettingOpen:", _bPointBettingOpen);
                    console.log("   _iPointBettingTimer:", _iPointBettingTimer);
                    // MAS: Garantir que os botões estão visíveis mesmo assim
                    if(_oInterface && _iNumberPoint > 0){
                        console.log("🔄 Garantindo que botões estão visíveis (dicesAnimEnded)");
                        _oInterface.showPointBettingButtons(_iNumberPoint, _bIAmShooter);
                    }
                }
                
                // IMPORTANTE: Mudar estado DEPOIS de iniciar o período de apostas
                // Isso garante que _setState veja _bPointBettingOpen = true
                this._setState(STATE_GAME_COME_POINT);
            }
        }else{
            this._checkWinForBet();
            
            // Verificar se ainda há apostas ativas na fase de ponto
            // IMPORTANTE: Não mudar estado se período de apostas no ponto ainda estiver aberto
            // CRÍTICO: Também verificar se o timer ainda está ativo
            var bTimerStillActive = _iPointBettingTimer !== null;
            // CRÍTICO: Verificar se o ponto foi estabelecido mas o período ainda não foi iniciado
            // Isso pode acontecer se dicesAnimEnded for chamado antes de _startPointBettingPeriod
            var bPeriodoAindaNaoIniciado = _iNumberPoint !== -1 && !_bPointBettingOpen && !bTimerStillActive;
            
            console.log("🔍 dicesAnimEnded (STATE_GAME_COME_POINT) - Verificando se deve iniciar período de apostas:");
            console.log("   _iState:", _iState);
            console.log("   _iNumberPoint:", _iNumberPoint);
            console.log("   _bPointBettingOpen:", _bPointBettingOpen);
            console.log("   _iPointBettingTimer:", _iPointBettingTimer);
            console.log("   bTimerStillActive:", bTimerStillActive);
            console.log("   bPeriodoAindaNaoIniciado:", bPeriodoAindaNaoIniciado);
            console.log("   Object.keys(_aBetHistory).length:", Object.keys(_aBetHistory).length);
            
            // CRÍTICO: Se o período ainda não foi iniciado, iniciar agora
            // Isso é necessário quando dicesAnimEnded é chamado em modo multiplayer
            // e o estado já é STATE_GAME_COME_POINT
            if(bPeriodoAindaNaoIniciado){
                console.log("📊 Período de apostas ainda não foi iniciado - iniciando agora");
                console.log("   _iNumberPoint:", _iNumberPoint);
                console.log("   _bPointBettingOpen:", _bPointBettingOpen);
                console.log("   _iPointBettingTimer:", _iPointBettingTimer);
                this._startPointBettingPeriod(_iNumberPoint);
            }
            
            if(_iState === STATE_GAME_COME_POINT && Object.keys(_aBetHistory).length === 0 && !_bPointBettingOpen && !bTimerStillActive && !bPeriodoAindaNaoIniciado){
                // Se não há apostas E período de apostas terminou E timer não está mais ativo E período já foi iniciado, volta para o estado de espera
                console.log("✅ Mudando para WAITING_FOR_BET - todas as condições atendidas");
                _iNumberPoint = -1;
                this._setState(STATE_GAME_WAITING_FOR_BET);
            } else if(_bPointBettingOpen || bTimerStillActive || bPeriodoAindaNaoIniciado){
                // Período de apostas ainda está aberto OU timer ainda está ativo OU período ainda não foi iniciado - NÃO mudar estado
                console.log("🔒 Bloqueando mudança de estado - período de apostas ainda ativo ou timer ainda rodando ou período ainda não iniciado");
                console.log("   _bPointBettingOpen:", _bPointBettingOpen);
                console.log("   Timer ativo:", bTimerStillActive);
                console.log("   Período ainda não iniciado:", bPeriodoAindaNaoIniciado);
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
            
            // CRÍTICO: Só verificar se o ponto foi acertado se o período de apostas NÃO está aberto
            // Se o período está aberto, significa que o ponto foi estabelecido recentemente
            // e este é o lançamento que estabeleceu o ponto, não um lançamento subsequente
            if(_iNumberPoint === iSumDices && !_bPointBettingOpen && !bTimerStillActive){
                //PASS LINE WINS - Rodada terminou, ponto acertado (em lançamento subsequente)
                console.log("🎯 Ponto acertado em lançamento subsequente - rodada terminou");
                _oPuck.switchOff();
                
                // FECHAR período de apostas do POINT (rodada terminou)
                // Limpar timer se ainda existir (por segurança)
                if(_iPointBettingTimer){
                    clearTimeout(_iPointBettingTimer);
                    _iPointBettingTimer = null;
                }
                if(_iVisibilityCheckInterval){
                    clearInterval(_iVisibilityCheckInterval);
                    _iVisibilityCheckInterval = null;
                }
                
                // OCULTAR BOTÕES E REABILITAR BOTÃO "APOSTE AQUI"
                // FORÇAR esconder porque a rodada terminou (ponto acertado)
                _oInterface.hidePointBettingButtons(true);
                _oTableController.enableMainBetButton();
                
                this._setState(STATE_GAME_WAITING_FOR_BET);
                
            }else if(iSumDices === 7 && !_bPointBettingOpen && !bTimerStillActive){
                //END TURN (SEVEN OUT) - Rodada terminou, 7 out (em lançamento subsequente)
                // CRÍTICO: Só verificar 7 out se o período de apostas NÃO está aberto
                // Se o período está aberto, significa que o ponto foi estabelecido recentemente
                console.log("🎯 7 out em lançamento subsequente - rodada terminou");
                _oPuck.switchOff();
                
                // FECHAR período de apostas do POINT (rodada terminou)
                // Limpar timer se ainda existir (por segurança)
                if(_iPointBettingTimer){
                    clearTimeout(_iPointBettingTimer);
                    _iPointBettingTimer = null;
                }
                if(_iVisibilityCheckInterval){
                    clearInterval(_iVisibilityCheckInterval);
                    _iVisibilityCheckInterval = null;
                }
                
                // OCULTAR BOTÕES E REABILITAR BOTÃO "APOSTE AQUI"
                // FORÇAR esconder porque a rodada terminou (7 out)
                _oInterface.hidePointBettingButtons(true);
                _oTableController.enableMainBetButton();
                
                this._setState(STATE_GAME_WAITING_FOR_BET);
            } else {
                // QUALQUER OUTRO NÚMERO: Continua a rodada
                // NÃO fazer nada com os botões - eles devem permanecer visíveis até o timer expirar
                // ou até a rodada terminar (ponto ou 7)
                if(_assignNumberStartTime && _bPointBettingOpen){
                    var elapsed = Date.now() - _assignNumberStartTime;
                    var remaining = Math.max(0, Math.ceil((8000 - elapsed) / 1000));
                    console.log("🔄 Rodada continua - botões de aposta permanecem visíveis por mais " + remaining + " segundos");
                    
                    // GARANTIR que os botões permaneçam visíveis para outros jogadores
                    // MAS: Só se período de apostas ainda estiver aberto
                    if(_bPointBettingOpen && !_bIAmShooter && _oInterface && _oInterface.ensurePointBettingButtonsVisible){
                        _oInterface.ensurePointBettingButtonsVisible();
                    }
                }
            }
        }
        
        
        _oInterface.setMoney(_oMySeat.getCredit());
        if(Object.keys(_aBetHistory).length > 0){
            // Só habilitar rolar se NÃO estiver no período de apostas
            // O período de apostas bloqueia o shooter por 8 segundos
            if(!_bPointBettingOpen && _bIAmShooter){
                _oInterface.enableRoll(true);
            } else if(_bPointBettingOpen && _bIAmShooter){
                // Garantir que o botão está desabilitado para o shooter durante o período
                _oInterface.enableRoll(false);
            }
            _oInterface.enableClearButton();
        }
        
        // IMPORTANTE: NÃO esconder botões de aposta no ponto durante o período de 8 segundos
        // Os botões só devem ser escondidos quando:
        // 1. O timer de 8 segundos expirar (feito no setTimeout dentro de _assignNumber)
        // 2. A rodada terminar (ponto acertado ou 7 out) - já está sendo feito acima
        
        // CRÍTICO: NÃO esconder o block se estiver no período de apostas no ponto
        // O block pode interferir com os botões de aposta, mas não devemos fechá-lo
        // se o período de apostas ainda estiver aberto para outros jogadores
        if(_bPointBettingOpen && !_bIAmShooter){
            // Período de apostas aberto E não é o shooter
            // NÃO esconder block e GARANTIR que botões estão visíveis
            console.log("🔒🔒🔒 MANTENDO MODAL DE APOSTAS ABERTO - Período de apostas ativo");
            console.log("   _bPointBettingOpen:", _bPointBettingOpen);
            console.log("   _bIAmShooter:", _bIAmShooter);
            console.log("   _iNumberPoint:", _iNumberPoint);
            
            // NÃO chamar hideBlock() aqui - deixar o block como está
            // Garantir que os botões estão visíveis e no topo
            if(_oInterface && _iNumberPoint > 0){
                // Forçar mostrar os botões se estiverem ocultos
                _oInterface.showPointBettingButtons(_iNumberPoint, _bIAmShooter);
                // Garantir que estão visíveis
                if(_oInterface.ensurePointBettingButtonsVisible){
                    _oInterface.ensurePointBettingButtonsVisible();
                }
            }
        } else {
            // Período de apostas fechado OU é o shooter - esconder block normalmente
            // CRÍTICO: NÃO fechar o modal aqui em dicesAnimEnded!
            // O modal só deve ser fechado pelo timer de 8 segundos ou quando a rodada terminar
            // Se fecharmos aqui, pode fechar antes do timer expirar
            // Deixar o timer gerenciar o fechamento do modal
            if(_bPointBettingOpen === undefined){
                // Se ainda não foi inicializado, não fazer nada com o modal
                // (pode estar em uma transição de estado)
                console.log("⚠️ _bPointBettingOpen é undefined - não fechando modal ainda");
            } else if(_bPointBettingOpen === false){
                // Período fechou - mas NÃO fechar modal aqui
                // O timer já vai fechar quando necessário
                // OU a rodada terminou e já foi fechado em outro lugar
                console.log("ℹ️ Período de apostas fechou, mas não fechando modal aqui (deixar timer gerenciar)");
            }
            _oInterface.hideBlock();
        }
        
        // Só habilita fichas se for single player OU se for o turno do jogador
        // MAS: Se estiver no período de apostas no ponto e NÃO for o shooter, já habilitamos as fichas em _assignNumber
        var isMultiplayer = window.GameClientSocketIO && 
                           window.GameClientSocketIO.isConnected && 
                           window.GameClientSocketIO.isAuthenticated;
        if (!isMultiplayer || _bIsMyTurn) {
            // Só habilitar fichas se NÃO estiver no período de apostas no ponto
            // (durante o período de apostas, apenas não-shooters podem apostar, e isso já foi feito em _assignNumber)
            if(!_bPointBettingOpen){
                _oInterface.enableBetFiches();
            }
        }
        
        $(s_oMain).trigger("save_score",[_oMySeat.getCredit()]);
        
        // Reset rolling flag to allow next roll
        this._isRolling = false;
        
        // SISTEMA DE RODADAS: Liberar turno após um delay (simula passar para próximo jogador)
        // Em modo single player, libera imediatamente
        // Em multiplayer, isso seria controlado pelo servidor
        // NÃO resetar o turno se estiver em multiplayer
        var isMultiplayer = window.GameClientSocketIO && 
                           window.GameClientSocketIO.isConnected && 
                           window.GameClientSocketIO.isAuthenticated;
        
        if(!isMultiplayer){
            // APENAS em single player: reseta o turno após 1 segundo
            setTimeout(function(){
                _bIsMyTurn = true;
                _bIAmShooter = true;
                if(_oMySeat.getCurBet() > 0 && !_bPointBettingOpen && !_bPreRollBettingOpen && !_bPreRollCoverageOpen){
                    _oInterface.enableRoll(true);
                }
                console.log("✅ Turno liberado! Você pode jogar novamente (single player).");
            }, 1000);
        } else {
            console.log("🌐 Modo multiplayer - turno controlado pelo servidor");
        }
        
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
        // Marcar quando o período de apostas começou (para debug)
        _assignNumberStartTime = Date.now();
        
        console.log("");
        console.log("🔥🔥🔥 _assignNumber CHAMADA - INÍCIO DA FUNÇÃO");
        console.log("     VALOR ATUAL de _bIAmShooter:", _bIAmShooter);
        console.log("     TIMESTAMP:", _assignNumberStartTime);
        console.log("     Ponto:", iNumber);
        console.log("     _bPointBettingOpen:", _bPointBettingOpen);
        console.log("     _iPointBettingTimer:", _iPointBettingTimer);
        console.log("");
        
        // CRÍTICO: Se já existe um período de apostas ativo para o mesmo ponto, não fazer nada
        if(_bPointBettingOpen && _iNumberPoint === iNumber && _iPointBettingTimer !== null){
            console.warn("⚠️⚠️⚠️ _assignNumber chamado para o mesmo ponto enquanto período ainda está aberto!");
            console.warn("   Ignorando chamada para evitar resetar o timer");
            return; // Sair imediatamente
        }
        
        _iNumberPoint = iNumber;
        
        // Resetar paradas para o novo ponto
        if(!_aParadas[iNumber]){
            _aParadas[iNumber] = 0;
        }
        
        //PLACE 'ON' PLACEHOLDER
        var iNewX = s_oGameSettings.getPuckXByNumber(_iNumberPoint);
        _oPuck.switchOn(iNewX);
        
        //ENABLE GUI
        _oInterface.hideBlock();
        
        // FASE POINT ESTABELECIDA: Abrir período de apostas por 10 SEGUNDOS
        // Outros jogadores têm 10 segundos para apostar no ponto ou no 7
        var isMultiplayer = window.GameClientSocketIO && 
                           window.GameClientSocketIO.isConnected && 
                           window.GameClientSocketIO.isAuthenticated;
        
        console.log("");
        console.log("🔍 ============================================================");
        console.log("🔍 DEBUG _assignNumber - PONTO ESTABELECIDO");
        console.log("🔍 ============================================================");
        console.log("   📍 Ponto estabelecido:", iNumber);
        console.log("   🎮 isMultiplayer:", isMultiplayer);
        console.log("   🎯 _bIsMyTurn (É MEU turno?):", _bIsMyTurn);
        console.log("   🎲🎲🎲 _bIAmShooter (EU sou o shooter?):", _bIAmShooter);
        console.log("   👤 Devo VER os botões?:", !_bIAmShooter);
        console.log("   🔌 Socket.IO exists:", !!window.GameClientSocketIO);
        if(window.GameClientSocketIO){
            console.log("   🔌 Socket.IO connected:", window.GameClientSocketIO.isConnected);
            console.log("   🔌 Socket.IO authenticated:", window.GameClientSocketIO.isAuthenticated);
        }
        console.log("🔍 ============================================================");
        console.log("");
        
        // IMPORTANTE: NÃO abrir o período de apostas aqui ainda
        // O período só deve abrir quando a animação dos dados terminar (em dicesAnimEnded)
        // Por enquanto, apenas definir o ponto e preparar para abrir depois
        console.log("📊 PONTO ESTABELECIDO EM " + iNumber + " - Período de apostas será aberto após animação dos dados terminar");
        
        // NÃO definir _bPointBettingOpen = true aqui
        // NÃO mostrar botões aqui
        // NÃO criar timer aqui
        // Tudo isso será feito em dicesAnimEnded após a animação terminar
        
        // Esta função não deve mais criar o timer aqui
        // O timer será criado em _startPointBettingPeriod que será chamado após a animação terminar
    };
    
    // Período ANTES da primeira jogada: shooter apostou → outros podem apostar até fechar o valor (15s)
    this._startPreRollBettingPeriod = function(){
        if(_iPreRollBettingTimer){
            clearTimeout(_iPreRollBettingTimer);
            _iPreRollBettingTimer = null;
        }
        _bShooterClickedApostar = true;
        _bPreRollBettingOpen = true;
        var secondsLeft = _iPreRollBettingSeconds;
        _oInterface.enableRoll(false);
        _oInterface.showMessage("Apostas abertas – outros jogadores podem apostar (" + secondsLeft + "s)");
        var countInterval = setInterval(function(){
            secondsLeft--;
            if(secondsLeft > 0 && _bPreRollBettingOpen){
                _oInterface.showMessage("Apostas abertas – outros jogadores podem apostar (" + secondsLeft + "s)");
            } else {
                clearInterval(countInterval);
            }
        }, 1000);
        _iPreRollBettingTimer = setTimeout(function(){
            if(!_bPreRollBettingOpen) return;
            _bPreRollBettingOpen = false;
            _iPreRollBettingTimer = null;
            if(_oInterface && _oInterface.hideMessage) _oInterface.hideMessage();
            var isMyTurn = !window.GameClientSocketIO || !window.GameClientSocketIO.isConnected || !window.GameClientSocketIO.isAuthenticated || _bIsMyTurn;
            if(isMyTurn && _oMySeat.getCurBet() > 0){
                _oInterface.setRollButtonLabel(typeof TEXT_ROLL !== 'undefined' ? TEXT_ROLL : "LANÇAR");
                _oInterface.enableRoll(true);
                _oInterface.showMessage("Pode lançar!");
                setTimeout(function(){ if(_oInterface && _oInterface.hideMessage) _oInterface.hideMessage(); }, 1500);
            }
        }, _iPreRollBettingSeconds * 1000);
    };
    
    this._endPreRollBettingPeriod = function(){
        if(_iPreRollBettingTimer){
            clearTimeout(_iPreRollBettingTimer);
            _iPreRollBettingTimer = null;
        }
        _bPreRollBettingOpen = false;
        _bShooterClickedApostar = false;  // reset ao limpar ou iniciar nova rodada
    };
    
    // NOVA FUNÇÃO: Iniciar período de apostas APÓS a animação dos dados terminar
    this._startPointBettingPeriod = function(iNumber){
        console.log("");
        console.log("🎯🎯🎯 _startPointBettingPeriod CHAMADA - INICIANDO PERÍODO DE APOSTAS");
        console.log("     Ponto:", iNumber);
        console.log("     _bIAmShooter:", _bIAmShooter);
        console.log("     _bPointBettingOpen ANTES:", _bPointBettingOpen);
        console.log("     _iPointBettingTimer ANTES:", _iPointBettingTimer);
        console.log("     _oInterface existe:", !!_oInterface);
        console.log("");
        
        // CRÍTICO: Se período já está aberto e timer ainda está ativo, não fazer nada
        // IMPORTANTE: Só retornar se o timer ainda está ativo E o período está aberto
        // Se o período está aberto mas o timer foi limpo (erro), recriar o timer
        if(_bPointBettingOpen && _iPointBettingTimer !== null){
            console.warn("⚠️⚠️⚠️ ATENÇÃO: Período de apostas já está aberto e timer ainda está ativo!");
            console.warn("   Ignorando chamada para evitar resetar o timer");
            // MAS: Garantir que os botões estão visíveis mesmo assim
            if(!_bIAmShooter && _oInterface && iNumber > 0){
                console.log("🔄 Garantindo que botões estão visíveis mesmo com período já aberto");
                _oInterface.showPointBettingButtons(iNumber);
            }
            return; // Sair imediatamente
        }
        
        // CRÍTICO: Se período está aberto mas timer foi limpo (erro), limpar flag e recriar
        if(_bPointBettingOpen && _iPointBettingTimer === null){
            console.warn("⚠️⚠️⚠️ ERRO DETECTADO: Período está aberto mas timer foi limpo!");
            console.warn("   Limpando flag e recriando período corretamente");
            _bPointBettingOpen = false;
        }
        
        // Limpar timer anterior se existir (IMPORTANTE: evitar múltiplos timers)
        if(_iPointBettingTimer){
            console.log("⚠️ Limpando timer anterior antes de criar novo");
            clearTimeout(_iPointBettingTimer);
            _iPointBettingTimer = null;
        }
        
        // AGORA SIM: Abrir período de apostas
        _bPointBettingOpen = true;
        console.log("✅ _bPointBettingOpen definido como TRUE");
        console.log("   Verificação imediata: _bPointBettingOpen =", _bPointBettingOpen);
        
        // DESABILITAR BOTÃO "APOSTE AQUI" durante o período de apostas no ponto
        _oTableController.disableMainBetButton();
        console.log("✅ Botão 'APOSTE AQUI' desabilitado");
        
        // MOSTRAR BOTÕES: shooter pode apostar NO PONTO; outros podem apostar no ponto e no 7
        if(_oInterface){
            _oInterface.showPointBettingButtons(iNumber, _bIAmShooter);
            _oInterface.enableBetFiches();
            _oInterface.enableClearButton();
            console.log("✅ Botões mostrados - shooter pode apostar no ponto, não no 7");
        }
        
        // IMPORTANTE: Desabilitar botão de rolar para o SHOOTER durante os 10 segundos
        if(_bIAmShooter){
            _oInterface.enableRoll(false);
            console.log("🔒 Botão de rolar DESABILITADO para o shooter durante os 10 segundos de apostas");
        }
        
        // CONTADOR VISUAL: Mostrar segundos restantes (10 segundos)
        var iBettingTimeSeconds = 10;
        var secondsLeft = iBettingTimeSeconds;
        
        // Mensagem diferente para o shooter e outros jogadores
        if(_bIAmShooter){
            _oInterface.showMessage("PONTO: " + iNumber + " | AGUARDE OS OUTROS JOGADORES APOSTAREM ⏰ " + secondsLeft + "s");
        } else {
            _oInterface.showMessage("PONTO: " + iNumber + " | APOSTE AGORA! ⏰ " + secondsLeft + "s");
        }
        
        var countdownInterval = setInterval(function() {
            secondsLeft--;
            if(secondsLeft > 0 && _bPointBettingOpen){
                if(_bIAmShooter){
                    _oInterface.showMessage("PONTO: " + iNumber + " | AGUARDE OS OUTROS JOGADORES ⏰ " + secondsLeft + "s");
                } else {
                    _oInterface.showMessage("PONTO: " + iNumber + " | APOSTE AGORA! ⏰ " + secondsLeft + "s");
                }
            } else {
                clearInterval(countdownInterval);
            }
        }, 1000);
        
        // Limpar verificação anterior se existir
        if(_iVisibilityCheckInterval){
            clearInterval(_iVisibilityCheckInterval);
            _iVisibilityCheckInterval = null;
        }
        
        // Verificação periódica para garantir que os botões permaneçam visíveis
        var iCurrentPoint = iNumber;
        _iVisibilityCheckInterval = setInterval(function() {
            var bPointBettingOpen = _bPointBettingOpen;
            var bIAmShooter = _bIAmShooter;
            var iNumberPoint = _iNumberPoint;
            
            if(!bPointBettingOpen){
                console.log("⏰ Período de apostas fechou - limpando intervalo de verificação");
                if(_iVisibilityCheckInterval){
                    clearInterval(_iVisibilityCheckInterval);
                    _iVisibilityCheckInterval = null;
                }
                return;
            }
            
            if(bPointBettingOpen && iNumberPoint > 0){
                if(_oInterface){
                    if(_oInterface.ensurePointBettingButtonsVisible){
                        _oInterface.ensurePointBettingButtonsVisible();
                    }
                    
                    var oContainer = window.s_oInterface && window.s_oInterface._oPointBettingContainer;
                    if(!oContainer || !oContainer.visible){
                        console.warn("⚠️⚠️⚠️ Container de botões foi escondido durante período de apostas - FORÇANDO RESTAURAÇÃO!");
                        _oInterface.showPointBettingButtons(iNumberPoint, _bIAmShooter);
                    }
                }
            } else {
                if(_iVisibilityCheckInterval){
                    clearInterval(_iVisibilityCheckInterval);
                    _iVisibilityCheckInterval = null;
                }
            }
        }, 100);
        
        // TIMER DE 10 SEGUNDOS: Após isso, fecha as apostas e libera o shooter
        // IMPORTANTE: Este timer começa AGORA, quando o modal é aberto (após animação terminar)
        // CRÍTICO: Armazenar referência ao timer para evitar que seja limpo incorretamente
        var iTimerStartTime = Date.now();
        console.log("⏰ Criando timer de " + iBettingTimeSeconds + " segundos...");
        console.log("   Timestamp de início:", iTimerStartTime);
        console.log("   _bPointBettingOpen ANTES de criar timer:", _bPointBettingOpen);
        
        // CRÍTICO: Criar uma referência local ao timer para garantir que não seja limpo incorretamente
        var timerId = setTimeout(function() {
            // CRÍTICO: Verificar se este timer ainda é o timer ativo antes de fechar
            // Se o timer foi limpo e recriado, não fechar o período
            if(_iPointBettingTimer !== timerId){
                console.warn("⚠️⚠️⚠️ TIMER EXPIRADO MAS NÃO É MAIS O TIMER ATIVO - IGNORANDO FECHAMENTO");
                console.warn("   Timer ID esperado:", timerId);
                console.warn("   Timer ID atual:", _iPointBettingTimer);
                return; // Não fechar - outro timer foi criado
            }
            
            // CRÍTICO: Verificar se período ainda está aberto antes de fechar
            if(!_bPointBettingOpen){
                console.warn("⚠️⚠️⚠️ TIMER EXPIRADO MAS PERÍODO JÁ ESTÁ FECHADO - IGNORANDO FECHAMENTO");
                return; // Não fechar - período já foi fechado
            }
            
            var iTimerEndTime = Date.now();
            var iElapsedTime = (iTimerEndTime - iTimerStartTime) / 1000;
            console.log("⏰⏰⏰ TIMER DE " + iBettingTimeSeconds + " SEGUNDOS EXPIROU - FECHANDO PERÍODO DE APOSTAS");
            console.log("   Timestamp de início:", iTimerStartTime);
            console.log("   Timestamp de fim:", iTimerEndTime);
            console.log("   Tempo decorrido:", iElapsedTime.toFixed(2), "segundos");
            console.log("   _bPointBettingOpen ANTES de fechar:", _bPointBettingOpen);
            
            // FECHAR período de apostas
            _bPointBettingOpen = false;
            clearInterval(countdownInterval);
            if(_iVisibilityCheckInterval){
                clearInterval(_iVisibilityCheckInterval);
                _iVisibilityCheckInterval = null;
            }
            
            if(_oInterface && _oInterface.hidePointBettingButtons){
                _oInterface.hidePointBettingButtons(true);
            }
            
            // CRÍTICO: Só limpar o timer se ainda for o timer ativo
            if(_iPointBettingTimer === timerId){
                _iPointBettingTimer = null;
            }
            
            _oTableController.enableMainBetButton();
            
            if(!_bIAmShooter){
                _oInterface.disableBetFiches();
                _oInterface.disableClearButton();
                console.log("⏰ TEMPO ESGOTADO - Apostas fechadas!");
                _oInterface.showMessage("APOSTAS FECHADAS! Aguarde (DADOS) jogar.");
                
                setTimeout(function() {
                    if (_oInterface && _oInterface.hideMessage) {
                        _oInterface.hideMessage();
                    }
                }, 3000);
            } else {
                _oInterface.enableRoll(true);
                console.log("✅ Botão de rolar HABILITADO para o shooter");
                console.log("⏰ TEMPO ESGOTADO - Apostas dos outros jogadores fechadas!");
                _oInterface.showMessage("Agora você pode jogar!");

                setTimeout(function() {
                    if (_oInterface && _oInterface.hideMessage) {
                        _oInterface.hideMessage();
                    }
                }, 2000);
            }
        }, iBettingTimeSeconds * 1000); // 10 segundos - começa AGORA quando modal abre
        
        // CRÍTICO: Atribuir o timer ID imediatamente após criar
        _iPointBettingTimer = timerId;
        
        console.log("✅ Período de apostas iniciado - 10 segundos começando AGORA");
        console.log("   _iPointBettingTimer criado:", _iPointBettingTimer);
        console.log("   Timer ID:", timerId);
        console.log("   _bPointBettingOpen:", _bPointBettingOpen);
        console.log("   Timer deve expirar em:", iBettingTimeSeconds, "segundos");
        console.log("   Timestamp de início do timer:", iTimerStartTime);
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
                // 7-11: GANHA DOBRO - Total (aposta + ganho) deve ir para "APOSTE AQUI"; só pode rolar se apostar esse total
                var iTotalActiveBets = _oMySeat.getCurBet();
                if(iTotalActiveBets > 0){
                    var iAutoWin = iTotalActiveBets * 2; // Dobro = aposta + ganho (total a apostar de novo)
                    var iTotalToBet = iAutoWin; // Total que deve ser colocado na mesa = aposta + ganho
                    
                    // Creditar o total (aposta + ganho)
                    _oMySeat.showWin(iTotalToBet);
                    _oInterface.setMoney(_oMySeat.getCredit());
                    
                    // Colocar fichas automaticamente na mesa (APOSTE AQUI) para o shooter só clicar em lançar
                    var bAutoPlaced = _oMySeat.placeBetAmountOnButton(iTotalToBet, "main_bet");
                    _iLockedBalance = 0;
                    _bMustBetFullWin = false;
                    _iLastWinAmount = 0;
                    
                    if(bAutoPlaced){
                        _oInterface.setCurBet(_oMySeat.getCurBet());
                        _oInterface.refreshMsgHelp("GANHOU! FICHAS NA MESA – CLIQUE EM LANÇAR!", true);
                        new CScoreText("GANHOU! " + iTotalToBet + TEXT_CURRENCY + "\nCLIQUE EM LANÇAR!", CANVAS_WIDTH/2, CANVAS_HEIGHT/2);
                    } else {
                        _iLastWinAmount = iTotalToBet;
                        _bMustBetFullWin = true;
                        _oInterface.setCurBet(0);
                        _oInterface.refreshMsgHelp("COLOQUE " + iTotalToBet + TEXT_CURRENCY + " EM APOSTE AQUI PARA LANÇAR NOVAMENTE!", true);
                        new CScoreText("GANHOU! " + iTotalToBet + TEXT_CURRENCY + "\nAPOSTE ESSE VALOR EM 'APOSTE AQUI' PARA ROLAR!", CANVAS_WIDTH/2, CANVAS_HEIGHT/2);
                    }
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
                
                // PROCESSAR APOSTAS NO 7 - SISTEMA DE PARADAS
                // Quando sai 7, quem apostou no 7 ganha baseado na aposta e no valor de "perde" da tabela
                if(_aSevenBets['seven'] && _aSevenBets['seven'] > 0){
                    var iSevenBet = _aSevenBets['seven'];
                    // Calcular ganho: para cada unidade de 100 apostada, ganha o valor "perde" da tabela
                    // Exemplo: Ponto 4, aposta 100 no 7, ganha 200 (além da aposta)
                    var iGanhoPorUnidade = _aPayoutTable[_iNumberPoint].perde;
                    var iUnidades = Math.floor(iSevenBet / _iParadaBaseValue);
                    var iSevenWin = iUnidades * iGanhoPorUnidade;
                    
                    _oMySeat.showWin(iSevenBet + iSevenWin); // Devolve aposta + ganho
                    _oInterface.setMoney(_oMySeat.getCredit());
                    
                    new CScoreText("SAIU 7! VOCÊ GANHOU " + iSevenWin + TEXT_CURRENCY + "!", CANVAS_WIDTH/2, CANVAS_HEIGHT/2 - 50);
                    playSound("win", 0.5, false);
                } else if(iTotalActiveBets > 0) {
                    new CScoreText("7 - SHOOTER PERDEU!", CANVAS_WIDTH/2, CANVAS_HEIGHT/2);
                }
                
                // PROCESSAR APOSTAS NO PONTO (perdem quando sai 7)
                // O débito já foi feito quando o jogador apostou, então não precisa debitar novamente
                // Apenas registrar que perdeu
                if(_aParadas[_iNumberPoint] && _aParadas[_iNumberPoint] > 0){
                    var iNumParadas = _aParadas[_iNumberPoint];
                    var iTotalPerdido = 0;
                    
                    // Calcular total perdido (já foi debitado quando apostou)
                    for(var i = 1; i <= iNumParadas; i++){
                        iTotalPerdido += i * _iParadaBaseValue;
                    }
                    
                    console.log("❌ Paradas no ponto " + _iNumberPoint + " perderam:", iNumParadas + " paradas, total perdido: " + iTotalPerdido);
                    
                    // Mostrar mensagem de perda
                    if(iNumParadas > 0){
                        new CScoreText("SAIU 7! VOCÊ PERDEU " + iTotalPerdido + TEXT_CURRENCY + "\n(" + iNumParadas + " PARADA(S))", CANVAS_WIDTH/2, CANVAS_HEIGHT/2 - 30);
                        playSound("lose", 0.3, false);
                    }
                }
                
                // Limpar apostas no ponto e no 7
                _aPointBets = {};
                _aSevenBets = {};
                _aParadas = {}; // Limpar paradas também
                try {
                    var ch = new BroadcastChannel('polegar_bets');
                    ch.postMessage({ type: 'clear_bets' });
                } catch (e) {}

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
                
                // RESETAR FLAG DE SHOOTER (rodada terminou)
                _bIAmShooter = false;
                console.log("🔄 Rodada terminou (7) - _bIAmShooter = false");
                
                // OCULTAR BOTÕES E REABILITAR BOTÃO "APOSTE AQUI"
                // FORÇAR esconder porque a rodada terminou (7 out)
                _oInterface.hidePointBettingButtons(true);
                _oTableController.enableMainBetButton();
            } else if(iSumDices === _iNumberPoint){
                // ACERTOU O PONTO: SHOOTER GANHA - Total (aposta + ganho) deve ir para "APOSTE AQUI"; só pode rolar se apostar esse total
                var iTotalActiveBets = _oMySeat.getCurBet();
                
                // Determina o multiplicador baseado no número do ponto
                var iMultiplier = 1;
                if(_iNumberPoint === 4 || _iNumberPoint === 10) iMultiplier = 2; // Dobro
                else if(_iNumberPoint === 5 || _iNumberPoint === 9) iMultiplier = 1.5; // 50%
                else if(_iNumberPoint === 6 || _iNumberPoint === 8) iMultiplier = 1.25; // 25%
                
                // Se o SHOOTER tinha apostas ativas
                if(iTotalActiveBets > 0){
                    var iAutoWin = iTotalActiveBets * iMultiplier; // só o ganho
                    var iTotalToBet = iTotalActiveBets + iAutoWin; // aposta + ganho = total na mesa
                    
                    // Creditar o total (aposta + ganho)
                    _oMySeat.showWin(iTotalToBet);
                    _oInterface.setMoney(_oMySeat.getCredit());
                    
                    // Remove fichas visuais do shooter (aposta anterior)
                    _oMySeat.clearAllBetsVisualOnly();
                    
                    // Colocar fichas automaticamente na mesa (APOSTE AQUI) para o shooter só clicar em lançar
                    var bAutoPlaced = _oMySeat.placeBetAmountOnButton(iTotalToBet, "main_bet");
                    _iLockedBalance = 0;
                    _bMustBetFullWin = false;
                    _iLastWinAmount = 0;
                    
                    if(bAutoPlaced){
                        _oInterface.setCurBet(_oMySeat.getCurBet());
                        _oInterface.refreshMsgHelp("GANHOU! FICHAS NA MESA – CLIQUE EM LANÇAR!", true);
                    } else {
                        _iLastWinAmount = iTotalToBet;
                        _bMustBetFullWin = true;
                        _oInterface.setCurBet(0);
                        _oInterface.refreshMsgHelp("COLOQUE " + iTotalToBet + TEXT_CURRENCY + " EM APOSTE AQUI PARA LANÇAR NOVAMENTE!", true);
                    }
                    
                    playSound("win", 0.2, false);
                }
                
                // PROCESSAR APOSTAS NO PONTO (ganham) - SISTEMA DE PARADAS
                if(_aParadas[_iNumberPoint] && _aParadas[_iNumberPoint] > 0){
                    var iNumParadas = _aParadas[_iNumberPoint];
                    var iTotalGanho = 0;
                    
                    // Calcular ganho para cada parada
                    for(var i = 1; i <= iNumParadas; i++){
                        var iParadaValue = i * _iParadaBaseValue;
                        var iGanhoPorParada = _aPayoutTable[_iNumberPoint].ganha;
                        iTotalGanho += iParadaValue + iGanhoPorParada; // Devolve aposta + ganho
                    }
                    
                    _oMySeat.showWin(iTotalGanho);
                    _oInterface.setMoney(_oMySeat.getCredit());
                    
                    new CScoreText("PONTO " + _iNumberPoint + "! " + iNumParadas + " PARADA(S)!\nVOCÊ GANHOU " + iTotalGanho + TEXT_CURRENCY + "!", CANVAS_WIDTH/2, CANVAS_HEIGHT/2 - 50);
                    playSound("win", 0.5, false);
                } else if(iTotalActiveBets > 0) {
                    new CScoreText(bAutoPlaced ? "PONTO " + _iNumberPoint + "! FICHAS NA MESA – CLIQUE EM LANÇAR!" : "PONTO " + _iNumberPoint + "! APOSTE " + (iTotalActiveBets + iAutoWin) + TEXT_CURRENCY + " EM 'APOSTE AQUI' PARA ROLAR!", CANVAS_WIDTH/2, CANVAS_HEIGHT/2);
                }
                
                // PROCESSAR APOSTAS NO 7 (perdem)
                if(_aSevenBets['seven'] && _aSevenBets['seven'] > 0){
                    console.log("❌ Apostas no 7 perderam:", _aSevenBets['seven']);
                }
                
                // Limpar apostas no ponto e no 7
                _aPointBets = {};
                _aSevenBets = {};
                _aParadas = {}; // Limpar paradas também
                try {
                    var ch = new BroadcastChannel('polegar_bets');
                    ch.postMessage({ type: 'clear_bets' });
                } catch (e) {}
                
                _aBetHistory = {};
                
                // Ponto acertado: shooter continua com o dado; deve apostar (aposta+ganho) para rolar de novo
                _iNumberPoint = -1;
                this._setState(STATE_GAME_WAITING_FOR_BET);
                
                // Shooter MANTÉM o dado (não passa) - só pode rolar quando apostar o total em "APOSTE AQUI"
                // _bIAmShooter permanece true
                
                // OCULTAR BOTÕES E REABILITAR BOTÃO "APOSTE AQUI"
                _oInterface.hidePointBettingButtons(true);
                _oTableController.enableMainBetButton();
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
        
        // CRITICAL: Bloquear o shooter durante o período de apostas (8 segundos)
        if(_bIAmShooter && _bPointBettingOpen){
            _oMsgBox.show("AGUARDE OS 8 SEGUNDOS!\nOUTROS JOGADORES ESTÃO APOSTANDO NO PONTO OU NO 7.");
            return;
        }
        
        // REGRA DE TURNO: Verificar se é a vez do jogador
        if(!_bIsMyTurn){
            _oMsgBox.show("AGUARDE SUA VEZ!\nO BOTÃO SERÁ LIBERADO QUANDO FOR SEU TURNO.");
            return;
        }

        // Ao iniciar um novo lançamento, limpar a flag de forçar lançamento após cobertura
        _bForceRollAfterCoverage = false;
        
        if (_oMySeat.getCurBet() === 0) {
                return;
        }

        // APOSTAR: shooter clicou no botão que mostra "APOSTAR" → abrir período para outros apostarem
        var isShooterOrSingleRoll = !window.GameClientSocketIO || !window.GameClientSocketIO.isConnected || !window.GameClientSocketIO.isAuthenticated || _bIAmShooter;
        if(isShooterOrSingleRoll && _iState === STATE_GAME_WAITING_FOR_BET && !_bShooterClickedApostar && !_bPreRollBettingOpen && !_bPointBettingOpen){
            this._startPreRollBettingPeriod();
            _oInterface.enableRoll(false);
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
                // Não habilitar rolar se estiver no período de apostas
                if(!_bPointBettingOpen){
                    _oInterface.enableRoll(true);
                }
            }
            
            return;
        }

        if(_oInterface.isBlockVisible()){
                return;
        }

        // Set rolling flag to prevent double-clicks
        this._isRolling = true;
        
        // ⚠️⚠️⚠️ IMPORTANTE: MARCAR QUE EU SOU O SHOOTER LOGO NO INÍCIO ⚠️⚠️⚠️
        // Isso DEVE acontecer ANTES de qualquer outra coisa
        _bIAmShooter = true;
        console.log("🎯🎯🎯 SETANDO _bIAmShooter = true (EU SOU O SHOOTER QUE ESTÁ LANÇANDO)");
        console.log("     Verificação imediata: _bIAmShooter =", _bIAmShooter);
        
        // BLOQUEAR O TURNO: Após lançar, não é mais sua vez
        _bIsMyTurn = false;
        _oInterface.enableRoll(false);
        
        _oInterface.showBlock();
        
        if(_iState === STATE_GAME_WAITING_FOR_BET){
            this._setState(STATE_GAME_COME_OUT);
        }
        
        console.log("     Antes de prepareForRolling: _bIAmShooter =", _bIAmShooter);
        
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
        
        // CRITICAL FIX: Update _bIAmShooter when shooter changes
        // Em multiplayer, sou shooter SE meu userId == currentShooter do servidor
        var isMultiplayer = window.GameClientSocketIO && window.GameClientSocketIO.isConnected && window.GameClientSocketIO.isAuthenticated;
        if (isMultiplayer) {
            var myId = window.GameClientSocketIO.currentUserId;
            var currentShooterId = window.GameClientSocketIO.gameState && window.GameClientSocketIO.gameState.currentShooter;
            _bIAmShooter = (myId && currentShooterId && myId === currentShooterId);
        } else {
            // Single player: sempre shooter quando for meu turno
            _bIAmShooter = isMyTurn;
        }
        console.log('🎯 _bIAmShooter atualizado para:', _bIAmShooter, '(isMyTurn:', isMyTurn + ', multiplayer:', !!isMultiplayer + ')');

        // Se acabamos de sair da cobertura e marcamos para forçar o lançamento,
        // NÃO deixar nenhuma outra lógica desligar o botão de lançar.
        if (_bForceRollAfterCoverage && _bIAmShooter && isMyTurn && _oMySeat.getCurBet() > 0) {
            console.log('🎯 Mantendo botão de lançar habilitado após cobertura (forçado)');
            _oInterface.enableRoll(true);
            _oInterface.setRollButtonLabel(TEXT_ROLL);
            _oInterface.enablePassDice(true);
            // Ainda assim manter fichas/clear conforme turno
            _oInterface.enableBetFiches();
            _oInterface.enableClearButton();
            
            console.log(`✅ Turn updated (FORÇADO) - isMyTurn: ${isMyTurn}, canRoll: true`);
            return;
        }
        
        // Only allow rolling if it's my turn, sou o SHOOTER, há aposta e não há período de apostas/cobertura
        // Se ganhou e deve apostar o valor total, só pode rolar quando a aposta for exatamente esse valor
        var betOk = _oMySeat.getCurBet() > 0;
        if (_bMustBetFullWin && _iLastWinAmount > 0) {
            betOk = (_oMySeat.getCurBet() === _iLastWinAmount);
        }
        var canRoll = isMyTurn && _bIAmShooter && betOk && !_bPointBettingOpen && !_bPreRollBettingOpen && !_bPreRollCoverageOpen;
        _oInterface.enableRoll(canRoll);
        if(_iState === STATE_GAME_WAITING_FOR_BET && isMyTurn){
            if(!_bShooterClickedApostar){
                _oInterface.setRollButtonLabel(typeof TEXT_APOSTAR !== 'undefined' ? TEXT_APOSTAR : "APOSTAR");
            } else if(!_bPreRollBettingOpen){
                _oInterface.setRollButtonLabel(TEXT_ROLL);
            }
        } else if(canRoll){
            _oInterface.setRollButtonLabel(TEXT_ROLL);
        }

        if(isMyTurn && _bPointBettingOpen){
            console.log("🔒 Botão de rolar BLOQUEADO - Período de apostas ainda ativo (8 segundos)");
        }
        
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
        // EXCEÇÕES:
        //  - Durante os 7 SEGUNDOS após estabelecer o POINT, outros jogadores podem apostar
        //  - Durante a fase de COBERTURA PRÉ-ROLAGEM, QUALQUER jogador que NÃO é o shooter pode apostar contra o shooter
        var isMultiplayer = window.GameClientSocketIO && window.GameClientSocketIO.isConnected && window.GameClientSocketIO.isAuthenticated;
        var isCoveragePhase = isMultiplayer && _bPreRollCoverageOpen === true && !_bIAmShooter;
        
        // Verificar se o período de apostas no POINT está aberto (7 segundos)
        // ou se estamos na fase de cobertura pré-rolagem
        if(isMultiplayer && !_bIsMyTurn && !_bPointBettingOpen && !isCoveragePhase){
            _oMsgBox.show("AGUARDE SUA VEZ!\nVOCÊ SÓ PODE APOSTAR QUANDO FOR SEU TURNO\nOU NOS 7 SEGUNDOS APÓS O PONTO SER ESTABELECIDO\nOU QUANDO FOR SUA VEZ NA COBERTURA CONTRA O SHOOTER.");
            playSound("lose", 0.3, false);
            return;
        }
        
        // Mensagem informativa durante o período de apostas do POINT
        if(isMultiplayer && !_bIsMyTurn && _bPointBettingOpen){
            console.log("📊 Jogador apostando durante os 7 segundos do POINT - permitido!");
        }
        // Mensagem informativa durante a fase de cobertura pré-rolagem
        if(isMultiplayer && !_bIsMyTurn && isCoveragePhase){
            console.log("📊 Jogador apostando durante a COBERTURA PRÉ-ROLAGEM contra o shooter - permitido!");
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
        var bBetSuccess = _oMySeat.addFicheOnButton(iFicheValue,iIndexFicheSelected,szBut);
        
        // Verificar se a aposta foi bem-sucedida
        if(!bBetSuccess){
            // Reverter histórico de aposta se falhou
            if(_aBetHistory[oParams.button] !== undefined){
                _aBetHistory[oParams.button] -= iFicheValue;
                if(_aBetHistory[oParams.button] <= 0){
                    delete _aBetHistory[oParams.button];
                }
            }
            _oMsgBox.show("SALDO INSUFICIENTE!\nNÃO FOI POSSÍVEL COMPLETAR A APOSTA.");
            playSound("lose", 0.3, false);
            return;
        }

        // Se estamos na fase de COBERTURA PRÉ-ROLAGEM em multiplayer (apostas contra o shooter),
        // também enviar a aposta para o servidor via Socket.IO
        if (isMultiplayer && _bPreRollCoverageOpen && !_bIAmShooter &&
            window.GameClientSocketIO && window.GameClientSocketIO.placeBet) {
            try {
                console.log("📤 Enviando aposta de COBERTURA ao servidor:", iFicheValue);
                window.GameClientSocketIO.placeBet('coverage', iFicheValue);
            } catch (e) {
                console.error("❌ Erro ao enviar aposta de cobertura para o servidor:", e);
            }
        }
        
        var iCurrentCredit = _oMySeat.getCredit();
        _oInterface.setMoney(iCurrentCredit);
        _oInterface.setCurBet(_oMySeat.getCurBet());
        
        if(_oDiceHistory && _oDiceHistory.updateBets){
            var ptBet = (_iNumberPoint > 0 && _aPointBets[_iNumberPoint]) ? _aPointBets[_iNumberPoint] : 0;
            _oDiceHistory.updateBets([{
                username: "Você", userId: "local", currentBet: _oMySeat.getCurBet(),
                pointBet: ptBet, pointBetNumber: _iNumberPoint > 0 ? _iNumberPoint : undefined,
                sevenBet: _aSevenBets['seven'] || 0
            }], "local");
        }
        
        // Atualizar botão: APOSTAR (quando shooter tem aposta mas ainda não clicou) ou LANÇAR
        var isShooterOrSingle = !isMultiplayer || _bIAmShooter;
        if(isShooterOrSingle && _iState === STATE_GAME_WAITING_FOR_BET && _oMySeat.getCurBet() > 0){
            if(!_bShooterClickedApostar){
                _oInterface.setRollButtonLabel(typeof TEXT_APOSTAR !== 'undefined' ? TEXT_APOSTAR : "APOSTAR");
                _oInterface.refreshMsgHelp("Clique em APOSTAR para abrir apostas dos outros jogadores", true);
            } else if(!_bPreRollBettingOpen){
                _oInterface.setRollButtonLabel(TEXT_ROLL);
            }
        }
        
        // Verificar saldo e habilitar/desabilitar fichas
        var iMinFicheValue = s_oGameSettings.getFicheValues(0);
        if(iCurrentCredit < iMinFicheValue){
            _oInterface.disableBetFiches();
        } else if(!_bPointBettingOpen || _bIsMyTurn){
            // Só habilitar fichas se não estiver no período de apostas OU se for o turno do jogador
            _oInterface.enableBetFiches();
        }
        
        // APOSTAR: shooter tem aposta, não clicou APOSTAR → botão mostra APOSTAR
        // LANÇAR: shooter clicou APOSTAR, período fechou → botão mostra LANÇAR
        if(_bPreRollBettingOpen){
            _oInterface.enableRoll(false);
            _oInterface.setRollButtonLabel(TEXT_ROLL);
        } else if(_bIAmShooter && _bPointBettingOpen){
            _oInterface.enableRoll(false);
        } else if(isShooterOrSingle && _bIAmShooter && _iState === STATE_GAME_WAITING_FOR_BET && _oMySeat.getCurBet() > 0 && !_bShooterClickedApostar && !_bPreRollCoverageOpen){
            _oInterface.enableRoll(true);
            _oInterface.setRollButtonLabel(typeof TEXT_APOSTAR !== 'undefined' ? TEXT_APOSTAR : "APOSTAR");
        } else if(isShooterOrSingle && _bIAmShooter && _bShooterClickedApostar && !_bPreRollBettingOpen && !_bPreRollCoverageOpen){
            var canRollNow = !_bMustBetFullWin || _oMySeat.getCurBet() === _iLastWinAmount;
            _oInterface.enableRoll(canRollNow);
            _oInterface.setRollButtonLabel(TEXT_ROLL);
        } else if(!_bPointBettingOpen || !_bIAmShooter){
            // Fora da fase de POINT, a lógica de onTurnChange já decide se pode rolar
            // Aqui evitamos reabilitar o botão de rolar para não-shooters em multiplayer
            if(!isMultiplayer){
                var canRollNow = true;
                if (_bMustBetFullWin && _iLastWinAmount > 0) canRollNow = (_oMySeat.getCurBet() === _iLastWinAmount);
                _oInterface.enableRoll(canRollNow);
                _oInterface.setRollButtonLabel(TEXT_ROLL);
            } else {
                _oInterface.enableRoll(false);
            }
        }
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
        
        // Shooter PODE apostar no ponto (mas não no 7)
        
        // Verificar se o período de apostas está aberto
        if(!_bPointBettingOpen){
            _oMsgBox.show("PERÍODO DE APOSTAS ENCERRADO!");
            return;
        }
        
        // Verificar limite de paradas (máximo 10 por ponto)
        if(!_aParadas[_iNumberPoint]){
            _aParadas[_iNumberPoint] = 0;
        }
        if(_aParadas[_iNumberPoint] >= 10){
            _oMsgBox.show("LIMITE DE 10 PARADAS ATINGIDO PARA ESTE PONTO!");
            playSound("lose", 0.3, false);
            return;
        }
        
        // Calcular valor da próxima parada
        var iParadaNumber = _aParadas[_iNumberPoint] + 1;
        var iParadaValue = iParadaNumber * _iParadaBaseValue; // 1 parada = 100, 2 paradas = 200, etc
        
        // Verificar se jogador tem crédito
        if(_oMySeat.getCredit() < iParadaValue){
            _oMsgBox.show("SALDO INSUFICIENTE!\nPARADA " + iParadaNumber + " REQUER " + iParadaValue + TEXT_CURRENCY);
            return;
        }
        
        // Incrementar número de paradas
        _aParadas[_iNumberPoint] = iParadaNumber;
        
        // Adicionar aposta ao ponto (manter compatibilidade com sistema antigo)
        if(!_aPointBets[_iNumberPoint]){
            _aPointBets[_iNumberPoint] = 0;
        }
        _aPointBets[_iNumberPoint] += iParadaValue;
        
        // Descontar do crédito e da aposta atual
        // IMPORTANTE: decreaseBet apenas altera _iCurBet, precisamos também debitar o crédito
        // Usar setFicheBetted que faz ambos: debita crédito e aumenta aposta atual
        var aFichesMc = []; // Array vazio - não precisamos fichas visuais para apostas no ponto
        var bBetSuccess = _oMySeat.setFicheBetted(iParadaValue, aFichesMc, 1);
        
        // Verificar se a aposta foi bem-sucedida
        if(!bBetSuccess){
            // Reverter incremento de paradas se a aposta falhou
            _aParadas[_iNumberPoint] = iParadaNumber - 1;
            _aPointBets[_iNumberPoint] -= iParadaValue;
            _oMsgBox.show("SALDO INSUFICIENTE!\nNÃO FOI POSSÍVEL COMPLETAR A APOSTA.");
            playSound("lose", 0.3, false);
            return;
        }
        
        _oInterface.setMoney(_oMySeat.getCredit());
        
        // Calcular ganho potencial
        var iGanhoPotencial = iParadaValue + _aPayoutTable[_iNumberPoint].ganha;
        
        // Atualizar texto do botão para mostrar número de paradas
        if(_oInterface && _oInterface.updatePointButtonText){
            _oInterface.updatePointButtonText(_iNumberPoint, iParadaNumber);
        }
        
        // Feedback visual
        new CScoreText("PARADA " + iParadaNumber + " NO PONTO " + _iNumberPoint + "\n" + iParadaValue + "x" + iGanhoPotencial, CANVAS_WIDTH/2, CANVAS_HEIGHT/2 + 30);
        playSound("chip", 1, false);
        
        console.log("✅ Parada " + iParadaNumber + " no ponto " + _iNumberPoint + " registrada:", iParadaValue, "Total no ponto:", _aPointBets[_iNumberPoint]);
        try {
            var ch = new BroadcastChannel('polegar_bets');
            ch.postMessage({ type: 'point_bet', point: _iNumberPoint, amount: iParadaValue, total: _aPointBets[_iNumberPoint] });
        } catch (e) {}
    };
    
    this.onBetOnSeven = function(){
        console.log('🎲 Jogador quer apostar no 7');
        
        // BLOQUEAR O SHOOTER de apostar no 7 - shooter só pode apostar no ponto
        if(_bIAmShooter){
            _oMsgBox.show("VOCÊ É O SHOOTER!\nVOCÊ PODE APOSTAR NO PONTO, MAS NÃO NO 7!");
            playSound("lose", 0.3, false);
            return;
        }
        
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
        
        // Descontar do crédito usando setFicheBetted (que valida saldo)
        var aFichesMc = []; // Array vazio - não precisamos fichas visuais para apostas no 7
        var bBetSuccess = _oMySeat.setFicheBetted(iFicheValue, aFichesMc, 1);
        
        // Verificar se a aposta foi bem-sucedida
        if(!bBetSuccess){
            _oMsgBox.show("SALDO INSUFICIENTE!\nNÃO FOI POSSÍVEL COMPLETAR A APOSTA NO 7.");
            playSound("lose", 0.3, false);
            return;
        }
        
        _aSevenBets['seven'] += iFicheValue;
        _oInterface.setMoney(_oMySeat.getCredit());
        
        // Feedback visual
        new CScoreText("APOSTOU " + iFicheValue + TEXT_CURRENCY + " NO 7", CANVAS_WIDTH/2, CANVAS_HEIGHT/2 + 30);
        playSound("chip", 1, false);
        
        console.log("✅ Aposta no 7 registrada:", iFicheValue, "Total no 7:", _aSevenBets['seven']);
        try {
            var ch = new BroadcastChannel('polegar_bets');
            ch.postMessage({ type: 'seven_bet', amount: iFicheValue, total: _aSevenBets['seven'] });
        } catch (e) {}
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
        
        this._endPreRollBettingPeriod();
        
        // Limpar flag de aposta obrigatória ao limpar apostas
        _bMustBetFullWin = false;
        _iLastWinAmount = 0;
        
        _oInterface.setMoney(_oMySeat.getCredit());
        _oInterface.setCurBet(_oMySeat.getCurBet());
        _oInterface.enableRoll(false);
        _oInterface.disableClearButton();
        
        if(_oDiceHistory && _oDiceHistory.updateBets){
            var ptBet = (_iNumberPoint > 0 && _aPointBets[_iNumberPoint]) ? _aPointBets[_iNumberPoint] : 0;
            _oDiceHistory.updateBets([{
                username: "Você", userId: "local", currentBet: _oMySeat.getCurBet(),
                pointBet: ptBet, pointBetNumber: _iNumberPoint > 0 ? _iNumberPoint : undefined,
                sevenBet: _aSevenBets['seven'] || 0
            }], "local");
        }
        if(_iState === STATE_GAME_WAITING_FOR_BET && (!window.GameClientSocketIO || !window.GameClientSocketIO.isConnected || _bIsMyTurn)){
            _oInterface.setRollButtonLabel(typeof TEXT_APOSTAR !== 'undefined' ? TEXT_APOSTAR : "APOSTAR");
        } else {
            _oInterface.setRollButtonLabel(TEXT_ROLL);
        }
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
    
    this.isApostarClick = function(){
        // APOSTAR só é válido ANTES de iniciar a pré-rolagem/cobertura.
        // Depois que as apostas forem cobertas (_bForceRollAfterCoverage),
        // o botão deve ser tratado como LANÇAR, nunca mais como APOSTAR nesta rodada.
        return _oMySeat.getCurBet() > 0 &&
               _iState === STATE_GAME_WAITING_FOR_BET &&
               !_bShooterClickedApostar &&
               !_bPreRollBettingOpen &&
               !_bPointBettingOpen &&
               !_bPreRollCoverageOpen &&
               !_bForceRollAfterCoverage &&
               (!window.GameClientSocketIO ||
                !window.GameClientSocketIO.isConnected ||
                !window.GameClientSocketIO.isAuthenticated ||
                _bIAmShooter);
    };
    this.shouldShowApostarButton = function(){
        var isMultiplayer = window.GameClientSocketIO && window.GameClientSocketIO.isConnected && window.GameClientSocketIO.isAuthenticated;
        // REGRA: Em multiplayer, apenas o SHOOTER deve ver o botão APOSTAR
        // Em single player, o próprio jogador é o shooter por definição
        if (isMultiplayer) {
            return _iState === STATE_GAME_WAITING_FOR_BET && !_bShooterClickedApostar && _bIAmShooter;
        } else {
            return _iState === STATE_GAME_WAITING_FOR_BET && !_bShooterClickedApostar;
        }
    };

    // Atualizar estado da COBERTURA PRÉ-ROLAGEM (chamado pela integração Socket.IO)
    this.setPreRollCoverageState = function(bOpen, szPlayerId){
        _bPreRollCoverageOpen = !!bOpen;
        _sPreRollCurrentPlayerId = szPlayerId || null;
    };
    
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