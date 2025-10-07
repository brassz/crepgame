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
    var _oPlayersPanel;
    var _sCurrentRoom = null;
    
    
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
        _oPuck = new CPuck(325,108,s_oStage);
        
        _oInterface = new CInterface();
        
        _oDicesAnim = new CDicesAnim(240,159);
        
        _oAreYouSurePanel = new CAreYouSurePanel(s_oStage);
        _oGameOverPanel = new CGameOver();

        _oMsgBox = new CMsgBox();
        
        // Inicializar painel de jogadores
        _oPlayersPanel = new CPlayersPanel();
        
        // Adicionar jogadores de exemplo para demonstração
        this._addExamplePlayers();

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
        
        if(_oPlayersPanel){
            _oPlayersPanel.unload();
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

        // Se conectado ao servidor, pedi-lo para rolar (autoritativo)
        if (window.Realtime && Realtime.isConnected()){
            // Show immediate feedback to user
            _oInterface.showMessage("Lançando dados...");
            
            Realtime.requestRoll().catch(function(error) {
                console.error('Failed to request roll:', error);
                
                // Hide loading message
                if (_oInterface && _oInterface.hideMessage) {
                    _oInterface.hideMessage();
                }
                
                // Show user-friendly message for common errors
                var errorMessage = "Erro de conexão. Jogando localmente...";
                if (error && error.message) {
                    if (error.message.includes('not authenticated')) {
                        errorMessage = "Sessão expirada. Jogando localmente...";
                    } else if (error.message.includes('Not in a room')) {
                        errorMessage = "Não conectado à sala. Jogando localmente...";
                    }
                }
                
                // Show brief message to user
                if (_oInterface && _oInterface.showMessage) {
                    _oInterface.showMessage(errorMessage);
                    setTimeout(function() {
                        if (_oInterface && _oInterface.hideMessage) {
                            _oInterface.hideMessage();
                        }
                    }, 1500); // Reduced timeout
                }
                
                // Fallback to local roll if server request fails
                _iContRolling++;
                _aDiceResult = new Array();
                s_oGame._generateWinLoss();
                _aDiceResultHistory.push(_aDiceResult);
                _iTimeElaps = 0;
                _oDicesAnim.startRolling(_aDiceResult);
            });
            return;
        }

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
        _oDicesAnim.startRolling(_aDiceResult);
    };

    // Recebe início da rolagem do servidor (todos os jogadores veem a animação)
    this.onDiceRollStart = function(data){
        // Todos os jogadores na sala veem a animação começar
        var isMyRoll = false;
        if (window.sb && window.sb.auth) {
            window.sb.auth.getUser().then(function(response) {
                var user = response.data && response.data.user;
                if (user && data && data.shooter) {
                    isMyRoll = (user.id === data.shooter);
                }
            });
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
        _oInterface.showMessage(shooterMsg);
        
        // Preparar para animação (sem gerar resultado ainda)
        _oInterface.disableBetFiches();
        _oInterface.disableClearButton();
        _oInterface.showBlock();
        
        // Iniciar animação de rolagem sem resultado definido ainda
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

    // Função para receber apostas de outros jogadores
    this.onPlayerBetUpdate = function(data){
        if(data && data.playerName && data.betAmount !== undefined){
            this._updatePlayerBet(data.playerName, data.betAmount, false);
        }
    };
    
    // Função para quando um jogador entra na sala
    this.onPlayerJoined = function(data){
        if(data && data.playerName){
            this.addPlayerToPanel(data.playerName, 0);
        }
    };
    
    // Função para quando um jogador sai da sala
    this.onPlayerLeft = function(data){
        if(data && data.playerName){
            this.removePlayerFromPanel(data.playerName);
        }
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
        // Só permite rolar se for meu turno E se há aposta ativa
        var canRoll = isMyTurn && _oMySeat.getCurBet() > 0;
        _oInterface.enableRoll(canRoll);
        
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
        }
        
        // Update turn display immediately
        if(_oInterface && _oInterface.updateTurnTimer){
            var playerInfo = {
                isMyTurn: isMyTurn,
                playerIndex: data.playerIndex,
                totalPlayers: data.totalPlayers
            };
            // Show initial timer with full time if available
            var remainingTime = data.endsAt ? Math.max(0, Math.ceil((data.endsAt - Date.now())/1000)) : 25;
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
                this._setState(STATE_GAME_WAITING_FOR_BET);
                
            }else if(iSumDices === 7){
                //END TURN
                _oPuck.switchOff();
                this._setState(STATE_GAME_WAITING_FOR_BET);
            }
        }
        
        
        _oInterface.setMoney(_oMySeat.getCredit());
        if(Object.keys(_aBetHistory).length > 0){
            _oInterface.enableRoll(true);
            _oInterface.enableClearButton();
        }
        
        _oInterface.hideBlock();
        _oInterface.enableBetFiches();
        $(s_oMain).trigger("save_score",[_oMySeat.getCredit()]);
        
        // Reset rolling flag to allow next roll
        this._isRolling = false;
        
        } catch(error) {
            console.error("Erro em dicesAnimEnded:", error);
            // Reset do estado em caso de erro
            _aBetsToRemove = new Array();
            _aFichesToMove = new Array();
            _iState = STATE_GAME_WAITING_FOR_BET;
            this._isRolling = false; // Reset flag on error too
        }
    };
    
    this._assignNumber = function(iNumber){
        _iNumberPoint = iNumber;
        
        //PLACE 'ON' PLACEHOLDER
        var iNewX = s_oGameSettings.getPuckXByNumber(_iNumberPoint);
        _oPuck.switchOn(iNewX);
        
        //ENABLE GUI
        _oInterface.hideBlock();
    };
    
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
                    _oMySeat.showWin(iAutoWin);
                    _iCasinoCash -= iAutoWin;
                    new CScoreText("GANHOU! +" + iAutoWin + TEXT_CURRENCY, CANVAS_WIDTH/2, CANVAS_HEIGHT/2);
                    playSound("win", 0.2, false);
                }
                // Remove todas as apostas ativas após pagamento
                _oMySeat.clearAllBets();
                _aBetHistory = {};
                _oInterface.setCurBet(_oMySeat.getCurBet());
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
            } else if(iSumDices === 4 || iSumDices === 5 || iSumDices === 6 || iSumDices === 8 || iSumDices === 9 || iSumDices === 10){
                // NÚMEROS DE PONTO: PERGUNTA SE QUER CONTINUAR
                console.log("Número de ponto detectado:", iSumDices);
                this._showContinueDialog(iSumDices);
                return;
            }
        } else if(_iState === STATE_GAME_COME_POINT){
            // FASE DE PONTO - APOSTA CONTRA O 7
            if(iSumDices === 7){
                // SAIU 7: PERDE TUDO
                var iTotalActiveBets = _oMySeat.getCurBet();
                if(iTotalActiveBets > 0){
                    _oMySeat.decreaseBet(iTotalActiveBets);
                    playSound("lose", 0.2, false);
                    new CScoreText("7 PERDEU TUDO!", CANVAS_WIDTH/2, CANVAS_HEIGHT/2);
                }
                // Remove todas as apostas ativas
                _oMySeat.clearAllBets();
                _aBetHistory = {};
                _oInterface.setCurBet(_oMySeat.getCurBet());
                // Volta para o estado de espera
                _iNumberPoint = -1;
                this._setState(STATE_GAME_WAITING_FOR_BET);
            } else if(iSumDices === _iNumberPoint){
                // ACERTOU O PONTO: PAGA CONFORME A MESA
                var iTotalActiveBets = _oMySeat.getCurBet();
                if(iTotalActiveBets > 0){
                    // Determina o multiplicador baseado no número do ponto
                    var iMultiplier = 1;
                    if(_iNumberPoint === 4 || _iNumberPoint === 10) iMultiplier = 2; // Dobro
                    else if(_iNumberPoint === 5 || _iNumberPoint === 9) iMultiplier = 0.5; // 50%
                    else if(_iNumberPoint === 6 || _iNumberPoint === 8) iMultiplier = 0.25; // 25%
                    
                    var iAutoWin = iTotalActiveBets * iMultiplier;
                    _oMySeat.showWin(iAutoWin);
                    _iCasinoCash -= iAutoWin;
                    new CScoreText("PONTO ACERTOU! +" + iAutoWin + TEXT_CURRENCY, CANVAS_WIDTH/2, CANVAS_HEIGHT/2);
                    playSound("win", 0.2, false);
                }
                // Remove todas as apostas ativas
                _oMySeat.clearAllBets();
                _aBetHistory = {};
                _oInterface.setCurBet(_oMySeat.getCurBet());
                // Volta para o estado de espera
                _iNumberPoint = -1;
                this._setState(STATE_GAME_WAITING_FOR_BET);
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
        
        if (_oMySeat.getCurBet() === 0) {
                return;
        }

        if(_oMySeat.getCurBet() < MIN_BET){
            _oMsgBox.show(TEXT_ERROR_MIN_BET);
            _oInterface.enableBetFiches();
            _oInterface.enableRoll(true);
            return;
        }

        if(_oInterface.isBlockVisible()){
                return;
        }

        // Set rolling flag to prevent double-clicks
        this._isRolling = true;
        
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
        
        // Sala padrão: BRONZE
        this.changeRoom("bronze");
        if (window.Realtime && Realtime.connect()){
            Realtime.join("bronze");
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
        if (window.Realtime && Realtime.connect()){
            Realtime.join(sRoomType);
        }
    };

    this.onRoomConfig = function(cfg){
        MIN_BET = cfg.min_bet;
        MAX_BET = cfg.max_bet;
        _oInterface.updateBetLimits(MIN_BET, MAX_BET);
    };

    this.getCurrentRoom = function(){
        return _sCurrentRoom || "bronze";
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

        var  iIndexFicheSelected = _oInterface.getCurFicheSelected();
        var iFicheValue=s_oGameSettings.getFicheValues(iIndexFicheSelected);
        
        var iCurBet=_oMySeat.getCurBet();
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
        _oInterface.refreshMsgHelp("APOSTE AQUI - Clique para apostar e lançar os dados",true);
        
        // Atualizar painel de jogadores com a nova aposta
        this._updatePlayerBet("Você", _oMySeat.getCurBet(), true);
        
        playSound("chip", 1, false);
    };
    
    // Função para atualizar aposta de um jogador no painel
    this._updatePlayerBet = function(sPlayerName, iBetAmount, bIsCurrentPlayer){
        if(_oPlayersPanel){
            _oPlayersPanel.addPlayerBet(sPlayerName, iBetAmount, bIsCurrentPlayer);
        }
    };
    
    // Função para adicionar jogador ao painel
    this.addPlayerToPanel = function(sPlayerName, iBetAmount){
        if(_oPlayersPanel){
            _oPlayersPanel.addPlayerBet(sPlayerName, iBetAmount || 0, false);
        }
    };
    
    // Função para remover jogador do painel
    this.removePlayerFromPanel = function(sPlayerName){
        if(_oPlayersPanel){
            _oPlayersPanel.removePlayer(sPlayerName);
        }
    };
    
    // Função para limpar todas as apostas do painel
    this.clearAllPlayerBets = function(){
        if(_oPlayersPanel){
            _oPlayersPanel.clearAllBets();
        }
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
    
    this.onClearAllBets = function(){
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
        
        _oInterface.setMoney(_oMySeat.getCredit());
        _oInterface.setCurBet(_oMySeat.getCurBet());
        _oInterface.enableRoll(false);
        _oInterface.disableClearButton();
        
        // Atualizar painel de jogadores
        this._updatePlayerBet("Você", _oMySeat.getCurBet(), true);
        
        
    };
    
    // Função para adicionar jogadores de exemplo
    this._addExamplePlayers = function(){
        // Adicionar alguns jogadores fictícios para demonstração
        this._updatePlayerBet("Jogador 1", 100, false);
        this._updatePlayerBet("Jogador 2", 250, false);
        this._updatePlayerBet("Maria Silva", 150, false);
        this._updatePlayerBet("João Santos", 75, false);
        this._updatePlayerBet("Você", 0, true);
        
        // Simular mudanças nas apostas dos outros jogadores periodicamente
        var self = this;
        setInterval(function(){
            if(_oPlayersPanel && Math.random() < 0.3){ // 30% chance a cada intervalo
                var aPlayerNames = ["Jogador 1", "Jogador 2", "Maria Silva", "João Santos"];
                var sRandomPlayer = aPlayerNames[Math.floor(Math.random() * aPlayerNames.length)];
                var iRandomBet = Math.floor(Math.random() * 300) + 50; // Entre 50 e 350
                self._updatePlayerBet(sRandomPlayer, iRandomBet, false);
            }
        }, 5000); // A cada 5 segundos
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