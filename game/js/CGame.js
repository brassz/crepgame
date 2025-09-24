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

        _iNumberPoint = -1;

        _aBetHistory = new Object();

        _oMySeat = new CSeat();
        _oPuck = new CPuck(325,108,s_oStage);
        
        _oInterface = new CInterface();
        
        _oDicesAnim = new CDicesAnim(240,159);
        
        _oAreYouSurePanel = new CAreYouSurePanel(s_oStage);
        _oGameOverPanel = new CGameOver();

        _oMsgBox = new CMsgBox();

        _aDiceResultHistory=new Array();

        _iTimeElaps=0;
        
        // Inicializar sistema multiplayer
        this._initMultiplayer();
        
        this._onSitDown();
	
        _bUpdate = true;
    };
    
    this._initMultiplayer = function(){
        // Inicializar sistema multiplayer se disponível
        if (typeof CMultiplayerGame !== 'undefined') {
            if (!s_oMultiplayerGame) {
                s_oMultiplayerGame = new CMultiplayerGame();
            }
        }
    };
    
    this.unload = function(){
        _oInterface.unload();
        _oTableController.unload();
        _oMsgBox.unload();
        _oGameOverPanel.unload();
        _oDicesAnim.unload();

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
    
    
    
    // Métodos de preparação removidos - agora tudo é controlado pelo servidor multiplayer
    
    // Métodos de animação removidos - agora são controlados pelo sistema multiplayer
    
    this.dicesAnimEnded = function(){
        // Este método agora é chamado apenas para finalizar a animação local
        // O processamento real dos resultados é feito pelo servidor multiplayer
        console.log("Animação dos dados finalizada localmente");
        
        // Salvar pontuação atual
        $(s_oMain).trigger("save_score",[_oMySeat.getCredit()]);
    };
    
    // Métodos de diálogo e processamento local removidos - agora controlados pelo servidor

    
    // Método de verificação de apostas removido - agora processado no servidor multiplayer
    
    // Métodos de movimentação de apostas removidos - gerenciados pelo servidor multiplayer
    
    this.onRecharge = function(iMoney) {
        _oMySeat.recharge(iMoney);
        _oInterface.setMoney(_oMySeat.getCredit());

        this._setState(STATE_GAME_WAITING_FOR_BET);
        
        _oGameOverPanel.hide();
    };
    
    this.onRoll = function(){
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

        // Modo multiplayer obrigatório
        if(s_oMultiplayerGame && s_oMultiplayerGame.isMultiplayer()){
            // Verificar se é o dealer
            if(!s_oMultiplayerGame.isDealer()){
                _oMsgBox.show("Apenas o dealer pode rolar os dados!");
                return;
            }
            
            // Enviar comando para rolar dados
            if(s_oMultiplayerGame.rollDice()){
                _oInterface.showBlock();
                // O resultado virá do servidor via eventos
            }
        } else {
            // Sem conexão multiplayer - mostrar erro
            _oMsgBox.show("ERRO: Conecte-se ao servidor para jogar!");
        }
    };
    
    this._onSitDown = function(){
        this._setState(STATE_GAME_WAITING_FOR_BET);
        _oMySeat.setInfo(TOTAL_MONEY, _oTableController.getContainer());
        _oInterface.setMoney(TOTAL_MONEY);
        _oInterface.setCurBet(0);
        
        // Atualizar informações da sala (padrão: Mesa Principal com aposta mínima de 50 reais)
        _oInterface.updateRoomInfo("principal", 1);
    };
    
    this.changeRoom = function(sRoomType){
        // Função para trocar de sala (útil para implementar seleção de salas)
        var oRoomConfig = s_oRoomConfig.getRoomConfig(sRoomType);
        
        // Atualizar configurações globais baseadas na sala
        MIN_BET = oRoomConfig.min_bet;
        MAX_BET = oRoomConfig.max_bet; // null se não há limite
        
        // Atualizar interface com nova configuração da sala
        _oInterface.updateRoomInfo(sRoomType, 1);
        
        // Limpar apostas atuais se necessário
        if(_oMySeat.getCurBet() > 0){
            _oMySeat.clearAllBets();
            _aBetHistory = {};
            _oInterface.setCurBet(0);
        }
        
        console.log("Sala alterada para:", oRoomConfig.name, "Aposta mínima:", oRoomConfig.min_bet, "Aposta máxima:", oRoomConfig.max_bet || "Sem limite");
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

        // Modo multiplayer obrigatório
        if(s_oMultiplayerGame && s_oMultiplayerGame.isMultiplayer()){
            // Enviar aposta para o servidor
            if(s_oMultiplayerGame.placeBet(iFicheValue, szBut)){
                // Processar aposta localmente (será confirmada pelo servidor)
                this._processLocalBet(iFicheValue, iIndexFicheSelected, szBut);
            }
        } else {
            // Sem conexão multiplayer - mostrar erro
            _oMsgBox.show("ERRO: Conecte-se ao servidor para jogar!");
        }
    };
    
    this._processLocalBet = function(iFicheValue, iIndexFicheSelected, szBut){
        if(_aBetHistory[szBut] === undefined){
            _aBetHistory[szBut] = iFicheValue;
        }else{
            _aBetHistory[szBut] += iFicheValue;
        }
        
        // Coloca a ficha diretamente no botão "APOSTE AQUI"
        _oMySeat.addFicheOnButton(iFicheValue,iIndexFicheSelected,szBut);
        
        _oInterface.setMoney(_oMySeat.getCredit());
        _oInterface.setCurBet(_oMySeat.getCurBet());
        _oInterface.enableRoll(true);
        _oInterface.enableClearButton();
        _oInterface.refreshMsgHelp("APOSTE AQUI - Clique para apostar e lançar os dados",true);
        
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
    
    this.onClearAllBets = function(){
        $(s_oMain).trigger("clear_bet",_oMySeat.getCurBet());
        
        // Modo multiplayer obrigatório
        if(s_oMultiplayerGame && s_oMultiplayerGame.isMultiplayer()){
            // Enviar comando para limpar apostas
            s_oMultiplayerGame.clearBets();
            // A limpeza local será feita quando o servidor confirmar
        } else {
            // Sem conexão multiplayer - mostrar erro
            _oMsgBox.show("ERRO: Conecte-se ao servidor para jogar!");
        }
    };
    
    this._processClearBets = function(){
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
    
    // Métodos públicos para acesso ao multiplayer
    this.getMoney = function(){
        return _oMySeat ? _oMySeat.getCredit() : 0;
    };
    
    this.setMoney = function(iMoney){
        if(_oMySeat){
            _oMySeat.setCredit(iMoney);
            _oInterface.setMoney(iMoney);
        }
    };
    
    this.getCurrentBet = function(){
        return _oMySeat ? _oMySeat.getCurBet() : 0;
    };
    
    this.getGameState = function(){
        return _iState;
    };
    
    this.setGameState = function(iState){
        this._setState(iState);
    };
    
    this.getPointNumber = function(){
        return _iNumberPoint;
    };
    
    this.setPointNumber = function(iNumber){
        _iNumberPoint = iNumber;
    };
    
    this.getDiceResult = function(){
        return _aDiceResult;
    };
    
    this.setDiceResult = function(aDiceResult){
        _aDiceResult = aDiceResult;
    };
    
    this.getBetHistory = function(){
        return _aBetHistory;
    };
    
    this.clearBetHistory = function(){
        _aBetHistory = new Object();
    };
    
    // Referencias para componentes
    this.getInterface = function(){
        return _oInterface;
    };
    
    this.getDicesAnim = function(){
        return _oDicesAnim;
    };
    
    this.getPuck = function(){
        return _oPuck;
    };
    
    this.getMySeat = function(){
        return _oMySeat;
    };
    
    this.getMsgBox = function(){
        return _oMsgBox;
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