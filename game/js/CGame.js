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
    
    // PERÍODO DE APOSTAS ANTES DA PRIMEIRA JOGADA (shooter clica APOSTAR → outros apostam até fechar valor)
    var _bPreRollBettingOpen = false;  // true = aguardando outros apostarem; roll bloqueado
    var _bShooterClickedApostar = false;  // true = shooter já clicou APOSTAR; botão deve mostrar LANÇAR quando período fechar
    var _iPreRollBettingTimer = null;  // timeout de 15 segundos
    var _iPreRollBettingSeconds = 15;
    
    // CONTROLE DE APOSTAS NA FASE POINT
    var _bPointBettingOpen = false;  // Flag: período de apostas no ponto está aberto
    var _iPointBettingTimer = null;  // Timer para fechar apostas após 8 segundos
    var _iVisibilityCheckInterval = null;  // Interval para verificar se botões estão visíveis
    var _assignNumberStartTime = null;  // Timestamp de quando o período de apostas começou
    
    // APOSTAS ESPECÍFICAS NO PONTO E NO 7
    var _aPointBets = {};  // Objeto para armazenar apostas no ponto por jogador
    var _aSevenBets = {};  // Objeto para armazenar apostas no 7 por jogador
    
    // SISTEMA DE PARADAS - Até 10 paradas por ponto / no 7 (valor = ficha selecionada)
    var _aParadas = {};
    var _aParadasStakes = {};   // { ponto: [50, 100, ...] }
    var _iSevenParadas = 0;
    var _aSevenParadasStakes = [];
    var _iParadaBaseValue = 100;
    var _iSevenPayoutPer100 = 200;  // Contra o lançador (7): sempre 100x200
    var _iMainTableBet = 0;         // Aposta principal rastreada (independente das paradas)
    
    // CONTROLE DE QUEM É O SHOOTER (quem lançou os dados e estabeleceu o ponto)
    var _bIAmShooter = false;  // Flag: eu sou o shooter que lançou os dados?
    
    
    this._init = function(){
        s_oTweenController = new CTweenController();
        s_oGameSettings = new CGameSettings();
        
        _oTableController = new CTableController();
        _oTableController.addEventListener(ON_SHOW_ENLIGHT,this._onShowEnlight,this);
        _oTableController.addEventListener(ON_HIDE_ENLIGHT,this._onHideEnlight,this);
        _oTableController.addEventListener(ON_SHOW_BET_ON_TABLE,this._onShowBetOnTable,this);
        
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
                this.resetPreRollRoundState();
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
                    _bIsMyTurn = true;
                    _bIAmShooter = true;
                }
                this.syncBettingUI();
                
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
        try {
            if (window.PolegarDice && window.PolegarDice.getDice) {
                var polegar = window.PolegarDice.getDice();
                if (polegar && polegar.length >= 2) {
                    return [polegar[0], polegar[1]];
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
        
        _bIsMyTurn = isMyTurn;
        this._updateRollButtonState(isMyTurn);
        _oInterface.enablePassDice(_bIAmShooter && isMyTurn);
        this.syncBettingUI();
        
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
        
        
        this._refreshWalletUI();
        if(Object.keys(_aBetHistory).length > 0){
            if(!_bPointBettingOpen && _bIAmShooter){
                this._updateRollButtonState(_bIsMyTurn);
            } else if(_bPointBettingOpen && _bIAmShooter){
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
        if(_bPointBettingOpen){
            // Período de apostas no ponto: usar só os botões do modal
            if(_oInterface && _iNumberPoint > 0){
                _oInterface.showPointBettingButtons(_iNumberPoint, _bIAmShooter);
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
        _aParadasStakes[iNumber] = [];
        _iSevenParadas = 0;
        _aSevenParadasStakes = [];
        
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
            if(isMyTurn && _oMySeat.getCurBet() > 0 &&
                (!window.GameClientSocketIO || !window.GameClientSocketIO.isConnected || !window.GameClientSocketIO.isAuthenticated || _bForceRollAfterCoverage)){
                _oInterface.setRollButtonLabel(typeof TEXT_ROLL !== 'undefined' ? TEXT_ROLL : "LANÇAR");
                _oInterface.enableRoll(true);
                _oInterface.showMessage("Pode lançar!");
                setTimeout(function(){ if(_oInterface && _oInterface.hideMessage) _oInterface.hideMessage(); }, 1500);
            }
        }, _iPreRollBettingSeconds * 1000);
    };
    
    /** Nova rodada (come-out): zera flags de pré-rolagem/cobertura para exigir APOSTAR de novo */
    this.resetPreRollRoundState = function(){
        this._endPreRollBettingPeriod();
        _bPreRollCoverageOpen = false;
        _bForceRollAfterCoverage = false;
        if(_oInterface && _oInterface.setRollButtonLabel){
            _oInterface.setRollButtonLabel(typeof TEXT_APOSTAR !== 'undefined' ? TEXT_APOSTAR : "APOSTAR");
        }
    };

    /** Bloqueia lançar até cobertura concluir (multiplayer, fora da fase de ponto ativa) */
    this._canRollInMultiplayer = function(){
        var isMultiplayer = window.GameClientSocketIO &&
            window.GameClientSocketIO.isConnected &&
            window.GameClientSocketIO.isAuthenticated;
        if(!isMultiplayer) return true;
        if(_iState === STATE_GAME_COME_POINT) return true;
        return _bForceRollAfterCoverage === true;
    };

    /** Após ganhar/perder: exige nova cobertura; botão APOSTAR fica clicável */
    this.lockRollUntilCoverage = function(){
        this.resetPreRollRoundState();
        this.syncActionButton();
    };

    /** APOSTAR (clicável) ou LANÇAR (só após cobertura), conforme o estado */
    this.syncActionButton = function(){
        if(!_oInterface) return;

        if(!_bIAmShooter || !_bIsMyTurn){
            _oInterface.enableRoll(false);
            return;
        }
        if(_bPointBettingOpen || _bPreRollCoverageOpen || _bPreRollBettingOpen){
            _oInterface.enableRoll(false);
            return;
        }
        if(_oMySeat.getCurBet() <= 0){
            _oInterface.enableRoll(false);
            if(_oInterface.setRollButtonLabel){
                _oInterface.setRollButtonLabel(typeof TEXT_APOSTAR !== 'undefined' ? TEXT_APOSTAR : "APOSTAR");
            }
            return;
        }
        if(_bMustBetFullWin && _iLastWinAmount > 0 && _oMySeat.getCurBet() !== _iLastWinAmount){
            _oInterface.enableRoll(false);
            return;
        }

        if(this.isApostarClick()){
            _oInterface.setRollButtonLabel(typeof TEXT_APOSTAR !== 'undefined' ? TEXT_APOSTAR : "APOSTAR");
            _oInterface.enableRoll(true);
            return;
        }

        if(this._canRollInMultiplayer()){
            _oInterface.setRollButtonLabel(typeof TEXT_ROLL !== 'undefined' ? TEXT_ROLL : "LANÇAR");
            _oInterface.enableRoll(true);
            return;
        }

        _oInterface.enableRoll(false);
    };

    this._endPreRollBettingPeriod = function(){
        if(_iPreRollBettingTimer){
            clearTimeout(_iPreRollBettingTimer);
            _iPreRollBettingTimer = null;
        }
        _bPreRollBettingOpen = false;
        _bShooterClickedApostar = false;
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
        
        // MOSTRAR BOTÕES: shooter → paradas no ponto; adversário → só no 7
        if(_oInterface){
            _oInterface.showPointBettingButtons(iNumber, _bIAmShooter);
            _oInterface.enableBetFiches();
            _oInterface.enableClearButton();
            console.log("✅ Modal: shooter aposta paradas no ponto, adversário aposta no 7");
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
            _oInterface.showMessage("PONTO: " + iNumber + " | APOSTE PARADAS NO PONTO! ⏰ " + secondsLeft + "s");
        } else {
            _oInterface.showMessage("PONTO: " + iNumber + " | APOSTE NO 7! ⏰ " + secondsLeft + "s");
        }
        
        var countdownInterval = setInterval(function() {
            secondsLeft--;
            if(secondsLeft > 0 && _bPointBettingOpen){
                if(_bIAmShooter){
                    _oInterface.showMessage("PONTO: " + iNumber + " | APOSTE PARADAS NO PONTO! ⏰ " + secondsLeft + "s");
                } else {
                    _oInterface.showMessage("PONTO: " + iNumber + " | APOSTE NO 7! ⏰ " + secondsLeft + "s");
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
                this.syncBettingUI();
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
        
        var szMessage = "Resultado: " + iNumber + "!\n\nDeseja continuar apostando contra o 7?\n\n• Se sair 7: PERDE TUDO\n• Paradas no ponto " + iNumber + ": " + this._getPointPayoutLabel(iNumber) + "\n• Contra lançador (7): 100x200\n• Outros números: continua jogando";
        
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

    
    this._refreshWalletUI = function(){
        _oMySeat.syncCurBetWithMainBet();
        _oInterface.setMoney(_oMySeat.getCredit());
        _oInterface.setCurBet(_oMySeat.getCurBet());
        TOTAL_MONEY = _oMySeat.getTotalWealth();
        this._refreshMesaBetsPanel();
        this._scheduleBalanceSync();
    };

    /** Apostas locais para painéis (lista de jogadores + Apostas da Mesa) */
    this.getLocalPlayerBetsForPanel = function(){
        var iMain = this._getMainBetAmount();
        return {
            currentBet: iMain > 0 ? iMain : _oMySeat.getCurBet(),
            pointBet: (_iNumberPoint > 0 && _aPointBets[_iNumberPoint]) ? _aPointBets[_iNumberPoint] : 0,
            pointBetNumber: _iNumberPoint > 0 ? _iNumberPoint : null,
            sevenBet: _aSevenBets['seven'] || 0
        };
    };

    /** Atualiza painel "Apostas da Mesa" e lista lateral em tempo real */
    this._refreshMesaBetsPanel = function(){
        var localBets = this.getLocalPlayerBetsForPanel();
        var me = window.customAuth && window.customAuth.getCurrentUser ? window.customAuth.getCurrentUser() : null;
        var myId = me ? me.id : "local";
        var myName = me ? (me.username || me.full_name || "Você") : "Você";
        var isMultiplayer = window.GameClientSocketIO &&
            window.GameClientSocketIO.isConnected &&
            window.GameClientSocketIO.isAuthenticated;
        var gs = isMultiplayer && window.GameClientSocketIO.gameState ? window.GameClientSocketIO.gameState : null;
        var currentShooter = gs && gs.currentShooter != null ? gs.currentShooter : (_bIAmShooter ? myId : null);
        var pointValue = gs && gs.point != null ? gs.point : (_iNumberPoint > 0 ? _iNumberPoint : null);
        var playersList = [];

        if(isMultiplayer && gs && Array.isArray(gs.players) && gs.players.length > 0){
            for(var i = 0; i < gs.players.length; i++){
                var p = gs.players[i];
                var isMe = String(p.userId) === String(myId);
                playersList.push({
                    username: p.username || ("Jogador " + (i + 1)),
                    userId: p.userId,
                    currentBet: isMe ? localBets.currentBet : (p.currentBet || 0),
                    pointBet: isMe ? localBets.pointBet : 0,
                    pointBetNumber: pointValue,
                    sevenBet: isMe ? localBets.sevenBet : 0
                });
            }
        } else {
            playersList.push({
                username: myName,
                userId: myId,
                currentBet: localBets.currentBet,
                pointBet: localBets.pointBet,
                pointBetNumber: localBets.pointBetNumber,
                sevenBet: localBets.sevenBet
            });
        }

        if(_oInterface && _oInterface.updatePlayersList){
            _oInterface.updatePlayersList(playersList, currentShooter, { point: pointValue });
        }
    };

    var _balanceSyncTimer = null;
    this._scheduleBalanceSync = function(){
        if(_balanceSyncTimer) clearTimeout(_balanceSyncTimer);
        var self = this;
        _balanceSyncTimer = setTimeout(function(){
            _balanceSyncTimer = null;
            self._pushBalanceToServer();
        }, 400);
    };

    /** Envia saldo total (livre + mesa) ao servidor / painel admin */
    this._pushBalanceToServer = function(){
        var total = _oMySeat.getTotalWealth();
        $(s_oMain).trigger("save_score", [total]);

        if(window.customAuth && window.customAuth.getCurrentUser && window.customAuth.updateCurrentUser){
            var user = window.customAuth.getCurrentUser();
            if(user){
                user.balance = total;
                window.customAuth.updateCurrentUser(user);
            }
        }

        var gc = window.GameClientSocketIO;
        if(gc && gc.isConnected && gc.isAuthenticated && gc.socket && gc.socket.connected){
            var me = window.customAuth && window.customAuth.getCurrentUser ? window.customAuth.getCurrentUser() : null;
            if(me && me.id){
                gc.socket.emit('report_player_wealth', {
                    userId: me.id,
                    totalWealth: total,
                    credit: _oMySeat.getCredit(),
                    currentBet: _oMySeat.getCurBet(),
                    bets: this.getLocalPlayerBetsForPanel()
                });
            }
        }
    };

    /** Credita prêmio de parada (valor total de volta — aposta já foi debitada) */
    this._creditParadaWin = function(iTotalPayout){
        if(iTotalPayout <= 0) return;
        _oMySeat.showWin(iTotalPayout);
        this._refreshWalletUI();
    };

    this._getMainBetAmount = function(){
        var iMain = _oMySeat.getBetAmountInPos("main_bet");
        if(typeof iMain === "number" && iMain > 0){
            return roundDecimal(iMain, 1);
        }
        if(_iMainTableBet > 0){
            return roundDecimal(_iMainTableBet, 1);
        }
        if(_aBetHistory["main_bet"] && _aBetHistory["main_bet"] > 0){
            return roundDecimal(_aBetHistory["main_bet"], 1);
        }
        return roundDecimal(_oMySeat.getCurBet(), 1);
    };

    this._syncMainTableBet = function(){
        var iMain = _oMySeat.getBetAmountInPos("main_bet");
        if(typeof iMain === "number" && iMain > 0){
            _iMainTableBet = roundDecimal(iMain, 1);
        }
    };

    /** Paga aposta principal — lucro vai para fichas em APOSTE AQUI (100x200) */
    this._payMainBetWin = function(iMultiplier){
        var iMainBet = this._getMainBetAmount();
        if(iMainBet <= 0){
            return { paid: false, mainBet: 0, profit: 0, totalOnTable: 0, totalPayout: 0, placed: false };
        }
        if(!iMultiplier || iMultiplier < 1){
            iMultiplier = _iSevenPayoutPer100 / _iParadaBaseValue;
        }
        _oMySeat.syncCurBetWithMainBet();
        var iProfit = roundDecimal(iMainBet * (iMultiplier - 1), 1);
        var iTotalOnTable = roundDecimal(iMainBet + iProfit, 1);
        var bPlaced = this._addWinningsToTable(iProfit);

        return { paid: true, mainBet: iMainBet, profit: iProfit, totalOnTable: iTotalOnTable, totalPayout: iTotalOnTable, placed: bPlaced };
    };

    /** Acrescenta ganho à aposta já na mesa (fichas ficam até passar o dado ou perder) */
    this._addWinningsToTable = function(iWinAmount){
        if(iWinAmount <= 0) return false;
        _oMySeat.showWin(iWinAmount);
        var bPlaced = _oMySeat.placeBetAmountOnButton(iWinAmount, "main_bet");
        if(!bPlaced){
            bPlaced = _oMySeat.placeWinOnMainBet(iWinAmount);
        }
        this._refreshWalletUI();
        if(bPlaced){
            var isMultiplayer = window.GameClientSocketIO &&
                               window.GameClientSocketIO.isConnected &&
                               window.GameClientSocketIO.isAuthenticated;
            if(isMultiplayer && window.GameClientSocketIO.placeBet){
                window.GameClientSocketIO.placeBet('main_bet', iWinAmount);
            }
        }
        $(s_oMain).trigger("save_score", [_oMySeat.getTotalWealth()]);
        return bPlaced;
    };

    this._afterShooterWin = function(){
        _bShooterClickedApostar = false;
        _bForceRollAfterCoverage = false;
        this._setState(STATE_GAME_WAITING_FOR_BET);
        if(_oInterface.setRollButtonLabel){
            _oInterface.setRollButtonLabel(typeof TEXT_APOSTAR !== 'undefined' ? TEXT_APOSTAR : "APOSTAR");
        }
        if(_oMySeat.getCurBet() > 0 && !_bMustBetFullWin){
            _oTableController.disableMainBetButton();
        } else if(_bMustBetFullWin){
            _oTableController.enableMainBetButton();
        }
        this.syncBettingUI();
        if(_bIAmShooter && _bIsMyTurn && _oMySeat.getCurBet() > 0){
            _oInterface.enableRoll(true);
        }
    };

    this._getParadasStakesForPoint = function(iPoint){
        var p = parseInt(iPoint, 10);
        return _aParadasStakes[p] || _aParadasStakes[iPoint] || [];
    };

    this._getParadasTotalBetFromStakes = function(aStakes){
        if(!aStakes || !aStakes.length) return 0;
        var iTotal = 0;
        for(var i = 0; i < aStakes.length; i++){
            iTotal += aStakes[i];
        }
        return roundDecimal(iTotal, 1);
    };

    this._getParadasTotalProfitFromStakes = function(aStakes, fnProfit){
        if(!aStakes || !aStakes.length) return 0;
        var iTotal = 0;
        for(var i = 0; i < aStakes.length; i++){
            iTotal += fnProfit(aStakes[i]);
        }
        return roundDecimal(iTotal, 1);
    };

    this._getParadasTotalProfitForPointStakes = function(aStakes, iPoint){
        var self = this;
        return this._getParadasTotalProfitFromStakes(aStakes, function(iAmt){
            return self._getParadaProfitForBetAmount(iAmt, self._getPointPayoutPer100(iPoint));
        });
    };

    this._getParadasTotalProfitForSevenStakes = function(aStakes){
        var self = this;
        return this._getParadasTotalProfitFromStakes(aStakes, function(iAmt){
            return self._getParadaProfitForBetAmount(iAmt, _iSevenPayoutPer100);
        });
    };

    this._getParadasTotalPayoutFromStakes = function(aStakes, fnPayout){
        if(!aStakes || !aStakes.length) return 0;
        var iTotal = 0;
        for(var i = 0; i < aStakes.length; i++){
            iTotal += fnPayout(aStakes[i]);
        }
        return roundDecimal(iTotal, 1);
    };

    this._getParadasTotalPayoutForPointStakes = function(aStakes, iPoint){
        var self = this;
        return this._getParadasTotalPayoutFromStakes(aStakes, function(iAmt){
            return self._getPayoutForBetAmount(iAmt, self._getPointPayoutPer100(iPoint));
        });
    };

    this._getParadasTotalPayoutForSevenStakes = function(aStakes){
        var self = this;
        return this._getParadasTotalPayoutFromStakes(aStakes, function(iAmt){
            return self._getSevenPayout(iAmt);
        });
    };

    this._getSelectedParadaChipValue = function(){
        if(!_oInterface || !_oInterface.getCurFicheSelected){
            return _iParadaBaseValue;
        }
        var iIndex = _oInterface.getCurFicheSelected();
        return s_oGameSettings.getFicheValues(iIndex);
    };

    this._getPointPayoutPer100 = function(iPoint){
        var p = parseInt(iPoint, 10);
        if(p === 4 || p === 10) return 200;
        if(p === 5 || p === 9) return 150;
        if(p === 6 || p === 8) return 125;
        return 200;
    };

    this._getPointPayoutLabel = function(iPoint){
        var p = parseInt(iPoint, 10);
        if(p === 4 || p === 10) return "100x200";
        if(p === 5 || p === 9) return "100x150";
        if(p === 6 || p === 8) return "100x125";
        return "100x200";
    };

    /** Lucro por aposta (100x200 → R$100 apostados = R$200 de lucro) */
    this._getParadaProfitForBetAmount = function(iBetAmount, iWinPer100){
        return roundDecimal(iBetAmount * iWinPer100 / _iParadaBaseValue, 1);
    };

    /** Total a creditar: aposta + lucro (100x200 → R$100 apostados, recebe R$300) */
    this._getPayoutForBetAmount = function(iBetAmount, iWinPer100){
        var iProfit = this._getParadaProfitForBetAmount(iBetAmount, iWinPer100);
        return roundDecimal(iBetAmount + iProfit, 1);
    };

    this._getSevenPayout = function(iBetAmount){
        return this._getPayoutForBetAmount(iBetAmount, _iSevenPayoutPer100);
    };

    this._checkWinForBet = function(){
        var iSumDices = _aDiceResult[0] + _aDiceResult[1];
        console.log("Verificando resultado dos dados:", iSumDices, "Estado:", _iState);
        
        // NOVA LÓGICA CONFORME ESPECIFICAÇÕES
        if(_iState === STATE_GAME_COME_OUT){
            // PRIMEIRO LANÇAMENTO
            if(iSumDices === 7 || iSumDices === 11){
                // 7-11: GANHA DOBRO - Total (aposta + ganho) deve ir para "APOSTE AQUI"
                var oMainWin = this._payMainBetWin(_iSevenPayoutPer100 / _iParadaBaseValue);
                if(oMainWin.paid){
                    var iTotalOnTable = oMainWin.totalOnTable;
                    var bAutoPlaced = oMainWin.placed;
                    _iLockedBalance = 0;
                    _bMustBetFullWin = false;
                    _iLastWinAmount = 0;
                    
                    if(bAutoPlaced){
                        _oInterface.refreshMsgHelp("GANHOU! FICHAS NA MESA – CLIQUE EM APOSTAR!", true);
                        new CScoreText("NATURAL! MESA " + iTotalOnTable + TEXT_CURRENCY + " (100x200)", CANVAS_WIDTH/2, CANVAS_HEIGHT/2);
                    } else {
                        _iLastWinAmount = iTotalOnTable;
                        _bMustBetFullWin = true;
                        _oInterface.refreshMsgHelp("COLOQUE MAIS " + oMainWin.profit + TEXT_CURRENCY + " EM APOSTE AQUI PARA MANTER O GANHO NA MESA!", true);
                        new CScoreText("NATURAL! FALTAM " + oMainWin.profit + TEXT_CURRENCY + "\nPARA COMPLETAR NA MESA!", CANVAS_WIDTH/2, CANVAS_HEIGHT/2);
                    }
                    playSound("win", 0.2, false);
                    this._afterShooterWin();
                }
                this.afterRoundEnds();
            } else if(iSumDices === 2 || iSumDices === 3 || iSumDices === 12){
                // 2-3-12: PERDE TUDO
                var iMainBet = this._getMainBetAmount();
                if(iMainBet > 0){
                    _oMySeat.decreaseBet(iMainBet);
                    playSound("lose", 0.2, false);
                    new CScoreText("PERDEU TUDO!", CANVAS_WIDTH/2, CANVAS_HEIGHT/2);
                }
                // Remove todas as apostas ativas
                _oMySeat.clearAllBets();
                _iMainTableBet = 0;
                _aBetHistory = {};
                _oInterface.setCurBet(_oMySeat.getCurBet());
                
                // PERDER também perde o saldo travado
                _iLockedBalance = 0;
                _oInterface.setCurBet(0);
                
                // Reset flag de aposta obrigatória ao perder
                _bMustBetFullWin = false;
                _iLastWinAmount = 0;
                if(this.isMultiplayerActive()){
                    _bIAmShooter = false;
                    this._ensureShooterFlag();
                }
                this.lockRollUntilCoverage();
            } else if(iSumDices === 4 || iSumDices === 5 || iSumDices === 6 || iSumDices === 8 || iSumDices === 9 || iSumDices === 10){
                console.log("Número de ponto detectado:", iSumDices, "- continuando automaticamente");
                _iNumberPoint = iSumDices;
                this._setState(STATE_GAME_COME_POINT);
                new CScoreText("PONTO " + iSumDices + "!\n• Paradas no ponto: " + this._getPointPayoutLabel(iSumDices) + "\n• Contra lançador (7): 100x200", CANVAS_WIDTH/2, CANVAS_HEIGHT/2 - 50);
                var iNewX = s_oGameSettings.getPuckXByNumber(iSumDices);
                _oPuck.switchOn(iNewX);
                return;
            }
        } else if(_iState === STATE_GAME_COME_POINT){
            // FASE DE PONTO - APOSTA CONTRA O 7
            if(iSumDices === 7){
                // SAIU 7: SHOOTER PERDE, mas quem apostou no 7 ganha!
                var iMainBet = this._getMainBetAmount();
                
                // Se o shooter tinha aposta principal na mesa, ele perde
                if(_bIAmShooter && iMainBet > 0){
                    _oMySeat.decreaseBet(iMainBet);
                    playSound("lose", 0.2, false);
                }
                
                // PROCESSAR APOSTAS NO 7 — sempre 2x
                if(_iSevenParadas > 0 && _aSevenParadasStakes.length > 0){
                    var iSevenBet = this._getParadasTotalBetFromStakes(_aSevenParadasStakes);
                    var iSevenProfit = this._getParadasTotalProfitForSevenStakes(_aSevenParadasStakes);
                    var iSevenWin = this._getParadasTotalPayoutForSevenStakes(_aSevenParadasStakes);
                    this._creditParadaWin(iSevenWin);
                    new CScoreText("SAIU 7! " + _iSevenParadas + " PARADA(S)!\nAPOSTADO " + iSevenBet + TEXT_CURRENCY + " → GANHOU " + iSevenProfit + TEXT_CURRENCY + " | RECEBEU " + iSevenWin + TEXT_CURRENCY + " (100x200)", CANVAS_WIDTH/2, CANVAS_HEIGHT/2 - 50);
                    playSound("win", 0.5, false);
                } else if(_aSevenBets['seven'] && _aSevenBets['seven'] > 0){
                    var iSevenBet = _aSevenBets['seven'];
                    var iSevenProfit = this._getParadaProfitForBetAmount(iSevenBet, _iSevenPayoutPer100);
                    var iSevenWin = this._getSevenPayout(iSevenBet);
                    this._creditParadaWin(iSevenWin);
                    new CScoreText("SAIU 7! APOSTADO " + iSevenBet + TEXT_CURRENCY + " → GANHOU " + iSevenProfit + TEXT_CURRENCY + " | RECEBEU " + iSevenWin + TEXT_CURRENCY + " (100x200)", CANVAS_WIDTH/2, CANVAS_HEIGHT/2 - 50);
                    playSound("win", 0.5, false);
                } else if(_bIAmShooter && iMainBet > 0) {
                    new CScoreText("7 - SHOOTER PERDEU A MESA!", CANVAS_WIDTH/2, CANVAS_HEIGHT/2);
                }
                
                // PROCESSAR APOSTAS NO PONTO (perdem quando sai 7)
                // O débito já foi feito quando o jogador apostou, então não precisa debitar novamente
                // Apenas registrar que perdeu
                if(_aParadas[_iNumberPoint] && _aParadas[_iNumberPoint] > 0){
                    var aPointStakes = this._getParadasStakesForPoint(_iNumberPoint);
                    var iNumParadas = _aParadas[_iNumberPoint];
                    var iTotalPerdido = this._getParadasTotalBetFromStakes(aPointStakes);
                    
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
                _aParadas = {};
                _aParadasStakes = {};
                _iSevenParadas = 0;
                _aSevenParadasStakes = [];
                try {
                    var ch = new BroadcastChannel('polegar_bets');
                    ch.postMessage({ type: 'clear_bets' });
                } catch (e) {}

                // Remove todas as apostas ativas do shooter
                _oMySeat.clearAllBets();
                _iMainTableBet = 0;
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
                this.lockRollUntilCoverage();
            } else if(iSumDices === _iNumberPoint){
                // ACERTOU O PONTO: mesa + paradas pagam separadamente
                var bHasParadaWin = _aParadas[_iNumberPoint] && _aParadas[_iNumberPoint] > 0;
                var oMainWin = this._payMainBetWin(_iSevenPayoutPer100 / _iParadaBaseValue);
                var iParadaPayout = 0;

                if(oMainWin.paid){
                    _iLockedBalance = 0;
                    _bMustBetFullWin = false;
                    _iLastWinAmount = 0;

                    if(!bHasParadaWin){
                        if(oMainWin.placed){
                            _oInterface.refreshMsgHelp("GANHOU! FICHAS NA MESA – CLIQUE EM LANÇAR!", true);
                            new CScoreText("MESA! " + oMainWin.totalOnTable + TEXT_CURRENCY + " (100x200)", CANVAS_WIDTH/2, CANVAS_HEIGHT/2 - 80);
                        } else {
                            _iLastWinAmount = oMainWin.totalOnTable;
                            _bMustBetFullWin = true;
                            _oInterface.refreshMsgHelp("COLOQUE MAIS " + oMainWin.profit + TEXT_CURRENCY + " EM APOSTE AQUI PARA MANTER O GANHO NA MESA!", true);
                            new CScoreText("MESA! FALTAM " + oMainWin.profit + TEXT_CURRENCY + " EM APOSTE AQUI", CANVAS_WIDTH/2, CANVAS_HEIGHT/2 - 80);
                        }
                    }
                    playSound("win", 0.2, false);
                }

                if(bHasParadaWin){
                    var iNumParadas = _aParadas[_iNumberPoint];
                    var aPointStakes = this._getParadasStakesForPoint(_iNumberPoint);
                    var iParadaBet = this._getParadasTotalBetFromStakes(aPointStakes);
                    var iParadaProfit = this._getParadasTotalProfitForPointStakes(aPointStakes, _iNumberPoint);
                    iParadaPayout = this._getParadasTotalPayoutForPointStakes(aPointStakes, _iNumberPoint);
                    this._creditParadaWin(iParadaPayout);

                    var iTotalRecebido = (oMainWin.paid ? oMainWin.totalOnTable : 0) + iParadaPayout;
                    new CScoreText(
                        "PONTO " + _iNumberPoint + "! " + iNumParadas + " PARADA(S)!\n" +
                        "MESA: " + (oMainWin.paid ? oMainWin.totalOnTable : 0) + TEXT_CURRENCY + " (100x200)\n" +
                        "PARADAS: APOSTADO " + iParadaBet + TEXT_CURRENCY + " → GANHOU " + iParadaProfit + TEXT_CURRENCY + " | RECEBEU " + iParadaPayout + TEXT_CURRENCY + " (" + this._getPointPayoutLabel(_iNumberPoint) + ")\n" +
                        "TOTAL: " + iTotalRecebido + TEXT_CURRENCY + " (mesa + paradas no saldo)",
                        CANVAS_WIDTH/2, CANVAS_HEIGHT/2 - 50
                    );
                    playSound("win", 0.5, false);

                    if(oMainWin.paid){
                        _iMainTableBet = oMainWin.totalOnTable;
                        _oInterface.refreshMsgHelp("GANHOU! MESA " + oMainWin.totalOnTable + TEXT_CURRENCY + " + SALDO " + iParadaPayout + TEXT_CURRENCY, true);
                    }
                } else if(!oMainWin.paid) {
                    new CScoreText("PONTO " + _iNumberPoint + "!", CANVAS_WIDTH/2, CANVAS_HEIGHT/2);
                }
                
                if(_iSevenParadas > 0){
                    var iTotalPerdidoSeven = this._getParadasTotalBetFromStakes(_aSevenParadasStakes);
                    new CScoreText("PONTO " + _iNumberPoint + "! PERDEU " + iTotalPerdidoSeven + TEXT_CURRENCY + " NO 7", CANVAS_WIDTH/2, CANVAS_HEIGHT/2 - 30);
                    playSound("lose", 0.3, false);
                } else if(_aSevenBets['seven'] && _aSevenBets['seven'] > 0){
                    console.log("❌ Apostas no 7 perderam:", _aSevenBets['seven']);
                }
                
                // Limpar apostas no ponto e no 7
                _aPointBets = {};
                _aSevenBets = {};
                _aParadas = {};
                _aParadasStakes = {};
                _iSevenParadas = 0;
                _aSevenParadasStakes = [];
                try {
                    var ch = new BroadcastChannel('polegar_bets');
                    ch.postMessage({ type: 'clear_bets' });
                } catch (e) {}
                
                _aBetHistory = {};
                
                // Ponto acertado: shooter continua com o dado; fichas na mesa até passar ou perder
                _iNumberPoint = -1;
                this._afterShooterWin();
                
                // Shooter MANTÉM o dado (não passa)
                // _bIAmShooter permanece true
                
                // OCULTAR BOTÕES DE PARADAS
                _oInterface.hidePointBettingButtons(true);
                this.lockRollUntilCoverage();
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
        // Recarga desativada — saldo só via painel admin
        if(_oMsgBox){
            _oMsgBox.show("SALDO INSUFICIENTE.\nSOLICITE CRÉDITO AO ADMINISTRADOR.");
        }
    };

    /** Atualiza carteira total (painel admin / servidor) — credit = total − fichas na mesa */
    this.syncWalletBalance = function(iTotalBalance){
        var total = parseFloat(iTotalBalance);
        if (isNaN(total) || total < 0) return;

        total = roundDecimal(total, 1);
        var curBet = _oMySeat.getCurBet();
        var newCredit = roundDecimal(Math.max(0, total - curBet), 1);

        _oMySeat.recharge(newCredit);
        this._refreshWalletUI();

        if(_oGameOverPanel && newCredit >= s_oGameSettings.getFicheValues(0)){
            _oGameOverPanel.hide();
            if(_iState === -1){
                this._setState(STATE_GAME_WAITING_FOR_BET);
            }
        }

        if (window.customAuth && window.customAuth.getCurrentUser && window.customAuth.updateCurrentUser) {
            var user = window.customAuth.getCurrentUser();
            if (user) {
                user.balance = total;
                window.customAuth.updateCurrentUser(user);
            }
        }
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
        this._refreshWalletUI();
        
        // Inicializar saldo travado (usa a caixa de aposta atual)
        
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
        if(_oTableController && _oTableController.enableMainBetButton){
            _oTableController.enableMainBetButton();
        }
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
            this._ensureShooterFlag();
        } else {
            _bIAmShooter = isMyTurn;
        }
        console.log('🎯 _bIAmShooter atualizado para:', _bIAmShooter, '(isMyTurn:', isMyTurn + ', multiplayer:', !!isMultiplayer + ')');

        // Se acabamos de sair da cobertura, manter LANÇAR habilitado para o shooter
        if (_bForceRollAfterCoverage && _bIAmShooter && isMyTurn && _oMySeat.getCurBet() > 0) {
            console.log('🎯 Mantendo botão de lançar habilitado após cobertura');
            _oInterface.setRollButtonLabel(typeof TEXT_ROLL !== 'undefined' ? TEXT_ROLL : "LANÇAR");
            _oInterface.enableRoll(true);
            _oInterface.enablePassDice(true);
            this.syncBettingUI();
            return;
        }

        this._updateRollButtonState(isMyTurn);

        if(isMyTurn && _bPointBettingOpen){
            console.log("🔒 Botão de rolar BLOQUEADO - Período de apostas ainda ativo (8 segundos)");
        }
        
        _oInterface.enablePassDice(_bIAmShooter && isMyTurn);
        this.syncBettingUI();
        
        console.log(`✅ Turn updated - isMyTurn: ${isMyTurn}, _bIAmShooter: ${_bIAmShooter}`);
        
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
        
        // Durante apostas no ponto: shooter usa botão de paradas, adversário usa botão do 7
        if(_bPointBettingOpen){
            if(_bIAmShooter){
                _oMsgBox.show("USE O BOTÃO DO PONTO PARA APOSTAR PARADAS!");
            } else {
                _oMsgBox.show("USE O BOTÃO DO 7 PARA APOSTAR CONTRA O SHOOTER!");
            }
            playSound("lose", 0.3, false);
            return;
        }
        
        // BLOQUEIO DE APOSTAS: Não permite apostar se não for o turno do jogador
        // EXCEÇÕES:
        //  - Durante os 7 SEGUNDOS após estabelecer o POINT, outros jogadores podem apostar
        //  - Durante a fase de COBERTURA PRÉ-ROLAGEM, jogador da vez cobre o shooter
        var isMultiplayer = window.GameClientSocketIO && window.GameClientSocketIO.isConnected && window.GameClientSocketIO.isAuthenticated;
        this._ensureShooterFlag();

        var isMyCoverageTurn = this.isMyCoverageTurn();

        // Shooter: pode somar várias fichas em APOSTE AQUI até clicar no botão APOSTAR
        if(isMultiplayer && _bIAmShooter && _bIsMyTurn && !_bMustBetFullWin){
            if(_bPreRollCoverageOpen || _bPreRollBettingOpen || (_bShooterClickedApostar && !_bForceRollAfterCoverage)){
                _oMsgBox.show("AGUARDE A COBERTURA DAS APOSTAS!");
                playSound("lose", 0.3, false);
                return;
            }
        }
        
        // Verificar se o período de apostas no POINT está aberto (7 segundos)
        // ou se estamos na fase de cobertura pré-rolagem
        if(isMultiplayer && !this.canPlaceBets()){
            _oMsgBox.show("AGUARDE SUA VEZ!\nVOCÊ SÓ PODE APOSTAR QUANDO FOR SEU TURNO\nOU NOS 7 SEGUNDOS APÓS O PONTO SER ESTABELECIDO\nOU QUANDO FOR SUA VEZ NA COBERTURA CONTRA O SHOOTER.");
            playSound("lose", 0.3, false);
            return;
        }
        
        if(isMultiplayer && _bPreRollCoverageOpen && !_bIAmShooter && !isMyCoverageTurn){
            _oMsgBox.show("AGUARDE SUA VEZ NA COBERTURA CONTRA O SHOOTER!");
            playSound("lose", 0.3, false);
            return;
        }
        
        // Mensagem informativa durante o período de apostas do POINT
        if(isMultiplayer && !_bIsMyTurn && _bPointBettingOpen){
            console.log("📊 Jogador apostando durante os 7 segundos do POINT - permitido!");
        }
        // Mensagem informativa durante a fase de cobertura pré-rolagem
        if(isMultiplayer && !_bIsMyTurn && isMyCoverageTurn){
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

        // Multiplayer: enviar apostas para o servidor (para validar roll e registrar cobertura)
        if (isMultiplayer && window.GameClientSocketIO && window.GameClientSocketIO.placeBet) {
            try {
                if (isMyCoverageTurn) {
                    console.log("📤 Enviando aposta de COBERTURA ao servidor:", iFicheValue);
                    window.GameClientSocketIO.placeBet('coverage', iFicheValue);
                } else {
                    console.log("📤 Enviando aposta PRINCIPAL ao servidor:", iFicheValue);
                    window.GameClientSocketIO.placeBet('main_bet', iFicheValue);
                }
            } catch (e) {
                console.error("❌ Erro ao enviar aposta para o servidor:", e);
            }
        }

        this._syncMainTableBet();
        this._refreshWalletUI();
        
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
        
        this.syncBettingUI();
        
        // Atualizar botão APOSTAR / LANÇAR
        this._updateRollButtonState(_bIsMyTurn);

        // Travar APOSTE AQUI só depois que o shooter clicou APOSTAR (cobertura aberta)
        if(isMultiplayer && _bIAmShooter && (_bShooterClickedApostar || _bPreRollCoverageOpen || _bPreRollBettingOpen)){
            _oTableController.disableMainBetButton();
        } else if(_oTableController && _oTableController.enableMainBetButton && !_bPointBettingOpen && this.canPlaceBets()){
            _oTableController.enableMainBetButton();
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
        
        // Apenas o shooter (quem tem os dados) pode apostar paradas no ponto
        if(!_bIAmShooter){
            _oMsgBox.show("APENAS QUEM TEM OS DADOS PODE APOSTAR PARADAS NO PONTO!\nVOCÊ DEVE APOSTAR NO 7.");
            playSound("lose", 0.3, false);
            return;
        }
        
        // Verificar se o período de apostas está aberto
        if(!_bPointBettingOpen){
            _oMsgBox.show("PERÍODO DE APOSTAS ENCERRADO!");
            return;
        }
        
        if(!_aParadasStakes[_iNumberPoint]){
            _aParadasStakes[_iNumberPoint] = [];
        }
        if(_aParadasStakes[_iNumberPoint].length >= 10){
            _oMsgBox.show("LIMITE DE 10 PARADAS ATINGIDO PARA ESTE PONTO!");
            playSound("lose", 0.3, false);
            return;
        }
        
        var iParadaValue = this._getSelectedParadaChipValue();
        if(iParadaValue <= 0){
            _oMsgBox.show("SELECIONE UMA FICHA VÁLIDA!");
            return;
        }
        
        var iParadaNumber = _aParadasStakes[_iNumberPoint].length + 1;
        
        // Verificar se jogador tem crédito
        if(_oMySeat.getCredit() < iParadaValue){
            _oMsgBox.show("SALDO INSUFICIENTE!\nPARADA REQUER " + iParadaValue + TEXT_CURRENCY);
            return;
        }
        
        // Adicionar aposta ao ponto (manter compatibilidade com sistema antigo)
        if(!_aPointBets[_iNumberPoint]){
            _aPointBets[_iNumberPoint] = 0;
        }
        _aPointBets[_iNumberPoint] += iParadaValue;
        
        // Descontar só do saldo — paradas não entram na aposta da mesa (APOSTE AQUI)
        var bBetSuccess = _oMySeat.debitCredit(iParadaValue);
        
        // Verificar se a aposta foi bem-sucedida
        if(!bBetSuccess){
            _aPointBets[_iNumberPoint] -= iParadaValue;
            _oMsgBox.show("SALDO INSUFICIENTE!\nNÃO FOI POSSÍVEL COMPLETAR A APOSTA.");
            playSound("lose", 0.3, false);
            return;
        }

        _aParadasStakes[_iNumberPoint].push(iParadaValue);
        _aParadas[_iNumberPoint] = _aParadasStakes[_iNumberPoint].length;
        
        this._refreshWalletUI();
        
        // Ganho acumulado das paradas neste ponto
        var aPointStakes = _aParadasStakes[_iNumberPoint];
        var iTotalApostado = this._getParadasTotalBetFromStakes(aPointStakes);
        var iGanhoTotal = this._getParadasTotalProfitForPointStakes(aPointStakes, _iNumberPoint);
        var iRecebeTotal = this._getParadasTotalPayoutForPointStakes(aPointStakes, _iNumberPoint);
        
        if(_oInterface && _oInterface.updatePointButtonText){
            _oInterface.updatePointButtonText(_iNumberPoint, iParadaNumber);
        }
        
        new CScoreText(
            "PARADA " + iParadaNumber + " (" + iParadaValue + TEXT_CURRENCY + ") NO PONTO " + _iNumberPoint + "\n" +
            "TOTAL " + iTotalApostado + TEXT_CURRENCY + " → GANHA " + iGanhoTotal + TEXT_CURRENCY + " | RECEBE " + iRecebeTotal + TEXT_CURRENCY + " (" + this._getPointPayoutLabel(_iNumberPoint) + ")",
            CANVAS_WIDTH/2, CANVAS_HEIGHT/2 + 30
        );
        playSound("chip", 1, false);
        
        console.log("✅ Parada " + iParadaNumber + " no ponto " + _iNumberPoint + " registrada:", iParadaValue, "Total no ponto:", _aPointBets[_iNumberPoint]);
        try {
            var ch = new BroadcastChannel('polegar_bets');
            ch.postMessage({ type: 'point_bet', point: _iNumberPoint, amount: iParadaValue, total: _aPointBets[_iNumberPoint] });
        } catch (e) {}
    };
    
    this.onBetOnSeven = function(){
        console.log('🎲 Jogador quer apostar parada no 7');
        
        if(_bIAmShooter){
            _oMsgBox.show("VOCÊ TEM OS DADOS!\nAPOSTE PARADAS NO PONTO, NÃO NO 7!");
            playSound("lose", 0.3, false);
            return;
        }
        
        if(!_bPointBettingOpen){
            _oMsgBox.show("PERÍODO DE APOSTAS ENCERRADO!");
            return;
        }
        
        if(_aSevenParadasStakes.length >= 10){
            _oMsgBox.show("LIMITE DE 10 PARADAS ATINGIDO NO 7!");
            playSound("lose", 0.3, false);
            return;
        }
        
        var iParadaValue = this._getSelectedParadaChipValue();
        if(iParadaValue <= 0){
            _oMsgBox.show("SELECIONE UMA FICHA VÁLIDA!");
            return;
        }
        
        var iParadaNumber = _aSevenParadasStakes.length + 1;
        
        if(_oMySeat.getCredit() < iParadaValue){
            _oMsgBox.show("SALDO INSUFICIENTE!\nPARADA REQUER " + iParadaValue + TEXT_CURRENCY);
            return;
        }
        
        if(!_aSevenBets['seven']){
            _aSevenBets['seven'] = 0;
        }
        _aSevenBets['seven'] += iParadaValue;
        
        var bBetSuccess = _oMySeat.debitCredit(iParadaValue);
        
        if(!bBetSuccess){
            _aSevenBets['seven'] -= iParadaValue;
            _oMsgBox.show("SALDO INSUFICIENTE!\nNÃO FOI POSSÍVEL COMPLETAR A APOSTA NO 7.");
            playSound("lose", 0.3, false);
            return;
        }

        _aSevenParadasStakes.push(iParadaValue);
        _iSevenParadas = _aSevenParadasStakes.length;
        
        this._refreshWalletUI();
        
        var iTotalApostado = this._getParadasTotalBetFromStakes(_aSevenParadasStakes);
        var iGanhoTotal = this._getParadasTotalProfitForSevenStakes(_aSevenParadasStakes);
        var iRecebeTotal = this._getParadasTotalPayoutForSevenStakes(_aSevenParadasStakes);
        if(_oInterface && _oInterface.updateSevenButtonText){
            _oInterface.updateSevenButtonText(iParadaNumber);
        }
        
        new CScoreText(
            "PARADA " + iParadaNumber + " (" + iParadaValue + TEXT_CURRENCY + ") NO 7\n" +
            "TOTAL " + iTotalApostado + TEXT_CURRENCY + " → GANHA " + iGanhoTotal + TEXT_CURRENCY + " | RECEBE " + iRecebeTotal + TEXT_CURRENCY + " (100x200)",
            CANVAS_WIDTH/2, CANVAS_HEIGHT/2 + 30
        );
        playSound("chip", 1, false);
        
        console.log("✅ Parada " + iParadaNumber + " no 7 registrada:", iParadaValue, "Total no 7:", _aSevenBets['seven']);
        try {
            var ch = new BroadcastChannel('polegar_bets');
            ch.postMessage({ type: 'seven_bet', amount: iParadaValue, total: _aSevenBets['seven'] });
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
                if( i !== "pass_line" && i !== "dont_pass1" && i !== "dont_pass2" && i !== "main_bet"){
                    delete _aBetHistory[i];
                }
            }
        }else{
            _oMySeat.clearAllBets();
            _aBetHistory = new Object();
            _iMainTableBet = 0;
            _oInterface.enableRoll(false);
        }
        
        this._endPreRollBettingPeriod();
        
        // Limpar flag de aposta obrigatória ao limpar apostas
        _bMustBetFullWin = false;
        _iLastWinAmount = 0;
        
        _oInterface.enableRoll(false);
        _oInterface.disableClearButton();
        this._refreshWalletUI();
        
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

    this.onLogout = function(){
        var szMsg = (typeof TEXT_LOGOUT_CONFIRM !== 'undefined') ? TEXT_LOGOUT_CONFIRM : 'Deseja sair da sua conta?';
        _oAreYouSurePanel.showCustom(szMsg, this._confirmLogout.bind(this), null);
    };

    this._confirmLogout = function(){
        if (window.GameClientSocketIO && window.GameClientSocketIO.disconnect) {
            window.GameClientSocketIO.disconnect();
        }
        this.unload();
        if (window.customAuth && window.customAuth.logout) {
            window.customAuth.logout();
        } else {
            localStorage.removeItem('game_user');
            localStorage.removeItem('game_session_token');
            localStorage.removeItem('game_session_time');
            window.location.replace('login.html');
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
    
    this._ensureShooterFlag = function(){
        if(!this.isMultiplayerActive()){
            _bIAmShooter = true;
            return;
        }
        var myId = window.GameClientSocketIO && window.GameClientSocketIO.currentUserId;
        var gs = window.GameClientSocketIO && window.GameClientSocketIO.gameState;
        var shooterId = gs && gs.currentShooter;
        if(!myId){
            _bIAmShooter = false;
            return;
        }
        if(shooterId){
            _bIAmShooter = String(myId) === String(shooterId);
        } else {
            _bIAmShooter = false;
        }
    };

    this._updateRollButtonState = function(isMyTurn){
        if(isMyTurn !== undefined && isMyTurn !== null){
            _bIsMyTurn = !!isMyTurn;
        }
        this._ensureShooterFlag();
        this.syncActionButton();
    };

    this.isApostarClick = function(){
        this._ensureShooterFlag();
        // APOSTAR só é válido ANTES de iniciar a pré-rolagem/cobertura.
        // Depois que as apostas forem cobertas (_bForceRollAfterCoverage),
        // o botão deve ser tratado como LANÇAR, nunca mais como APOSTAR nesta rodada.
        var canApostarState = (_iState === STATE_GAME_WAITING_FOR_BET) ||
            (_iState === STATE_GAME_COME_OUT && _iNumberPoint < 0);
        return _oMySeat.getCurBet() > 0 &&
               canApostarState &&
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
            var canApostarState = (_iState === STATE_GAME_WAITING_FOR_BET) ||
                (_iState === STATE_GAME_COME_OUT && _iNumberPoint < 0);
            return canApostarState && !_bShooterClickedApostar && _bIAmShooter;
        } else {
            return _iState === STATE_GAME_WAITING_FOR_BET && !_bShooterClickedApostar;
        }
    };

    this.isMultiplayerActive = function(){
        return !!(window.GameClientSocketIO && window.GameClientSocketIO.isConnected && window.GameClientSocketIO.isAuthenticated);
    };

    this.canPlaceBets = function(){
        if(!this.isMultiplayerActive()) return true;
        if(_bPointBettingOpen) return !_bIAmShooter;
        if(this.isMyCoverageTurn()) return true;
        if(_bPreRollCoverageOpen) return false;
        if(_bPreRollBettingOpen) return false;
        if(_bIAmShooter && (_bShooterClickedApostar && !_bForceRollAfterCoverage)) return false;
        return _bIAmShooter;
    };

    this.syncBettingUI = function(){
        if(!_oInterface || !_oMySeat) return;
        var iCredit = _oMySeat.getCredit();
        var iMin = s_oGameSettings.getFicheValues(0);
        var bCan = this.canPlaceBets() && iCredit >= iMin;
        if(bCan){
            _oInterface.enableBetFiches();
            _oInterface.enableClearButton();
            if(_oTableController && _oTableController.enableMainBetButton && !_bPointBettingOpen){
                _oTableController.enableMainBetButton();
            }
        } else {
            _oInterface.disableBetFiches();
            if(!this.isMyCoverageTurn()){
                _oInterface.disableClearButton();
            }
        }
    };

    // Atualizar estado da COBERTURA PRÉ-ROLAGEM (chamado pela integração Socket.IO)
    this.setPreRollCoverageState = function(bOpen, szPlayerId){
        _bPreRollCoverageOpen = !!bOpen;
        _sPreRollCurrentPlayerId = szPlayerId || null;
        this.syncBettingUI();
    };

    this.isMyCoverageTurn = function(){
        if(!_bPreRollCoverageOpen || _bIAmShooter) return false;
        var myId = window.GameClientSocketIO && window.GameClientSocketIO.currentUserId;
        if(!myId || !_sPreRollCurrentPlayerId) return false;
        return String(myId) === String(_sPreRollCurrentPlayerId);
    };

    this.resetPreRollRoundState = function(){
        _bPreRollBettingOpen = false;
        _bPreRollCoverageOpen = false;
        _bForceRollAfterCoverage = false;
        _sPreRollCurrentPlayerId = null;
        _bShooterClickedApostar = false;
        if(_iPreRollBettingTimer){
            clearTimeout(_iPreRollBettingTimer);
            _iPreRollBettingTimer = null;
        }
        this._isRolling = false;
        if(_oInterface){
            _oInterface.hideBlock();
            if(_oInterface.hideMessage) _oInterface.hideMessage();
        }
        if(_oTableController && _oTableController.enableMainBetButton){
            _oTableController.enableMainBetButton();
        }
        this.syncBettingUI();
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