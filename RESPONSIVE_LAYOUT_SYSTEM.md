# Sistema de Layout Responsivo - Documentação

## 📋 Visão Geral

Este documento descreve o sistema de layout responsivo implementado para o jogo de dados, utilizando **containers centralizados** com **Flexbox/Grid** e mantendo **pixels apenas internamente** para elementos específicos como fichas.

## 🎯 Objetivos

- ✅ Uso de containers centralizados para melhor responsividade
- ✅ Implementação de Flexbox/Grid para layouts flexíveis
- ✅ Unidades relativas (%, vw, vh, rem, clamp) em vez de pixels fixos
- ✅ Manutenção de pixels apenas para elementos internos específicos (fichas, ícones)
- ✅ Compatibilidade total com mobile e desktop
- ✅ Suporte a diferentes orientações (portrait/landscape)
- ✅ Otimização para telas de alta densidade (Retina)

## 📁 Arquivos Modificados/Criados

### Novos Arquivos CSS

1. **`/game/css/responsive-layout.css`**
2. **`/live_demo/css/responsive-layout.css`**

Sistema completo de layout responsivo com:
- Variáveis CSS (Custom Properties) para design system
- Containers centralizados
- Grid layout para interface do jogo
- Componentes com Flexbox
- Media queries para todos os breakpoints
- Suporte para orientação e preferências de acessibilidade

### Arquivos JavaScript

3. **`/game/js/responsive-layout.js`**
4. **`/live_demo/js/responsive-layout.js`**

Sistema JavaScript que:
- Gerencia redimensionamento do canvas de forma inteligente
- Usa CSS para centralização automática
- Mantém aspect ratio do jogo
- Suporta telas de alta densidade
- Fornece utilitários para conversão de coordenadas

### Arquivos Modificados

5. **`/game/css/main.css`** e **`/live_demo/css/main.css`**
   - Adicionado `box-sizing: border-box` globalmente
   - Implementado Flexbox para centralização do body
   - Container centralizado para o canvas
   - Uso de transform para posicionamento preciso

6. **`/game/css/orientation_utils.css`** e **`/live_demo/css/orientation_utils.css`**
   - Substituição de pixels fixos por `clamp()`
   - Uso de Flexbox para centralização
   - Responsividade baseada em viewport

7. **`/game/index.html`** e **`/live_demo/index.html`**
   - Estrutura HTML com containers semânticos
   - Inclusão do novo sistema CSS responsivo
   - Integração do sistema JavaScript

## 🎨 Sistema de Design

### Variáveis CSS (Design Tokens)

```css
:root {
    /* Espaçamentos fluidos */
    --spacing-xs: clamp(0.25rem, 0.5vw, 0.5rem);
    --spacing-sm: clamp(0.5rem, 1vw, 1rem);
    --spacing-md: clamp(1rem, 2vw, 1.5rem);
    --spacing-lg: clamp(1.5rem, 3vw, 2.5rem);
    --spacing-xl: clamp(2rem, 4vw, 3rem);
    
    /* Tamanhos de fichas (ÚNICO elemento com PX fixo) */
    --ficha-size-mobile: 40px;
    --ficha-size-tablet: 50px;
    --ficha-size-desktop: 60px;
    
    /* Tipografia fluida */
    --font-size-base: clamp(1rem, 3vw, 1.125rem);
    --font-size-lg: clamp(1.125rem, 3.5vw, 1.5rem);
    --font-size-xl: clamp(1.5rem, 4vw, 2rem);
}
```

### Breakpoints

| Nome | Tamanho | Uso |
|------|---------|-----|
| **Mobile** | < 640px | Smartphones em portrait/landscape |
| **Tablet** | 640px - 1023px | Tablets e smartphones grandes |
| **Desktop** | 1024px - 1439px | Laptops e desktops padrão |
| **Desktop Large** | ≥ 1440px | Monitores grandes e 4K |

## 📐 Estrutura de Containers

### HTML Structure

```html
<body>
    <div class="game-container">
        <div class="game-wrapper">
            <div class="canvas-container">
                <canvas id="canvas"></canvas>
            </div>
        </div>
    </div>
</body>
```

