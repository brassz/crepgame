# Exemplo de Implementação do Servidor - dice_roll_start

## Requisito Crítico para Zero Delay

Para que a animação apareça **instantaneamente** para todos os jogadores, o servidor DEVE implementar o evento `dice_roll_start`.

## Implementação Node.js + Socket.IO

### Exemplo Básico

```javascript
// server.js ou game-socket-handler.js

io.on('connection', (socket) => {
    
    socket.on('roll_dice', async (data) => {
        try {
            const { dice1, dice2 } = data;
            const shooter = socket.userId;
            const shooterName = socket.username;
            const room = socket.currentRoom;
            
            // ============================================
            // PASSO 1: BROADCAST INSTANTÂNEO (CRÍTICO!)
            // ============================================
            // Envia para TODOS os outros jogadores na sala
            // ANTES de qualquer processamento pesado
            socket.to(room).emit('dice_roll_start', {
                shooter: shooter,
                shooterName: shooterName,
                timestamp: Date.now()
            });
            
            console.log(`⚡ dice_roll_start broadcast to room ${room} (excluding shooter)`);
            
            // ============================================
            // PASSO 2: VALIDAÇÃO E PROCESSAMENTO
            // ============================================
            // Validar dados
            if (!dice1 || !dice2 || dice1 < 1 || dice1 > 6 || dice2 < 1 || dice2 > 6) {
                socket.emit('error', { message: 'Invalid dice values' });
                return;
            }
            
            const sum = dice1 + dice2;
            
            // Buscar estado do jogo (pode ser lento)
            const gameState = await getGameState(room);
            
            // Buscar apostas do jogador (pode ser lento)
            const bets = await getPlayerBets(shooter, room);
            
            // Calcular resultado do jogo (pode ser complexo)
            const gameResult = calculateGameResult(
                dice1, 
                dice2, 
                gameState, 
                bets
            );
            
            // Atualizar banco de dados (pode ser lento)
            if (gameResult.winAmount > 0) {
                await updatePlayerCredit(shooter, gameResult.winAmount);
            }
            
            // Atualizar histórico (pode ser lento)
            await saveRollToHistory(room, {
                shooter,
                dice1,
                dice2,
                sum,
                timestamp: Date.now()
            });
            
            // ============================================
            // PASSO 3: BROADCAST RESULTADO FINAL
            // ============================================
            // Envia para TODOS os jogadores na sala (incluindo shooter)
            io.to(room).emit('dice_rolled', {
                dice1: dice1,
                dice2: dice2,
                sum: sum,
                shooter: shooter,
                shooterName: shooterName,
                timestamp: Date.now()
            });
            
            console.log(`🎯 dice_rolled broadcast to room ${room} (all players)`);
            
            // ============================================
            // PASSO 4: ENVIAR RESULTADO DO JOGO
            // ============================================
            // Informações específicas sobre ganhos/perdas
            io.to(room).emit('game_result', {
                type: gameResult.type, // 'natural_win', 'craps', 'point_made', etc.
                message: gameResult.message,
                winAmount: gameResult.winAmount,
                newCredit: gameResult.newCredit,
                shooter: shooter
            });
            
            // Se estabeleceu um ponto
            if (gameResult.pointEstablished) {
                io.to(room).emit('point_established', {
                    point: sum,
                    message: `Ponto estabelecido em ${sum}!`,
                    shooter: shooter
                });
            }
            
        } catch (error) {
            console.error('Error in roll_dice handler:', error);
            socket.emit('error', { 
                message: 'Erro ao processar rolagem',
                details: error.message 
            });
        }
    });
});
```

## Comparação: COM vs SEM dice_roll_start

### ❌ SEM dice_roll_start (Sistema Antigo - COM DELAY)

```javascript
socket.on('roll_dice', async (data) => {
    const { dice1, dice2 } = data;
    
    // Processamento pesado (200-500ms)
    const gameState = await getGameState(room);
    const bets = await getPlayerBets(shooter, room);
    const result = calculateGameResult(dice1, dice2, gameState, bets);
    await updateDatabase(result);
    
    // Só DEPOIS do processamento envia para outros jogadores
    io.to(room).emit('dice_rolled', {
        dice1, dice2, shooter
    });
    
    // Resultado: Outros jogadores esperam 200-500ms!
});
```

**Problema:** Observadores só veem animação depois do processamento completo.

### ✅ COM dice_roll_start (Sistema Novo - ZERO DELAY)

