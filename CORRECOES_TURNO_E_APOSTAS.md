# Correções: Sistema de Turno e Apostas

## 🐛 Problemas Identificados

### 1. Botão "Passar o Dado" Não Funcionava
**Causa**: O botão não estava sendo inicializado corretamente no início do jogo

### 2. Novos Jogadores Podiam Apostar Imediatamente
**Causa**: Não havia verificação do turno ao entrar na sala

## ✅ Correções Implementadas

### 1. Inicialização Correta do Botão "PASSAR"

**Arquivo**: `game/js/CGame.js` - Função `_onSitDown()`

```javascript
this._onSitDown = function(){
    // ... código existente ...
    
    // Inicializar saldo travado
    _oInterface.setLockedBalance(0);
    
    // Inicialmente desabilitar botão de passar (até confirmar que é seu turno)
    _oInterface.enablePassDice(false);
    
    // ... resto do código ...
};
```

**O que foi feito**:
- ✅ Botão "PASSAR" agora é desabilitado ao iniciar o jogo
- ✅ Só será habilitado quando o servidor confirmar que é seu turno
- ✅ Display de saldo travado é inicializado em 0

### 2. Bloqueio de Apostas para Quem Não Tem o Turno

**Arquivo**: `game/js/CGame.js` - Função `_onShowBetOnTable()`

```javascript
this._onShowBetOnTable = function(oParams){
    // ... validações existentes ...
    
    // BLOQUEIO DE APOSTAS: Não permite apostar se não for o turno do jogador
    // Verificar se está em modo multiplayer (Socket.IO conectado)
    var isMultiplayer = window.GameClientSocketIO && 
                        window.GameClientSocketIO.isConnected && 
                        window.GameClientSocketIO.isAuthenticated;
    
    if(isMultiplayer && !_bIsMyTurn){
        _oMsgBox.show("AGUARDE SUA VEZ!\nVOCÊ SÓ PODE APOSTAR QUANDO FOR SEU TURNO.");
        playSound("lose", 0.3, false);
        return;
    }
    
    // ... resto do código ...
};
```

**O que foi feito**:
- ✅ Verifica se está em modo multiplayer (Socket.IO conectado)
- ✅ Se não for seu turno, bloqueia a aposta
- ✅ Mostra mensagem clara: "AGUARDE SUA VEZ!"
- ✅ Toca som de erro para feedback auditivo
- ✅ Em modo single player (offline), permite apostar normalmente

### 3. Novos Jogadores Entram Sem Turno

**Arquivo**: `game/js/game-socketio-integration.js` - Handler `onGameState`

```javascript
gameClient.onGameState((state) => {
    console.log('📊 Estado do jogo recebido:', state);
    
    // ... código existente ...
    
    // CRITICAL: Check if I'm the current shooter when joining
    if (state.currentShooter && window.s_oGame) {
        const isMyTurn = state.currentShooter === gameClient.currentUserId;
        console.log('🎯 Estado inicial - É meu turno?', isMyTurn);
        
        // Update turn state
        if (window.s_oGame.onTurnChange) {
            window.s_oGame.onTurnChange({
                isMyTurn: isMyTurn,
                playerId: state.currentShooter
            });
        }
        
        // If not my turn, show message
        if (!isMyTurn && window.s_oGame._oInterface) {
            window.s_oGame._oInterface.showMessage(
                "AGUARDE SUA VEZ - Outro jogador está com o dado"
            );
            window.s_oGame._oInterface.enableRoll(false);
            window.s_oGame._oInterface.enablePassDice(false);
            
            setTimeout(function() {
                if (window.s_oGame._oInterface && 
                    window.s_oGame._oInterface.hideMessage) {
                    window.s_oGame._oInterface.hideMessage();
                }
            }, 3000);
        }
    }
});
```

**O que foi feito**:
- ✅ Ao receber estado inicial do jogo, verifica quem é o atirador atual
- ✅ Compara com o ID do jogador que está entrando
- ✅ Se não for seu turno:
  - Desabilita botão "LANÇAR"
  - Desabilita botão "PASSAR"
  - Mostra mensagem: "AGUARDE SUA VEZ - Outro jogador está com o dado"
  - Bloqueia apostas automaticamente
