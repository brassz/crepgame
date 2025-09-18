# Sistema de Configuração da Mesa

## Visão Geral

O sistema de configuração da mesa permite definir as regras da mesa principal do jogo. A mesa tem **aposta mínima de 50 reais** e **sem limite máximo**.

## Configuração da Mesa

### Mesa Principal

**Mesa Principal** (`principal`)
- Aposta mínima: 50 reais
- Aposta máxima: **Sem limite**
- Máximo de jogadores: 8
- Descrição: Mesa principal do jogo

## Como Usar

### Usar a Mesa Principal

```javascript
// Usar a mesa principal (padrão)
s_oGame.changeRoom("principal");
```

### Obter Configuração de Sala

```javascript
// Obter configuração completa
var oRoomConfig = s_oRoomConfig.getRoomConfig("principal");
console.log(oRoomConfig.name); // "Mesa Principal"
console.log(oRoomConfig.min_bet); // 50

// Obter valores específicos
var iMinBet = s_oRoomConfig.getRoomMinBet("principal"); // 50
var iMaxBet = s_oRoomConfig.getRoomMaxBet("principal"); // null (sem limite)
var sRoomName = s_oRoomConfig.getRoomName("principal"); // "Mesa Principal"
```

## Modificações Realizadas

### 1. Arquivos Atualizados
- `game/index.html` - Aposta mínima alterada para 50 reais, limite máximo removido
- `live_demo/index.html` - Aposta mínima alterada para 50 reais, limite máximo removido
- `readme/index.html` - Aposta mínima alterada para 50 reais, limite máximo removido
- `ctl_arcade_wp_plugin/ctl-craps/game/index.php` - Aposta mínima alterada para 50 reais, limite máximo removido

### 2. Novos Arquivos
- `game/js/CRoomConfig.js` - Sistema de configuração de salas
- `SISTEMA_SALAS.md` - Esta documentação

### 3. Arquivos Modificados
- `game/js/CInterface.js` - Integração com sistema de salas
- `game/js/CGame.js` - Função para trocar de salas

## Interface Atualizada

As informações da sala agora são exibidas no **espaço verde da mesa** (posição x=450, y=50) mostrando:
- Nome da sala
- Número de jogadores atuais/máximo
- Aposta mínima e máxima (ou "Sem limite" quando não há limite)

## Benefícios

1. **Simplicidade**: Uma única mesa com configuração clara
2. **Configuração Centralizada**: Todas as configurações em um local
3. **Interface Dinâmica**: Informações da mesa atualizadas automaticamente
4. **Aposta Mínima Padronizada**: Mesa com aposta mínima de 50 reais
5. **Sem Limite Máximo**: Jogadores podem apostar qualquer valor acima da aposta mínima
6. **Sistema Multiplayer**: Salas compartilhadas com outros jogadores em tempo real

## Configuração da Mesa

A mesa principal está sempre ativa e configurada com:
- Aposta mínima: 50 reais
- Aposta máxima: Sem limite
- Máximo de jogadores: 8

## Sistema Multiplayer

O jogo agora suporta **salas compartilhadas multiplayer** onde:

- **Salas são compartilhadas**: Os jogadores são automaticamente direcionados para salas existentes com espaço disponível
- **Criação inteligente**: Novas salas só são criadas quando todas as salas existentes atingem a capacidade máxima
- **Sincronização em tempo real**: Estados de jogo, apostas e resultados são sincronizados entre todos os jogadores
- **Interface de seleção**: Painel visual para escolher entre diferentes tipos de salas

### Tipos de Salas Disponíveis

1. **Mesa Principal** - Aposta mín: 50 reais, 8 jogadores
2. **Mesa VIP** - Aposta mín: 500 reais, 6 jogadores  
3. **Mesa Iniciante** - Aposta mín: 10 reais, 10 jogadores

Para detalhes completos do sistema multiplayer, consulte: `SISTEMA_MULTIPLAYER.md`

O sistema está preparado para futuras expansões e suporta tanto modo online (com WebSocket) quanto offline (local).