# Sistema de Saldo Travado

## 📋 Descrição

O sistema de "Saldo Travado" garante que o dinheiro ganho pelo jogador não vai diretamente para seu saldo disponível. Ao invés disso, o valor ganho fica **travado** até que o jogador **passe o dado** para o próximo jogador.

## 🎯 Objetivo

Evitar que jogadores acumulem dinheiro ganho sem passar o dado, criando uma mecânica onde:
- Você ganha → Saldo fica travado
- Você passa o dado → Saldo travado é liberado e adicionado ao saldo disponível
- Você perde → Saldo travado também é perdido

## 💰 Como Funciona

### Cenário 1: Vitória com 7 ou 11 (Natural)

1. **Jogador aposta**: 100
2. **Resultado**: Dados somam 7 (ou 11)
3. **Ganho**: 200 (dobro da aposta)
4. **Saldo Travado**: +200 💛
5. **Saldo Disponível**: Não aumenta ainda
6. **Display**: Mostra "🔒 TRAVADO: 200"

### Cenário 2: Vitória com Ponto

1. **Jogador aposta**: 100
2. **Resultado**: Acerta o ponto (ex: 4, 5, 6, 8, 9, 10)
3. **Ganho**: Varia conforme o multiplicador
   - 4 ou 10: 200 (2x)
   - 5 ou 9: 50 (0.5x)
   - 6 ou 8: 25 (0.25x)
4. **Saldo Travado**: + valor ganho 💛
5. **Saldo Disponível**: Não aumenta ainda
6. **Display**: Mostra "🔒 TRAVADO: [valor]"

### Cenário 3: Passar o Dado (Liberação do Saldo)

1. **Jogador clica em "PASSAR"**
2. **Saldo Travado**: 200
3. **Sistema processa**:
   - Saldo travado é LIBERADO
   - 200 é adicionado ao saldo disponível
   - Mensagem: "SALDO LIBERADO! +200"
   - Som de vitória toca
4. **Saldo Travado**: 0
5. **Saldo Disponível**: +200 ✅
6. **Dado passa**: Para o próximo jogador

### Cenário 4: Perda (Perde Tudo)

1. **Saldo Travado**: 200
2. **Resultado**: Perde (2, 3, 12 ou 7 no ponto)
3. **Sistema processa**:
   - Perde a aposta atual
   - Perde o saldo travado também 💔
4. **Saldo Travado**: 0
5. **Saldo Disponível**: Não aumenta
6. **Mensagem**: "PERDEU TUDO!"

## 🎮 Fluxo Completo

```
┌─────────────────┐
│ Jogador Aposta  │
│     100         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Lança Dados    │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌────────┐ ┌────────┐
│ GANHOU │ │ PERDEU │
└───┬────┘ └───┬────┘
    │          │
    ▼          ▼
┌─────────────┐ ┌─────────────┐
│ Saldo       │ │ Perde Tudo  │
│ Travado     │ │ (inclusive  │
│ +200 💛     │ │  travado)   │
└──────┬──────┘ └─────────────┘
       │
       ▼
┌─────────────────┐
│ Clica "PASSAR"  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Saldo Liberado  │
│ +200 → Saldo    │
│ Disponível ✅   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Dado passa para │
│ próximo jogador │
└─────────────────┘
```

## 📊 Interface Visual

### Display de Saldo Travado

**Localização**: Abaixo do display "DINHEIRO" (esquerda inferior)

```
┌─────────────────┐
│    DINHEIRO     │
│     1000.00     │
└─────────────────┘
┌─────────────────┐
│  🔒 TRAVADO     │ ← Novo display
│     200.00      │   (em amarelo)
└─────────────────┘
```

