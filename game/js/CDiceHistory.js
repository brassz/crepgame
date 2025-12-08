/**
 * Dice History Panel - Shows recent dice rolls
 * Horizontal bar displaying last 5 rolls with dice faces and totals
 */
function CDiceHistory() {
    var _oContainer;
    var _oBackground;
    var _oTitle;
    var _aHistoryItems = [];
    var _iMaxHistoryItems = 5; // Mostra apenas as últimas 5 jogadas
    var _oThis;

    this._init = function() {
        // Container posicionado na parte inferior central da tela
        _oContainer = new createjs.Container();
        _oContainer.x = CANVAS_WIDTH / 2 - 400; // Centralizado
        _oContainer.y = CANVAS_HEIGHT - 100; // 100px do fundo
        s_oStage.addChild(_oContainer);

        // Background panel horizontal
        var oGraphics = new createjs.Graphics()
            .beginFill("rgba(0, 0, 0, 0.8)")
            .drawRoundRect(0, 0, 800, 90, 10);
        _oBackground = new createjs.Shape(oGraphics);
        _oContainer.addChild(_oBackground);

        // Border
        var oBorderGraphics = new createjs.Graphics()
            .setStrokeStyle(2)
            .beginStroke("#FFD700")
            .drawRoundRect(0, 0, 800, 90, 10);
        var oBorder = new createjs.Shape(oBorderGraphics);
        _oContainer.addChild(oBorder);

        // Title
        _oTitle = new createjs.Text("ÚLTIMAS 5 JOGADAS", "bold 14px Arial", "#FFD700");
        _oTitle.x = 400;
        _oTitle.y = 15;
        _oTitle.textAlign = "center";
        _oTitle.textBaseline = "middle";
        _oContainer.addChild(_oTitle);

        console.log('✅ Dice History Panel initialized (horizontal layout)');
    };

    /**
     * Add a new dice roll to the history
     * @param {number} dice1 - First die value (1-6)
     * @param {number} dice2 - Second die value (1-6)
     * @param {string} shooterName - Name of the shooter (optional)
     */
    this.addRoll = function(dice1, dice2, shooterName) {
        console.log('📊 Adding roll to history:', dice1, dice2, shooterName);

        // Validate input
        if (typeof dice1 !== 'number' || typeof dice2 !== 'number' ||
            dice1 < 1 || dice1 > 6 || dice2 < 1 || dice2 > 6) {
            console.error('❌ Invalid dice values for history:', dice1, dice2);
            return;
        }

        // Remove oldest item if at max capacity (remove from the left/first position)
        if (_aHistoryItems.length >= _iMaxHistoryItems) {
            var oldestItem = _aHistoryItems.shift();
            _oContainer.removeChild(oldestItem.container);
            
            // Shift all remaining items to the left
            for (var i = 0; i < _aHistoryItems.length; i++) {
                createjs.Tween.get(_aHistoryItems[i].container)
                    .to({x: 15 + (i * 155)}, 300, createjs.Ease.cubicOut);
            }
        }

        // Create new history item (will be added on the right)
        var oItemContainer = new createjs.Container();
        var xPosition = 15 + (_aHistoryItems.length * 155);
        oItemContainer.x = xPosition;
        oItemContainer.y = 35; // Abaixo do título

        // Background for this item
        var oItemBg = new createjs.Graphics()
            .beginFill("rgba(255, 215, 0, 0.1)")
            .drawRoundRect(0, 0, 145, 50, 5);
        var oBgShape = new createjs.Shape(oItemBg);
        oItemContainer.addChild(oBgShape);

        // Dice text (simple representation) - larger for horizontal layout
        var sDiceText = this._getDiceEmoji(dice1) + " " + this._getDiceEmoji(dice2);
        var oDiceText = new createjs.Text(sDiceText, "24px Arial", "#FFFFFF");
        oDiceText.x = 10;
        oDiceText.y = 8;
        oItemContainer.addChild(oDiceText);

        // Total - displayed below the dice
        var iTotal = dice1 + dice2;
        var oTotalText = new createjs.Text("= " + iTotal, "bold 16px Arial", "#FFD700");
        oTotalText.x = 10;
        oTotalText.y = 30;
        oItemContainer.addChild(oTotalText);

        // Shooter name (if provided, show on the right side)
        if (shooterName) {
            var oShooterText = new createjs.Text(shooterName, "9px Arial", "#AAAAAA");
            oShooterText.x = 85;
            oShooterText.y = 20;
            oShooterText.maxWidth = 55;
            oShooterText.textAlign = "right";
            oItemContainer.addChild(oShooterText);
        }

        _oContainer.addChild(oItemContainer);

        // Add to history array
        _aHistoryItems.push({
            container: oItemContainer,
            dice1: dice1,
            dice2: dice2,
            total: iTotal
        });

        // Fade in animation
        oItemContainer.alpha = 0;
        createjs.Tween.get(oItemContainer)
            .to({alpha: 1}, 300, createjs.Ease.cubicOut);

        console.log('✅ Roll added to history. Total items:', _aHistoryItems.length);
    };

    /**
     * Get dice emoji/character representation
     * Using dice unicode characters for visual representation
     */
    this._getDiceEmoji = function(value) {
        switch(value) {
            case 1: return "⚀";
            case 2: return "⚁";
            case 3: return "⚂";
            case 4: return "⚃";
            case 5: return "⚄";
            case 6: return "⚅";
            default: return "?";
        }
    };

    /**
     * Clear all history
     */
    this.clear = function() {
        console.log('🧹 Clearing dice history');
        
        for (var i = 0; i < _aHistoryItems.length; i++) {
            _oContainer.removeChild(_aHistoryItems[i].container);
        }
        
        _aHistoryItems = [];
    };

    /**
     * Show the history panel
     */
    this.show = function() {
        _oContainer.visible = true;
    };

    /**
     * Hide the history panel
     */
    this.hide = function() {
        _oContainer.visible = false;
    };

    /**
     * Toggle visibility
     */
    this.toggle = function() {
        _oContainer.visible = !_oContainer.visible;
    };

    /**
     * Check if panel is visible
     */
    this.isVisible = function() {
        return _oContainer.visible;
    };

    /**
     * Set position
     */
    this.setPosition = function(x, y) {
        _oContainer.x = x;
        _oContainer.y = y;
    };

    /**
     * Unload and cleanup
     */
    this.unload = function() {
        this.clear();
        s_oStage.removeChild(_oContainer);
    };

    _oThis = this;
    this._init();
}
