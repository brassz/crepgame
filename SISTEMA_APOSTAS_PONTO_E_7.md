# Sistema de Apostas no Ponto e no 7

## Resumo das Mudanças

Foi implementado um novo sistema que permite aos jogadores apostarem especificamente no número do PONTO ou no número 7 durante a fase POINT do jogo de Craps.

## Como Funciona

### 1. Estabelecimento do Ponto

Quando o shooter (jogador com os dados) faz a primeira jogada e NÃO tira 2, 3, 7, 11 ou 12, um PONTO é estabelecido (números 4, 5, 6, 8, 9 ou 10).

### 2. Período de Apostas (7 segundos)

Assim que o ponto é estabelecido:
- **Aparecem dois botões grandes na tela:**
  - **"PONTO: X"** - Para apostar no número do ponto
  - **"7"** - Para apostar no número 7

- **Todos os jogadores têm 7 SEGUNDOS para apostar**
- **Um contador regressivo é exibido na tela**
- Durante esses 7 segundos, qualquer jogador pode:
  1. Selecionar uma ficha (valor da aposta)
  2. Clicar no botão "PONTO: X" ou "7"
  3. Repetir para apostar mais fichas

### 3. Sistema de Apostas

**⚠️ IMPORTANTE: APENAS OS OUTROS JOGADORES PODEM APOSTAR!**
- O **SHOOTER** (jogador com os dados) **NÃO PODE** apostar no ponto ou no 7
- Se o shooter tentar clicar nos botões, receberá uma mensagem de bloqueio
- Apenas os **outros jogadores** na sala podem fazer essas apostas

#### Como Apostar no Ponto (OUTROS JOGADORES):
1. Selecione o valor da ficha que deseja apostar
2. Clique no botão **"PONTO: X"**
3. O valor será deduzido do seu saldo
4. Aparecerá uma mensagem confirmando sua aposta

#### Como Apostar no 7 (OUTROS JOGADORES):
1. Selecione o valor da ficha que deseja apostar
2. Clique no botão **"7"**
3. O valor será deduzido do seu saldo
4. Aparecerá uma mensagem confirmando sua aposta

### 4. Resultado das Apostas

#### Se o shooter rolar o NÚMERO DO PONTO:
- ✅ **Quem apostou no PONTO GANHA:**
  - **4 ou 10:** Recebe o DOBRO (2x)
  - **5 ou 9:** Recebe 1.5x (50% a mais)
  - **6 ou 8:** Recebe 1.25x (25% a mais)
- ❌ **Quem apostou no 7 PERDE**
- O shooter também ganha conforme a tabela acima

#### Se o shooter rolar o número 7:
- ✅ **Quem apostou no 7 GANHA:**
  - Recebe **4x** o valor apostado
- ❌ **Quem apostou no PONTO PERDE**
- O shooter perde sua aposta

#### Se o shooter rolar OUTRO NÚMERO:
- ⏳ **Ninguém ganha ou perde**
- O jogo continua e o shooter rola novamente
- Os jogadores NÃO podem fazer novas apostas (período de 7 segundos já passou)

### 5. Fechamento do Período de Apostas

Após 7 segundos:
- Os botões desaparecem
- Não é mais possível fazer apostas no ponto ou no 7
- Apenas o shooter pode continuar jogando até:
  - Tirar o número do ponto (ganha)
  - Tirar 7 (perde e passa o dado)

## Arquivos Modificados

### 1. `game/js/CInterface.js`
- Adicionadas variáveis para os botões de aposta:
  - `_oButBetOnPoint` - Botão para apostar no ponto
  - `_oButBetOnSeven` - Botão para apostar no 7
  - `_oPointBettingContainer` - Container que agrupa os botões