### Responsabilidades dos Containers

1. **`game-container`**
   - Container principal usando Flexbox
   - Centralização vertical e horizontal
   - Padding responsivo
   - Altura mínima de 100vh

2. **`game-wrapper`**
   - Limita largura máxima (1280px padrão)
   - Mantém aspect ratio do jogo (16:9.6)
   - Margin auto para centralização

3. **`canvas-container`**
   - Container específico do canvas
   - Flexbox para centralização
   - Posicionamento relativo para elementos absolutos

## 🎮 Sistema de Layout para Interface de Jogo

### Grid Layout

```css
.game-interface {
    display: grid;
    grid-template-areas:
        "header header header"
        "sidebar-left main sidebar-right"
        "footer footer footer";
    grid-template-columns: minmax(150px, 1fr) minmax(0, 3fr) minmax(150px, 1fr);
}
```

### Áreas do Grid

- **header**: Informações do topo (score, timer, etc)
- **sidebar-left**: Controles e informações da esquerda
- **main**: Área principal do jogo (canvas)
- **sidebar-right**: Informações e controles da direita
- **footer**: Controles inferiores (apostas, botões)

### Responsividade do Grid

#### Mobile (< 640px)
```
┌─────────┐
│ header  │
├─────────┤
│  main   │
├─────────┤
│ footer  │
└─────────┘
```

#### Tablet (640px - 1023px)
```
┌─────────────┐
│   header    │
├─────────────┤
│    main     │
├──────┬──────┤
│ left │right │
├──────┴──────┤
│   footer    │
└─────────────┘
```

#### Desktop (≥ 1024px)
```
┌───────────────────┐
│      header       │
├────┬─────────┬────┤
│    │         │    │
│left│  main   │rght│
│    │         │    │
├────┴─────────┴────┤
│      footer       │
└───────────────────┘
```

## 🎯 Elementos com Pixels Fixos

Apenas estes elementos usam pixels fixos por necessidade:

### 1. Fichas (Chips)

```css
.ficha {
    width: var(--ficha-size-mobile);  /* 40px em mobile */
    height: var(--ficha-size-mobile);
    border-radius: 50%;
}

@media (min-width: 640px) {
    .ficha {
        width: var(--ficha-size-tablet);   /* 50px em tablet */
        height: var(--ficha-size-tablet);
    }
}

@media (min-width: 1024px) {
    .ficha {
        width: var(--ficha-size-desktop);  /* 60px em desktop */
        height: var(--ficha-size-desktop);
    }
}
```

**Motivo**: As fichas precisam de tamanhos consistentes e proporcionais para empilhamento e animações.

### 2. Ícones Pequenos

Ícones menores que 32px podem usar pixels fixos para manter clareza visual.

### 3. Bordas Finas

Bordas de 1-2px mantêm pixels para consistência visual.

## 🔧 Sistema JavaScript de Redimensionamento

### CResponsiveLayout Class

```javascript
var s_oResponsiveLayout = new CResponsiveLayout();
s_oResponsiveLayout.init();
```

#### Principais Métodos

##### `resize()`
Redimensiona o canvas mantendo proporção e centralização via CSS.

```javascript
this.resize = function() {
    // Obtém dimensões da viewport
    var viewportWidth = this._getViewportWidth();
    var viewportHeight = this._getViewportHeight();
    
    // Calcula escala mantendo aspect ratio
    var scale = Math.min(
        viewportWidth / CANVAS_WIDTH,
        viewportHeight / CANVAS_HEIGHT
    );
    
    // Aplica dimensões via CSS
    canvas.style.width = canvasWidth + 'px';
    canvas.style.height = canvasHeight + 'px';
    
    // CSS transform: translate(-50%, -50%) centraliza automaticamente
}
```

##### `getInfo()`
Retorna informações do layout atual para debugging.

```javascript
var info = s_oResponsiveLayout.getInfo();
console.log(info);
// {
//     canvasWidth: 1280,
//     canvasHeight: 768,
//     scale: 0.85,
//     offsetX: 0,
//     offsetY: 0,
//     isMobile: false,
//     isHighDPI: true
// }
```

