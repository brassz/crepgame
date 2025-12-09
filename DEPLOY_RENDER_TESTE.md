# 🚀 Como Testar no Render

## ✅ Situação Atual

✅ **Branch atual:** `cursor/implementar-regras-de-aposta-52a3`
✅ **Status:** Todas alterações commitadas
✅ **Remote:** Branch já está no GitHub
✅ **Pronto para deploy!**

---

## 🎯 3 Opções para Testar no Render

### 📌 OPÇÃO 1: Deploy Temporário da Branch (RECOMENDADO)

**Vantagens:**
- ✅ NÃO afeta a produção (main)
- ✅ Pode testar sem risco
- ✅ Fácil de reverter

**Como fazer:**

#### Passo 1: No Dashboard do Render

1. Acesse: https://dashboard.render.com
2. Encontre seu serviço (ex: `crepgame`)
3. Clique no serviço

#### Passo 2: Mudar Branch Temporariamente

1. Vá em **"Settings"** (no menu lateral)
2. Role até **"Build & Deploy"**
3. Em **"Branch"**, clique em **"Edit"**
4. Mude de `main` para: **`cursor/implementar-regras-de-aposta-52a3`**
5. Clique em **"Save Changes"**

#### Passo 3: Deploy Manual

1. Volte para o **Dashboard** do serviço
2. Clique em **"Manual Deploy"** → **"Deploy latest commit"**
3. Aguarde o deploy (5-10 minutos)

#### Passo 4: Testar

1. Acesse seu site do Render
2. Teste as novas funcionalidades:
   - ✅ Regra de aposta obrigatória
   - ✅ Sistema de rodadas
3. Veja o arquivo `COMO_TESTAR.md` para guia completo

#### Passo 5: Reverter (Quando Terminar Testes)

1. Volte em **"Settings"** → **"Build & Deploy"**
2. Mude a branch de volta para: **`main`**
3. Clique em **"Manual Deploy"** novamente
4. ✅ Produção volta ao normal!

---

### 📌 OPÇÃO 2: Criar Ambiente de Preview (Web Service Duplicado)

**Vantagens:**
- ✅ Mantém produção intacta
- ✅ URL separada para testes
- ✅ Não precisa ficar mudando branch

**Como fazer:**

1. No Render Dashboard, clique em **"New +"**
2. Selecione **"Web Service"**
3. Conecte ao mesmo repositório: `brassz/crepgame`
4. Configure:
   - **Name:** `crepgame-preview` (ou outro nome)
   - **Branch:** `cursor/implementar-regras-de-aposta-52a3`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
5. Clique em **"Create Web Service"**

**Resultado:**
- ✅ URL nova: `https://crepgame-preview.onrender.com` (exemplo)
- ✅ Produção continua em: `https://crepgame.onrender.com`
- ✅ Pode testar sem risco!

**Limpeza (Depois dos Testes):**
- Delete o serviço `crepgame-preview` quando não precisar mais

---

### 📌 OPÇÃO 3: Fazer Merge na Main (PRODUÇÃO)

**⚠️ ATENÇÃO:** Isso coloca em produção IMEDIATAMENTE!

**Apenas se:** Você já testou tudo localmente e está CERTO que funciona.

**Como fazer:**

```bash
# 1. Voltar para a main
git checkout main

# 2. Fazer merge da branch
git merge cursor/implementar-regras-de-aposta-52a3

# 3. Push para o GitHub
git push origin main
```

**Resultado:**
- ✅ Render detecta mudança na `main`
- ✅ Faz deploy automaticamente
- ⚠️ Mudanças vão para PRODUÇÃO

---

## 🎯 Recomendação: OPÇÃO 1 ou 2

**Para testar com segurança:**
- Use **OPÇÃO 1** se quer testar rápido (troca branch temporariamente)
- Use **OPÇÃO 2** se quer testar com calma (cria ambiente separado)

**Quando estiver 100% satisfeito:**
- Use **OPÇÃO 3** para colocar em produção

---

## 📝 Checklist de Teste no Render

Quando o deploy terminar, teste:

### ✅ Teste 1: Regra de Aposta Obrigatória
- [ ] Aposte R$ 50
- [ ] Ganhe (7 ou 11)
- [ ] Tente apostar R$ 25 → Deve bloquear
- [ ] Aposte o valor exato ganho → Deve liberar

### ✅ Teste 2: Sistema de Rodadas
- [ ] Aposte e lance os dados
- [ ] Tente clicar em "LANÇAR" novamente → Deve bloquear
- [ ] Aguarde 1 segundo → Botão deve liberar

### ✅ Teste 3: Multiplayer (2 Abas)
- [ ] Abra 2 abas do site do Render
- [ ] Na Aba 1: Faça aposta e lance
- [ ] Na Aba 2: Observe "AGUARDE SUA VEZ"
- [ ] Verifique que apenas 1 jogador lança por vez

### ✅ Teste 4: Geral
- [ ] Jogo carrega corretamente
- [ ] Todas as mensagens estão em português
- [ ] Som funciona
- [ ] Não há erros no console (F12)

---

## 🔍 Verificar Logs do Render

Se algo não funcionar:

1. No Dashboard do Render
2. Clique no seu serviço
3. Vá em **"Logs"**
4. Procure por erros (linhas em vermelho)

---

## 📱 Testar no Mobile

Não esqueça de testar no celular também:
1. Abra o site do Render no celular
2. Faça os mesmos testes
3. Verifique responsividade

---

## 🆘 Se Algo Der Errado

### Deploy Falhou?
1. Veja os **Logs** no Render
2. Procure por erros de build ou start
3. Verifique se `package.json` está correto

### Jogo Não Funciona?
1. Abra o Console do navegador (F12)
2. Veja se há erros JavaScript
3. Teste em modo incógnito (descarta cache)

### Quer Reverter?
- **OPÇÃO 1:** Mude branch de volta para `main` no Render
- **OPÇÃO 2:** Delete o serviço preview
- **OPÇÃO 3:** Faça `git revert` do merge

---

## ✅ Comandos Úteis Durante Teste

### Ver status do deploy
```bash
# No terminal local
git log --oneline -1
git status
```

### Ver diferenças antes do merge
```bash
git diff main..cursor/implementar-regras-de-aposta-52a3 --stat
```

---

## 🎉 Quando Tudo Funcionar

1. ✅ Testou tudo no Render
2. ✅ Funcionou perfeitamente
3. ✅ Pronto para produção

**Então faça:**
- Merge na main (OPÇÃO 3)
- Delete branch de teste (se criou OPÇÃO 2)

**Comandos:**
```bash
git checkout main
git merge cursor/implementar-regras-de-aposta-52a3
git push origin main

# Opcional: deletar branch antiga
git branch -d cursor/implementar-regras-de-aposta-52a3
git push origin --delete cursor/implementar-regras-de-aposta-52a3
```

---

## 📞 Links Úteis

- **Render Dashboard:** https://dashboard.render.com
- **GitHub Repo:** https://github.com/brassz/crepgame
- **Documentação do Render:** https://render.com/docs

---

## 🎯 Próximos Passos

1. ✅ Escolha uma das 3 opções
2. ✅ Faça o deploy
3. ✅ Teste seguindo o checklist
4. ✅ Aprove ou ajuste
5. ✅ Coloque em produção

Boa sorte com os testes! 🚀
