# 🎮 GUIA RÁPIDO DE TESTE

## 🚀 Como Testar as Novas Funcionalidades

### 🎯 Teste Rápido (5 minutos)

#### 1. Abra o Jogo
```bash
# Se tiver servidor Node.js rodando:
npm start

# OU abra diretamente o arquivo HTML:
# Abra: /workspace/game/index.html no navegador
```

#### 2. Teste a Regra de Aposta Obrigatória

**Passo a Passo:**
```
1. Selecione uma ficha (ex: R$ 50)
2. Clique no botão "APOSTE AQUI" na mesa
3. Clique em "LANÇAR"
4. Aguarde o resultado dos dados

SE GANHAR (7 ou 11):
✅ Vai aparecer: "GANHOU! +100 R$ PRÓXIMA APOSTA: 100 R$"

5. Tente apostar R$ 50:
❌ Vai bloquear: "DEVE APOSTAR O VALOR INTEIRO!"

6. Aposte exatamente R$ 100:
✅ Vai liberar: "VALOR CORRETO! Agora lance os dados!"
```

**Resultado Esperado:**
- ✅ Sistema IMPEDE apostar menos que o valor ganho
- ✅ Sistema IMPEDE apostar mais que o valor ganho
- ✅ Sistema LIBERA apenas quando aposta o valor EXATO

---

#### 3. Teste o Sistema de Rodadas

**Passo a Passo:**
```
1. Faça uma aposta de R$ 50
2. Clique em "LANÇAR"
3. TENTE clicar em "LANÇAR" novamente RAPIDAMENTE

❌ Vai aparecer: "AGUARDE SUA VEZ! O BOTÃO SERÁ LIBERADO..."

4. Aguarde a animação dos dados terminar
5. Aguarde 1 segundo

✅ Botão "LANÇAR" será LIBERADO automaticamente
```

**Resultado Esperado:**
- ✅ Botão bloqueia durante animação
- ✅ Mensagem clara quando tenta jogar fora de hora
- ✅ Botão libera automaticamente após 1 segundo

---

### 👥 Teste Multiplayer (10 minutos)

#### 1. Abra 2 Abas do Navegador

**Aba 1 (Jogador 1):**
```
1. Abra: http://localhost:3000/game/index.html
2. Observe: "SALA: BRONZE - JOGADORES: 1/10"
```

**Aba 2 (Jogador 2):**
```
1. Abra: http://localhost:3000/game/index.html
2. Observe: "SALA: BRONZE - JOGADORES: 2/10"
```

#### 2. Teste o Sistema de Turno

**Na Aba 1:**
```
1. Faça aposta de R$ 100
2. Clique em "LANÇAR"
3. Observe a animação
```

**Na Aba 2 (SIMULTANEAMENTE):**
```
1. Tente clicar em "LANÇAR"
2. ❌ Vai mostrar: "AGUARDE SUA VEZ..."
3. Observe: "JOGADOR 1/2: 30s" (timer)
4. Aguarde Jogador 1 terminar
5. ✅ Sua vez! "SUA VEZ! Clique para lançar"
```

**Resultado Esperado:**
- ✅ Apenas um jogador pode lançar por vez
- ✅ Outros jogadores veem "AGUARDE SUA VEZ"
- ✅ Timer mostra qual jogador está jogando
- ✅ Sistema roda entre os jogadores

---

## 🐛 Checklist de Validação

### Regra de Aposta Obrigatória:
- [ ] Ao ganhar, mostra valor que deve apostar
- [ ] Bloqueia aposta menor que o valor ganho
- [ ] Bloqueia aposta maior que o valor ganho
- [ ] Libera quando aposta valor exato
- [ ] Reset quando perde
- [ ] Reset quando clica em LIMPAR

