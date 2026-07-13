function CSpriteLibrary(){

    var _oLibSprites = {};
    var _oSpritesToLoad;
    var _iNumSprites;
    var _iCntSprites;
    var _cbCompleted;
    var _cbTotalCompleted;
    var _cbOwner;
    
    this.init = function( cbCompleted,cbTotalCompleted, cbOwner ){
        _oSpritesToLoad = {};
        _iNumSprites = 0;
        _iCntSprites = 0;
        _cbCompleted = cbCompleted;
        _cbTotalCompleted = cbTotalCompleted;
        _cbOwner     = cbOwner;
    };
    
    this.addSprite = function( szKey, szPath ){
        if ( _oLibSprites.hasOwnProperty(szKey) ){
            return ;
        }
        
        var oImage = new Image();
        _oLibSprites[szKey] = _oSpritesToLoad[szKey] = { szPath:szPath, oSprite: oImage ,bLoaded:false};
        _iNumSprites++;
    };
    
    this.getSprite = function( szKey ){
        if (!_oLibSprites.hasOwnProperty(szKey)){
            return null;
        }else{
            return _oLibSprites[szKey].oSprite;
        }
    };
    
    this._onSpritesLoaded = function(){
        _iNumSprites = 0;
        _cbTotalCompleted.call(_cbOwner);
    };

    this._onSpriteLoaded = function(){
        _cbCompleted.call(_cbOwner);
        if (++_iCntSprites === _iNumSprites) {
            this._onSpritesLoaded();
        }
        
    };    

    this.loadSprites = function(){
        
        for (var szKey in _oSpritesToLoad) {
            
            _oSpritesToLoad[szKey].oSprite["oSpriteLibrary"] = this;
            _oSpritesToLoad[szKey].oSprite["szKey"] = szKey;
            _oSpritesToLoad[szKey].oSprite["_retryCount"] = 0;
            _oSpritesToLoad[szKey].oSprite.onload = function(){
                this.oSpriteLibrary.setLoaded(this.szKey);
                this.oSpriteLibrary._onSpriteLoaded(this.szKey);
            };
            _oSpritesToLoad[szKey].oSprite.onerror  = function(evt){
                var oSpriteToRestore = evt.currentTarget || this;
                oSpriteToRestore._retryCount = (oSpriteToRestore._retryCount || 0) + 1;
                
                // Após 3 tentativas, conta como carregada para não travar na tela preta
                if (oSpriteToRestore._retryCount >= 3) {
                    console.warn('⚠️ Sprite falhou após retries:', oSpriteToRestore.szKey);
                    oSpriteToRestore.oSpriteLibrary.setLoaded(oSpriteToRestore.szKey);
                    oSpriteToRestore.oSpriteLibrary._onSpriteLoaded(oSpriteToRestore.szKey);
                    return;
                }

                setTimeout(function(){
                    if (_oSpritesToLoad[oSpriteToRestore.szKey]) {
                        _oSpritesToLoad[oSpriteToRestore.szKey].oSprite.src = _oSpritesToLoad[oSpriteToRestore.szKey].szPath + '?r=' + oSpriteToRestore._retryCount;
                    }
                }, 400);
            };
            _oSpritesToLoad[szKey].oSprite.src = _oSpritesToLoad[szKey].szPath;
        } 
    };
    
    this.setLoaded = function(szKey){
        _oLibSprites[szKey].bLoaded = true;
    };
    
    this.isLoaded = function(szKey){
        return _oLibSprites[szKey].bLoaded;
    };
    
    this.getNumSprites=function(){
        return _iNumSprites;
    };
}