- Novas funções:
  - `_initPointBettingButtons()` - Cria os botões (ocultos inicialmente)
  - `showPointBettingButtons(iPointNumber)` - Mostra os botões com o número do ponto
  - `hidePointBettingButtons()` - Oculta os botões
  - `_onBetOnPoint()` - Processa clique no botão do ponto
  - `_onBetOnSeven()` - Processa clique no botão do 7

### 2. `game/js/CGame.js`
- Adicionadas variáveis para armazenar apostas:
  - `_aPointBets` - Armazena apostas no ponto por número
  - `_aSevenBets` - Armazena apostas no 7

- Novas funções:
  - `onBetOnPoint()` - Registra aposta no ponto
  - `onBetOnSeven()` - Registra aposta no 7

- Modificações na função `_assignNumber()`:
  - Agora chama `_oInterface.showPointBettingButtons(iNumber)` quando ponto é estabelecido
  - Atualiza mensagem para "APOSTE NO PONTO OU NO 7!"

- Modificações na função `_checkWinForBet()`:
  - Processa pagamentos das apostas no ponto
  - Processa pagamentos das apostas no 7
  - Limpa apostas após resolução
  - Oculta botões quando necessário

## Multiplicadores de Pagamento

### Apostas no PONTO:
| Número | Probabilidade | Multiplicador | Pagamento |
|--------|--------------|---------------|-----------|
| 4 ou 10 | Baixa | 2x | Dobro |
| 5 ou 9 | Média | 1.5x | 50% a mais |
| 6 ou 8 | Alta | 1.25x | 25% a mais |

### Apostas no 7:
| Número | Multiplicador | Pagamento |
|--------|--------------|-----------|
| 7 | 4x | Quádruplo |

## Observações Importantes

1. **Modo Multiplayer:** Este sistema só funciona em modo multiplayer (quando conectado ao Socket.IO)

2. **APENAS OUTROS JOGADORES:** O **shooter NÃO pode apostar** no ponto ou no 7. Apenas os outros jogadores na sala podem fazer essas apostas.

3. **Período Limitado:** Os 7 segundos começam IMEDIATAMENTE após o ponto ser estabelecido

4. **Uma Chance:** Se você perder o período de 7 segundos, não poderá mais apostar até o próximo ponto

5. **Múltiplas Apostas:** Você pode apostar várias vezes (múltiplas fichas) no mesmo número durante os 7 segundos

6. **Sem Limite de Apostas:** Durante os 7 segundos, você pode apostar tanto no ponto quanto no 7, se desejar

7. **Feedback Visual:** 
   - Mensagens na tela confirmam cada aposta
   - Sons de fichas são reproduzidos
   - Contador regressivo é sempre visível
   - Mensagens diferentes para o shooter e outros jogadores

## Exemplo de Jogo

1. **Shooter (Jogador 1) faz primeira jogada:** Tira 5 (estabelece ponto em 5)
2. **Botões aparecem:** "PONTO: 5" e "7" (apenas para os outros jogadores)
3. **Contador:** "⏰ 7s" começando a contar
4. **Jogador 1 (shooter):** Vê mensagem "AGUARDE OS OUTROS JOGADORES" - NÃO pode apostar
5. **Jogador 2:** Aposta $10 no ponto 5
6. **Jogador 3:** Aposta $20 no 7
7. **Após 7 segundos:** Botões desaparecem
8. **Shooter (Jogador 1) rola:** Tira 5
9. **Resultado:**
   - Jogador 2 ganha: $10 + ($10 × 1.5) = $25
   - Jogador 3 perde: $20
   - Shooter (Jogador 1) ganha sua aposta original também

## Testando o Sistema

Para testar:
1. Abra o jogo em modo multiplayer
2. Conecte-se com pelo menos 2 jogadores
3. Faça o shooter lançar os dados
4. Quando o ponto for estabelecido, os botões aparecerão
5. Teste apostando em cada botão
6. Observe os resultados quando o shooter jogar novamente

---

**Data de Implementação:** Janeiro 2026
**Versão:** 1.0