### ResponsiveUtils

Utilitários adicionais para trabalhar com coordenadas:

```javascript
// Converte coordenadas da tela para canvas
var canvasPos = ResponsiveUtils.screenToCanvas(screenX, screenY);

// Converte coordenadas do canvas para tela
var screenPos = ResponsiveUtils.canvasToScreen(canvasX, canvasY);

// Obtém tamanho da ficha baseado no breakpoint atual
var fichaSize = ResponsiveUtils.getFichaSize(); // 40, 50 ou 60

// Obtém informações do breakpoint atual
var breakpoint = ResponsiveUtils.getCurrentBreakpoint();
console.log(breakpoint.name); // "mobile", "tablet", "desktop", etc
```

## 📱 Suporte Mobile

### Orientação

O sistema detecta automaticamente a orientação e ajusta o layout:

```javascript
this._checkOrientation = function(width, height) {
    var isLandscape = width > height;
    var isPortrait = height > width;
    
    // Mostra mensagem se orientação incorreta
    if (requiredOrientation === 'landscape' && !isLandscape) {
        orientationContainer.style.display = 'flex';
        s_oMain.stopUpdate(); // Pausa o jogo
    }
}
```

### Touch Events

- CreateJS Touch habilitado automaticamente em dispositivos móveis
- Sem `user-select` para prevenir seleção de texto acidental
- Gestão adequada de eventos touch

### iOS Específico

- Tratamento especial para altura da viewport no iOS
- Suporte para telas Retina (device pixel ratio)
- Compatibilidade com iPhone X+ (safe areas)

## 🎨 Classes Utilitárias

### Layout

```css
.flex-container       /* Container flex básico */
.flex-row             /* Flex direction: row */
.flex-column          /* Flex direction: column */
.flex-center          /* Centraliza conteúdo */
.flex-between         /* Justifica com espaço entre */
.flex-around          /* Justifica com espaço ao redor */
```

### Tipografia

```css
.text-center          /* Texto centralizado */
.text-left            /* Texto à esquerda */
.text-right           /* Texto à direita */
```

### Visibilidade

```css
.hidden-mobile        /* Oculto em mobile */
.hidden-desktop       /* Oculto em desktop */
.sr-only              /* Screen reader only */
```

### Dimensões

```css
.full-width           /* width: 100% */
.max-width            /* max-width: 100% */
.margin-auto          /* margin auto horizontal */
```

## ♿ Acessibilidade

### Preferência de Movimento Reduzido

```css
@media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
        animation-duration: 0.01ms !important;
        transition-duration: 0.01ms !important;
    }
}
```

### Suporte a Leitores de Tela

```css
.sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
}
```

## 🖥️ Suporte High DPI (Retina)

### CSS

```css
@media (-webkit-min-device-pixel-ratio: 2),
       (min-resolution: 192dpi) {
    canvas {
        image-rendering: -webkit-optimize-contrast;
        image-rendering: crisp-edges;
    }
}
```

### JavaScript

```javascript
this._handleHighDPI = function(canvasWidth, canvasHeight, scale) {
    if (window.devicePixelRatio > 1) {
        var dpr = window.devicePixelRatio || 2;
        s_oStage.canvas.width = canvasWidth * dpr;
        s_oStage.canvas.height = canvasHeight * dpr;
        s_oStage.scaleX = s_oStage.scaleY = scale * dpr;
    }
}
```

## 🔍 Debugging

### Console Logs

O sistema fornece logs informativos:

```
✅ Sistema de layout responsivo inicializado
🔄 Layout redimensionado: {
    viewport: 1920x1080
    canvas: 1280x768
    scale: 0.711
}
```

### Obter Informações do Layout

```javascript
// No console do navegador
var info = s_oResponsiveLayout.getInfo();
console.table(info);

var breakpoint = ResponsiveUtils.getCurrentBreakpoint();
console.log('Breakpoint atual:', breakpoint.name);

var fichaSize = ResponsiveUtils.getFichaSize();
console.log('Tamanho da ficha:', fichaSize + 'px');
```

## 📊 Performance

