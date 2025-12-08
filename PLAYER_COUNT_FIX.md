# Correção: Contagem de Jogadores na Sala

## Problema
Ao abrir o jogo em dois dispositivos, o número de jogadores na sala não mudava para 2, ficando em 1 em ambos os dispositivos.

## Causa Raiz
O servidor Socket.IO estava emitindo corretamente o evento `players_updated` quando jogadores entravam na sala, mas o cliente não estava processando essa informação para atualizar a interface do usuário.

No arquivo `game-socketio-integration.js`, o handler `onPlayersUpdated` apenas registrava a informação no console mas não chamava o método `updateRoomInfo` da interface para atualizar a contagem visualmente.

## Solução Implementada

### Alterações em `game/js/game-socketio-integration.js`

#### 1. Handler `onPlayersUpdated` atualizado (linhas ~384-396)
```javascript
// Handle players updated
gameClient.onPlayersUpdated((players) => {
    console.log('👥 Players in room:', players.length, players);
    
    // Update player count in UI
    if (window.s_oInterface && window.s_oInterface.updateRoomInfo) {
        const currentRoom = gameClient.currentRoomId || 'table1';
        const roomType = 'bronze'; // Default room type, adjust if you have room selection
        window.s_oInterface.updateRoomInfo(roomType, players.length);
        console.log('✅ Updated player count in UI:', players.length);
    }
});
```

#### 2. Novo handler `onGameState` adicionado (linhas ~398-409)
```javascript
// Handle game state (initial state when joining)
gameClient.onGameState((state) => {
    console.log('📊 Game state received:', state);
    
    // Update player count from initial state
    if (state.players && window.s_oInterface && window.s_oInterface.updateRoomInfo) {
        const playerCount = Array.isArray(state.players) ? state.players.length : 0;
        const roomType = 'bronze'; // Default room type
        window.s_oInterface.updateRoomInfo(roomType, playerCount);
        console.log('✅ Updated player count from game state:', playerCount);
    }
});
```

## Fluxo Corrigido

### Quando Jogador 1 conecta:
1. Servidor adiciona jogador à sala (players.size = 1)
2. Servidor emite `game_state` com 1 jogador
3. Servidor emite `players_updated` para todos na sala (apenas Jogador 1)
4. Cliente 1 recebe os eventos e atualiza UI: **"JOGADORES: 1/8"**

### Quando Jogador 2 conecta:
1. Servidor adiciona jogador à sala (players.size = 2)
2. Servidor emite `game_state` para Jogador 2 com 2 jogadores
3. Servidor emite `players_updated` para **TODOS** na sala (Jogador 1 e 2)
4. **AMBOS** os clientes recebem o evento e atualizam UI: **"JOGADORES: 2/8"**

## Teste da Correção

Para testar:
1. Abra o jogo em um navegador/dispositivo
2. Verifique que mostra "JOGADORES: 1/8" (ou o máximo configurado)
3. Abra o jogo em outro navegador/dispositivo (mesma sala)
4. **AMBOS** devem atualizar automaticamente para "JOGADORES: 2/8"

## Arquivos Modificados
- `game/js/game-socketio-integration.js` - Adicionados handlers para atualizar UI quando jogadores entram/saem

## Arquivos Relacionados (não modificados)
- `server.js` - Já estava funcionando corretamente (linhas 154-156)
- `game/js/CInterface.js` - Método `updateRoomInfo` já existia (linha 350)
- `game/js/game-client-socketio.js` - Já recebia os eventos corretamente

## Status
✅ **CORRIGIDO** - A contagem de jogadores agora sincroniza corretamente em todos os dispositivos conectados à mesma sala.
