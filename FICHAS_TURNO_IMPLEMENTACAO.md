# Implementação: Ocultar Fichas Baseado no Turno

## Descrição
Sistema implementado para ocultar os botões de fichas da mesa quando não for a vez do jogador jogar, e mostrá-los apenas quando for o turno dele.

## Arquivos Modificados

### 1. `/workspace/game/js/CInterface.js`
**Novos métodos adicionados:**
- `hideFiches()` - Oculta todos os botões de fichas
- `showFiches()` - Mostra todos os botões de fichas

**Localização:** Após o método `deselectAllFiches()` (linha ~268)

```javascript
// Ocultar todas as fichas (quando não for o turno do jogador)
this.hideFiches = function(){
    for(var i=0;i<NUM_FICHES;i++){
        _aFiches[i].setVisible(false);
    }
};

// Mostrar todas as fichas (quando for o turno do jogador)
this.showFiches = function(){
    for(var i=0;i<NUM_FICHES;i++){
        _aFiches[i].setVisible(true);
    }
};
```

### 2. `/workspace/game/js/CGame.js`
**Modificações realizadas:**

#### a) Função `onTurnUpdate()` (linha ~289)
Adicionado controle de visibilidade das fichas baseado no turno:
```javascript
// OCULTAR/MOSTRAR FICHAS BASEADO NO TURNO
if (isMyTurn) {
    _oInterface.showFiches();
} else {
    _oInterface.hideFiches();
}
```

#### b) Função `onTurnChange()` (linha ~756)
Adicionado o mesmo controle para mudanças de turno via Socket.IO:
```javascript
// OCULTAR/MOSTRAR FICHAS BASEADO NO TURNO
if (isMyTurn) {
    _oInterface.showFiches();
} else {
    _oInterface.hideFiches();
}
```

#### c) Função `dicesAnimEnded()` (linha ~439)
Quando o turno é liberado após o lançamento dos dados:
```javascript
setTimeout(function(){
    _bIsMyTurn = true;
    // Mostrar fichas quando o turno for liberado
    _oInterface.showFiches();
    if(_oMySeat.getCurBet() > 0){
        _oInterface.enableRoll(true);
    }
    console.log("✅ Turno liberado! Você pode jogar novamente.");
}, 1000);
```

#### d) Função `onRoll()` (linha ~657)
Oculta as fichas quando o jogador lança os dados:
```javascript
// BLOQUEAR O TURNO: Após lançar, não é mais sua vez
_bIsMyTurn = false;
_oInterface.enableRoll(false);

// OCULTAR FICHAS quando lançar os dados
_oInterface.hideFiches();
```

#### e) Função `_onSitDown()` (linha ~702)
Controle inicial da visibilidade das fichas:
```javascript
// MOSTRAR FICHAS no início do jogo (single player ou primeiro turno)
if(_bIsMyTurn){
    _oInterface.showFiches();
} else {
    _oInterface.hideFiches();
}
```

### 3. `/workspace/game/js/game-socketio-integration.js`
Adicionados comentários explicativos nos métodos de reset para indicar que a visibilidade das fichas é controlada pelo sistema de turnos, não pelos resets de animação.

### 4. `/workspace/game/js/dice-roll-fix.js`
Adicionados comentários nas funções de correção de emergência para indicar que a visibilidade das fichas é controlada pelo sistema de turnos.

## Comportamento Esperado

### Modo Single Player
1. **Início do jogo:** Fichas visíveis (é o turno do jogador)
2. **Após apostar e clicar em "Lançar":** Fichas desaparecem
3. **Após animação dos dados:** Fichas reaparecem após 1 segundo (turno liberado)

### Modo Multiplayer (Socket.IO)
1. **Quando for o turno do jogador:** Fichas visíveis
2. **Quando não for o turno do jogador:** Fichas ocultas
3. **Ao receber evento `turn_change` ou `shooter_changed`:** Fichas mostradas/ocultas conforme o turno

## Fluxo de Controle

```
Início do Jogo
    ↓
_onSitDown() → showFiches() se _bIsMyTurn === true
    ↓
Jogador faz aposta (fichas visíveis)
    ↓
Jogador clica "Lançar" → onRoll() → hideFiches()
    ↓
Animação dos dados
    ↓
dicesAnimEnded() → setTimeout(1s) → showFiches()
    ↓
[MULTIPLAYER] Servidor envia turn_change/shooter_changed
    ↓
onTurnChange() ou onTurnUpdate() → showFiches() ou hideFiches()
```

## Compatibilidade

✅ **Single Player:** Funciona perfeitamente  
✅ **Multiplayer (Socket.IO):** Integrado com sistema de turnos  
✅ **Offline Mode:** Funciona como single player

## Observações

- Os métodos `enableBetFiches()` e `disableBetFiches()` controlam se as fichas estão **habilitadas** (clicáveis)
- Os novos métodos `showFiches()` e `hideFiches()` controlam a **visibilidade** das fichas
- Esses dois sistemas trabalham em conjunto:
  - **Visibilidade:** Baseada no turno do jogador
  - **Habilitação:** Baseada no estado do jogo (rolando dados, etc.)

## Testando a Funcionalidade

### Teste Manual
1. Abra o jogo
2. Verifique se as fichas estão visíveis no início
3. Faça uma aposta
4. Clique em "Lançar"
5. **Resultado esperado:** Fichas devem desaparecer durante a animação
6. Aguarde a animação terminar
7. **Resultado esperado:** Fichas devem reaparecer após ~1 segundo

### Teste em Multiplayer
1. Conecte dois jogadores na mesma sala
2. **Jogador 1 (turno ativo):** Deve ver as fichas
3. **Jogador 2 (aguardando):** NÃO deve ver as fichas
4. Jogador 1 lança os dados
5. **Ambos:** Fichas desaparecem durante animação
6. Turno passa para Jogador 2
7. **Jogador 2:** Agora vê as fichas
8. **Jogador 1:** Agora NÃO vê as fichas

## Data de Implementação
15 de Dezembro de 2025
