# Ajustes Visuais da Interface

## 🎨 Mudanças Implementadas

### 1. Reposicionamento do Botão "PASSAR DADO"

**Problema Anterior**: 
- Botão estava em cima do botão "LANÇAR" (Y: 160)
- Muito próximo, causava confusão visual

**Solução Implementada**:
```javascript
// ANTES
_oPassDiceBut = new CTextButton(1080, 160, ...); // Muito próximo do botão lançar

// DEPOIS
_oPassDiceBut = new CTextButton(1080, 240, ...); // Mais espaçado
```

**Nova Posição**:
- X: 1080 (mesma coluna)
- Y: 240 (mais abaixo, com espaço)
- Texto: "PASSAR DADO" (mais descritivo)
- Fonte: 18 (legível)

**Layout Vertical Agora**:
```
Y = 120:  [LANÇAR DADOS]  ← Botão principal grande
Y = 180:  Timer de turno
Y = 240:  [PASSAR DADO]   ← Botão separado, claro
```

### 2. Remoção da Caixa "TRAVADO" Separada

**Problema Anterior**:
- Havia uma caixa separada "🔒 TRAVADO" (251, 540)
- Interface ficava poluída com muitas caixas
- Confuso ter "APOSTA ATUAL" e "TRAVADO" separados

**Solução Implementada**:
- ✅ Removida a caixa separada `_oLockedBalanceText`
- ✅ Removido o background `oLockedBalanceBg`
- ✅ Removido o label "🔒 TRAVADO"

**Código Removido**:
```javascript
// REMOVIDO - Não existe mais
var oLockedBalanceBg = createBitmap(...);
var oLockedBalanceLabel = new CTLText(..., "🔒 TRAVADO", ...);
_oLockedBalanceText = new CTLText(...);
```

### 3. Uso da Caixa "APOSTA ATUAL" para Saldo Travado

**Conceito**:
- A caixa "APOSTA ATUAL" agora serve dupla função:
  1. **Antes de ganhar**: Mostra valor das apostas na mesa
  2. **Após ganhar**: Mostra valor travado até passar o dado

**Implementação**:

#### Interface (`CInterface.js`)
```javascript
this.setLockedBalance = function(iLockedBalance){
    // Usa a mesma caixa de aposta atual para mostrar saldo travado
    // Se há saldo travado, mostra ele na caixa de aposta atual
    if(iLockedBalance > 0){
        _oBetAmountText.refreshText(iLockedBalance.toFixed(2) + TEXT_CURRENCY);
    }
};
```

#### Lógica do Jogo (`CGame.js`)
```javascript
// Ao ganhar
_iLockedBalance = iAutoWin;
_oInterface.setCurBet(_iLockedBalance); // Usa mesma caixa

// Ao perder
_iLockedBalance = 0;
_oInterface.setCurBet(0); // Zera a caixa

// Ao passar o dado
_oMySeat.showWin(_iLockedBalance); // Libera para saldo disponível
_iLockedBalance = 0;
_oInterface.setCurBet(0); // Zera a caixa
```

## 📊 Layout Final da Interface

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│  [DINHEIRO]      [APOSTA ATUAL]    [LIMITES]       │
│   1000.00          200.00          Min: 50         │
│                  ↑ Saldo Travado   Max: 1000       │
│                                                     │
│                                         [LANÇAR]  ← Y: 120
│                                                     │
│                                      Timer: 45s   ← Y: 180
│                                                     │
│                                    [PASSAR DADO]  ← Y: 240
│                                                     │
└─────────────────────────────────────────────────────┘
```

## 🎯 Fluxo Visual do Saldo

### Cenário 1: Jogador Aposta
```
APOSTA ATUAL: 100.00  ← Mostra valor apostado
```

### Cenário 2: Jogador Ganha
```
APOSTA ATUAL: 200.00  ← Mostra saldo TRAVADO
```
- Mensagem: "⚠️ PASSE O DADO PARA LIBERAR!"
- A mesma caixa agora representa o saldo travado
- Visualmente mais limpo e intuitivo

### Cenário 3: Jogador Passa o Dado
```
APOSTA ATUAL: 0.00    ← Resetado
DINHEIRO: 1200.00     ← Saldo liberado e adicionado aqui
```
- Mensagem: "SALDO LIBERADO! +200"
- Saldo travado foi para o saldo disponível

### Cenário 4: Jogador Perde
```
APOSTA ATUAL: 0.00    ← Resetado
DINHEIRO: 1000.00     ← Não aumenta
```
- Mensagem: "PERDEU TUDO!"
- Perde tanto a aposta quanto o saldo travado

## 🎨 Vantagens da Nova Interface

### 1. **Mais Limpa**
- ❌ Antes: 3 caixas (Dinheiro, Aposta Atual, Travado)
- ✅ Agora: 2 caixas (Dinheiro, Aposta Atual)

### 2. **Mais Intuitiva**
- "APOSTA ATUAL" mostra o que você tem em jogo
- Se ganhou, está travado ali
- Conceito único: "valor atual na rodada"

### 3. **Menos Poluída**
- Menos elementos visuais
- Mais espaço para o jogo
- Foco no essencial

### 4. **Botões Bem Espaçados**
```
  [LANÇAR DADOS]  ← Grande, destaque
       ↓ 60px
     Timer
       ↓ 60px
  [PASSAR DADO]   ← Separado, claro
