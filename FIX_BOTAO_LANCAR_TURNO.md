# Correção: Botão de Lançar Indisponível para Outros Jogadores

## Problema Identificado

Quando um jogador lançava os dados, o botão de lançar ficava indisponível para os outros jogadores mesmo após o término da jogada e mudança de turno. Isso impedia que os outros jogadores pudessem jogar quando chegasse a vez deles.

## Causa Raiz

O problema estava relacionado a três questões principais:

1. **Flag `_bIsMyTurn` não atualizada**: Quando o servidor emitia o evento `shooter_changed` (mudança de atirador), a flag `_bIsMyTurn` no cliente não estava sendo atualizada corretamente para `true` no jogador que recebia o turno.

2. **Flag `_isRolling` travada**: A flag `_isRolling` poderia ficar travada em `true` após o lançamento, impedindo novos lançamentos.

3. **Falta de handler para mudança de turno**: Não havia um método adequado no `CGame.js` para processar as mudanças de turno vindas do servidor.

## Solução Implementada

### 1. Adicionado método `onTurnChange` no CGame.js

**Arquivo**: `/workspace/game/js/CGame.js`

Adicionado um novo método público `onTurnChange()` que permite que o sistema Socket.IO atualize corretamente a flag `_bIsMyTurn`:

```javascript
// Handler for turn changes (called by Socket.IO integration)
this.onTurnChange = function(data){
    console.log('🔄 Turn change received:', data);
    
    const isMyTurn = data.isMyTurn;
    const playerId = data.playerId || null;
    
    // UPDATE TURN FLAG
    _bIsMyTurn = isMyTurn;
    
    // Only allow rolling if it's my turn AND there's an active bet
    const canRoll = isMyTurn && _oMySeat.getCurBet() > 0;
    _oInterface.enableRoll(canRoll);
    
    console.log(`✅ Turn updated - isMyTurn: ${isMyTurn}, canRoll: ${canRoll}`);
    
    // Show clear feedback about turn status
    if (isMyTurn) {
        if (_oMySeat.getCurBet() > 0) {
            console.log("🎲 É sua vez e você tem apostas - botão de lançar habilitado!");
        } else {
            console.log("⚠️ É sua vez mas você precisa fazer uma aposta primeiro!");
        }
    } else {
        console.log("⏳ Não é sua vez - aguarde...");
    }
};
```

### 2. Melhorado handler `onShooterChanged` no game-socketio-integration.js

**Arquivo**: `/workspace/game/js/game-socketio-integration.js`

O handler do evento `shooter_changed` foi aprimorado para:

- Chamar o novo método `onTurnChange()` quando o turno muda
- Resetar a flag `_isRolling` para garantir que o próximo jogador possa jogar
- Habilitar/desabilitar o botão de lançar corretamente
- Mostrar mensagens claras sobre o status do turno

```javascript
// Handle shooter changed
gameClient.onShooterChanged((data) => {
    console.log('🔄 Atirador mudou para:', data.shooterName);
    const isMyTurn = data.newShooter === gameClient.currentUserId;
    
    // CRITICAL FIX: Update _bIsMyTurn flag when shooter changes
    if (window.s_oGame) {
        // Call the turn change handler to update internal state
        if (window.s_oGame.onTurnChange) {
            window.s_oGame.onTurnChange({ 
                isMyTurn: isMyTurn,
                playerId: data.newShooter 
            });
        }
        
        // Reset rolling flag to ensure clean state for next turn
        if (window.s_oGame._isRolling) {
            console.log('🔄 Resetting _isRolling flag on shooter change');
            window.s_oGame._isRolling = false;
        }
    }
    
    // Show notification and feedback...
});
```

### 3. Adicionado auto-reset da flag `_isRolling`

Para garantir que a flag `_isRolling` não fique travada, foram adicionados múltiplos pontos de reset:

- Após o resultado dos dados ser processado (3,5 segundos)
- Após o resultado do jogo ser exibido (1 segundo)
- Quando o turno muda para outro jogador

### 4. Melhorado logging no servidor

**Arquivo**: `/workspace/server.js`

Adicionado logging detalhado na função `passShooter()` para facilitar debugging:

