# 🎲 Craps Game - Sistema de Autenticação

Este guia explica como configurar o sistema completo de autenticação para o jogo de Craps com Supabase.

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Pré-requisitos](#pré-requisitos)
3. [Configuração do Supabase](#configuração-do-supabase)
4. [Configuração do Projeto](#configuração-do-projeto)
5. [Estrutura dos Arquivos](#estrutura-dos-arquivos)
6. [Como Usar](#como-usar)
7. [Funcionalidades](#funcionalidades)
8. [Troubleshooting](#troubleshooting)

## 🎯 Visão Geral

O sistema de autenticação inclui:

- ✅ **Páginas de Login e Registro** com design moderno
- ✅ **Integração completa com Supabase**
- ✅ **Modo Visitante** (sem necessidade de conta)
- ✅ **Sistema de salas/mesas** configurável
- ✅ **Gerenciamento de saldo** e transações
- ✅ **Design responsivo** para mobile e desktop
- ✅ **Validação em tempo real** dos formulários

## 🔧 Pré-requisitos

- Conta no [Supabase](https://supabase.com) (gratuita)
- Servidor web com HTTPS (para produção)
- Navegador moderno com suporte a ES6

## 🚀 Configuração do Supabase

### 1. Criar Projeto

1. Acesse [supabase.com](https://supabase.com)
2. Clique em "New Project"
3. Escolha sua organização
4. Defina nome e senha do banco
5. Selecione região (recomendado: South America)

### 2. Executar Schema SQL

1. No dashboard do Supabase, vá em **SQL Editor**
2. Clique em "New Query"
3. Cole todo o conteúdo do arquivo `supabase.sql`
4. Execute o script (Ctrl+Enter)

### 3. Configurar Autenticação

1. Vá em **Authentication > Settings**
2. Configure **Site URL**: `https://seudominio.com`
3. Configure **Redirect URLs**: 
   - `https://seudominio.com/game/index.html`
   - `https://seudominio.com/auth/login.html`

### 4. Configurar OAuth (Opcional)

Para login com Google:

1. Vá em **Authentication > Providers**
2. Enable Google
3. Configure Client ID e Client Secret
4. Adicione redirect URI: `https://seudominio.com/auth/callback`

### 5. Obter Credenciais

1. Vá em **Settings > API**
2. Copie:
   - **Project URL** (ex: `https://abc123.supabase.co`)
   - **Anon public key**

## ⚙️ Configuração do Projeto

### 1. Configurar Credenciais

Edite o arquivo `config.js`:

```javascript
const SUPABASE_CONFIG = {
    url: 'https://seu-projeto.supabase.co',
    anonKey: 'sua-chave-anon-publica'
};
```

### 2. Configurar Game Settings (Opcional)

```javascript
const GAME_CONFIG = {
    defaultBalance: 1000,     // Saldo inicial
    minBet: 50,              // Aposta mínima
    maxBet: null,            // Aposta máxima (null = sem limite)
    demoBalance: 1000        // Saldo para visitantes
};
```

### 3. Atualizar Arquivos de Autenticação

Nos arquivos `auth/js/auth.js`, `auth/js/login.js` e `game/js/CAuth.js`, substitua:

```javascript
// De:
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

// Para:
const SUPABASE_URL = 'https://seu-projeto.supabase.co';
const SUPABASE_ANON_KEY = 'sua-chave-anon-publica';
```

## 📁 Estrutura dos Arquivos

```
projeto/
├── index.html                 # Página inicial
├── config.js                 # Configurações do projeto
├── supabase.sql              # Schema do banco de dados
├── auth/                     # Sistema de autenticação
│   ├── login.html           # Página de login
│   ├── register.html        # Página de registro
│   ├── css/
│   │   └── auth.css        # Estilos das páginas auth
│   └── js/
│       ├── auth.js         # Core de autenticação
│       ├── login.js        # Lógica do login
│       └── register.js     # Lógica do registro
├── game/                     # Jogo principal
│   ├── index.html           # Página do jogo
│   └── js/
│       ├── CAuth.js        # Integração auth com jogo
│       └── ... (outros arquivos do jogo)
└── README.md
```

## 🎮 Como Usar

### 1. Acesso Inicial

- Acesse `index.html` para a página inicial
- Escolha entre **Login**, **Registro** ou **Jogar como Visitante**

### 2. Criar Conta

1. Clique em "Criar Conta"
2. Preencha todos os campos obrigatórios
3. Confirme que tem +18 anos
4. Aceite os termos de uso
5. Clique em "Criar Conta"
6. Verifique seu email (se configurado)

### 3. Fazer Login

1. Digite email e senha
2. Marque "Lembrar de mim" se desejar
3. Clique em "Entrar"
4. Ou use "Jogar como Visitante"

### 4. Jogar

- O jogo carrega automaticamente após login
- Saldo inicial: R$ 1.000
- Mesa principal: aposta mín. R$ 50, sem limite máximo

## ✨ Funcionalidades

### Sistema de Autenticação

- **Registro completo** com validação em tempo real
- **Login seguro** com Supabase Auth
- **Modo visitante** sem necessidade de conta
- **Validação de idade** (18+ anos)
- **Força da senha** com indicador visual
- **Recuperação de senha** (configurável)

### Integração com o Jogo

- **Saldo persistente** entre sessões
- **Histórico de transações** completo
- **Sistema de salas** configurável
- **Estatísticas do jogador**
- **Logout seguro**

### Interface

- **Design moderno** e responsivo
- **Animações CSS** suaves
- **Feedback visual** em tempo real
- **Mensagens de erro** claras
- **Loading states** informativos

## 🔍 Troubleshooting

### Problema: "Supabase not configured"

**Solução**: Verifique se as credenciais em `config.js` estão corretas.

### Problema: Erro de CORS

**Solução**: Configure as URLs permitidas no Supabase:
1. Settings > API
2. Adicione seu domínio em "CORS origins"

### Problema: Email não está sendo enviado

**Solução**: Configure templates de email:
1. Authentication > Email Templates
2. Customize os templates necessários

### Problema: Login com Google não funciona

**Solução**: Verifique configuração OAuth:
1. Authentication > Providers > Google
2. Confirme Client ID e Secret
3. Adicione redirect URIs corretas

### Problema: Dados não salvam

**Solução**: Verifique RLS (Row Level Security):
1. Table Editor > Políticas
2. Configure políticas apropriadas
3. Ou desabilite RLS temporariamente

## 🔒 Segurança

### Políticas RLS (Row Level Security)

O arquivo `supabase.sql` inclui comentários para configurar RLS:

```sql
-- Descomente para habilitar RLS
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Users can view own data" ON users FOR SELECT USING (auth.uid() = id);
```

### Validações

- **Client-side**: Validação imediata na interface
- **Server-side**: Validação no Supabase
- **Database**: Constraints e triggers

## 📞 Suporte

Para problemas ou dúvidas:

1. Verifique este README
2. Consulte [documentação do Supabase](https://supabase.com/docs)
3. Verifique logs do navegador (F12)
4. Teste em modo incógnito

## 🎯 Próximos Passos

Após configurar a autenticação:

1. **Personalizar** design e cores
2. **Adicionar** mais provedores OAuth
3. **Implementar** sistema de níveis/XP
4. **Configurar** notificações push
5. **Adicionar** chat entre jogadores

---

**🎲 Divirta-se jogando Craps!**