**Características**:
- Cor: Amarelo (#ffde00) para destacar
- Ícone: 🔒 (cadeado) indicando que está travado
- Atualização: Em tempo real quando ganha ou passa

### Mensagens Visuais

1. **Ao Ganhar**:
   ```
   GANHOU! +200
   ⚠️ SALDO TRAVADO ATÉ PASSAR O DADO!
   ```

2. **Ao Passar o Dado**:
   ```
   SALDO LIBERADO! +200
   ```

3. **Ao Perder**:
   ```
   PERDEU TUDO!
   ```
   (Saldo travado é zerado silenciosamente)

## 🔧 Implementação Técnica

### Arquivos Modificados

#### 1. `game/js/CGame.js`

**Nova Variável**:
```javascript
var _iLockedBalance = 0;  // Saldo travado
```

**Modificações em `_checkWinForBet()`**:
- Ao ganhar: Adiciona ao `_iLockedBalance` ao invés de `showWin()`
- Não adiciona ao saldo disponível imediatamente
- Atualiza display de saldo travado

**Nova Lógica em `onPassDice()`**:
```javascript
if(_iLockedBalance > 0){
    _oMySeat.showWin(_iLockedBalance); // Libera para saldo disponível
    _oInterface.setLockedBalance(0);    // Zera display travado
    _iLockedBalance = 0;                // Reseta variável
}
```

**Ao Perder**:
```javascript
_iLockedBalance = 0;  // Perde o saldo travado também
_oInterface.setLockedBalance(0);
```

#### 2. `game/js/CInterface.js`

**Nova Variável**:
```javascript
var _oLockedBalanceText;  // Display do saldo travado
```

**Novo Display Visual**:
- Background: Mesmo sprite de `but_bg`
- Label: "🔒 TRAVADO" em amarelo
- Posição: (251, 540) - abaixo do dinheiro

**Nova Função**:
```javascript
this.setLockedBalance = function(iLockedBalance){
    _oLockedBalanceText.refreshText(iLockedBalance.toFixed(2) + TEXT_CURRENCY);
};
```

## ⚙️ Configurações

| Parâmetro | Valor | Descrição |
|-----------|-------|-----------|
| Cor do Texto | #ffde00 | Amarelo para destacar |
| Posição X | 251 | Alinhado com "DINHEIRO" |
| Posição Y | 540 | Abaixo do "DINHEIRO" |
| Tamanho Fonte | 16 | Mesmo tamanho dos outros valores |

## 🧪 Como Testar

### Teste 1: Ganhar e Passar
1. **Aposte**: 100
2. **Lance**: Consiga 7 ou 11
3. **Verifique**:
   - ✅ Mensagem "GANHOU! +200"
   - ✅ Saldo Disponível: Não aumenta
   - ✅ Saldo Travado: Mostra 200
4. **Clique**: Botão "PASSAR"
5. **Verifique**:
   - ✅ Mensagem "SALDO LIBERADO! +200"
   - ✅ Saldo Disponível: +200
   - ✅ Saldo Travado: Volta para 0
   - ✅ Dado passa para próximo jogador

### Teste 2: Ganhar e Perder
1. **Aposte**: 100
2. **Lance**: Consiga 7 (ganhe 200)
3. **Verifique**: Saldo Travado = 200
4. **Aposte**: Novamente
5. **Lance**: Consiga 2, 3 ou 12 (perca)
6. **Verifique**:
   - ✅ Mensagem "PERDEU TUDO!"
   - ✅ Saldo Travado: Volta para 0
   - ✅ Saldo Disponível: Não aumenta

### Teste 3: Múltiplas Vitórias
1. **Aposte**: 100
2. **Lance**: Ganhe 200 (travado)
3. **Aposte**: 100 novamente
4. **Lance**: Ganhe mais 200
5. **Verifique**:
   - ✅ Saldo Travado: 400 (acumula)
6. **Clique**: "PASSAR"
7. **Verifique**:
   - ✅ Saldo Disponível: +400

### Teste 4: Passar sem Saldo Travado
1. **Aposte**: 100
2. **Perca**: Resultado ruim
3. **Clique**: "PASSAR"
4. **Verifique**:
   - ✅ Dado passa normalmente
   - ✅ Nenhum saldo liberado
   - ✅ Nenhuma mensagem de saldo

## 🎯 Regras do Sistema

### ✅ Quando o Saldo Fica Travado

1. **Vitória com 7 ou 11** (Come Out)
   - Ganha dobro da aposta
   - Todo o valor vai para saldo travado

2. **Vitória com Ponto**
   - Ganha multiplicador baseado no ponto
   - Todo o valor vai para saldo travado

3. **Múltiplas Vitórias**
   - Valores acumulam no saldo travado
   - Não vão para saldo disponível

### ❌ Quando o Saldo Travado é Perdido

1. **Perde com 2, 3 ou 12** (Come Out)
   - Perde aposta atual
   - Perde saldo travado

2. **Perde com 7** (Durante Ponto)
   - Perde aposta atual
   - Perde saldo travado

### ✅ Quando o Saldo Travado é Liberado

1. **Clica em "PASSAR"**
   - Saldo travado vai para saldo disponível
   - Som de vitória toca
   - Mensagem visual aparece
   - Dado passa para próximo jogador

## 💡 Vantagens do Sistema

1. **Incentiva Passar o Dado**: Jogadores precisam passar para receber o dinheiro
2. **Risco/Recompensa**: Quanto mais ganhar antes de passar, mais pode perder
3. **Dinâmica Social**: Cria tensão e decisão estratégica
4. **Visualização Clara**: Display amarelo mostra claramente o que está em jogo
5. **Fairness**: Todos jogam com as mesmas regras

## 🐛 Solução de Problemas

### Problema: Saldo travado não aparece
**Solução**: Verifique se o sprite `but_bg` está carregado corretamente

### Problema: Saldo não libera ao passar
**Solução**: Verifique os logs do console. A função `onPassDice()` deve mostrar "💰 Liberando saldo travado"

### Problema: Saldo travado não zera ao perder
**Solução**: Verifique se `_iLockedBalance = 0` está sendo chamado em todos os casos de perda

### Problema: Display amarelo não aparece
**Solução**: Verifique se `_oLockedBalanceText` foi inicializado corretamente em `_init()`

## 📈 Estatísticas e Logs

### Logs no Console

```javascript
// Ao ganhar
console.log('💰 Saldo travado:', _iLockedBalance);

// Ao passar
console.log('💰 Liberando saldo travado:', _iLockedBalance);

// Ao perder
console.log('💔 Saldo travado perdido:', _iLockedBalance);
```

### Monitoramento

Para monitorar o saldo travado em tempo real:
1. Abra o console (F12)
2. Digite: `s_oGame._iLockedBalance` (se acessível)
3. Ou observe as mensagens de log automáticas

## 🚀 Melhorias Futuras

1. **Animação**: Mostrar animação quando saldo é travado/liberado
2. **Som Diferente**: Som específico para travar/liberar saldo
3. **Barra de Progresso**: Mostrar visualmente quanto está travado vs disponível
4. **Histórico**: Registrar quanto foi travado/liberado por rodada
5. **Limite**: Opção de limitar quanto pode ficar travado
6. **Auto-Passar**: Passar automaticamente após X vitórias consecutivas

## 📝 Resumo

O sistema de saldo travado adiciona uma camada estratégica ao jogo:
- **Ganha** → 💛 Fica Travado
- **Passa** → ✅ Liberado para usar
- **Perde** → 💔 Perde Tudo (inclusive travado)

Isso cria uma dinâmica onde jogadores precisam decidir:
- Continuar jogando arriscando perder tudo?
- Passar o dado e garantir o lucro?

**Balance perfeito entre risco e recompensa!** 🎲💰