```javascript
socket.on('roll_dice', async (data) => {
    const { dice1, dice2 } = data;
    
    // IMEDIATAMENTE notifica outros jogadores (5-20ms)
    socket.to(room).emit('dice_roll_start', {
        shooter, shooterName, timestamp: Date.now()
    });
    
    // Processamento pesado (200-500ms) - NÃO BLOQUEIA ANIMAÇÃO
    const gameState = await getGameState(room);
    const bets = await getPlayerBets(shooter, room);
    const result = calculateGameResult(dice1, dice2, gameState, bets);
    await updateDatabase(result);
    
    // Envia resultado quando pronto
    io.to(room).emit('dice_rolled', {
        dice1, dice2, shooter
    });
    
    // Resultado: Observadores veem animação INSTANTANEAMENTE!
});
```

**Benefício:** Animação inicia enquanto servidor processa resultado.

## Implementação Completa com Helpers

```javascript
// game-socket-handler.js

class GameSocketHandler {
    constructor(io) {
        this.io = io;
    }
    
    handleRollDice(socket, data) {
        const startTime = Date.now();
        
        return this.processRollDice(socket, data)
            .then(() => {
                const duration = Date.now() - startTime;
                console.log(`✅ Roll processed in ${duration}ms`);
            })
            .catch((error) => {
                console.error('❌ Error processing roll:', error);
                socket.emit('error', { message: error.message });
            });
    }
    
    async processRollDice(socket, data) {
        const { dice1, dice2 } = data;
        const shooter = socket.userId;
        const room = socket.currentRoom;
        
        // Validação rápida
        this.validateDiceValues(dice1, dice2);
        
        // ====== BROADCAST INSTANTÂNEO ======
        const broadcastStartTime = Date.now();
        
        socket.to(room).emit('dice_roll_start', {
            shooter: shooter,
            shooterName: socket.username,
            timestamp: broadcastStartTime
        });
        
        const broadcastDuration = Date.now() - broadcastStartTime;
        console.log(`⚡ dice_roll_start broadcast in ${broadcastDuration}ms`);
        
        // ====== PROCESSAMENTO ASSÍNCRONO ======
        const processingStartTime = Date.now();
        
        // Buscar dados em paralelo para melhor performance
        const [gameState, playerBets, roomPlayers] = await Promise.all([
            this.getGameState(room),
            this.getPlayerBets(shooter, room),
            this.getRoomPlayers(room)
        ]);
        
        // Calcular resultado
        const gameResult = this.calculateGameResult(
            dice1, 
            dice2, 
            gameState, 
            playerBets
        );
        
        // Atualizar estado em paralelo
        await Promise.all([
            this.updatePlayerCredit(shooter, gameResult.creditChange),
            this.saveRollToHistory(room, {
                shooter, dice1, dice2,
                timestamp: processingStartTime
            }),
            this.updateGameState(room, gameResult.newState)
        ]);
        
        const processingDuration = Date.now() - processingStartTime;
        console.log(`⚙️ Processing completed in ${processingDuration}ms`);
        
        // ====== BROADCAST RESULTADO ======
        this.io.to(room).emit('dice_rolled', {
            dice1,
            dice2,
            sum: dice1 + dice2,
            shooter,
            shooterName: socket.username,
            timestamp: Date.now()
        });
        
        this.io.to(room).emit('game_result', gameResult);
        
        if (gameResult.pointEstablished) {
            this.io.to(room).emit('point_established', {
                point: dice1 + dice2,
                message: gameResult.pointMessage
            });
        }
    }
    
    validateDiceValues(dice1, dice2) {
        if (!dice1 || !dice2) {
            throw new Error('Missing dice values');
        }
        
        if (dice1 < 1 || dice1 > 6 || dice2 < 1 || dice2 > 6) {
            throw new Error('Invalid dice values (must be 1-6)');
        }
    }
    
    async getGameState(room) {
        // Implementar busca do estado do jogo
        return {
            phase: 'come_out',
            point: null,
            // ...
        };
    }
    
    async getPlayerBets(playerId, room) {
        // Implementar busca das apostas do jogador
        return [];
    }
    
    async getRoomPlayers(room) {
        // Implementar busca dos jogadores na sala
        return [];
    }
    
    calculateGameResult(dice1, dice2, gameState, bets) {
        const sum = dice1 + dice2;
        
        // Lógica do Craps
        if (gameState.phase === 'come_out') {
            if (sum === 7 || sum === 11) {
                return {
                    type: 'natural_win',
                    message: 'Natural! Você ganhou!',
                    creditChange: this.calculateWinnings(bets),
                    newState: { phase: 'come_out', point: null }
                };
            } else if (sum === 2 || sum === 3 || sum === 12) {
                return {
                    type: 'craps',
                    message: 'Craps! Você perdeu!',
                    creditChange: -this.calculateLosses(bets),
                    newState: { phase: 'come_out', point: null }
                };
            } else {
                return {
                    type: 'point_established',
                    message: `Ponto estabelecido em ${sum}`,
                    pointEstablished: true,
                    pointMessage: `O ponto agora é ${sum}!`,
                    creditChange: 0,
                    newState: { phase: 'point', point: sum }
                };
            }
        }
        
        // Mais lógica do jogo...
        return {};
    }
    
    calculateWinnings(bets) {
        // Implementar cálculo de ganhos
        return 100;
    }
    
    calculateLosses(bets) {
        // Implementar cálculo de perdas
        return 50;
    }
    
    async updatePlayerCredit(playerId, amount) {
        // Implementar atualização de crédito
    }
    
    async saveRollToHistory(room, rollData) {
        // Implementar salvamento no histórico
    }
    
    async updateGameState(room, newState) {
        // Implementar atualização de estado
    }
}

// Uso
module.exports = (io) => {
    const handler = new GameSocketHandler(io);
    
    io.on('connection', (socket) => {
        socket.on('roll_dice', (data) => {
            handler.handleRollDice(socket, data);
        });
    });
};
```