```javascript
function passShooter(roomId) {
    // ...código existente...
    
    console.log(`🔄 Passing shooter from ${gameState.currentShooter} to ${nextShooterId} in room ${roomId}`);
    
    // Notify room
    io.to(`room_${roomId}`).emit('shooter_changed', {
        newShooter: nextShooterId,
        shooterName: newShooter ? newShooter.username : 'Unknown'
    });
    
    console.log(`✅ Shooter changed event emitted to room ${roomId} - new shooter: ${newShooter ? newShooter.username : 'Unknown'}`);
}
```

## Fluxo Corrigido

### Quando um jogador lança os dados:

1. Jogador A clica no botão de lançar
2. `_bIsMyTurn` é definido como `false` para Jogador A
3. `_isRolling` é definido como `true` para Jogador A
4. Dados são lançados e animação é exibida
5. Resultado é processado no servidor
6. Se jogador perdeu, servidor chama `passShooter()`

### Quando o turno passa para o próximo jogador:

1. Servidor emite evento `shooter_changed` com `newShooter: jogadorB_id`
2. Todos os clientes recebem o evento
3. Jogador B identifica que é seu turno (`isMyTurn = true`)
4. Jogador B chama `onTurnChange({ isMyTurn: true })`
5. `_bIsMyTurn` é atualizado para `true` no Jogador B
6. `_isRolling` é resetado para `false`
7. Botão de lançar é habilitado para Jogador B (se houver aposta)
8. Jogador B pode agora lançar os dados

### Para outros jogadores (observadores):

1. Recebem evento `shooter_changed`
2. Identificam que NÃO é seu turno (`isMyTurn = false`)
3. `_bIsMyTurn` é definido como `false`
4. Botão de lançar é desabilitado
5. Veem mensagem "Jogador X é o atirador agora"

## Arquivos Modificados

1. `/workspace/game/js/CGame.js`
   - Adicionado método `onTurnChange()`

2. `/workspace/game/js/game-socketio-integration.js`
   - Melhorado handler `onShooterChanged()`
   - Adicionado auto-reset de `_isRolling` em múltiplos pontos
   - Melhorado handler `onGameResult()`

3. `/workspace/server.js`
   - Melhorado logging na função `passShooter()`

## Teste da Correção

Para testar se a correção está funcionando:

1. Abra o jogo em duas abas/navegadores diferentes
2. Faça login com dois jogadores diferentes
3. Entre na mesma sala
4. Jogador 1 faz uma aposta e lança os dados
5. Espere até o jogador perder (craps ou seven out)
6. O turno deve passar automaticamente para o Jogador 2
7. Jogador 2 deve ver:
   - Mensagem "É SUA VEZ DE ROLAR!"
   - Botão de lançar HABILITADO (se houver aposta)
   - Possibilidade de clicar e lançar os dados
8. Jogador 1 deve ver:
   - Mensagem "Jogador 2 é o atirador agora"
   - Botão de lançar DESABILITADO

## Logs para Monitoramento

Os seguintes logs podem ser usados para monitorar o funcionamento correto:

### No Cliente:
- `🔄 Atirador mudou para: [nome]`
- `✅ Atualizando turno via onTurnChange handler`
- `🔄 É meu turno? [true/false]`
- `✅ Turn updated - isMyTurn: [true/false], canRoll: [true/false]`
- `🔄 Resetting _isRolling flag on shooter change`

### No Servidor:
- `🔄 Passing shooter from [id1] to [id2] in room [roomId]`
- `✅ Shooter changed event emitted to room [roomId] - new shooter: [nome]`

## Prevenção de Problemas Futuros

Para evitar que o botão fique travado no futuro:

1. Sempre resetar `_isRolling` após conclusão de animação
2. Sempre chamar `onTurnChange()` quando o servidor notificar mudança de turno
3. Sempre verificar `_bIsMyTurn` antes de permitir lançamento
4. Adicionar timeouts de segurança para auto-reset de flags

## Observações

- O sistema agora é mais robusto e não depende apenas de uma única flag
- Múltiplos pontos de reset garantem que o sistema se recupere de estados inconsistentes
- Logging detalhado facilita debugging de problemas futuros
- A separação entre `_isRolling` (animação em andamento) e `_bIsMyTurn` (controle de turno) está mais clara
