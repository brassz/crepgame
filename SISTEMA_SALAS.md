# Sistema Avançado de Salas

## Visão Geral

O sistema avançado de salas permite a criação e gerenciamento de múltiplas salas de jogo simultâneas, com diferentes limites de aposta e controle dinâmico de jogadores. O sistema suporta até **10 salas simultâneas** de três tipos diferentes.

## Tipos de Salas

### Sala Bronze
**Sala Bronze** (`bronze`)
- Aposta mínima: R$ 50
- Aposta máxima: R$ 1.000
- Máximo de jogadores: 8 por sala
- Descrição: Ideal para jogadores iniciantes
- Cor: Bronze (#CD7F32)

### Sala Prata
**Sala Prata** (`prata`)
- Aposta mínima: R$ 100
- Aposta máxima: R$ 3.000
- Máximo de jogadores: 8 por sala
- Descrição: Para jogadores intermediários
- Cor: Prata (#C0C0C0)

### Sala Ouro
**Sala Ouro** (`ouro`)
- Aposta mínima: R$ 200
- Aposta máxima: R$ 5.000
- Máximo de jogadores: 8 por sala
- Descrição: Para jogadores experientes
- Cor: Ouro (#FFD700)

## Funcionalidades do Sistema

### Limitação de Salas Simultâneas
- Máximo de **10 salas ativas** ao mesmo tempo
- Sistema automaticamente gerencia criação e remoção de salas
- Salas são removidas quando ficam vazias

### Controle de Jogadores
- Máximo de 8 jogadores por sala
- Contagem automática de jogadores ativos
- Status da sala atualizado dinamicamente (waiting, playing, full)

### Seleção Inteligente de Salas
- Interface gráfica para seleção de salas
- Busca automática por salas disponíveis
- Criação automática de novas salas quando necessário

## Como Usar

### Seleção de Sala pelo Jogador
Ao iniciar o jogo, o sistema automaticamente exibe uma interface para seleção de salas:

```javascript
// O seletor de salas é exibido automaticamente
// Jogador escolhe entre Bronze, Prata ou Ouro
// Sistema encontra sala disponível ou cria nova
```

### Trocar de Sala Durante o Jogo
```javascript
// Botão "TROCAR SALA" disponível na interface
s_oGame.showSalaSelector();
```

### Gerenciamento Programático de Salas

```javascript
// Criar nova sala
var oNewSala = s_oRoomConfig.createSala("bronze");

// Entrar em uma sala
s_oRoomConfig.joinSala(salaId);

// Sair de uma sala
s_oRoomConfig.leaveSala(salaId);

// Obter salas disponíveis
var aAvailableSalas = s_oRoomConfig.getAvailableSalas("prata");

// Buscar ou criar sala
var oSala = s_oRoomConfig.findOrCreateSala("ouro");
```

### Obter Informações de Salas

```javascript
// Obter configuração de sala específica
var oRoomConfig = s_oRoomConfig.getRoomConfig("bronze_1672531200000");
console.log(oRoomConfig.name); // "Sala Bronze"
console.log(oRoomConfig.min_bet); // 50
console.log(oRoomConfig.max_bet); // 1000

// Obter todas as salas ativas
var oActiveSalas = s_oRoomConfig.getActiveSalas();

// Verificar limites do sistema
var iMaxSalas = s_oRoomConfig.getMaxSimultaneousSalas(); // 10
var iCurrentCount = s_oRoomConfig.getCurrentSalasCount(); // Número atual
```

## Arquitetura do Sistema

### Estrutura dos Arquivos

**Arquivos Principais:**
- `game/js/CRoomConfig.js` - Gerenciador central de salas e configurações
- `game/js/CSalaSelector.js` - Interface de seleção de salas
- `game/js/CGame.js` - Lógica principal do jogo com integração de salas
- `game/js/CInterface.js` - Interface do usuário com controles de sala

**Arquivos HTML Atualizados:**
- `game/index.html` - Inclusão dos novos scripts
- `live_demo/index.html` - Versão de demonstração atualizada

### Interface do Usuário

**Seletor de Salas:**
- Modal com 3 opções de salas (Bronze, Prata, Ouro)
- Informações em tempo real de salas disponíveis
- Contador de salas ativas no sistema
- Design visual diferenciado por tipo de sala

**Informações da Sala na Mesa:**
- Exibidas no espaço verde da mesa (x=450, y=50)
- Nome da sala atual
- Contador de jogadores ativos/máximo
- Limites de aposta atualizados dinamicamente

**Controles Adicionais:**
- Botão "TROCAR SALA" para mudança durante o jogo
- Atualização automática dos limites de aposta na interface
- Limpeza automática de apostas ao trocar de sala

## Benefícios do Sistema Avançado

### Para Jogadores
1. **Flexibilidade**: Escolha de sala baseada no orçamento
2. **Controle de Risco**: Limites de aposta adequados ao perfil
3. **Experiência Social**: Salas com número controlado de jogadores
4. **Interface Intuitiva**: Seleção visual e informativa

### Para o Sistema
1. **Escalabilidade**: Suporte a múltiplas salas simultâneas
2. **Gerenciamento Automático**: Criação/remoção dinâmica de salas
3. **Controle de Recursos**: Limite máximo de salas para otimização
4. **Flexibilidade**: Fácil adição de novos tipos de sala

### Para Administradores
1. **Monitoramento**: Controle total sobre salas ativas
2. **Configuração**: Limites personalizáveis por tipo de sala
3. **Otimização**: Sistema inteligente de gerenciamento de salas
4. **Estatísticas**: Informações em tempo real sobre uso do sistema

## Configurações do Sistema

**Limites Globais:**
- Máximo de 10 salas simultâneas
- Máximo de 8 jogadores por sala
- Remoção automática de salas vazias

**Tipos de Sala Configurados:**
- Bronze: R$ 50 - R$ 1.000
- Prata: R$ 100 - R$ 3.000  
- Ouro: R$ 200 - R$ 5.000

**Status de Sala:**
- `waiting`: Aguardando jogadores
- `playing`: Jogo em andamento
- `full`: Sala lotada (8/8 jogadores)