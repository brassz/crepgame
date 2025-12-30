/**
 * SISTEMA DE LAYOUT RESPONSIVO
 * Gerencia redimensionamento usando containers centralizados
 * Mantém compatibilidade com o sistema CreateJS existente
 */

// Variáveis globais para o sistema responsivo
var s_oResponsiveLayout = null;

(function() {
    'use strict';
    
    /**
     * Classe principal para gerenciamento de layout responsivo
     */
    function CResponsiveLayout() {
        var _canvas = null;
        var _canvasContainer = null;
        var _gameWrapper = null;
        var _gameContainer = null;
        var _aspectRatio = CANVAS_WIDTH / CANVAS_HEIGHT; // 1280/768 = 1.667
        var _resizeTimeout = null;
        var _initialized = false;
        
        /**
         * Inicializa o sistema de layout responsivo
         */
        this.init = function() {
            if (_initialized) return;
            
            _canvas = document.getElementById('canvas');
            if (!_canvas) {
                console.warn('Canvas não encontrado');
                return;
            }
            
            // Busca ou cria os containers
            _canvasContainer = _canvas.closest('.canvas-container');
            _gameWrapper = _canvas.closest('.game-wrapper');
            _gameContainer = _canvas.closest('.game-container');
            
            // Se não existirem, cria os containers
            if (!_canvasContainer) {
                this._createContainers();
            }
            
            // Configura listeners de redimensionamento
            this._setupEventListeners();
            
            // Faz o redimensionamento inicial
            this.resize();
            
            _initialized = true;
            console.log('✅ Sistema de layout responsivo inicializado');
        };
        
        /**
         * Cria os containers necessários se não existirem
         */
        this._createContainers = function() {
            var gameContainer = document.createElement('div');
            gameContainer.className = 'game-container';
            
            var gameWrapper = document.createElement('div');
            gameWrapper.className = 'game-wrapper';
            
            var canvasContainer = document.createElement('div');
            canvasContainer.className = 'canvas-container';
            
            // Move o canvas para dentro dos containers
            var parent = _canvas.parentNode;
            parent.insertBefore(gameContainer, _canvas);
            gameContainer.appendChild(gameWrapper);
            gameWrapper.appendChild(canvasContainer);
            canvasContainer.appendChild(_canvas);
            
            _canvasContainer = canvasContainer;
            _gameWrapper = gameWrapper;
            _gameContainer = gameContainer;
        };
        
        /**
         * Configura listeners de eventos
         */
        this._setupEventListeners = function() {
            // Debounce do resize para melhor performance
            window.addEventListener('resize', function() {
                if (_resizeTimeout) {
                    clearTimeout(_resizeTimeout);
                }
                _resizeTimeout = setTimeout(function() {
                    s_oResponsiveLayout.resize();
                }, 100);
            });
            
            // Listener para mudança de orientação
            window.addEventListener('orientationchange', function() {
                setTimeout(function() {
                    s_oResponsiveLayout.resize();
                }, 200);
            });
            
            // Listener para fullscreen
            if (screenfull && screenfull.isEnabled) {
                screenfull.on('change', function() {
                    setTimeout(function() {
                        s_oResponsiveLayout.resize();
                    }, 100);
                });
            }
        };
        
        /**
         * Função principal de redimensionamento
         * Usa CSS para centralização e mantém proporção do canvas
         */
        this.resize = function() {
            if (!_canvas || !_canvasContainer) {
                console.warn('Canvas ou container não encontrado');
                return;
            }
            
            // Obtém dimensões da viewport
            var viewportWidth = this._getViewportWidth();
            var viewportHeight = this._getViewportHeight();
            
            // Calcula dimensões respeitando aspect ratio
            var scale = Math.min(
                viewportWidth / CANVAS_WIDTH,
                viewportHeight / CANVAS_HEIGHT
            );
            
            // Calcula dimensões finais do canvas
            var canvasWidth = Math.floor(CANVAS_WIDTH * scale);
            var canvasHeight = Math.floor(CANVAS_HEIGHT * scale);
            
            // Aplica dimensões ao canvas usando CSS
            // O CSS transform: translate(-50%, -50%) já centraliza
            _canvas.style.width = canvasWidth + 'px';
            _canvas.style.height = canvasHeight + 'px';
            
            // Atualiza variáveis globais necessárias para o jogo
            s_iScaleFactor = scale;
            s_iCanvasResizeWidth = canvasWidth;
            s_iCanvasResizeHeight = canvasHeight;
            
            // Calcula offsets (sempre 0 pois o CSS centraliza)
            s_iOffsetX = 0;
            s_iOffsetY = 0;
            
            // Para dispositivos com DPI alto (Retina, etc)
            if (this._isHighDPI()) {
                this._handleHighDPI(canvasWidth, canvasHeight, scale);
            } else if (s_oStage) {
                // Configuração padrão do stage
                s_oStage.scaleX = s_oStage.scaleY = scale;
            }
            
            // Atualiza posições de botões se a interface existir
            if (s_oInterface && typeof s_oInterface.refreshButtonPos === 'function') {
                s_oInterface.refreshButtonPos(s_iOffsetX, s_iOffsetY);
            }
            
            if (s_oMenu && typeof s_oMenu.refreshButtonPos === 'function') {
                s_oMenu.refreshButtonPos(s_iOffsetX, s_iOffsetY);
            }
            
            // Verifica orientação
            this._checkOrientation(viewportWidth, viewportHeight);
            
            // Log para debug
            console.log('🔄 Layout redimensionado:', {
                viewport: viewportWidth + 'x' + viewportHeight,
                canvas: canvasWidth + 'x' + canvasHeight,
                scale: scale.toFixed(3)
            });
        };
        
        /**
         * Obtém largura da viewport
         */
        this._getViewportWidth = function() {
            return Math.max(
                document.documentElement.clientWidth || 0,
                window.innerWidth || 0
            );
        };
        
        /**
         * Obtém altura da viewport
         */
        this._getViewportHeight = function() {
            if (s_bIsIphone || isIOS()) {
                return getIOSWindowHeight ? getIOSWindowHeight() : window.innerHeight;
            }
            return Math.max(
                document.documentElement.clientHeight || 0,
                window.innerHeight || 0
            );
        };
        
        /**
         * Verifica se é uma tela de alta densidade (Retina)
         */
        this._isHighDPI = function() {
            return window.devicePixelRatio && window.devicePixelRatio > 1;
        };
        
        /**
         * Tratamento especial para telas de alta densidade
         */
        this._handleHighDPI = function(canvasWidth, canvasHeight, scale) {
            if (s_bIsIphone && s_oStage) {
                // iPhone com Retina
                var dpr = window.devicePixelRatio || 2;
                s_oStage.canvas.width = canvasWidth * dpr;
                s_oStage.canvas.height = canvasHeight * dpr;
                s_oStage.scaleX = s_oStage.scaleY = scale * dpr;
            } else if (s_oStage) {
                // Outros dispositivos de alta densidade
                s_oStage.scaleX = s_oStage.scaleY = scale;
            }
        };
        
        /**
         * Verifica orientação do dispositivo
         */
        this._checkOrientation = function(width, height) {
            if (!s_bMobile || !ENABLE_CHECK_ORIENTATION) {
                return;
            }
            
            var orientationContainer = document.querySelector('.orientation-msg-container');
            if (!orientationContainer) return;
            
            var requiredOrientation = orientationContainer.getAttribute('data-orientation');
            var isLandscape = width > height;
            var isPortrait = height > width;
            
            if (requiredOrientation === 'landscape' && !isLandscape) {
                // Requer landscape mas está em portrait
                orientationContainer.style.display = 'flex';
                if (s_oMain && typeof s_oMain.stopUpdate === 'function') {
                    s_oMain.stopUpdate();
                }
            } else if (requiredOrientation === 'portrait' && !isPortrait) {
                // Requer portrait mas está em landscape
                orientationContainer.style.display = 'flex';
                if (s_oMain && typeof s_oMain.stopUpdate === 'function') {
                    s_oMain.stopUpdate();
                }
            } else {
                // Orientação correta
                orientationContainer.style.display = 'none';
                if (s_oMain && typeof s_oMain.startUpdate === 'function') {
                    s_oMain.startUpdate();
                }
            }
        };
        
        /**
         * Obtém informações do layout atual
         */
        this.getInfo = function() {
            return {
                canvasWidth: s_iCanvasResizeWidth,
                canvasHeight: s_iCanvasResizeHeight,
                scale: s_iScaleFactor,
                offsetX: s_iOffsetX,
                offsetY: s_iOffsetY,
                aspectRatio: _aspectRatio,
                isMobile: s_bMobile,
                isHighDPI: this._isHighDPI()
            };
        };
        
        /**
         * Força um redimensionamento
         */
        this.forceResize = function() {
            this.resize();
        };
    }
    
    // Inicializa o sistema quando o DOM estiver pronto
    function initResponsiveLayout() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function() {
                s_oResponsiveLayout = new CResponsiveLayout();
                s_oResponsiveLayout.init();
            });
        } else {
            s_oResponsiveLayout = new CResponsiveLayout();
            s_oResponsiveLayout.init();
        }
    }
    
    // Auto-inicializa
    initResponsiveLayout();
})();