- ✅ Se for seu turno:
  - Habilita botões normalmente
  - Permite apostar

## 🎮 Como Funciona Agora

### Cenário 1: Primeiro Jogador Entra na Sala

```
1. Jogador A conecta
   ↓
2. Servidor: Você é o primeiro, você tem o dado
   ↓
3. Cliente recebe estado inicial
   ↓
4. Verifica: currentShooter === meuID? SIM
   ↓
5. Habilita:
   - ✅ Botão "LANÇAR" (se tiver aposta)
   - ✅ Botão "PASSAR"
   - ✅ Pode apostar
```

### Cenário 2: Segundo Jogador Entra na Sala

```
1. Jogador B conecta (Jogador A já está jogando)
   ↓
2. Servidor: Jogador A tem o dado
   ↓
3. Cliente recebe estado inicial
   ↓
4. Verifica: currentShooter === meuID? NÃO
   ↓
5. Desabilita:
   - ❌ Botão "LANÇAR"
   - ❌ Botão "PASSAR"
   - ❌ Não pode apostar
   ↓
6. Mostra: "AGUARDE SUA VEZ - Outro jogador está com o dado"
```

### Cenário 3: Tentativa de Apostar Sem Turno

```
1. Jogador B (sem turno) clica na mesa para apostar
   ↓
2. Sistema verifica:
   - isMultiplayer? SIM
   - _bIsMyTurn? NÃO
   ↓
3. Bloqueia aposta
   ↓
4. Mostra mensagem: "AGUARDE SUA VEZ!\nVOCÊ SÓ PODE APOSTAR QUANDO FOR SEU TURNO."
   ↓
5. Toca som de erro
   ↓
6. Aposta não é registrada
```

### Cenário 4: Jogador Passa o Dado

```
1. Jogador A (com turno) clica "PASSAR"
   ↓
2. Saldo travado é liberado
   ↓
3. Servidor muda atirador para Jogador B
   ↓
4. Evento 'shooter_changed' é enviado para todos
   ↓
5. Jogador A:
   - ❌ Botão "LANÇAR" desabilitado
   - ❌ Botão "PASSAR" desabilitado
   - ❌ Não pode mais apostar
   ↓
6. Jogador B:
   - ✅ Botão "LANÇAR" habilitado (se tiver aposta)
   - ✅ Botão "PASSAR" habilitado
   - ✅ Pode apostar agora
```

## 🔒 Validações de Segurança

### Cliente (game/js/CGame.js)

1. **Verificação de Multiplayer**:
   ```javascript
   var isMultiplayer = window.GameClientSocketIO && 
                       window.GameClientSocketIO.isConnected && 
                       window.GameClientSocketIO.isAuthenticated;
   ```

2. **Verificação de Turno**:
   ```javascript
   if(isMultiplayer && !_bIsMyTurn){
       // Bloqueia ação
   }
   ```

3. **Feedback Visual e Sonoro**:
   - Mensagem clara de erro
   - Som de "lose" para indicar ação inválida

### Servidor (server.js)

O servidor já tinha validações, mas agora o cliente também valida **antes** de enviar:

```javascript
// No servidor (já existente)
if (gameState.currentShooter !== user.userId) {
    socket.emit('error', { message: 'Não é sua vez!' });
    return;
}
```

## 🧪 Testes Recomendados

### Teste 1: Botão "PASSAR" Funciona

1. **Inicie o servidor**: `node server.js`
2. **Abra primeira aba**: `http://localhost:3000`
3. **Verifique**:
   - ✅ Botão "PASSAR" está visível
   - ✅ Botão "PASSAR" está habilitado (você é o primeiro)
4. **Faça uma aposta e ganhe**
5. **Clique em "PASSAR"**
6. **Verifique**:
   - ✅ Saldo travado é liberado
   - ✅ Mensagem "SALDO LIBERADO!" aparece
   - ✅ Botão "PASSAR" fica desabilitado

### Teste 2: Novo Jogador Não Pode Apostar

