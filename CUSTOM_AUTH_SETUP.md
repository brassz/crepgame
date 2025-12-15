# Sistema de Autenticação Customizado

## 📋 Visão Geral

Este sistema usa uma **tabela customizada no Supabase** para gerenciar usuários, ao invés do sistema de autenticação padrão (Supabase Auth). 

### Por que usar tabela customizada?

- ✅ Controle total sobre os dados dos usuários
- ✅ Não depende do sistema auth.users do Supabase
- ✅ Permite personalizações específicas do jogo
- ✅ Simples de gerenciar e expandir

## 🚀 Instalação

### 1. Criar a Tabela de Usuários no Supabase

Execute o script SQL no **Supabase SQL Editor**:

```bash
# Arquivo: custom-users-table.sql
```

Este script irá criar:

- ✅ Tabela `public.users` com campos:
  - id (UUID)
  - email (único)
  - username (único)
  - password_hash (SHA-256)
  - full_name
  - balance (saldo inicial R$ 1.000,00)
  - total_winnings, total_losses, games_played
  - avatar_url
  - is_active, created_at, updated_at, last_login

- ✅ Funções SQL:
  - `register_user()` - Registrar novo usuário
  - `login_user()` - Fazer login
  - `update_user_balance()` - Atualizar saldo
  - `get_user_by_id()` - Obter dados do usuário

- ✅ Políticas RLS (Row Level Security)
- ✅ Índices para performance

### 2. Configurar Supabase no Frontend

O arquivo `game/js/auth-config.js` já está configurado com suas credenciais do Supabase:

```javascript
window.SUPABASE_URL = "https://iwjdwpaulonjrlyvudgo.supabase.co";
window.SUPABASE_ANON_KEY = "eyJhbGci...";
```

### 3. Arquivos do Sistema

#### Scripts JavaScript:
- `game/js/custom-auth.js` - Sistema de autenticação principal
- `game/js/auth-config.js` - Configurações do Supabase

#### Páginas HTML:
- `game/login.html` - Página de login
- `game/register.html` - Página de registro
- `game/index.html` - Página principal do jogo (protegida)

## 🔐 Como Funciona

### Registro de Usuário

1. Usuário preenche formulário em `register.html`
2. Senha é hasheada com SHA-256 no cliente
3. Função `register_user()` é chamada via RPC
4. Usuário criado com saldo inicial de R$ 1.000,00
5. Redirecionado para login

### Login

1. Usuário preenche email e senha em `login.html`
2. Senha é hasheada com SHA-256
3. Função `login_user()` verifica credenciais
4. Se válido, dados do usuário são salvos no `localStorage`
5. Token de sessão gerado (válido por 24 horas)
6. Redirecionado para o jogo

### Proteção de Rotas

Ao acessar `game/index.html`:

1. Script `custom-auth.js` verifica se existe sessão válida
2. Verifica dados no `localStorage`:
   - `game_user` - Dados do usuário
   - `game_session_token` - Token de sessão
   - `game_session_time` - Timestamp da sessão
3. Se sessão expirou (>24h), faz logout automático
4. Se não há sessão, redireciona para `login.html`

## 🛠️ API de Autenticação

### JavaScript API

```javascript
// Fazer login
const result = await window.customAuth.login(email, password);
if(result.success) {
    console.log('Usuário logado:', result.user);
}

// Registrar usuário
const result = await window.customAuth.register(email, username, password, fullName);
if(result.success) {
    console.log('Usuário criado:', result.user);
}

// Obter usuário logado
const user = window.customAuth.getCurrentUser();
console.log('Saldo:', user.balance);

// Fazer logout
window.customAuth.logout();

// Atualizar saldo do servidor
const newBalance = await window.customAuth.refreshUserBalance(userId);
```

### SQL Functions

```sql
-- Registrar usuário
SELECT register_user(
    'email@exemplo.com',
    'username',
    'hash_da_senha',
    'Nome Completo'
);

-- Login
SELECT login_user(
    'email@exemplo.com',
    'hash_da_senha'
);

-- Atualizar saldo
SELECT update_user_balance(
    'user-id-uuid',
    1500.00
);

-- Obter dados do usuário
SELECT get_user_by_id('user-id-uuid');
```

## 🔒 Segurança

### Hash de Senha
- Senhas são hasheadas com **SHA-256** no cliente
- Nunca enviadas em texto plano para o servidor
- Armazenadas hasheadas no banco de dados

### Sessão
- Token de sessão gerado aleatoriamente
- Armazenado no `localStorage`
- Expira automaticamente após 24 horas
- Verificação em todas as páginas protegidas

### Row Level Security (RLS)
- Habilitado em todas as tabelas
- Políticas específicas para cada operação
- Todos podem ver usuários (para rankings)
- Apenas o próprio usuário pode atualizar seus dados

## 📊 Estrutura de Dados

### Objeto User

```javascript
{
    id: "uuid",
    email: "usuario@email.com",
    username: "usuario123",
    full_name: "Nome Completo",
    balance: 1000.00,
    total_winnings: 0.00,
    total_losses: 0.00,
    games_played: 0,
    avatar_url: null
}
```

### LocalStorage

```javascript
// game_user - Dados do usuário
localStorage.getItem('game_user')

// game_session_token - Token de sessão
localStorage.getItem('game_session_token')

// game_session_time - Timestamp da criação
localStorage.getItem('game_session_time')
```

## 🧪 Testando o Sistema

### 1. Criar Usuário de Teste

Acesse `game/register.html` e crie uma conta:
- Nome: Teste Silva
- Email: teste@email.com
- Senha: teste123
- Confirmar Senha: teste123

### 2. Fazer Login

Acesse `game/login.html`:
- Email: teste@email.com
- Senha: teste123

### 3. Verificar no Supabase

No Supabase Table Editor, verifique a tabela `users`:

```sql
SELECT * FROM public.users WHERE email = 'teste@email.com';
```

### 4. Testar Proteção de Rota

- Tente acessar `game/index.html` sem estar logado
- Deve redirecionar automaticamente para `login.html`

## 🐛 Troubleshooting

### Erro: "Supabase config missing"
- Verifique `game/js/auth-config.js`
- Confirme que SUPABASE_URL e SUPABASE_ANON_KEY estão preenchidos

### Erro: "function register_user does not exist"
- Execute o script `custom-users-table.sql` no Supabase
- Verifique se as funções foram criadas

### Login não funciona
- Abra o Console do navegador (F12)
- Verifique erros JavaScript
- Confirme que a senha está correta
- Verifique se o usuário existe na tabela

### Redirecionamento em loop
- Limpe o localStorage: `localStorage.clear()`
- Faça login novamente

## 📝 Próximos Passos

- [ ] Adicionar recuperação de senha
- [ ] Implementar "Lembrar-me"
- [ ] Adicionar autenticação de 2 fatores
- [ ] Sistema de avatares
- [ ] Ranking de jogadores
- [ ] Histórico de jogos

## ✅ Conclusão

Sistema implementado com sucesso! Agora o jogo:

1. ✅ **Exige login** para acessar
2. ✅ Usa **tabela customizada** no Supabase
3. ✅ **Não usa Supabase Auth**
4. ✅ Gerencia sessões com localStorage
5. ✅ Protege rotas automaticamente
6. ✅ Hash seguro de senhas (SHA-256)

**O jogo não pode mais ser acessado sem fazer login!** 🎮🔒
