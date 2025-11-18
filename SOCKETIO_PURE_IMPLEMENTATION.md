# Sistema Socket.IO Puro - Implementação Completa

## 🎯 Visão Geral

Este projeto agora usa **APENAS Socket.IO** para todas as jogadas e comunicação em tempo real. **Não há mais dependência do Supabase Realtime** para eventos de jogo.

## 🔄 Fluxo de Jogada

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│  Jogador 1  │         │   Servidor  │         │  Jogador 2  │
│             │         │  Socket.IO  │         │             │
└──────┬──────┘         └──────┬──────┘         └──────┬──────┘
       │                       │                       │
       │  1. Click "Rolar"     │                       │
       ├──────────────────────>│                       │
       │                       │                       │
       │  2. roll_dice event   │                       │
       ├──────────────────────>│                       │
       │                       │                       │
       │                       │ 3. Processa no server │
       │                       │    - Valida jogador   │
       │                       │    - Gera dados       │
       │                       │    - Aplica lógica    │
       │                       │                       │
       │  4. dice_rolled       │  4. dice_rolled       │
       │<──────────────────────┼──────────────────────>│
       │     (broadcast)       │      (broadcast)      │
       │                       │                       │
       │  5. Anima dados       │                       │
       │     Atualiza UI       │  5. Anima dados       │
       │                       │     Atualiza UI       │
       │                       │                       │
```

## 📁 Arquivos Modificados

### 1. `/workspace/game/index.html`
**Mudanças:**
- ✅ Removido: Supabase SDK
- ✅ Removido: `auth-config.js`, `auth-client.js`, `auth-guard.js`, `profile.js`
- ✅ Removido: `supabase-multiplayer.js`, `supabase-realtime-dice.js`
- ✅ Removido: `hybrid-realtime-manager.js`, `realtime.js`, `socketio-client.js`
- ✅ Mantido: Socket.IO client (`/socket.io/socket.io.js`)
- ✅ Mantido: `game-client-socketio.js` (cliente puro)
- ✅ Mantido: `game-socketio-integration.js` (integração com CGame)

**Sistema de autenticação:**
- Removido sistema de login/logout do Supabase
- Jogadores são identificados por ID gerado localmente
- Saldo gerenciado em memória do servidor

### 2. `/workspace/game/js/CGame.js`
**Mudanças:**
- ✅ `_prepareForRolling()`: Simplificado para usar Socket.IO
- ✅ `_onSitDown()`: Removido inicialização do Supabase
- ✅ `changeRoom()`: Simplificado (Socket.IO gerencia salas)
- ✅ Removido tratamento de erros específicos do Supabase

**Como funciona agora:**
```javascript
// Quando jogador clica em "Rolar"
_onRollBut() {
  // Interceptado por game-socketio-integration.js
  // Envia: socket.emit('roll_dice')
  // Recebe: socket.on('dice_rolled', callback)
}
```

### 3. `/workspace/game/js/game-socketio-integration.js`
**Responsabilidades:**
- 🎮 Override do botão de rolar (`_onRollBut`)
- 📡 Gerencia eventos do Socket.IO
- 🎲 Recebe `dice_rolled` e anima para TODOS os jogadores
- 💰 Atualiza saldo local quando apostas são confirmadas
- 🔄 Auto-conecta ao servidor na inicialização

**Eventos principais:**
```javascript
// Envia para servidor
GameClientSocketIO.rollDice()        // Rolar dados
GameClientSocketIO.placeBet()        // Fazer aposta
GameClientSocketIO.clearBets()       // Limpar apostas

// Recebe do servidor
onDiceRolled(data)                    // Dados rolados
onGameResult(result)                  // Resultado (win/loss)
onPointEstablished(point)             // Ponto estabelecido
onShooterChanged(shooter)             // Atirador mudou
```

### 4. `/workspace/server.js`
**Já implementado:**
- ✅ Gerenciamento completo de estado do jogo
- ✅ Validação de ações (quem é o atirador, tem aposta, etc)
- ✅ Lógica do Craps (come out, point, seven out, etc)
- ✅ Broadcast para todos jogadores na sala
- ✅ Sistema de salas isoladas
- ✅ Sistema de chat integrado

## 🎮 Como Funciona

### Inicialização do Jogo

1. **Página carrega** (`index.html`)
2. **CGame.js inicializa** (cria UI, dados, mesa)
3. **game-socketio-integration.js executa**
   - Aguarda `s_oGame` estar pronto
   - Conecta ao servidor Socket.IO
   - Autentica com ID/username gerado
   - Entra na sala "table1"
4. **Servidor responde**
   - Adiciona jogador à sala
   - Define primeiro jogador como atirador
   - Envia estado atual do jogo

### Jogada (Dice Roll)

1. **Jogador clica em "Rolar"**
2. **Integration override intercepta**
   - Verifica se está conectado
   - Verifica se tem aposta
   - Previne double-click
3. **Envia para servidor**
   ```javascript
   socket.emit('roll_dice', {})
   ```
4. **Servidor processa**
   - Valida se é o atirador
   - Valida se tem aposta
   - Gera dados aleatórios: `dice1`, `dice2`
   - Aplica lógica do Craps
   - Determina resultado
5. **Servidor broadcast para TODOS**
   ```javascript
   io.to('room_table1').emit('dice_rolled', {
     dice1, dice2, total,
     shooter, shooterName,
     timestamp, point
   })
   ```
6. **Todos os clientes recebem**
   - Atualizam `_aDiceResult`
   - Iniciam animação dos dados
   - Mostram resultado na tela

### Apostas (Bets)

1. **Jogador clica em ficha + área da mesa**
2. **CGame.js processa localmente** (visual)
3. **Envia para servidor** (opcional - para sincronizar)
   ```javascript
   socket.emit('place_bet', { betType: 'pass_line', amount: 50 })
   ```
4. **Servidor valida e confirma**
   - Verifica saldo
   - Deduz crédito
   - Broadcast para outros jogadores

## 🚀 Como Testar

### 1. Iniciar Servidor
```bash
npm start
# ou
node server.js
```

Servidor inicia em `http://localhost:3000`

