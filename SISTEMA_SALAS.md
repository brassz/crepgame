# Sistema de Salas Multiplayer

## Visão Geral

O sistema de salas multiplayer permite que jogadores escolham entre diferentes mesas online com configurações específicas de apostas e limites de jogadores. Cada mesa tem características únicas para atender diferentes perfis de jogadores.

## Configuração das Mesas

### 1. Mesa Iniciante 🌱
**ID**: `iniciante`
- Aposta mínima: **R$ 50**
- Aposta máxima: **R$ 1.000**
- Máximo de jogadores: **6**
- Cor: Verde (#4CAF50)
- Descrição: Mesa para jogadores iniciantes

### 2. Mesa Intermediária ⚡
**ID**: `intermediaria`
- Aposta mínima: **R$ 100**
- Aposta máxima: **R$ 2.000**
- Máximo de jogadores: **6**
- Cor: Laranja (#FF9800)
- Descrição: Mesa para jogadores experientes

### 3. Mesa VIP 💎
**ID**: `vip`
- Aposta mínima: **R$ 200**
- Aposta máxima: **R$ 5.000**
- Máximo de jogadores: **4**
- Cor: Roxo (#9C27B0)
- Descrição: Mesa para grandes apostadores

## Funcionalidades do Sistema

### 1. Seleção de Salas
- Interface visual para escolha de mesa antes de iniciar o jogo
- Exibe apenas salas que o jogador pode pagar (baseado no saldo)
- Mostra informações em tempo real de cada sala:
  - Nome e ícone da mesa
  - Limites de aposta (mínimo - máximo)
  - Número de jogadores online/máximo
  - Status de disponibilidade

### 2. Sistema Multiplayer
- Simulação de jogadores online (bots)
- Contador de jogadores em tempo real
- Mensagens de ações de outros jogadores
- Atividade automática dos bots

### 3. Interface Durante o Jogo
- Informações da mesa atual no canto superior
- Mensagens de ações de outros jogadores
- Contador de jogadores na mesa

## API do Sistema

### Obter Configuração de Sala

```javascript
// Obter configuração completa
var oRoomConfig = s_oRoomConfig.getRoomConfig("iniciante");
console.log(oRoomConfig.name); // "Mesa Iniciante"
console.log(oRoomConfig.min_bet); // 50
console.log(oRoomConfig.max_bet); // 1000

// Obter valores específicos
var iMinBet = s_oRoomConfig.getRoomMinBet("vip"); // 200
var iMaxBet = s_oRoomConfig.getRoomMaxBet("vip"); // 5000
var sRoomName = s_oRoomConfig.getRoomName("intermediaria"); // "Mesa Intermediária"
```

### Gerenciar Jogadores

```javascript
// Entrar numa sala
s_oMultiplayerManager.joinRoom("vip", "player123", playerProfile);

// Verificar jogadores online
var iPlayersCount = s_oMultiplayerManager.getRoomPlayersCount("iniciante");
var aPlayers = s_oMultiplayerManager.getRoomPlayersProfiles("vip");

// Sair de todas as salas
s_oMultiplayerManager.leaveAllRooms("player123");
```

## Arquivos do Sistema

### Novos Arquivos Criados
- `game/js/CRoomConfig.js` - Sistema de configuração das 3 mesas
- `game/js/CMultiplayerManager.js` - Gerenciamento de jogadores por sala
- `game/js/CRoomSelection.js` - Interface de seleção de salas
- `game/js/utils.js` - Funções utilitárias (formatação de moeda, etc.)

### Arquivos Modificados
- `game/index.html` - Adicionados novos scripts e lógica de seleção de sala
- `game/js/CInterface.js` - Atualizações na UI para mostrar info da sala e mensagens multiplayer
- `game/js/CGame.js` - Integração com sistema de salas e callbacks multiplayer
- `game/js/CMain.js` - Suporte para inicialização em salas específicas

## Como Funciona

### Fluxo do Jogador
1. **Login**: Jogador faz login e carrega seu saldo
2. **Seleção de Mesa**: Interface mostra mesas disponíveis baseadas no saldo
3. **Entrada na Sala**: Jogador clica numa mesa e entra automaticamente
4. **Jogo Multiplayer**: Vê outros jogadores online e suas ações em tempo real

### Sistema de Bots
- Simula atividade de jogadores reais
- Nomes brasileiros realistas
- Ações periódicas (apostas, entrada/saída)
- Diferentes perfis de saldo para cada bot

## Benefícios do Sistema

1. **Experiência Multiplayer**: Sensação de jogo online real
2. **Segmentação de Jogadores**: Mesas adequadas para diferentes níveis
3. **Interface Intuitiva**: Seleção visual simples e clara  
4. **Escalabilidade**: Sistema preparado para expansão
5. **Imersão**: Jogadores veem atividade em tempo real
6. **Controle de Acesso**: Apenas jogadores com saldo suficiente podem entrar

## Configuração Técnica

### Limites das Mesas
- **Iniciante**: R$ 50 - R$ 1.000 (6 jogadores)
- **Intermediária**: R$ 100 - R$ 2.000 (6 jogadores) 
- **VIP**: R$ 200 - R$ 5.000 (4 jogadores)

### Validações
- Saldo mínimo para entrar na sala
- Limite máximo de jogadores por mesa
- Verificação de disponibilidade em tempo real