### Otimizações Implementadas

1. **Debounce de Resize**: Evita múltiplas execuções durante redimensionamento
   ```javascript
   var _resizeTimeout = null;
   window.addEventListener('resize', function() {
       if (_resizeTimeout) clearTimeout(_resizeTimeout);
       _resizeTimeout = setTimeout(function() {
           s_oResponsiveLayout.resize();
       }, 100);
   });
   ```

2. **CSS Transform**: Usa GPU para centralização
   ```css
   #canvas {
       transform: translate(-50%, -50%);
       /* Hardware accelerated */
   }
   ```

3. **Will-change**: Otimiza animações
   ```css
   .ficha {
       will-change: transform;
   }
   ```

## 🧪 Testes

### Testar em Diferentes Dispositivos

```javascript
// Simular mobile
ResponsiveUtils.getCurrentBreakpoint(); // {name: 'mobile', ...}

// Simular tablet
ResponsiveUtils.getCurrentBreakpoint(); // {name: 'tablet', ...}

// Testar conversão de coordenadas
var canvas = ResponsiveUtils.screenToCanvas(100, 100);
var screen = ResponsiveUtils.canvasToScreen(canvas.x, canvas.y);
console.assert(screen.x === 100 && screen.y === 100);
```

### DevTools

Use Chrome DevTools para testar:

1. Abra DevTools (F12)
2. Toggle Device Toolbar (Ctrl+Shift+M)
3. Teste diferentes dispositivos e orientações
4. Teste com "Responsive" para dimensões personalizadas

## 📝 Exemplos de Uso

### Exemplo 1: Criar Painel Responsivo

```html
<div class="info-panel">
    <div class="info-panel-header">Placar</div>
    <div class="info-panel-content">
        <div class="info-row">
            <span class="info-label">Pontos:</span>
            <span class="info-value">1000</span>
        </div>
    </div>
</div>
```

### Exemplo 2: Layout de Fichas

```html
<div class="ficha-container">
    <div class="ficha" data-value="10"></div>
    <div class="ficha" data-value="25"></div>
    <div class="ficha" data-value="50"></div>
</div>
```

### Exemplo 3: Botão Responsivo

```html
<button class="btn btn-primary">
    Fazer Aposta
</button>
```

## 🚀 Melhorias Futuras

- [ ] Suporte para themes (dark mode)
- [ ] Animações mais fluidas com `framer-motion` ou similar
- [ ] PWA com service workers
- [ ] Layout otimizado para tablets em landscape
- [ ] Suporte para multi-idiomas com i18n
- [ ] Melhoria de performance com lazy loading de sprites

## 📚 Referências

- [CSS Grid Layout - MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Grid_Layout)
- [Flexbox - MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Flexible_Box_Layout)
- [CSS Custom Properties - MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties)
- [clamp() - MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/clamp)
- [CreateJS Documentation](https://createjs.com/docs/easeljs/modules/EaselJS.html)

## 🤝 Contribuindo

Ao fazer modificações no sistema de layout:

1. **Sempre use unidades relativas** (%, vw, vh, rem, clamp) exceto para fichas
2. **Teste em múltiplos dispositivos** antes de commitar
3. **Mantenha a documentação atualizada**
4. **Use as variáveis CSS** existentes em vez de valores hardcoded
5. **Siga o padrão BEM** para nomenclatura de classes CSS

## ✅ Checklist de Implementação

- [x] Criado sistema CSS responsivo com variáveis
- [x] Implementados containers centralizados
- [x] Adicionado Grid layout para interface
- [x] Implementado Flexbox para componentes
- [x] Configurados breakpoints mobile/tablet/desktop
- [x] Criado sistema JavaScript de redimensionamento
- [x] Adicionados utilitários de conversão de coordenadas
- [x] Implementado suporte para orientação
- [x] Otimizado para telas Retina/High DPI
- [x] Adicionada acessibilidade (reduced motion, sr-only)
- [x] Documentação completa criada

---

**Versão**: 1.0.0  
**Data**: Dezembro 2025  
**Autor**: Sistema de Layout Responsivo para Jogo de Dados
