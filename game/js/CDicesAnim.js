function CDicesAnim(iX,iY){
    var _bUpdate;
    var _iCurDiceIndex;
    var _iFrameCont;
    var _iCurBallIndex;
    var _aDiceResult;
    var _aDicesAnimSprites;
    var _oListener;
    
    var _oDiceASprite;
    var _oDiceBSprite;
    var _oCurLaunchDiceSprite;
    var _oDiceTopDownView;
    var _oContainer;
    var _oBgDiceLaunch;
    var _oFade;
    var _oThis;
    
    this._init= function(iX,iY){
        _iCurDiceIndex= 0;
        _iFrameCont = 0;
        
        _oContainer = new createjs.Container();
        _oContainer.visible = false;
        _oContainer.x = iX;
        _oContainer.y = iY;
        s_oStage.addChild(_oContainer);
        
        var oGraphics = new createjs.Graphics().beginFill("rgba(0,0,0,0.6)").drawRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        _oFade = new createjs.Shape(oGraphics);
        _oFade.x = -iX;
        _oFade.y = -iY;
        _oContainer.addChild(_oFade);
        _oListener = _oFade.on("click", function () {});
        
        _oBgDiceLaunch = createBitmap(s_oSpriteLibrary.getSprite("dices_screen_bg"));
        _oContainer.addChild(_oBgDiceLaunch);
        
        _aDicesAnimSprites = new Array();
        for(var i=0;i<NUM_DICE_ROLLING_FRAMES;i++){
            var oImage = createBitmap(s_oSpriteLibrary.getSprite('launch_dices_'+i)); 
            oImage.x = 162;
            oImage.y = 150;
            oImage.visible = false;
            _oContainer.addChild(oImage);
            _aDicesAnimSprites.push(oImage);
        }
        
        _oCurLaunchDiceSprite = _aDicesAnimSprites[0];
        _oCurLaunchDiceSprite.visible = true;

        var oData = {   
                        images: [s_oSpriteLibrary.getSprite("dice_a")], 
                        // width, height & registration point of each sprite
                        frames: {width: 80, height: 34}, 
                        animations: {anim_1:[0,9,"stop_anim_1"],anim_2:[10,19,"stop_anim_2"],anim_3:[20,29,"stop_anim_3"],
                                     anim_4:[30,39,"stop_anim_4"],anim_5:[40,49,"stop_anim_5"],anim_6:[50,59,"stop_anim_6"],
                                     stop_anim_1:9,stop_anim_2:19,stop_anim_3:29,stop_anim_4:39,stop_anim_5:49,stop_anim_6:59}
                    };
                   
        var oSpriteSheet = new createjs.SpriteSheet(oData);
        
        _oDiceASprite = createSprite(oSpriteSheet,"anim_1",80,34);
        _oDiceASprite.stop();
        _oDiceASprite.visible = false;
        _oDiceASprite.x = 332;
        _oDiceASprite.y = 206;
        _oContainer.addChild(_oDiceASprite);
        
        var oData = {   
                        images: [s_oSpriteLibrary.getSprite("dice_b")], 
                        // width, height & registration point of each sprite
                        frames: {width: 102, height: 65}, 
                        animations: {anim_1:[0,14,"stop_anim_1"],anim_2:[15,29,"stop_anim_2"],anim_3:[30,44,"stop_anim_3"],
                                     anim_4:[45,59,"stop_anim_4"],anim_5:[60,74,"stop_anim_5"],anim_6:[75,89,"stop_anim_6"],
                                     stop_anim_1:14,stop_anim_2:29,stop_anim_3:44,stop_anim_4:59,stop_anim_5:74,stop_anim_6:89}
                    };
                   
        var oSpriteSheet = new createjs.SpriteSheet(oData);
        
        _oDiceBSprite = createSprite(oSpriteSheet,"anim_1",102,65);
        _oDiceBSprite.stop();
        _oDiceBSprite.visible = false;
        _oDiceBSprite.x = 239;
        _oDiceBSprite.y = 240;
        _oContainer.addChild(_oDiceBSprite);
        _oDiceBSprite.addEventListener("animationend", _oThis._onDiceBAnimEnded);
        
        _oDiceTopDownView = new CDicesTopDownView(584,20,_oContainer);
    };
    
    this.unload =  function(){
        _oFade.off("click",_oListener);
    };
    
    this.hide = function(){
        console.log('🎲 CDicesAnim.hide called - cleaning up animation state');
        
        // Force stop update loop
        _bUpdate = false;
        
        _oDiceTopDownView.hide();
        _oContainer.visible = false;
        _iCurBallIndex = 0;
        
        _oDiceASprite.visible = false;
        _oDiceBSprite.visible = false;
        
        // Stop any ongoing sprite animations
        if (_oDiceASprite) {
            _oDiceASprite.stop();
        }
        if (_oDiceBSprite) {
            _oDiceBSprite.stop();
        }
        
        for(var i=0;i<_aDicesAnimSprites.length;i++){
            _aDicesAnimSprites[i].visible = false;
        }
        
        // Reset dice index
        _iCurDiceIndex = 0;
        _iFrameCont = 0;
        
        // Clear dice result for next roll
        _aDiceResult = null;
        
        console.log('✅ CDicesAnim.hide completed - animation state cleaned');
        
        // Call dicesAnimEnded to notify game that animation is complete
        if (s_oGame && typeof s_oGame.dicesAnimEnded === 'function') {
            s_oGame.dicesAnimEnded();
        } else {
            console.warn('⚠️ s_oGame.dicesAnimEnded not available');
        }
    };
    
    this.startRolling = function(aDicesResult){
        console.log('🎲 CDicesAnim.startRolling called with result:', aDicesResult);
        
        // Validate input - check array exists, has 2 elements, and both are valid numbers
        if (!aDicesResult || aDicesResult.length !== 2 || 
            typeof aDicesResult[0] !== 'number' || typeof aDicesResult[1] !== 'number' ||
            aDicesResult[0] < 1 || aDicesResult[0] > 6 || 
            aDicesResult[1] < 1 || aDicesResult[1] > 6) {
            console.error('❌ Invalid dice result provided to startRolling:', aDicesResult);
            console.error('   Expected: [number, number] where each is 1-6');
            console.error('   Received:', typeof aDicesResult, aDicesResult);
            return;
        }
        
        // Store result
        _aDiceResult = aDicesResult;
        
        // Reset animation state
        _iCurDiceIndex = 0;
        _iFrameCont = 0;
        
        // Start from frame 0
        this.playToFrame(0);

        // Show container
        _oContainer.visible = true;

        // Enable update loop
        _bUpdate = true;
        
        // Play sound
        playSound("dice_rolling", 1, false);
        
        // Reduced safety timeout for faster recovery
        setTimeout(function() {
            if (_oContainer.visible && _bUpdate) {
                console.warn('⚠️ SAFETY TIMEOUT: Forcing dice animation to complete after 4 seconds');
                _bUpdate = false;
                if (_aDiceResult && _aDiceResult.length === 2) {
                    _oThis._setAnimForDiceResult();
                } else {
                    console.error('❌ No valid dice result, hiding animation');
                    _oThis.hide();
                }
            }
        }, 4000); // Reduced from 6 to 4 seconds
    };
    
    // Inicia animação sem resultado definido (para outros jogadores observarem)
    this.startRollingWithoutResult = function(){
        console.log('🎲 CDicesAnim: Starting rolling animation without result');
        
        // Reset animation state
        _iCurDiceIndex = 0;
        _iFrameCont = 0;
        _aDiceResult = null; // Clear any previous result
        
        // Start from frame 0
        this.playToFrame(0);
        
        // Show container and enable update
        _oContainer.visible = true;
        _bUpdate = true;
        
        console.log('🎲 CDicesAnim: Animation container visible:', _oContainer.visible);
        console.log('🎲 CDicesAnim: Update flag set to:', _bUpdate);
        
        // Play sound
        playSound("dice_rolling", 1, false);
        
        // Safety timeout if result never arrives
        setTimeout(function() {
            if (_oContainer.visible && !_aDiceResult) {
                console.error('❌ TIMEOUT: No dice result received after 5 seconds, forcing hide');
                _bUpdate = false;
                _oThis.hide();
            }
        }, 5000);
    };
    
    // Finaliza animação com resultado (quando recebe do servidor)
    this.finishRollingWithResult = function(aDicesResult){
        console.log('🎲 CDicesAnim: Finishing rolling with result:', aDicesResult);
        
        // Validate input - check array exists, has 2 elements, and both are valid numbers
        if (!aDicesResult || aDicesResult.length !== 2 || 
            typeof aDicesResult[0] !== 'number' || typeof aDicesResult[1] !== 'number' ||
            aDicesResult[0] < 1 || aDicesResult[0] > 6 || 
            aDicesResult[1] < 1 || aDicesResult[1] > 6) {
            console.error('❌ Invalid dice result provided to finishRollingWithResult:', aDicesResult);
            console.error('   Expected: [number, number] where each is 1-6');
            console.error('   Received:', typeof aDicesResult, aDicesResult);
            // Force hide if invalid result
            _bUpdate = false;
            _oThis.hide();
            return;
        }
        
        // Store result
        _aDiceResult = aDicesResult;
        
        // Se ainda estiver na animação de rolagem, deixa continuar
        // Se já terminou, força o resultado imediatamente
        if(!_bUpdate){
            console.log('🎲 CDicesAnim: Animation not updating, setting result immediately');
            this._setAnimForDiceResult();
        } else {
            console.log('🎲 CDicesAnim: Animation still updating, result will be set when animation completes');
        }
    };
    
    this.setShowNumberInfo = function(){
        _oDiceTopDownView.setDiceResult(_aDiceResult[0],_aDiceResult[1]);
    };
    
    this.playToFrame = function(iFrame){
        _oCurLaunchDiceSprite.visible = false;
        _iCurDiceIndex = iFrame;
        _aDicesAnimSprites[_iCurDiceIndex].visible= true;
        _oCurLaunchDiceSprite = _aDicesAnimSprites[_iCurDiceIndex];
    };
    
    this.nextFrame = function(){
        _oCurLaunchDiceSprite.visible = false;
        _iCurDiceIndex++;
        _aDicesAnimSprites[_iCurDiceIndex].visible= true;
        _oCurLaunchDiceSprite = _aDicesAnimSprites[_iCurDiceIndex];
    };
    
    this._setAnimForDiceResult = function(){
        _aDicesAnimSprites[_iCurDiceIndex].visible = false;
        
        _oDiceASprite.visible = true;
        _oDiceBSprite.visible = true;
        _oDiceASprite.gotoAndPlay("anim_"+_aDiceResult[0]);
        _oDiceBSprite.gotoAndPlay("anim_"+_aDiceResult[1]);
    };
    
    this._onDiceBAnimEnded = function(evt){
        if(evt.currentTarget.currentAnimation.indexOf("stop_anim") !== -1){
            console.log('🎲 Dice animation ended, showing result');
            _oThis.setShowNumberInfo();
            
            // Reduced delay for faster gameplay
            var reducedTime = Math.max(1000, TIME_SHOW_DICES_RESULT * 0.5); // At least 1 second, but 50% faster
            console.log('🎲 Will hide animation in', reducedTime, 'ms');
            
            setTimeout(function(){
                console.log('🎲 Hiding animation now');
                _oThis.hide();
            }, reducedTime);
        }
    };
    
    this.isVisible = function(){
        return _oContainer.visible;
    };
    
    this.update = function(){
        if(_bUpdate === false){
            return;
        }
        
        _iFrameCont++;
        
        if(_iFrameCont === 1){
            _iFrameCont = 0;
            if (  _iCurDiceIndex === (NUM_DICE_ROLLING_FRAMES-1)) {
                // Se temos resultado, mostra o resultado
                if(_aDiceResult && _aDiceResult.length === 2){
                    console.log('🎲 CDicesAnim: Animation complete, showing result:', _aDiceResult);
                    _bUpdate = false;
                    this._setAnimForDiceResult();
                } else {
                    // Se não temos resultado ainda, para a animação no último frame
                    console.log('🎲 CDicesAnim: No result yet, stopping at last frame');
                    _bUpdate = false;
                }
            }else{
                this.nextFrame();
            }
            
        }
        
    };
    
    _oThis = this;
    this._init(iX,iY);
}