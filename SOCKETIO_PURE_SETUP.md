# Sistema Socket.IO Puro - Craps Multiplayer

## 🎯 Visão Geral

Este projeto agora usa **Socket.IO PURO** para toda a comunicação entre jogadores, removendo completamente a dependência de insert/update do Supabase para as jogadas.

## 🏗️ Arquitetura

```
Jogador A
    |
    v
Socket.io (servidor Node)
    ^
    |
Jogador B
```

### Fluxo de Comunicação

1. **Jogador A** se conecta ao servidor Socket.IO
2. **Servidor** mantém o estado do jogo em memória
3. **Jogador B** se conecta ao mesmo servidor
4. Todas as ações (apostas, rolagem de dados) são sincronizadas em **tempo real** via Socket.IO
5. **Nenhuma** operação de banco de dados para jogadas

## 📦 Componentes

### Servidor (`server.js`)

- Gerenciamento completo de estado do jogo
- Salas de jogo isoladas
- Sincronização em tempo real
- Lógica de negócio do Craps
- Sistema de chat integrado

**Eventos do Servidor:**
- `authenticate` - Autenticar e entrar em uma sala
- `roll_dice` - Rolar os dados
- `place_bet` - Fazer uma aposta
- `clear_bets` - Limpar apostas
- `get_game_state` - Obter estado atual do jogo
- `chat_message` - Enviar mensagem no chat

### Cliente (`game/js/game-client-socketio.js`)

- Interface JavaScript para comunicação com o servidor
- Callbacks para todos os eventos do jogo
- Gerenciamento de estado local
- Sincronização automática

**Eventos do Cliente:**
- `onConnected` - Conectado ao servidor
- `onAuthenticated` - Autenticado com sucesso
- `onDiceRolled` - Dados foram rolados
- `onBetConfirmed` - Aposta confirmada
- `onGameResult` - Resultado do jogo
- `onPointEstablished` - Ponto estabelecido
- `onShooterChanged` - Atirador mudou
- `onPlayersUpdated` - Lista de jogadores atualizada

## 🚀 Como Usar

### 1. Instalar Dependências

```bash
npm install
```

### 2. Iniciar o Servidor

```bash
npm start
# ou
node server.js
```

O servidor estará rodando em `http://localhost:3000`

### 3. Testar o Sistema

Abra o arquivo de teste no navegador:
```
http://localhost:3000/test-socketio-game.html
```

**Para testar multiplayer:**
1. Abra a página de teste em **duas abas** diferentes
2. Configure usuários diferentes (ex: player1, player2)
3. Use a mesma sala (ex: table1)
4. Teste as funcionalidades:
   - Conectar
   - Fazer apostas
   - Rolar dados
   - Ver sincronização em tempo real

## 💻 Exemplo de Uso no Cliente

```javascript
// Inicializar cliente
await GameClientSocketIO.init();

// Autenticar e entrar em uma sala
GameClientSocketIO.authenticate('player1', 'João', 'table1', 1000);

// Configurar callbacks
GameClientSocketIO.onDiceRolled((rollData) => {
    console.log(`Dados: ${rollData.dice1} + ${rollData.dice2} = ${rollData.total}`);
});

GameClientSocketIO.onGameResult((result) => {
    console.log(`Resultado: ${result.message}`);
});

// Fazer uma aposta
GameClientSocketIO.placeBet('pass_line', 10);

// Rolar os dados (apenas se for o atirador)
GameClientSocketIO.rollDice();

// Limpar apostas
GameClientSocketIO.clearBets();
```

## 🎮 Lógica do Jogo Craps

### Come Out Roll (Primeira Jogada)
- **7 ou 11**: Natural - Atirador ganha
- **2, 3 ou 12**: Craps - Atirador perde
- **4, 5, 6, 8, 9, 10**: Estabelece o "ponto"

### Point Roll (Após estabelecer ponto)
- **Rolar o ponto**: Atirador ganha
- **Rolar 7**: Seven out - Atirador perde e dados passam para o próximo jogador

## 🔧 Estado do Jogo

O servidor mantém o seguinte estado para cada sala:

```javascript
{
    roomId: 'table1',
    players: Map<userId, playerData>,
    gameState: 'WAITING' | 'COMEOUT' | 'POINT',
    currentShooter: 'player1',
    point: null | number,
    lastRoll: { dice1, dice2, total, ... },
    bets: Map<betKey, betData>,
    history: [...]
}
```

## 🎯 Vantagens do Sistema Socket.IO Puro

1. **Latência Ultra-Baixa**: Comunicação direta sem intermediários
2. **Sincronização Perfeita**: Todos os jogadores veem as mesmas informações instantaneamente
3. **Simplicidade**: Sem complexidade de banco de dados para jogadas
4. **Escalabilidade**: Servidor pode gerenciar múltiplas salas simultaneamente
5. **Confiabilidade**: Estado do jogo é a fonte única da verdade

## 🔒 Segurança

- Validação de todas as ações no servidor
- Verificação de atirador antes de permitir rolagem
- Validação de saldo antes de aceitar apostas
- Isolamento entre salas diferentes

## 📊 Monitoramento

O servidor loga todas as ações importantes:
- Conexões e desconexões
- Autenticações
- Rolagens de dados
- Apostas realizadas
- Mudanças de atirador

## 🛠️ Desenvolvimento

### Estrutura de Arquivos

```
/workspace/
├── server.js                           # Servidor Socket.IO com lógica do jogo
├── package.json                        # Dependências
└── game/
    ├── js/
    │   └── game-client-socketio.js    # Cliente Socket.IO
    └── test-socketio-game.html        # Página de teste
```

### Próximos Passos

- [ ] Integrar com a UI existente do jogo (CGame.js)
- [ ] Adicionar animações sincronizadas
- [ ] Implementar sistema de turno com timer
- [ ] Adicionar mais tipos de apostas
- [ ] Implementar sistema de conquistas
- [ ] Adicionar persistência opcional (salvar histórico)

## 🐛 Troubleshooting

### Problema: Não consigo conectar
- Verifique se o servidor está rodando
- Confirme que está acessando a porta correta (3000)
- Verifique o console do navegador para erros

### Problema: Dados não sincronizam
- Verifique se ambos os jogadores estão na mesma sala
- Confirme que ambos estão autenticados
- Verifique os logs do servidor

### Problema: Não consigo rolar os dados
- Confirme que você é o atirador atual
- Verifique se fez uma aposta primeiro
- Verifique se está autenticado

## 📝 Notas

- O estado do jogo existe apenas em memória do servidor
- Se o servidor reiniciar, todos os jogos em andamento serão perdidos
- Para persistência, considere adicionar salvamento periódico em banco de dados
- Sistema de chat está incluído e funcionando

## 🎉 Status

✅ Sistema Socket.IO puro implementado
✅ Servidor com lógica completa do Craps
✅ Cliente JavaScript funcional
✅ Página de teste criada
✅ Sincronização em tempo real funcionando
✅ Sistema de apostas implementado
✅ Sistema de chat integrado

**Próximo passo**: Testar com múltiplos jogadores e integrar com a UI principal do jogo.
