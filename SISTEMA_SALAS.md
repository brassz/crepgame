# Sistema de Seleção de Mesas Multiplayer

## Visão Geral

O sistema permite que os jogadores escolham entre três tipos de mesa com diferentes limites de apostas e capacidades de jogadores. O sistema inclui funcionalidade multiplayer em tempo real.

## Configuração das Mesas

### Mesa Bronze (`bronze`)
- Aposta mínima: R$ 50
- Aposta máxima: R$ 1.000
- Máximo de jogadores: 8
- Descrição: Mesa para iniciantes
- Cor: Bronze (#CD7F32)

### Mesa Prata (`prata`)
- Aposta mínima: R$ 100
- Aposta máxima: R$ 3.000
- Máximo de jogadores: 6
- Descrição: Mesa intermediária
- Cor: Prata (#C0C0C0)

### Mesa Ouro (`ouro`)
- Aposta mínima: R$ 200
- Aposta máxima: R$ 5.000
- Máximo de jogadores: 4
- Descrição: Mesa para experientes
- Cor: Ouro (#FFD700)

## Como Usar

### Seleção de Mesa

O jogador pode escolher uma mesa através do seletor que aparece ao clicar em "JOGAR":

1. O seletor exibe todas as mesas disponíveis
2. Cada mesa mostra: nome, limites de aposta, jogadores online/máximo, descrição
3. O jogador clica na mesa desejada
4. O sistema automaticamente entra na sala multiplayer
5. O jogo inicia com os limites da mesa selecionada

### Programaticamente

```javascript
// Trocar para mesa Bronze
s_oGame.changeRoom("bronze");

// Trocar para mesa Prata
s_oGame.changeRoom("prata");

// Trocar para mesa Ouro
s_oGame.changeRoom("ouro");

// Obter configuração completa
var oRoomConfig = s_oRoomConfig.getRoomConfig("bronze");
console.log(oRoomConfig.name); // "Mesa Bronze"
console.log(oRoomConfig.min_bet); // 50
console.log(oRoomConfig.max_bet); // 1000

// Obter valores específicos
var iMinBet = s_oRoomConfig.getRoomMinBet("prata"); // 100
var iMaxBet = s_oRoomConfig.getRoomMaxBet("ouro"); // 5000
var sRoomName = s_oRoomConfig.getRoomName("bronze"); // "Mesa Bronze"
```

## Sistema Multiplayer

### Funcionalidades Multiplayer

1. **Jogadores Online em Tempo Real**: Cada mesa mostra quantos jogadores estão conectados
2. **Simulação de Atividade**: Bots entram e saem das salas automaticamente
3. **Limites por Mesa**: Cada mesa tem capacidade máxima diferente
4. **Entrada Automática**: Ao selecionar uma mesa, o jogador entra automaticamente na sala
5. **Saída Automática**: Ao sair do jogo, o jogador é removido da sala

## Modificações Realizadas

### 1. Arquivos Atualizados
- `game/index.html` - Adicionados novos scripts para seletor de salas e multiplayer
- `game/js/CRoomConfig.js` - Sistema expandido com 3 tipos de mesa
- `game/js/CMenu.js` - Integração com seletor de salas
- `game/js/CGame.js` - Suporte a salas selecionadas e multiplayer
- `game/js/CInterface.js` - Exibição de informações de jogadores online

### 2. Novos Arquivos
- `game/js/CRoomSelector.js` - Interface de seleção de mesas
- `game/js/CMultiplayerManager.js` - Gerenciamento de jogadores online
- `SISTEMA_SALAS.md` - Esta documentação (atualizada)

### 3. Funcionalidades Implementadas
- Seletor visual de mesas com informações detalhadas
- Sistema multiplayer simulado com bots
- Contagem de jogadores online em tempo real
- Interface responsiva com animações
- Integração completa com o jogo existente

## Interface do Seletor de Mesas

O seletor de mesas apresenta uma interface moderna e intuitiva com:

### Elementos Visuais
- **Overlay escuro** semi-transparente para destaque
- **Painel principal** centralizado com bordas arredondadas
- **Botões de mesa** em cores temáticas (bronze, prata, ouro)
- **Animações suaves** de entrada e hover
- **Informações em tempo real** de jogadores online

### Informações Exibidas por Mesa
- **Nome da mesa** (Ex: "Mesa Bronze")
- **Limites de aposta** (Ex: "R$ 50 - R$ 1.000")
- **Jogadores online** (Ex: "Jogadores: 3/8")
- **Descrição** (Ex: "Mesa para iniciantes")

### Interface do Jogo

Durante o jogo, as informações da sala são exibidas mostrando:
- Nome da sala selecionada
- Número de jogadores online em tempo real
- Limites de aposta da mesa atual

## Benefícios do Sistema

1. **Escolha Personalizada**: Jogadores podem escolher mesa adequada ao seu orçamento
2. **Experiência Multiplayer**: Interação com outros jogadores online
3. **Progressão Natural**: Sistema Bronze → Prata → Ouro
4. **Interface Intuitiva**: Seleção visual clara e informativa
5. **Atividade Dinâmica**: Simulação realista de entrada/saída de jogadores
6. **Flexibilidade**: Sistema preparado para expansão futura

## Configurações Técnicas

### Mesa Bronze (Iniciantes)
- Público-alvo: Novos jogadores
- Capacidade maior (8 jogadores)
- Apostas menores para aprendizado

### Mesa Prata (Intermediários)
- Público-alvo: Jogadores com experiência
- Capacidade média (6 jogadores)
- Apostas moderadas

### Mesa Ouro (Experientes)
- Público-alvo: Jogadores experientes
- Capacidade menor (4 jogadores) para maior exclusividade
- Apostas maiores para high-rollers