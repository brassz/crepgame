# 🔍 Como Ver as Alterações Sem Fazer Merge

## 📊 Situação Atual

Você está na branch: **`cursor/implementar-regras-de-aposta-52a3`**

Todas as alterações já foram commitadas automaticamente nesta branch.

Para ver o que foi modificado **ANTES de fazer merge com a main**, use os comandos abaixo:

---

## 🎯 Comandos para Ver as Alterações

### 1. Ver Resumo das Mudanças

```bash
# Ver estatísticas de quais arquivos foram modificados
git diff main..cursor/implementar-regras-de-aposta-52a3 --stat
```

**Resultado:**
- 33 arquivos modificados
- 5.789 linhas adicionadas
- 104 linhas removidas

---

### 2. Ver Apenas o Arquivo Principal Modificado

```bash
# Ver diferenças no arquivo CGame.js (código principal)
git diff main..cursor/implementar-regras-de-aposta-52a3 -- game/js/CGame.js
```

Este comando mostra **exatamente** o que mudou no código do jogo.

---

### 3. Ver Arquivos Novos Criados

```bash
# Ver lista de arquivos novos
git diff main..cursor/implementar-regras-de-aposta-52a3 --name-status | grep "^A"
```

**Arquivos de documentação criados:**
- `COMO_TESTAR.md`
- `REGRAS_APOSTA_IMPLEMENTADAS.md`
- `RESUMO_IMPLEMENTACAO.md`
- E outros...

---

### 4. Ver Diferenças de um Arquivo Específico (Visual)

```bash
# Ver mudanças no CGame.js com cores e contexto
git diff main..cursor/implementar-regras-de-aposta-52a3 -- game/js/CGame.js | less
```

Use as setas para navegar, `q` para sair.

---

### 5. Ver Lista de Commits Feitos

```bash
# Ver histórico de commits na branch
git log main..cursor/implementar-regras-de-aposta-52a3 --oneline
```

**Resultado:**
```
65e3937 feat: Implement mandatory bet and turn system
```

---

## 🖥️ Ver Alterações de Forma Visual (Recomendado)

### Opção 1: GitHub/GitLab (Melhor opção)

Se você estiver usando GitHub ou GitLab:

1. Vá para o repositório online
2. Clique em **"Pull Requests"** ou **"Merge Requests"**
3. Crie um **Draft PR** (Pull Request rascunho)
4. Compare: `main` ← `cursor/implementar-regras-de-aposta-52a3`
5. Você verá todas as mudanças coloridas, linha por linha

**Vantagem:** Interface visual, fácil de revisar

---

### Opção 2: VS Code / Cursor

1. Abra o VS Code/Cursor
2. Vá para a aba **"Source Control"** (ícone de branch no lado esquerdo)
3. Clique em **"..."** (menu)
4. Selecione **"Branch" → "Compare With..."**
5. Escolha: **`main`**

**Vantagem:** Ver mudanças diretamente no editor

---

### Opção 3: Git GUI (GitKraken, SourceTree, etc.)

Se tiver uma ferramenta Git GUI instalada:

1. Abra o repositório
2. Compare as branches: `main` vs `cursor/implementar-regras-de-aposta-52a3`
3. Veja diferenças coloridas com interface gráfica

---

## 📝 Ver Apenas as Mudanças Principais

### Mudanças no Código (game/js/CGame.js)

```bash
# Ver linhas adicionadas (em verde)
git diff main..HEAD -- game/js/CGame.js | grep "^+"

# Ver linhas removidas (em vermelho)
git diff main..HEAD -- game/js/CGame.js | grep "^-"
```

### Mudanças Específicas (Buscar por palavra)

```bash
# Procurar mudanças relacionadas a "turno"
git diff main..HEAD -- game/js/CGame.js | grep -i "turno"

# Procurar mudanças relacionadas a "aposta"
git diff main..HEAD -- game/js/CGame.js | grep -i "aposta"
```

---

## 🎯 Principais Mudanças Feitas

### ✅ Variáveis Adicionadas (CGame.js)

