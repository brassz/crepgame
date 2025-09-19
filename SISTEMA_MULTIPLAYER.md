# Sistema Multiplayer - Salas Compartilhadas

## Visão Geral

O sistema multiplayer implementa salas compartilhadas onde os jogadores são automaticamente direcionados para salas existentes com espaço disponível. Novas salas são criadas apenas quando todas as salas existentes atingem sua capacidade máxima.

## Características Principais

### 1. **Salas Compartilhadas**
- Os jogadores são automaticamente direcionados para salas com espaço disponível
- Nova sala é criada apenas quando todas as salas existem estão lotadas
- Sistema inteligente de balanceamento de carga entre salas

### 2. **Tipos de Salas Disponíveis**

#### Mesa Principal (`principal`)
- **Aposta mínima**: 50 reais
- **Aposta máxima**: Sem limite
- **Máximo de jogadores**: 8
- **Descrição**: Mesa principal do jogo

#### Mesa VIP (`vip`)
- **Aposta mínima**: 500 reais
- **Aposta máxima**: Sem limite
- **Máximo de jogadores**: 6
- **Descrição**: Mesa VIP para jogadores premium

#### Mesa Iniciante (`iniciante`)
- **Aposta mínima**: 10 reais
- **Aposta máxima**: 1.000 reais
- **Máximo de jogadores**: 10
- **Descrição**: Mesa para iniciantes

### 3. **Funcionalidades Multiplayer**

#### Sincronização em Tempo Real
- Estados de jogo sincronizados entre todos os jogadores
- Resultados de dados compartilhados
- Apostas visíveis para outros jogadores
- Atualizações automáticas do número de jogadores

#### Sistema de Comunicação
- WebSocket para comunicação em tempo real
- Fallback para modo local quando não conectado
- Reconexão automática em caso de desconexão

#### Interface de Seleção de Salas
- Painel visual responsivo mostrando todas as salas disponíveis
- Status em tempo real (disponível/lotada)
- Informações detalhadas de cada sala
- Atualização automática a cada 3 segundos
- **Adaptável a diferentes resoluções** - O modal se ajusta automaticamente ao tamanho da tela
- **Posicionamento inteligente** - Garante que todos os elementos fiquem visíveis na tela

## Arquitetura do Sistema

### Componentes Principais

#### 1. `CMultiplayerRoomManager`
**Responsabilidades:**
- Gerenciamento de conexões WebSocket
- Atribuição automática de salas
- Sincronização de estados de jogo
- Fallback para modo local

**Métodos principais:**
```javascript
// Entrar em uma sala (encontra disponível ou cria nova)
s_oMultiplayerRoomManager.joinRoom("principal");

// Sair da sala atual
s_oMultiplayerRoomManager.leaveRoom();

// Transmitir ação do jogo para outros jogadores
s_oMultiplayerRoomManager.broadcastGameAction({
    type: 'bet_placed',
    data: { amount: 100 }
});

// Obter informações de todas as salas ativas
var aRoomsInfo = s_oMultiplayerRoomManager.getActiveRoomsInfo();
```

#### 2. `CRoomSelectionPanel`
**Responsabilidades:**
- Interface visual para seleção de salas
- Exibição de status em tempo real
- Atualização automática da lista de salas

#### 3. `CRoomConfig`
**Responsabilidades:**
- Configurações de cada tipo de sala
- Limites de apostas e jogadores
- Metadados das salas

### Fluxo de Funcionamento

#### 1. **Entrada do Jogador**
```
Jogador inicia o jogo
    ↓
Sistema inicializa CMultiplayerRoomManager
    ↓
Tenta conectar ao servidor WebSocket
    ↓
Procura sala disponível do tipo solicitado
    ↓
Se encontrou sala com espaço: adiciona jogador
    ↓
Se não encontrou: cria nova sala
    ↓
Atualiza interface com informações da sala
```

#### 2. **Durante o Jogo**
```
Jogador faz aposta
    ↓
Ação é transmitida para outros jogadores da sala
    ↓
Outros jogadores recebem atualização
    ↓
Interface atualizada em tempo real
```

