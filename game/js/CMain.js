function CMain(oData){
    var _bUpdate;
    var _iCurResource = 0;
    var RESOURCE_TO_LOAD = 0;
    var _iState = STATE_LOADING;
    var _bLoadingFinished = false;
    var _iLoadWatchdog = null;
    
    var _oData;
    var _oPreloader;
    var _oMenu;
    var _oHelp;
    var _oGame;

    this.initContainer = function(){
        var canvas = document.getElementById("canvas");
        s_oStage = new createjs.Stage(canvas);       
        
        s_bMobile = isMobile();
        if(s_bMobile === false){
            s_oStage.enableMouseOver(20);  
            
        }else{
            createjs.Touch.enable(s_oStage, true);
        }
        s_iPrevTime = new Date().getTime();

        createjs.Ticker.setFPS(FPS);
	createjs.Ticker.addEventListener("tick", this._update);
		
        if(navigator.userAgent.match(/Windows Phone/i)){
                DISABLE_SOUND_MOBILE = true;
        }
		
        s_oSpriteLibrary  = new CSpriteLibrary();

        //ADD PRELOADER
        _oPreloader = new CPreloader();
    };

    this.soundLoaded = function(){
         _iCurResource++;
         var iPerc = Math.floor(_iCurResource/RESOURCE_TO_LOAD *100);
         if(_oPreloader){
             _oPreloader.refreshLoader(iPerc);
         }
         this._checkLoadComplete(iPerc);
    };

    this._checkLoadComplete = function(iPerc){
         if(iPerc >= 100 || (RESOURCE_TO_LOAD > 0 && _iCurResource >= RESOURCE_TO_LOAD)){
             this._forceFinishLoading();
         }
    };

    this._forceFinishLoading = function(){
         if(_bLoadingFinished) return;
         _bLoadingFinished = true;
         if(_iLoadWatchdog){
             clearTimeout(_iLoadWatchdog);
             _iLoadWatchdog = null;
         }
         if(_oPreloader && _oPreloader.refreshLoader){
             _oPreloader.refreshLoader(100);
         } else {
             this._onRemovePreloader();
         }
    };
    
    this._initSounds = function(){
        Howler.mute(!s_bAudioActive);

        s_aSoundsInfo = new Array();
        s_aSoundsInfo.push({path: './sounds/',filename:'chip',loop:false,volume:1, ingamename: 'chip'});
        s_aSoundsInfo.push({path: './sounds/',filename:'click',loop:false,volume:1, ingamename: 'click'});
        s_aSoundsInfo.push({path: './sounds/',filename:'fiche_collect',loop:false,volume:1, ingamename: 'fiche_collect'});
        s_aSoundsInfo.push({path: './sounds/',filename:'fiche_select',loop:false,volume:1, ingamename: 'fiche_select'});
        s_aSoundsInfo.push({path: './sounds/',filename:'dice_rolling',loop:false,volume:1, ingamename: 'dice_rolling'});
        s_aSoundsInfo.push({path: './sounds/',filename:'win',loop:false,volume:1, ingamename: 'win'});
        s_aSoundsInfo.push({path: './sounds/',filename:'lose',loop:false,volume:1, ingamename: 'lose'});
        
        RESOURCE_TO_LOAD += s_aSoundsInfo.length;

        s_aSounds = new Array();
        for(var i=0; i<s_aSoundsInfo.length; i++){
            this.tryToLoadSound(s_aSoundsInfo[i], false);
        }
        
    };  
    
    this.tryToLoadSound = function(oSoundInfo, bDelay){
        
       setTimeout(function(){        
            s_aSounds[oSoundInfo.ingamename] = new Howl({ 
                                                            src: [oSoundInfo.path+oSoundInfo.filename+'.mp3'],
                                                            autoplay: false,
                                                            preload: true,
                                                            loop: oSoundInfo.loop, 
                                                            volume: oSoundInfo.volume,
                                                            onload: s_oMain.soundLoaded,
                                                            onloaderror: function(szId,szMsg){
                                                                                console.warn('⚠️ Erro ao carregar som:', oSoundInfo.filename, szMsg);
                                                                                // Conta como carregado para não travar na tela preta
                                                                                s_oMain.soundLoaded();
                                                                                var block = document.querySelector("#block_game");
                                                                                if(block){ block.style.display = "none"; }
                                                                        },
                                                            onplayerror: function(szId) {
                                                                for(var i=0; i < s_aSoundsInfo.length; i++){
                                                                                     if ( szId === s_aSounds[s_aSoundsInfo[i].ingamename]._sounds[0]._id){
                                                                                          s_aSounds[s_aSoundsInfo[i].ingamename].once('unlock', function() {
                                                                                            s_aSounds[s_aSoundsInfo[i].ingamename].play();                                                                                          
                                                                                          });
                                                                                         break;
                                                                                     }
                                                                                 }
                                                                       
                                                            } 
                                                        });

            
        }, (bDelay ? 200 : 0) );
        
        
    };



    this._loadImages = function(){
        s_oSpriteLibrary.init( this._onImagesLoaded,this._onAllImagesLoaded, this );

	s_oSpriteLibrary.addSprite("bg_menu","./sprites/bg_menu.jpg");
        s_oSpriteLibrary.addSprite("but_exit","./sprites/but_exit.png");
        s_oSpriteLibrary.addSprite("audio_icon","./sprites/audio_icon.png");
        s_oSpriteLibrary.addSprite("msg_box","./sprites/msg_box.png");
        s_oSpriteLibrary.addSprite("chip_box","./sprites/chip_box.png");
        s_oSpriteLibrary.addSprite("but_bets","./sprites/but_bets.png");
        s_oSpriteLibrary.addSprite("but_bg","./sprites/but_bg.png");
        s_oSpriteLibrary.addSprite("but_clear_all","./sprites/but_clear_all.png");
        s_oSpriteLibrary.addSprite("but_play","./sprites/but_play.png");
        s_oSpriteLibrary.addSprite("logo_credits","./sprites/logo_credits.png");
        s_oSpriteLibrary.addSprite("but_credits","./sprites/but_credits.png");
        s_oSpriteLibrary.addSprite("ball","./sprites/ball.png");
        s_oSpriteLibrary.addSprite("enlight_any_craps","./sprites/enlight_any_craps.png");
        s_oSpriteLibrary.addSprite("enlight_big_6","./sprites/enlight_big_6.png");
        s_oSpriteLibrary.addSprite("enlight_big_8","./sprites/enlight_big_8.png");
        s_oSpriteLibrary.addSprite("enlight_circle","./sprites/enlight_circle.png");
        s_oSpriteLibrary.addSprite("enlight_come","./sprites/enlight_come.png");
        s_oSpriteLibrary.addSprite("enlight_dont_come","./sprites/enlight_dont_come.png");
        s_oSpriteLibrary.addSprite("enlight_dont_pass1","./sprites/enlight_dont_pass1.png");
        s_oSpriteLibrary.addSprite("enlight_dont_pass2","./sprites/enlight_dont_pass2.png");
        s_oSpriteLibrary.addSprite("enlight_field","./sprites/enlight_field.png");
        s_oSpriteLibrary.addSprite("enlight_lay_bet","./sprites/enlight_lay_bet.png");
        s_oSpriteLibrary.addSprite("enlight_lose_bet","./sprites/enlight_lose_bet.png");
        s_oSpriteLibrary.addSprite("enlight_number","./sprites/enlight_number.png");
        s_oSpriteLibrary.addSprite("enlight_pass_line","./sprites/enlight_pass_line.png");
        s_oSpriteLibrary.addSprite("enlight_proposition1","./sprites/enlight_proposition1.png");
        s_oSpriteLibrary.addSprite("enlight_proposition2","./sprites/enlight_proposition2.png");
        s_oSpriteLibrary.addSprite("enlight_seven","./sprites/enlight_seven.png");
        s_oSpriteLibrary.addSprite("enlight_any11","./sprites/enlight_any11.png");
        
        s_oSpriteLibrary.addSprite("hit_area_any_craps","./sprites/hit_area_any_craps.png");
        s_oSpriteLibrary.addSprite("hit_area_big_8","./sprites/hit_area_big_8.png");
        s_oSpriteLibrary.addSprite("hit_area_big_6","./sprites/hit_area_big_6.png");
        s_oSpriteLibrary.addSprite("hit_area_circle","./sprites/hit_area_circle.png");
        s_oSpriteLibrary.addSprite("hit_area_come","./sprites/hit_area_come.png");
        s_oSpriteLibrary.addSprite("hit_area_dont_come","./sprites/hit_area_dont_come.png");
        s_oSpriteLibrary.addSprite("hit_area_dont_pass1","./sprites/hit_area_dont_pass1.png");
        s_oSpriteLibrary.addSprite("hit_area_dont_pass2","./sprites/hit_area_dont_pass2.png");
        s_oSpriteLibrary.addSprite("hit_area_field","./sprites/hit_area_field.png");
        s_oSpriteLibrary.addSprite("hit_area_lay_bet","./sprites/hit_area_lay_bet.png");
        s_oSpriteLibrary.addSprite("hit_area_lose_bet","./sprites/hit_area_lose_bet.png");
        s_oSpriteLibrary.addSprite("hit_area_number","./sprites/hit_area_number.png");
        s_oSpriteLibrary.addSprite("hit_area_pass_line","./sprites/hit_area_pass_line.png");
        s_oSpriteLibrary.addSprite("hit_area_proposition1","./sprites/hit_area_proposition1.png");
        s_oSpriteLibrary.addSprite("hit_area_proposition2","./sprites/hit_area_proposition2.png");
        s_oSpriteLibrary.addSprite("hit_area_seven","./sprites/hit_area_seven.png");
        s_oSpriteLibrary.addSprite("hit_area_any11","./sprites/hit_area_any11.png");
        s_oSpriteLibrary.addSprite("select_fiche","./sprites/select_fiche.png");
        s_oSpriteLibrary.addSprite("roll_but","./sprites/roll_but.png");
        s_oSpriteLibrary.addSprite("dices_screen_bg","./sprites/dices_screen_bg.png");
        s_oSpriteLibrary.addSprite("logo_game_0","./sprites/logo_game_0.png");
        s_oSpriteLibrary.addSprite("board_table","./sprites/board_table.png");
        s_oSpriteLibrary.addSprite("display_bg","./sprites/display_bg.png");
        s_oSpriteLibrary.addSprite("puck","./sprites/puck.png");
        s_oSpriteLibrary.addSprite("dice_topdown1","./sprites/dice_topdown1.png");
        s_oSpriteLibrary.addSprite("dice_topdown2","./sprites/dice_topdown2.png");
        s_oSpriteLibrary.addSprite("but_not","./sprites/but_not.png");
        s_oSpriteLibrary.addSprite("but_yes","./sprites/but_yes.png");
        s_oSpriteLibrary.addSprite("dice_a","./sprites/dice_a.png");
        s_oSpriteLibrary.addSprite("dice_b","./sprites/dice_b.png");
        s_oSpriteLibrary.addSprite("dices_box","./sprites/dices_box.png");
        s_oSpriteLibrary.addSprite("but_fullscreen","./sprites/but_fullscreen.png");
        s_oSpriteLibrary.addSprite("but_credits","./sprites/but_credits.png");
        
        var aFicheSpriteFiles = ["fiche_4", "fiche_5", "fiche_6", "fiche_7"];
        for(var i=0;i<NUM_FICHES;i++){
            s_oSpriteLibrary.addSprite("fiche_"+i,"./sprites/"+aFicheSpriteFiles[i]+".png");
        }
        
        for(var j=0;j<NUM_DICE_ROLLING_FRAMES;j++){
            s_oSpriteLibrary.addSprite("launch_dices_"+j,"./sprites/launch_dice_anim/launch_dices_"+j+".png");
        }

        
        RESOURCE_TO_LOAD += s_oSpriteLibrary.getNumSprites();

        s_oSpriteLibrary.loadSprites();
    };
    
    this._onImagesLoaded = function(){
        _iCurResource++;

        var iPerc = Math.floor(_iCurResource/RESOURCE_TO_LOAD *100);
        if(_oPreloader){
            _oPreloader.refreshLoader(iPerc);
        }
        this._checkLoadComplete(iPerc);
    };
    
    this._onAllImagesLoaded = function(){
        
    };
    
    this.onImageLoadError = function(szText){
        
    };
	
    this.preloaderReady = function(){
        this._loadImages();
		
	if(DISABLE_SOUND_MOBILE === false || s_bMobile === false){
            this._initSounds();
        }
        
        _bUpdate = true;

        // Se sons/imagens travarem, abre o menu mesmo assim (evita tela preta eterna)
        if(_iLoadWatchdog) clearTimeout(_iLoadWatchdog);
        _iLoadWatchdog = setTimeout(function(){
            console.warn('⚠️ Timeout de carregamento — forçando menu');
            s_oMain._forceFinishLoading();
        }, 12000);
    };
    
    this._onRemovePreloader = function(){
        if(_bLoadingFinished && _oMenu){
            return;
        }
        if(_iLoadWatchdog){
            clearTimeout(_iLoadWatchdog);
            _iLoadWatchdog = null;
        }
        _bLoadingFinished = true;
        if(_oPreloader){
            try { _oPreloader.unload(); } catch(e) {}
            _oPreloader = null;
        }

        s_oMain.gotoMenu();
        try {
            if(typeof sizeHandler === 'function'){ sizeHandler(); }
            if(s_oStage){ s_oStage.update(); }
        } catch(e) {}
    };
    
    this.gotoMenu = function(){
        if(_oMenu){
            try { _oMenu.unload(); } catch(e) {}
            _oMenu = null;
        }
        _oMenu = new CMenu();
        _iState = STATE_MENU;
        try {
            if(s_oStage){ s_oStage.update(); }
        } catch(e) {}
    };
    
    this.gotoGame = function(){
        _oGame = new CGame(_oData);   
							
        _iState = STATE_GAME;
    };
    
    this.gotoHelp = function(){
        _oHelp = new CHelp();
        _iState = STATE_HELP;
    };
    
    this.stopUpdate = function(){
        _bUpdate = false;
        createjs.Ticker.paused = true;
        $("#block_game").css("display","block");
        
        if(DISABLE_SOUND_MOBILE === false || s_bMobile === false){
            Howler.mute(true);
        }
        
    };

    this.startUpdate = function(){
        s_iPrevTime = new Date().getTime();
        _bUpdate = true;
        createjs.Ticker.paused = false;
        $("#block_game").css("display","none");
        
        if(DISABLE_SOUND_MOBILE === false || s_bMobile === false){
            if(s_bAudioActive){
                Howler.mute(false);
            }
        }
        
    };
    
    this._update = function(event){
        if(_bUpdate === false){
                return;
        }
        var iCurTime = new Date().getTime();
        s_iTimeElaps = iCurTime - s_iPrevTime;
        s_iCntTime += s_iTimeElaps;
        s_iCntFps++;
        s_iPrevTime = iCurTime;
        
        if ( s_iCntTime >= 1000 ){
            s_iCurFps = s_iCntFps;
            s_iCntTime-=1000;
            s_iCntFps = 0;
        }
                
        if(_iState === STATE_GAME){
            _oGame.update();
        }
        
        s_oStage.update(event);

    };
    
    s_oMain = this;
    _oData = oData;
    SHOW_CREDITS = oData.show_credits;
    ENABLE_FULLSCREEN = oData.fullscreen;
    ENABLE_CHECK_ORIENTATION = oData.check_orientation;
    s_bAudioActive = oData.audio_enable_on_startup;

    this.initContainer();
}

var s_bMobile;
var s_bAudioActive = true;
var s_bFullscreen = false;
var s_iCntTime = 0;
var s_iTimeElaps = 0;
var s_iPrevTime = 0;
var s_iCntFps = 0;
var s_iCurFps = 0;

var s_oDrawLayer;
var s_oStage;
var s_oMain = null;
var s_oSpriteLibrary;
var s_aSounds;
var s_aSoundsInfo;