/**
 * Override do sizeHandler original para usar o novo sistema
 * Mantém compatibilidade com código legado
 */
var _originalSizeHandler = typeof sizeHandler !== 'undefined' ? sizeHandler : null;

function sizeHandler() {
    // Usa o novo sistema responsivo se disponível
    if (s_oResponsiveLayout && typeof s_oResponsiveLayout.resize === 'function') {
        s_oResponsiveLayout.resize();
    } else if (_originalSizeHandler) {
        // Fallback para o sistema antigo
        _originalSizeHandler();
    }
}

/**
 * Utilitários adicionais para trabalhar com o layout responsivo
 */
var ResponsiveUtils = {
    /**
     * Converte coordenadas da tela para coordenadas do canvas
     */
    screenToCanvas: function(screenX, screenY) {
        if (!s_oStage) return {x: screenX, y: screenY};
        
        var canvas = document.getElementById('canvas');
        if (!canvas) return {x: screenX, y: screenY};
        
        var rect = canvas.getBoundingClientRect();
        var scaleX = CANVAS_WIDTH / rect.width;
        var scaleY = CANVAS_HEIGHT / rect.height;
        
        return {
            x: (screenX - rect.left) * scaleX,
            y: (screenY - rect.top) * scaleY
        };
    },
    
    /**
     * Converte coordenadas do canvas para coordenadas da tela
     */
    canvasToScreen: function(canvasX, canvasY) {
        if (!s_oStage) return {x: canvasX, y: canvasY};
        
        var canvas = document.getElementById('canvas');
        if (!canvas) return {x: canvasX, y: canvasY};
        
        var rect = canvas.getBoundingClientRect();
        var scaleX = rect.width / CANVAS_WIDTH;
        var scaleY = rect.height / CANVAS_HEIGHT;
        
        return {
            x: canvasX * scaleX + rect.left,
            y: canvasY * scaleY + rect.top
        };
    },
    
    /**
     * Retorna o tamanho atual da ficha baseado no breakpoint
     */
    getFichaSize: function() {
        var width = window.innerWidth;
        
        if (width < 640) {
            return 40; // mobile
        } else if (width < 1024) {
            return 50; // tablet
        } else {
            return 60; // desktop
        }
    },
    
    /**
     * Retorna informações sobre o breakpoint atual
     */
    getCurrentBreakpoint: function() {
        var width = window.innerWidth;
        
        if (width < 640) {
            return {name: 'mobile', width: width, maxWidth: 639};
        } else if (width < 1024) {
            return {name: 'tablet', width: width, maxWidth: 1023};
        } else if (width < 1440) {
            return {name: 'desktop', width: width, maxWidth: 1439};
        } else {
            return {name: 'desktop-large', width: width, maxWidth: Infinity};
        }
    }
};

// Exporta para uso global
window.ResponsiveUtils = ResponsiveUtils;