#### 3. **Lançamento de Dados**
```
Jogador lança dados
    ↓
Resultado é sincronizado com todos na sala
    ↓
Todos veem o mesmo resultado
    ↓
Estados de jogo atualizados
```

## Configuração e Uso

### 1. **Configuração do WebSocket**
No arquivo `CMultiplayerRoomManager.js`, configure a URL do servidor:
```javascript
_sWebSocketUrl = "wss://seu-servidor-websocket.com";
```

### 2. **Inicialização Automática**
O sistema é inicializado automaticamente quando o jogador entra no jogo:
```javascript
// Automático - não precisa chamar manualmente
s_oMultiplayerRoomManager = new CMultiplayerRoomManager();
s_oMultiplayerRoomManager.joinRoom("principal");
```

### 3. **Interface de Seleção de Salas**
Os jogadores podem acessar o painel de seleção através do botão "SALAS" na interface do jogo.

### 4. **Modo Offline/Local**
Se não houver conexão com o servidor WebSocket, o sistema funciona em modo local:
- Salas são gerenciadas localmente
- Funcionalidade completa mantida
- Reconexão automática quando possível

## Protocolo de Comunicação WebSocket

### Mensagens do Cliente para Servidor

#### Entrada do Jogador
```json
{
    "type": "player_join",
    "player_id": "player_abc123",
    "timestamp": 1640995200000
}
```

#### Solicitação de Sala
```json
{
    "type": "request_room",
    "room_type": "principal",
    "player_id": "player_abc123",
    "timestamp": 1640995200000
}
```

#### Ação do Jogo
```json
{
    "type": "game_action",
    "room_id": "principal_room_1",
    "player_id": "player_abc123",
    "action": {
        "type": "bet_placed",
        "data": { "amount": 100 }
    },
    "timestamp": 1640995200000
}
```

### Mensagens do Servidor para Cliente

#### Atribuição de Sala
```json
{
    "type": "room_assigned",
    "room": {
        "id": "principal_room_1",
        "type": "principal",
        "players": [...],
        "max_players": 8
    }
}
```

#### Atualização da Sala
```json
{
    "type": "room_update",
    "room_id": "principal_room_1",
    "players": [...]
}
```

#### Jogador Entrou/Saiu
```json
{
    "type": "player_joined",
    "room_id": "principal_room_1",
    "player_id": "player_def456"
}
```

## Benefícios do Sistema

### 1. **Eficiência de Recursos**
- Máximo aproveitamento das salas existentes
- Criação de novas salas apenas quando necessário
- Balanceamento automático de carga

### 2. **Experiência do Usuário**
- Entrada automática em salas disponíveis
- Interface clara mostrando status das salas
- Sincronização em tempo real

### 3. **Escalabilidade**
- Suporte a múltiplos tipos de salas
- Sistema preparado para crescimento
- Fallback robusto para modo offline

### 4. **Robustez**
- Reconexão automática
- Modo local como fallback
- Tratamento de erros abrangente

## Arquivos Modificados/Criados

### Novos Arquivos
- `game/js/CMultiplayerRoomManager.js` - Gerenciador principal do sistema multiplayer
- `game/js/CRoomSelectionPanel.js` - Interface de seleção de salas
- `SISTEMA_MULTIPLAYER.md` - Esta documentação

### Arquivos Modificados
- `game/js/CGame.js` - Integração com sistema multiplayer
- `game/js/CInterface.js` - Botão de seleção de salas e atualizações de interface
- `game/js/CRoomConfig.js` - Adicionados novos tipos de salas
- `game/index.html` - Inclusão dos novos scripts
- `live_demo/index.html` - Inclusão dos novos scripts

## Próximos Passos

### Para Produção
1. **Configurar Servidor WebSocket**
   - Implementar servidor Node.js com Socket.io
   - Configurar balanceamento de carga
   - Implementar persistência de dados

2. **Testes**
   - Testes de carga com múltiplos jogadores
   - Testes de reconexão
   - Testes de sincronização

3. **Monitoramento**
   - Logs de atividade das salas
   - Métricas de performance
   - Alertas de problemas

### Melhorias Futuras
- Sistema de chat entre jogadores
- Histórico de jogadas
- Rankings e estatísticas
- Torneios e eventos especiais