```

## 🔧 Mudanças Técnicas

### Arquivos Modificados

#### 1. `game/js/CInterface.js`

**Removido**:
- Variável `_oLockedBalanceText`
- Background `oLockedBalanceBg`
- Label "🔒 TRAVADO"
- Toda a seção de display separado de saldo travado

**Modificado**:
- Posição do botão "PASSAR DADO": Y de 160 → 240
- Posição do timer: Y de 220 → 180
- Texto do botão: "PASSAR" → "PASSAR DADO"
- Tamanho da fonte: 20 → 18

**Função `setLockedBalance()`**:
- Agora usa `_oBetAmountText` ao invés de `_oLockedBalanceText`
- Reutiliza a caixa existente de aposta atual

#### 2. `game/js/CGame.js`

**Substituído**:
```javascript
// ANTES
_oInterface.setLockedBalance(_iLockedBalance);

// DEPOIS
_oInterface.setCurBet(_iLockedBalance);
```

**Mensagens Atualizadas**:
```javascript
// ANTES
"⚠️ SALDO TRAVADO ATÉ PASSAR O DADO!"

// DEPOIS
"⚠️ PASSE O DADO PARA LIBERAR!"
```

## 🧪 Como Testar as Mudanças Visuais

### Teste 1: Verificar Posicionamento dos Botões

1. **Inicie o jogo**
2. **Verifique no canto superior direito**:
   - ✅ Botão "LANÇAR DADOS" no topo
   - ✅ Timer abaixo
   - ✅ Botão "PASSAR DADO" bem separado, mais abaixo
   - ✅ Não há sobreposição de elementos

### Teste 2: Verificar Caixa Única de Aposta

1. **Verifique que não há caixa "TRAVADO" separada**:
   - ✅ Apenas "DINHEIRO" e "APOSTA ATUAL" visíveis
   - ✅ Nenhuma caixa amarela "🔒 TRAVADO"

2. **Faça uma aposta de 100**:
   - ✅ "APOSTA ATUAL" mostra: 100.00

3. **Lance e ganhe (resultado 7)**:
   - ✅ "APOSTA ATUAL" mostra: 200.00 (o saldo travado)
   - ✅ "DINHEIRO" não aumenta
   - ✅ Mensagem: "⚠️ PASSE O DADO PARA LIBERAR!"

4. **Clique em "PASSAR DADO"**:
   - ✅ "APOSTA ATUAL" volta para: 0.00
   - ✅ "DINHEIRO" aumenta em 200
   - ✅ Mensagem: "SALDO LIBERADO! +200"

### Teste 3: Verificar Perda com Saldo Travado

1. **Ganhe 200 (travado na "APOSTA ATUAL")**
2. **Aposte novamente e perca**
3. **Verifique**:
   - ✅ "APOSTA ATUAL" volta para 0.00
   - ✅ "DINHEIRO" não aumenta
   - ✅ Saldo travado foi perdido

## 📝 Resumo das Melhorias

| Aspecto | Antes | Depois |
|---------|-------|--------|
| **Caixas de Info** | 3 (Dinheiro, Aposta, Travado) | 2 (Dinheiro, Aposta) |
| **Botão "PASSAR"** | Y: 160 (em cima do lançar) | Y: 240 (bem separado) |
| **Layout** | Confuso, elementos sobrepostos | Limpo, bem espaçado |
| **Intuitividade** | Duas caixas para saldo | Uma caixa multi-função |
| **Poluição Visual** | Alta | Baixa |

## 🎯 Princípios de Design Aplicados

1. **KISS (Keep It Simple, Stupid)**:
   - Menos elementos = mais clareza
   - Reutilizar componentes existentes

2. **Affordance**:
   - "APOSTA ATUAL" mostra exatamente o que está em jogo
   - Contexto determina o significado

3. **Espaçamento**:
   - 60px entre elementos críticos
   - Evita cliques acidentais

4. **Feedback Visual**:
   - Mensagens claras sobre estado do saldo
   - Mesmo componente em contextos diferentes

## 🚀 Resultado Final

Interface mais limpa, intuitiva e profissional:
- ✅ Botões bem posicionados
- ✅ Informação clara e concisa
- ✅ Menos elementos = mais foco no jogo
- ✅ Layout responsivo e organizado

O jogador agora entende claramente:
- Quanto tem de dinheiro disponível
- Quanto está em jogo na rodada atual (apostado ou travado)
- Quando pode passar o dado (botão separado e claro)

**Interface otimizada para melhor experiência do usuário!** 🎲✨

