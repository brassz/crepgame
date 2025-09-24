# Sistema de Seleção de Mesas - Craps Game

## Visão Geral

Foi implementado um sistema completo de seleção de mesas com 3 níveis diferentes: **Bronze**, **Prata** e **Ouro**, cada uma com suas próprias configurações de apostas.

## Características das Mesas

### 🥉 Mesa Bronze
- **Aposta Mínima**: R$ 50
- **Aposta Máxima**: R$ 1.000  
- **Máximo de Jogadores**: 8
- **Descrição**: Mesa para iniciantes
- **Cor**: Bronze (#CD7F32)

### 🥈 Mesa Prata
- **Aposta Mínima**: R$ 100
- **Aposta Máxima**: R$ 3.000
- **Máximo de Jogadores**: 6  
- **Descrição**: Mesa intermediária
- **Cor**: Prata (#C0C0C0)

### 🥇 Mesa Ouro
- **Aposta Mínima**: R$ 200
- **Aposta Máxima**: R$ 5.000
- **Máximo de Jogadores**: 4
- **Descrição**: Mesa VIP
- **Cor**: Ouro (#FFD700)

## Arquivos Modificados/Criados

### Novos Arquivos
- `game/js/CRoomSelector.js` - Componente de seleção de mesas
- `SISTEMA_MESAS.md` - Esta documentação

### Arquivos Modificados
1. **`game/js/CRoomConfig.js`** - Configurações das mesas
2. **`game/js/CLang.min.js`** - Textos em português 
3. **`game/js/CMain.js`** - Adicionado novo estado de seleção
4. **`game/js/CMenu.js`** - Redirecionamento para seleção de mesas
5. **`game/js/settings.js`** - Novo estado `STATE_ROOM_SELECTOR`
6. **`game/js/CGame.js`** - Carregamento da mesa selecionada
7. **`game/index.html`** - Inclusão do script CRoomSelector.js
8. **`live_demo/index.html`** - Atualização completa dos scripts

## Fluxo de Funcionamento

1. **Menu Principal** → Botão "JOGAR"
2. **Seleção de Mesas** → Interface com 3 opções (Bronze, Prata, Ouro)
3. **Confirmação** → Botão "INICIAR" após seleção
4. **Jogo** → Mesa carregada com configurações específicas

## Interface da Seleção de Mesas

### Elementos Visuais
- **Fundo escuro semitransparente** para destaque
- **Cartões coloridos** para cada mesa com gradiente
- **Animações suaves** de entrada e saída
- **Destaque visual** da mesa selecionada (borda dourada)
- **Informações detalhadas** de cada mesa

### Informações Exibidas
- Nome da mesa
- Valor mínimo e máximo de aposta
- Número máximo de jogadores
- Descrição da mesa

## Controles

- **Seleção**: Clique no cartão da mesa desejada
- **Confirmação**: Botão "INICIAR" (aparece após seleção)
- **Voltar**: Botão "VOLTAR" para retornar ao menu

## Armazenamento

A mesa selecionada é salva no `localStorage` com a chave `selected_room`, permitindo que a escolha persista entre sessões.

## Interface do Jogo

Durante o jogo, as informações da mesa atual são exibidas na área verde da mesa de dados:
- Nome da sala
- Número de jogadores online  
- Aposta mínima
- Aposta máxima

## Validações

O sistema implementa validações automáticas:
- **Dinheiro insuficiente**: Bloqueia apostas se o jogador não tem crédito
- **Aposta máxima**: Impede apostas acima do limite da mesa
- **Aposta mínima**: Garante que a aposta mínima seja respeitada

## Personalização

Para adicionar novas mesas ou modificar configurações, edite o arquivo `game/js/CRoomConfig.js` na função `_init()`.

## Compatibilidade

O sistema foi implementado tanto na pasta `game/` quanto em `live_demo/`, mantendo compatibilidade com todas as versões do jogo.

---

**Status**: ✅ **Implementado e Funcional**

O sistema está totalmente operacional e pronto para uso em produção.