```javascript
// Linhas 29-31 (NOVAS)
var _iLastWinAmount = 0;        // Último valor ganho
var _bMustBetFullWin = false;   // Flag: deve apostar valor inteiro ganho
var _bIsMyTurn = true;          // Flag: é minha vez de jogar
```

### ✅ Funções Modificadas

1. **`_checkWinForBet()`** - Armazena valor ganho e ativa flag de aposta obrigatória
2. **`_onShowBetOnTable()`** - Valida se jogador está apostando valor correto
3. **`onRoll()`** - Verifica se é o turno do jogador antes de permitir jogar
4. **`dicesAnimEnded()`** - Libera turno após resultado dos dados
5. **`onTurnUpdate()`** - Atualiza flag de turno (multiplayer)
6. **`onClearAllBets()`** - Reset das flags ao limpar apostas

### ✅ Arquivos de Documentação

- `COMO_TESTAR.md` - Guia de testes
- `REGRAS_APOSTA_IMPLEMENTADAS.md` - Documentação técnica
- `RESUMO_IMPLEMENTACAO.md` - Resumo visual
- `COMO_VER_ALTERACOES.md` - Este arquivo

---

## 🚫 IMPORTANTE: Ainda NÃO fazer merge!

Para **NÃO fazer merge ainda**, simplesmente:

❌ **NÃO execute:**
```bash
git checkout main
git merge cursor/implementar-regras-de-aposta-52a3
```

✅ **Apenas revise** usando os comandos acima.

---

## ✅ Quando Estiver Pronto para Merge

Quando tiver revisado e aprovado as mudanças:

```bash
# 1. Voltar para a main
git checkout main

# 2. Fazer o merge
git merge cursor/implementar-regras-de-aposta-52a3

# 3. (Opcional) Push para o remote
git push origin main
```

---

## 🔍 Comandos Úteis de Revisão

### Ver quantas linhas mudaram por arquivo

```bash
git diff main..HEAD --numstat
```

### Ver mudanças em formato compacto

```bash
git diff main..HEAD --compact-summary
```

### Ver apenas nomes de arquivos modificados

```bash
git diff main..HEAD --name-only
```

### Ver mudanças de um arquivo específico, coloridas

```bash
git diff main..HEAD --color -- game/js/CGame.js | less -R
```

---

## 📊 Resumo das Mudanças (Números)

**Arquivos Modificados:** 33
**Linhas Adicionadas:** 5.789
**Linhas Removidas:** 104

**Principais alterações:**
- `game/js/CGame.js`: +169 linhas (lógica de aposta e turno)
- `game/js/game-socketio-integration.js`: +294 linhas (integração multiplayer)
- Novos arquivos de documentação: 3 arquivos
- Arquivos de histórico de correções: ~20 arquivos .md

---

## 💡 Dica: Criar Pull Request para Revisão

Se quiser uma revisão mais formal:

```bash
# Usando GitHub CLI (gh)
gh pr create --base main --head cursor/implementar-regras-de-aposta-52a3 --draft

# Ou manualmente no GitHub/GitLab:
# 1. Vá para o repositório online
# 2. Clique em "New Pull Request"
# 3. Compare: main ← cursor/implementar-regras-de-aposta-52a3
# 4. Marque como "Draft" se ainda não quiser merge
```

Isso permite:
- ✅ Ver todas as mudanças visualmente
- ✅ Adicionar comentários em linhas específicas
- ✅ Revisar antes de aprovar
- ✅ Fazer merge com um clique quando estiver pronto

---

## 🎯 Próximos Passos

1. ✅ **Revisar** as mudanças usando os comandos acima
2. ✅ **Testar** o jogo (veja `COMO_TESTAR.md`)
3. ✅ **Aprovar** as mudanças
4. ✅ **Fazer merge** quando estiver satisfeito

---

## ❓ Dúvidas?

- Ver documentação: `RESUMO_IMPLEMENTACAO.md`
- Ver guia de testes: `COMO_TESTAR.md`
- Ver detalhes técnicos: `REGRAS_APOSTA_IMPLEMENTADAS.md`

Boas revisões! 🔍
