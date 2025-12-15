# 🚀 Instruções Rápidas - Sistema de Login Customizado

## ⚡ Passo a Passo Rápido

### 1️⃣ Criar Tabela no Supabase (5 minutos)

1. Acesse: https://app.supabase.com
2. Selecione seu projeto
3. Clique em **SQL Editor** (menu lateral esquerdo)
4. Clique em **+ New Query**
5. Copie TODO o conteúdo do arquivo `custom-users-table.sql`
6. Cole no editor
7. Clique em **Run** (ou pressione Ctrl+Enter)
8. Aguarde mensagem de sucesso ✅

### 2️⃣ Verificar Instalação

Execute no SQL Editor:

```sql
-- Verificar se tabela foi criada
SELECT * FROM public.users;

-- Verificar se funções foram criadas
SELECT proname FROM pg_proc 
WHERE proname IN ('register_user', 'login_user', 'update_user_balance', 'get_user_by_id');
```

Deve mostrar:
- Tabela vazia (sem usuários ainda)
- 4 funções listadas

### 3️⃣ Testar Sistema

1. **Criar Conta:**
   - Acesse: `http://seu-site.com/game/register.html`
   - Preencha os dados
   - Clique em "Criar Conta"

2. **Fazer Login:**
   - Será redirecionado para login
   - Digite email e senha
   - Clique em "Entrar"

3. **Acessar Jogo:**
   - Será redirecionado para o jogo
   - Deve ver seu saldo de R$ 1.000,00

4. **Testar Proteção:**
   - Abra navegador anônimo
   - Tente acessar `http://seu-site.com/game/index.html`
   - DEVE redirecionar para login ✅

---

## 🔧 Configurações

### Alterar Saldo Inicial

Edite `custom-users-table.sql`, linha 14:

```sql
balance NUMERIC(12,2) DEFAULT 1000.00,  -- Altere 1000.00 para o valor desejado
```

Reexecute o script.

### Alterar Tempo de Sessão

Edite `game/js/custom-auth.js`, linha ~37:

```javascript
if (hoursElapsed > 24) {  // Altere 24 para horas desejadas
```

---

## ✅ Checklist Rápido

- [ ] Script SQL executado no Supabase
- [ ] Tabela `users` criada
- [ ] 4 funções criadas (register_user, login_user, etc)
- [ ] Teste de registro funcionou
- [ ] Teste de login funcionou
- [ ] Jogo está protegido (requer login)

---

## 📝 Credenciais de Teste

Use estas credenciais para testar:

```
Nome: Teste Silva
Email: teste@example.com
Senha: teste123
```

---

## 🆘 Problemas Comuns

### Erro: "function register_user does not exist"
➜ Execute o script SQL novamente

### Login não funciona
➜ Abra Console (F12), veja os erros

### Redirecionamento em loop
➜ Console (F12) → digite: `localStorage.clear()`

### Sessão expira rápido
➜ Edite `custom-auth.js`, altere linha 37 (horas)

---

## 📞 Suporte

Se precisar de ajuda:

1. Abra Console do navegador (F12)
2. Veja aba "Console" para erros JavaScript
3. Veja aba "Network" para erros de rede
4. Verifique logs no Supabase Dashboard

---

## 🎉 Pronto!

Seu sistema de login customizado está funcionando!

- ✅ Jogo protegido por login
- ✅ Tabela customizada no Supabase
- ✅ Não usa Supabase Auth
- ✅ Sessão de 24 horas
- ✅ Saldo inicial de R$ 1.000,00

**Agora é só jogar!** 🎮