### Sistema de Rodadas:
- [ ] Botão bloqueia após clicar em LANÇAR
- [ ] Mensagem "AGUARDE" aparece se clicar novamente
- [ ] Botão libera após 1 segundo (single player)
- [ ] Em multiplayer, apenas jogador da vez pode lançar
- [ ] Timer mostra tempo restante no turno
- [ ] Mensagem clara de quem está jogando

### Geral:
- [ ] Todas as mensagens estão em PORTUGUÊS
- [ ] Não há erros no console do navegador
- [ ] Jogo funciona em Desktop
- [ ] Jogo funciona em Mobile
- [ ] Som funciona corretamente

---

## 🔍 Verificar no Console do Navegador

Abra o Console (F12) e procure por:

**✅ Mensagens Esperadas:**
```
✅ Turno liberado! Você pode jogar novamente.
✅ Verificando resultado dos dados: 7 Estado: 1
✅ VALOR CORRETO! Agora lance os dados!
```

**❌ Erros NÃO Esperados:**
```
❌ Undefined variable
❌ Cannot read property
❌ Syntax error
```

Se ver erros, anote a mensagem e o número da linha.

---

## 📱 Testar no Mobile

1. Abra o jogo no celular
2. Faça todos os testes acima
3. Verifique se:
   - [ ] Botões são clicáveis
   - [ ] Mensagens são legíveis
   - [ ] Não há problemas de layout
   - [ ] Sistema de turno funciona

---

## 🎯 Teste Completo (20 minutos)

### Cenário 1: Jogador Ganha Várias Vezes
```
1. Aposta R$ 50
2. Ganha R$ 100
3. DEVE apostar R$ 100 (teste: funciona?)
4. Lança e ganha R$ 200
5. DEVE apostar R$ 200 (teste: funciona?)
6. Lança e ganha R$ 400
7. DEVE apostar R$ 400 (teste: funciona?)
```

### Cenário 2: Jogador Ganha e Perde
```
1. Aposta R$ 100
2. Ganha R$ 200
3. DEVE apostar R$ 200
4. Aposta R$ 200 e PERDE
5. Pode apostar qualquer valor (teste: funciona?)
6. Aposta R$ 50 (deve permitir)
```

### Cenário 3: Jogador Ganha e Limpa
```
1. Aposta R$ 100
2. Ganha R$ 200
3. DEVE apostar R$ 200
4. Clica em "LIMPAR APOSTAS"
5. Pode apostar qualquer valor (teste: funciona?)
6. Aposta R$ 50 (deve permitir)
```

### Cenário 4: Multiplayer - 3 Jogadores
```
Abra 3 abas do navegador

ABA 1 (Jogador 1):
1. Aposta R$ 100 e lança
2. Aguarda resultado
3. Vê "AGUARDE SUA VEZ" (não é mais seu turno)

ABA 2 (Jogador 2):
1. Durante Jogador 1: vê "AGUARDE SUA VEZ"
2. Depois: vê "SUA VEZ!"
3. Aposta R$ 100 e lança
4. Vê "AGUARDE SUA VEZ"

ABA 3 (Jogador 3):
1. Durante Jogadores 1 e 2: vê "AGUARDE"
2. Depois: vê "SUA VEZ!"
3. Aposta e lança

Ciclo se repete: 1 → 2 → 3 → 1 → 2 → 3...
```

---

## ✅ Tudo Funcionando?

Se todos os testes passaram:
🎉 **Implementação está 100% funcional!**

Se algum teste falhou:
1. Anote qual teste falhou
2. Copie a mensagem de erro do console
3. Tire screenshot se possível
4. Reporte o problema

---

## 📞 Suporte

Se tiver dúvidas ou problemas:
1. Verifique os arquivos de documentação:
   - `RESUMO_IMPLEMENTACAO.md`
   - `REGRAS_APOSTA_IMPLEMENTADAS.md`
2. Verifique o console do navegador (F12)
3. Teste em modo incógnito (para descartar cache)

---

## 🎲 Divirtam-se!

O jogo está pronto para uso com todas as novas funcionalidades implementadas!
