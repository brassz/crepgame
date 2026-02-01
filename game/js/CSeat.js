function CSeat(){  
    var _iCurBet;
    var _iCredit;
    var _aNumbersSelected;
    var _oFicheController;
    
    this._init = function(){
        this.reset();
    };
    
    this.reset = function(){
        _aNumbersSelected = new Array();

        if(_oFicheController){
            _oFicheController.reset();
        }
        
        _iCurBet=0;
    };
    
    this.setInfo = function(iCredit,oContainerFiche){
        _iCredit=iCredit;
        _iCurBet=0;

        _oFicheController = new CFichesController(oContainerFiche);
    };
    
    this.setFicheBetted = function(iFicheValue,aFichesMc,iNumFiches){
        var iTotalAmount = iFicheValue * iNumFiches;
        
        // VALIDAÇÃO: Não permitir saldo negativo
        if(_iCredit < iTotalAmount){
            console.warn("⚠️ Tentativa de apostar com saldo insuficiente. Saldo:", _iCredit, "Necessário:", iTotalAmount);
            return false; // Retornar false para indicar falha
        }
        
        _iCurBet+= iTotalAmount;
        _iCredit -= iTotalAmount;
        _iCredit = roundDecimal(_iCredit, 1);
        
        // GARANTIR que o saldo nunca fique negativo (proteção extra)
        if(_iCredit < 0){
            console.error("❌ ERRO: Saldo ficou negativo! Corrigindo para 0");
            _iCredit = 0;
        }
        
        return true; // Retornar true para indicar sucesso
    };
		
    this.addFicheOnTable = function(iFicheValue,iIndexFicheSelected,szNameAttach){
        // Verificar saldo antes de criar fichas visuais
        if(_iCredit < iFicheValue){
            console.warn("⚠️ Saldo insuficiente para apostar:", _iCredit, "Necessário:", iFicheValue);
            return false; // Retornar false se não tiver saldo
        }
        
        var aFichesMc=new Array();
        _oFicheController.setFicheOnTable(iIndexFicheSelected,szNameAttach,aFichesMc);
        var bSuccess = this.setFicheBetted(iFicheValue,aFichesMc,1);
        
        if(!bSuccess){
            // Se falhou, remover fichas visuais
            _oFicheController.removeBet(szNameAttach);
            return false;
        }
        
        return true; // Retornar true se sucesso
    };
    
    this.addFicheOnButton = function(iFicheValue,iIndexFicheSelected,szNameAttach){
        // Verificar saldo antes de criar fichas visuais
        if(_iCredit < iFicheValue){
            console.warn("⚠️ Saldo insuficiente para apostar:", _iCredit, "Necessário:", iFicheValue);
            return false; // Retornar false se não tiver saldo
        }
        
        var aFichesMc=new Array();
        _oFicheController.setFicheOnButton(iIndexFicheSelected,szNameAttach,aFichesMc);
        var bSuccess = this.setFicheBetted(iFicheValue,aFichesMc,1);
        
        if(!bSuccess){
            // Se falhou, remover fichas visuais
            _oFicheController.removeBet(szNameAttach);
            return false;
        }
        
        return true; // Retornar true se sucesso
    };
    
    this.decreaseBet = function(iAmount){
        _iCurBet -= iAmount;
    };
    
    this.removeBet = function(szName){
        _oFicheController.removeBet(szName);
    };
    
    this.swapBet = function(szPrevBet,szNewBet){
        _oFicheController.swapBet(szPrevBet,szNewBet);
    };
    
    this.clearAllBets = function(){
        _oFicheController.clearAllBets();
        _iCredit += _iCurBet;
        _iCredit = roundDecimal(_iCredit, 1);
        _iCurBet=0;
    };
    
    this.clearAllBetsVisualOnly = function(){
        // Remove fichas visualmente mas NÃO devolve crédito
        // Usado quando o jogador ganha e o valor já foi adicionado via showWin()
        _oFicheController.clearAllBets();
        _iCurBet=0;
    };
    
    this.clearAllBetsInComePoint = function(){
        var iBetToSubtract = _oFicheController.clearAllBetsInComePoint();
        _iCurBet -= iBetToSubtract;
        _iCredit += iBetToSubtract;
        _iCredit = roundDecimal(_iCredit, 1);
        
        // GARANTIR que o saldo nunca fique negativo
        if(_iCredit < 0){
            console.error("❌ ERRO: Saldo ficou negativo ao limpar apostas no come point! Corrigindo para 0");
            _iCredit = 0;
        }
    };
    
    this.showWin = function(iWin){
        _iCredit += iWin;
        _iCredit = roundDecimal(_iCredit, 1);
        
        // GARANTIR que o saldo nunca fique negativo (mesmo ao ganhar, por segurança)
        if(_iCredit < 0){
            console.error("❌ ERRO: Saldo ficou negativo ao ganhar! Corrigindo para 0");
            _iCredit = 0;
        }
    };
    
    this.recharge = function(iMoney) {
        _iCredit = iMoney;
    };
    
    this.getCurBet = function(){
        return _iCurBet;
    };
    
    this.getCredit = function(){
        return _iCredit;
    };
    
    this.getNumberSelected = function(){
        return _aNumbersSelected;
    };
    
    this.getFicheMc = function(szName){
        return _oFicheController.getFicheMc(szName);
    };
    
    this.getBetAmountInPos = function(szName){
        return _oFicheController.getBetAmountInPos(szName);
    };
    
    this._init();
}