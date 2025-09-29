# Sistema de Salas Multiplayer

## Visão Geral

O sistema de salas multiplayer permite que até 8 jogadores joguem simultaneamente em três diferentes níveis de salas, cada uma com seus próprios limites de apostas. O sistema inclui uma banca que cobre apostas não feitas na mesa.

## Configuração das Salas

### Sala Bronze (`bronze`)
- Aposta mínima: **50 reais**
- Aposta máxima: **1.000 reais**
- Máximo de jogadores: **8 jogadores**
- Fundos da banca: **50.000 reais**
- Descrição: Sala para iniciantes
- Cor: Bronze (#CD7F32)

### Sala Prata (`prata`)
- Aposta mínima: **100 reais**
- Aposta máxima: **3.000 reais**
- Máximo de jogadores: **8 jogadores**
- Fundos da banca: **150.000 reais**
- Descrição: Sala intermediária
- Cor: Prata (#C0C0C0)

### Sala Ouro (`ouro`)
- Aposta mínima: **200 reais**
- Aposta máxima: **5.000 reais**
- Máximo de jogadores: **8 jogadores**
- Fundos da banca: **300.000 reais**
- Descrição: Sala VIP
- Cor: Ouro (#FFD700)

## Como Usar

### Trocar de Sala

```javascript
// Trocar para sala bronze
s_oGame.changeRoom("bronze");

// Trocar para sala prata
s_oGame.changeRoom("prata");

// Trocar para sala ouro
s_oGame.changeRoom("ouro");
```

### Interface de Seleção de Salas

Os jogadores podem trocar de sala através da interface:
1. Clique no botão **"TROCAR SALA"** na mesa
2. Selecione uma das três salas disponíveis
3. O sistema automaticamente validará se a sala não está lotada
4. Os limites de aposta serão atualizados automaticamente

### Obter Configuração de Sala

```javascript
// Obter configuração completa
var oRoomConfig = s_oRoomConfig.getRoomConfig("bronze");
console.log(oRoomConfig.name); // "Sala Bronze"
console.log(oRoomConfig.min_bet); // 50
console.log(oRoomConfig.max_bet); // 1000

// Obter valores específicos
var iMinBet = s_oRoomConfig.getRoomMinBet("bronze"); // 50
var iMaxBet = s_oRoomConfig.getRoomMaxBet("prata"); // 3000
var sRoomName = s_oRoomConfig.getRoomName("ouro"); // "Sala Ouro"
```

### Sistema Multiplayer

```javascript
// Adicionar jogador a uma sala
var oPlayer = {id: 12345, name: "João", credit: 1000};
var oResult = s_oMultiplayerManager.addPlayerToRoom(oPlayer, "bronze");

// Verificar quantos jogadores estão na sala
var iCount = s_oMultiplayerManager.getRoomPlayersCount("prata");

// Fazer uma aposta
s_oMultiplayerManager.placeBet(playerId, "ouro", "main_bet", 500);
```

## Sistema da Banca

### Funcionamento da Banca

A banca atua como um "seguro" para cobrir apostas não feitas por outros jogadores na mesa:

1. **Cobertura Automática**: Quando não há apostas suficientes de outros jogadores para cobrir os ganhos, a banca cobre a diferença
2. **Fundos por Sala**: Cada sala tem seus próprios fundos da banca
3. **Cálculo Dinâmico**: A banca lucra quando há mais apostas que pagamentos, e cobre quando há mais pagamentos que apostas

### Exemplo de Funcionamento

```
Sala Bronze - Resultado: 7 (ganha)
- Total de apostas na mesa: 500 reais  
- Total de pagamentos: 800 reais
- Déficit: 300 reais
- Banca cobre: 300 reais (descontado dos 50.000 fundos)
```

## Modificações Realizadas

### 1. Arquivos Criados
- `game/js/CRoomConfig.js` - Sistema de configuração das três salas
- `game/js/CMultiplayerManager.js` - Sistema de gerenciamento de jogadores e apostas
- `game/js/CRoomSelector.js` - Interface de seleção de salas
- `SISTEMA_SALAS.md` - Esta documentação

### 2. Arquivos Atualizados
- `game/index.html` - Inclusão dos novos scripts JavaScript
- `live_demo/index.html` - Inclusão dos novos scripts JavaScript
- `game/js/CInterface.js` - Interface de seleção de salas e informações da sala
- `game/js/CGame.js` - Integração com sistema multiplayer e validação de apostas

### 3. Arquivos Copiados
- `live_demo/js/CMultiplayerManager.js` - Cópia do sistema multiplayer
- `live_demo/js/CRoomSelector.js` - Cópia da interface de seleção

## Interface Atualizada

### Informações da Sala na Mesa
As informações da sala são exibidas no **espaço verde da mesa** (posição x=450, y=50) mostrando:
- Nome da sala atual (Bronze/Prata/Ouro)
- Número de jogadores atuais/máximo (ex: 3/8)
- Aposta mínima da sala
- Aposta máxima da sala

### Botão "TROCAR SALA"
- Localizado logo abaixo das informações da sala
- Abre uma interface modal com as três salas disponíveis
- Cada sala mostra sua cor característica, limites e número de jogadores

### Seletor de Salas
- Interface visual com três opções coloridas (Bronze, Prata, Ouro)
- Mostra informações detalhadas de cada sala
- Indica salas lotadas com transparência
- Destaca a sala atual com efeito visual

## Benefícios do Sistema

1. **Multiplayer Real**: Até 8 jogadores por sala simultaneamente
2. **Níveis Progressivos**: Três salas com diferentes limites de apostas
3. **Sistema da Banca**: Cobertura automática para apostas não correspondidas
4. **Interface Intuitiva**: Seleção visual de salas com informações claras
5. **Validação Automática**: Verificação de limites de apostas por sala
6. **Escalabilidade**: Sistema preparado para futuras expansões

## Estados do Sistema

### Inicialização
- Jogador entra automaticamente na **Sala Bronze** (padrão)
- Sistema gera ID único e nome aleatório para o jogador
- Limites de aposta são definidos conforme a sala

### Mudança de Sala
- Validação se sala não está lotada (máximo 8 jogadores)
- Apostas atuais são validadas contra novos limites
- Apostas inválidas são automaticamente removidas
- Interface é atualizada com novos limites

### Processamento de Apostas
- Todas as apostas são registradas no sistema multiplayer
- Validação em tempo real contra limites da sala
- Sistema da banca calcula automaticamente cobertura necessária