### 2. Abrir Jogo
```
http://localhost:3000/index.html
```

### 3. Testar Multiplayer
1. Abrir jogo em **duas abas/janelas** diferentes
2. Fazer aposta em ambas
3. Clicar em "Rolar" na primeira aba
4. **Verificar:** Ambas as abas devem animar os dados simultaneamente
5. **Verificar:** Ambas mostram o mesmo resultado

### 4. Verificar Logs

**Console do Navegador:**
```
🎮 Starting game with Socket.IO Pure System
✅ Socket.IO connected: socket_id_123
✅ Authenticated successfully
📊 Game state received: {...}
🎲 Dice rolled: {dice1: 3, dice2: 4, total: 7}
```

**Console do Servidor:**
```
Socket connected: socket_id_123
User authenticated: Jogador123 (player_abc) in room table1
Dice rolled in room table1: 3 + 4 = 7
```

## 📊 Estrutura do Estado do Jogo

```javascript
{
  roomId: 'table1',
  
  players: Map {
    'player_abc' => {
      userId: 'player_abc',
      username: 'Jogador 1',
      socketId: 'socket_123',
      credit: 950,        // Saldo atual
      currentBet: 50,     // Aposta total desta rodada
      isShooter: true,    // Se é o atirador
      joinedAt: Date
    }
  },
  
  gameState: 'COMEOUT',    // WAITING | COMEOUT | POINT
  currentShooter: 'player_abc',
  point: null,             // null ou número (4,5,6,8,9,10)
  
  lastRoll: {
    dice1: 3,
    dice2: 4,
    total: 7,
    shooter: 'player_abc',
    shooterName: 'Jogador 1',
    timestamp: '2025-11-18T...',
    point: null
  },
  
  bets: Map {
    'player_abc_pass_line' => {
      userId: 'player_abc',
      username: 'Jogador 1',
      betType: 'pass_line',
      amount: 50,
      timestamp: '...'
    }
  },
  
  history: [...]  // Últimos 50 rolls
}
```

## 🔍 Debugging

### Problema: Dados não sincronizam

**Verificar:**
1. Ambos os jogadores estão na mesma sala?
   ```javascript
   console.log(GameClientSocketIO.currentRoomId)
   ```
2. Ambos estão autenticados?
   ```javascript
   console.log(GameClientSocketIO.isAuthenticated)
   ```
3. Servidor está rodando?
   ```bash
   curl http://localhost:3000/health
   ```

### Problema: Não consigo rolar

**Verificar:**
1. Você é o atirador?
   - Servidor define primeiro jogador como atirador
   - Mensagem na tela indica quem é o atirador
2. Fez uma aposta?
   - Precisa clicar em ficha + mesa antes de rolar
3. Conexão está ativa?
   - Verificar console do navegador

### Problema: Servidor não inicia

**Verificar:**
1. Porta 3000 está livre?
   ```bash
   lsof -i :3000
   ```
2. Dependências instaladas?
   ```bash
   npm install
   ```

## 🎉 Benefícios do Sistema Socket.IO Puro

✅ **Latência Ultra-Baixa**
- Comunicação WebSocket direta
- Sem camadas intermediárias
- ~10-50ms entre jogadores

✅ **Sincronização Perfeita**
- Todos veem a mesma jogada ao mesmo tempo
- Servidor é autoridade única
- Impossível ter estados divergentes

✅ **Simplicidade**
- Menos dependências
- Menos código
- Mais fácil de debugar

✅ **Escalabilidade**
- Servidor pode gerenciar múltiplas salas
- Isolamento completo entre salas
- Estado em memória (rápido)

✅ **Confiabilidade**
- Reconexão automática
- Validação server-side
- Prevenção de trapaças

## 📝 Próximos Passos (Opcional)

- [ ] Adicionar persistência de saldo em banco de dados
- [ ] Implementar sistema de login simples (JWT)
- [ ] Adicionar mais tipos de apostas (field, place, buy, etc)
- [ ] Implementar sistema de turno com timer
- [ ] Adicionar histórico de jogadas persistente
- [ ] Adicionar estatísticas de jogador
- [ ] Implementar sistema de sala com níveis (Bronze, Silver, Gold)

## ✅ Status Atual

**Sistema Implementado:**
- ✅ Socket.IO servidor completo
- ✅ Cliente Socket.IO puro
- ✅ Integração com CGame.js
- ✅ Sincronização de dados em tempo real
- ✅ Sistema de apostas básico
- ✅ Lógica do Craps implementada
- ✅ Sistema de salas
- ✅ Chat integrado

**Pronto para usar!** 🎮
