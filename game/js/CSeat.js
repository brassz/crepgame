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

    /** Debita saldo sem alterar aposta na mesa (paradas no ponto / no 7) */
    this.debitCredit = function(iAmount){
        var iTotal = roundDecimal(iAmount, 1);
        if(iTotal <= 0) return true;
        if(_iCredit < iTotal){
            console.warn("⚠️ Saldo insuficiente. Saldo:", _iCredit, "Necessário:", iTotal);
            return false;
        }
        _iCredit -= iTotal;
        _iCredit = roundDecimal(_iCredit, 1);
        if(_iCredit < 0){
            _iCredit = 0;
        }
        return true;
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
    
    // Coloca automaticamente um valor total na mesa (APOSTE AQUI) - usado após ganho do shooter
    this.placeBetAmountOnButton = function(iTotalAmount, szNameAttach){
        var iAmount = Math.round(roundDecimal(iTotalAmount, 1));
        if(iAmount <= 0) return true;
        var aDenoms = [500, 200, 100, 50];
        var aIndices = [3, 2, 1, 0];
        var remaining = iAmount;
        for(var i = 0; i < aDenoms.length && remaining > 0; i++){
            var count = Math.floor(remaining / aDenoms[i]);
            for(var j = 0; j < count; j++){
                if(_iCredit < aDenoms[i]) break;
                if(!this.addFicheOnButton(aDenoms[i], aIndices[i], szNameAttach)) break;
                remaining -= aDenoms[i];
            }
        }
        return remaining === 0;
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
        
        if(_iCredit < 0){
            console.error("❌ ERRO: Saldo ficou negativo ao limpar apostas no come point! Corrigindo para 0");
            _iCredit = 0;
        }
        this.syncCurBetWithMainBet();
    };
    
    this.showWin = function(iWin){
        _iCredit += iWin;
        _iCredit = roundDecimal(_iCredit, 1);
        
        if(_iCredit < 0){
            console.error("❌ ERRO: Saldo ficou negativo ao ganhar! Corrigindo para 0");
            _iCredit = 0;
        }
    };

    /** Saldo livre + fichas na mesa */
    this.getTotalWealth = function(){
        return roundDecimal(_iCredit + _iCurBet, 1);
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

    /** Garante que _iCurBet reflete pelo menos a aposta em APOSTE AQUI */
    this.syncCurBetWithMainBet = function(){
        var iMain = this.getBetAmountInPos("main_bet") || 0;
        if(iMain > _iCurBet){
            _iCurBet = roundDecimal(iMain, 1);
        }
    };

    /** Só fichas na mesa — não mexe no saldo (ganho já creditado) */
    this.addWinChipsToMainBetNoDebit = function(iWinAmount){
        var iAmount = Math.round(roundDecimal(iWinAmount, 1));
        if(iAmount <= 0) return true;
        var aDenoms = [500, 200, 100, 50];
        var aIndices = [3, 2, 1, 0];
        var remaining = iAmount;
        var iPlaced = 0;
        for(var i = 0; i < aDenoms.length && remaining > 0; i++){
            var count = Math.floor(remaining / aDenoms[i]);
            for(var j = 0; j < count; j++){
                var aFichesMc = [];
                _oFicheController.setFicheOnButton(aIndices[i], "main_bet", aFichesMc);
                remaining -= aDenoms[i];
                iPlaced += aDenoms[i];
            }
        }
        if(iPlaced > 0){
            _iCurBet += iPlaced;
            _iCurBet = roundDecimal(_iCurBet, 1);
        }
        return remaining === 0;
    };

    /** Coloca ganho na mesa debitando do saldo (fluxo normal sem parada) */
    this.placeWinOnMainBet = function(iWinAmount){
        var iAmount = Math.round(roundDecimal(iWinAmount, 1));
        if(iAmount <= 0) return true;
        var aDenoms = [500, 200, 100, 50];
        var aIndices = [3, 2, 1, 0];
        var remaining = iAmount;
        var iPlaced = 0;
        for(var i = 0; i < aDenoms.length && remaining > 0; i++){
            var count = Math.floor(remaining / aDenoms[i]);
            for(var j = 0; j < count; j++){
                var aFichesMc = [];
                _oFicheController.setFicheOnButton(aIndices[i], "main_bet", aFichesMc);
                remaining -= aDenoms[i];
                iPlaced += aDenoms[i];
            }
        }
        if(iPlaced > 0){
            _iCurBet += iPlaced;
            _iCurBet = roundDecimal(_iCurBet, 1);
            _iCredit -= iPlaced;
            _iCredit = roundDecimal(_iCredit, 1);
            if(_iCredit < 0) _iCredit = 0;
        }
        return remaining === 0;
    };

    this._init();
}