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

## Configuração da Mesa

A mesa principal está sempre ativa e configurada com:
- Aposta mínima: 50 reais
- Aposta máxima: Sem limite
- Máximo de jogadores: 8

O sistema está preparado para futuras expansões caso seja necessário adicionar mais mesas.