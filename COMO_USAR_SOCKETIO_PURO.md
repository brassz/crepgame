# Como Usar o Sistema Socket.IO Puro

## ✅ Sistema Implementado

O jogo de Craps agora usa **APENAS Socket.IO** para comunicação em tempo real. Não há mais dependência do Supabase Realtime.

## 🚀 Como Iniciar

### 1. Instalar Dependências (se necessário)
```bash
npm install
```

### 2. Iniciar o Servidor
```bash
npm start
```

Ou diretamente:
```bash
node server.js
```

O servidor iniciará em: **http://localhost:3000**

Você verá no console:
```
Server listening on http://localhost:3000
✅ Socket.IO Pure: Complete game management
🎮 Real-time multiplayer Craps game ready!
📊 Features: Dice rolling, betting, chat, lobby
```

### 3. Abrir o Jogo
Abra no navegador:
```
http://localhost:3000/index.html
```

## 🎮 Como Testar Multiplayer

### Teste em Duas Abas/Janelas

1. **Aba 1 (Jogador 1):**
   - Abrir: `http://localhost:3000/index.html`
   - Aguardar jogo carregar
   - Verificar console: "✅ Socket.IO connected"

2. **Aba 2 (Jogador 2):**
   - Abrir outra aba: `http://localhost:3000/index.html`
   - Aguardar jogo carregar
   - Verificar console: "✅ Socket.IO connected"

3. **Jogar:**
   - **Aba 1:** Clicar em ficha (ex: 50)
   - **Aba 1:** Clicar em área da mesa (Pass Line)
   - **Aba 1:** Clicar em "ROLL" / "ROLAR"
   - **VERIFICAR:** Ambas as abas devem mostrar os dados rolando
   - **VERIFICAR:** Ambas as abas devem mostrar o mesmo resultado

## 📊 O Que Observar

### Console do Navegador
Deve mostrar:
```javascript
🎮 Starting game with Socket.IO Pure System
✅ Socket.IO connected: AbcDef123
✅ Authenticated successfully
📊 Game state received: {gameState: "WAITING", players: Array(1), ...}
👥 Players in room: 1 [{userId: "player_xyz", username: "Jogador 123", ...}]

// Quando rola os dados:
🎲 Roll button clicked - using Socket.IO
📤 Sending roll_dice to server...
🎲 Received dice_rolled from server: {dice1: 4, dice2: 3, total: 7}
🎬 Starting dice animation with result: [4, 3]
```

### Console do Servidor
Deve mostrar:
```javascript
Socket connected: AbcDef123
User authenticated: Jogador 123 (player_xyz) in room table1
👤 User joined: {userId: "player_xyz", username: "Jogador 123"}
👥 Players in room: 1

// Quando jogador rola:
🎲 Rolling dice...
Dice rolled in room table1: 4 + 3 = 7
```

## 🎲 Fluxo de Uma Jogada

1. **Jogador 1 clica em "ROLAR"**
   - Cliente envia: `socket.emit('roll_dice')`
   
2. **Servidor recebe e processa:**
   - Valida se é o atirador ✓
   - Valida se tem aposta ✓
   - Gera dados: `dice1 = random(1-6)`, `dice2 = random(1-6)`
   - Calcula total: `total = dice1 + dice2`
   - Aplica regras do Craps

3. **Servidor faz broadcast:**
   - Envia para TODOS na sala: `io.to('room_table1').emit('dice_rolled', data)`
   
4. **Ambos os clientes recebem:**
   - Atualizam estado local
   - Animam os dados com o resultado
   - Mostram mensagem de resultado

## 🔍 Verificações de Funcionamento

### ✅ Teste 1: Conexão
```javascript
// No console do navegador:
console.log(GameClientSocketIO.isConnected);  // true
console.log(GameClientSocketIO.isAuthenticated);  // true
console.log(GameClientSocketIO.currentRoomId);  // "table1"
```

### ✅ Teste 2: Sincronização
1. Abrir 2 abas
2. Fazer aposta na Aba 1
3. Rolar na Aba 1
4. **Verificar:** Aba 2 deve animar os dados simultaneamente
5. **Verificar:** Ambas mostram o mesmo resultado (ex: 3 + 4 = 7)

### ✅ Teste 3: Estado do Jogo
```javascript
// No console do navegador (após rolar):
console.log(GameClientSocketIO.gameState);
// Deve mostrar:
// {
//   state: "COMEOUT" ou "POINT",
//   players: [...],
//   currentShooter: "player_xyz",
//   point: null ou número,
//   lastRoll: {dice1: 4, dice2: 3, total: 7},
//   ...
// }
```

## ❓ Problemas Comuns

### Problema: "Não conectado ao servidor!"
**Solução:**
- Verificar se servidor está rodando: `curl http://localhost:3000/health`
- Reiniciar servidor: `node server.js`
- Recarregar página do jogo: F5

### Problema: "Você precisa fazer uma aposta primeiro!"
**Solução:**
- Clicar em uma ficha (ex: 50)
- Clicar em área da mesa (Pass Line, Don't Pass, etc)
- Tentar rolar novamente

### Problema: "Você não é o atirador"
**Solução:**
- Apenas um jogador por vez pode rolar
- Aguardar sua vez
- Primeiro jogador a entrar é o atirador inicial

### Problema: Dados não sincronizam
**Solução:**
1. Verificar console do navegador para erros
2. Verificar se ambos estão na mesma sala:
   ```javascript
   console.log(GameClientSocketIO.currentRoomId)
   ```
3. Recarregar ambas as abas

## 📝 Arquivos Importantes

### Backend
- **`server.js`**: Servidor Socket.IO com toda lógica do jogo

### Frontend
- **`game/index.html`**: HTML principal (modificado para Socket.IO puro)
- **`game/js/game-client-socketio.js`**: Cliente Socket.IO puro
- **`game/js/game-socketio-integration.js`**: Integração com CGame
- **`game/js/CGame.js`**: Lógica do jogo (modificado)

### Documentação
- **`SOCKETIO_PURE_IMPLEMENTATION.md`**: Documentação técnica completa
- **`COMO_USAR_SOCKETIO_PURO.md`**: Este guia

## 🎉 Pronto!

Agora você tem um sistema de Craps multiplayer funcionando com Socket.IO puro:

✅ Sincronização em tempo real  
✅ Múltiplos jogadores por sala  
✅ Dados rolados no servidor (autoritativo)  
✅ Baixa latência  
✅ Sem dependências do Supabase Realtime  

**Divirta-se jogando!** 🎲