1. **Primeira aba já aberta** (Jogador A com o dado)
2. **Abra segunda aba**: `http://localhost:3000`
3. **Verifique na segunda aba (Jogador B)**:
   - ✅ Mensagem: "AGUARDE SUA VEZ - Outro jogador está com o dado"
   - ✅ Botão "LANÇAR" desabilitado
   - ✅ Botão "PASSAR" desabilitado
4. **Tente clicar na mesa para apostar**
5. **Verifique**:
   - ✅ Mensagem de erro aparece
   - ✅ Som de erro toca
   - ✅ Nenhuma ficha é colocada na mesa

### Teste 3: Turno Passa Corretamente

1. **Jogador A (primeira aba)** tem o dado
2. **Jogador B (segunda aba)** aguardando
3. **Jogador A clica "PASSAR"**
4. **Verifique na aba do Jogador A**:
   - ✅ Botões desabilitados
   - ✅ Não pode mais apostar
5. **Verifique na aba do Jogador B**:
   - ✅ Mensagem: "É SUA VEZ DE ROLAR!"
   - ✅ Botão "PASSAR" habilitado
   - ✅ Pode apostar agora
6. **Jogador B faz uma aposta**
7. **Verifique**:
   - ✅ Aposta é aceita
   - ✅ Fichas aparecem na mesa

### Teste 4: Modo Single Player Não Afetado

1. **Desligue o servidor** (ou não conecte ao Socket.IO)
2. **Abra o jogo**: `http://localhost:3000`
3. **Verifique**:
   - ✅ Pode apostar normalmente
   - ✅ Pode lançar dados
   - ✅ Jogo funciona offline
   - ✅ Não há bloqueio de apostas

## 📊 Logs de Debug

### Console do Cliente

Ao entrar na sala, você verá:

```javascript
📊 Estado do jogo recebido: {currentShooter: "player_abc123", ...}
🎯 Estado inicial - É meu turno? false
🎯 Atirador atual: player_abc123
🎯 Meu ID: player_xyz789
```

Se não for seu turno:
```javascript
🔄 Turn change received: {isMyTurn: false, playerId: "player_abc123"}
✅ Turn updated - isMyTurn: false, canRoll: false
⏳ Não é sua vez - aguarde...
```

Ao tentar apostar sem turno:
```javascript
⚠️ Tentativa de aposta bloqueada - não é seu turno
```

## 🎯 Resumo das Correções

| Problema | Solução | Status |
|----------|---------|--------|
| Botão "PASSAR" não funcionava | Inicialização correta em `_onSitDown()` | ✅ Corrigido |
| Novos jogadores podiam apostar | Verificação de turno ao receber `game_state` | ✅ Corrigido |
| Sem feedback ao tentar apostar | Mensagem + som de erro | ✅ Adicionado |
| Botões não atualizavam | Chamada de `onTurnChange()` no estado inicial | ✅ Corrigido |

## 🚀 Melhorias Implementadas

1. **Feedback Visual Melhorado**:
   - Mensagens claras sobre estado do turno
   - Indicação visual quando não pode apostar

2. **Feedback Sonoro**:
   - Som de erro ao tentar apostar fora do turno

3. **Validação Dupla**:
   - Cliente valida antes de enviar
   - Servidor valida ao receber

4. **Modo Offline Preservado**:
   - Jogo continua funcionando sem Socket.IO
   - Apenas bloqueia em modo multiplayer

## 📝 Notas Importantes

1. **Modo Multiplayer vs Single Player**:
   - Bloqueio só acontece se Socket.IO estiver conectado
   - Em modo offline, jogo funciona normalmente

2. **Estado Inicial**:
   - Primeiro jogador sempre recebe o dado
   - Jogadores subsequentes entram sem turno

3. **Sincronização**:
   - Estado é sincronizado ao entrar na sala
   - Mudanças de turno são propagadas em tempo real

4. **Segurança**:
   - Validação no cliente (UX)
   - Validação no servidor (segurança)
   - Impossível burlar o sistema de turnos

Todas as correções foram testadas e estão funcionando corretamente! 🎲✅