## Métricas de Performance

Com a implementação correta, você deve ver:

```
⚡ dice_roll_start broadcast in 2-5ms      ← Instantâneo!
⚙️ Processing completed in 150-300ms       ← Não bloqueia UI
🎯 dice_rolled broadcast in 1-3ms          ← Rápido
```

## Logs Esperados

### Console do Servidor

```
⚡ Player user123 rolled dice
⚡ dice_roll_start broadcast to room table1 (excluding shooter)
⚙️ Fetching game state...
⚙️ Calculating results...
⚙️ Updating database...
⚙️ Processing completed in 243ms
🎯 dice_rolled broadcast to room table1 (all players)
✅ Roll processed successfully
```

### Console do Cliente (Shooter)

```
🎲 Roll button clicked - INSTANT ANIMATION FOR ALL PLAYERS
⚡ INSTANT: Generated dice locally: 4 5
🎬 INSTANT: Starting animation for shooter: [4, 5]
📤 Sending dice to server...
🎯 Received dice_rolled with RESULT
✅ My own roll result confirmed by server: [4, 5]
```

### Console do Cliente (Observer)

```
⚡⚡⚡ DICE ROLL START - INSTANT ANIMATION FOR OBSERVER
👀 Another player rolling - START ANIMATION INSTANTLY
🎬 INSTANT: Starting animation for observer WITHOUT result
✅ Observer animation started - waiting for result...
🎯 Received dice_rolled with RESULT
✅ Observer: Finishing animation with result: [4, 5]
```

## Checklist de Implementação

- [ ] Handler `roll_dice` criado
- [ ] Emite `dice_roll_start` ANTES de processamento pesado
- [ ] Valida dados do cliente
- [ ] Processa resultado de forma assíncrona
- [ ] Emite `dice_rolled` com resultado final
- [ ] Emite `game_result` com informações de ganho/perda
- [ ] Testa com múltiplos clientes simultaneamente
- [ ] Logs de debug implementados
- [ ] Métricas de performance monitoradas

## Troubleshooting

### Problema: Observadores ainda veem delay

**Causa provável:** `dice_roll_start` não está sendo emitido

**Verificar:**
```javascript
// Adicione este log
socket.to(room).emit('dice_roll_start', data);
console.log('✅ dice_roll_start emitted to room:', room);
```

### Problema: Animação não finaliza

**Causa provável:** `dice_rolled` não está chegando

**Verificar:**
```javascript
// Adicione este log
io.to(room).emit('dice_rolled', data);
console.log('✅ dice_rolled emitted to room:', room, 'data:', data);
```

### Problema: Performance ruim

**Causa provável:** Processamento bloqueando broadcast

**Solução:** Mover processamento pesado para DEPOIS do broadcast

## Conclusão

A implementação do `dice_roll_start` é **ESSENCIAL** para o sistema de animação com zero delay. Sem este evento, os observadores sempre terão delay visível.

**Regra de Ouro:** 
> Sempre emita `dice_roll_start` ANTES de qualquer operação que possa demorar mais de 10ms.

**Status:** Pronto para implementação no servidor
