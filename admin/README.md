# Painel Administrativo - Dados da Sorte

## 📋 Visão Geral

Painel administrativo completo para gerenciar o jogo de dados, incluindo:
- Programação de resultados dos dados
- Gerenciamento de depósitos
- Relatórios e logs
- Visualização de mesas online
- Estatísticas de apostas

## 🚀 Instalação

### 1. Configurar Banco de Dados

Execute o script SQL no Supabase SQL Editor:

```bash
# Arquivo: admin-database-setup.sql
```

Este script criará:
- ✅ Tabela `admin_users` - Usuários administradores
- ✅ Tabela `dice_results` - Resultados programados dos dados
- ✅ Tabela `deposits` - Depósitos pendentes/aprovados
- ✅ Tabela `admin_logs` - Logs de ações administrativas
- ✅ Funções SQL para login e registro
- ✅ Primeiro admin padrão (email: admin@dadosdasorte.com, senha: admin123)

### 2. Acessar o Painel

1. Acesse: `admin/admin-login.html`
2. Use as credenciais padrão ou crie uma nova conta
3. Após login, você será redirecionado para o painel principal

## 🔐 Credenciais Padrão

**IMPORTANTE**: Altere a senha após o primeiro login!

- **Email**: admin@dadosdasorte.com
- **Senha**: admin123

## 📁 Estrutura de Arquivos

```
admin/
├── admin-login.html      # Página de login
├── admin-register.html   # Página de cadastro (com CPF)
├── admin-panel.html      # Painel principal
└── README.md            # Este arquivo
```

## 🎯 Funcionalidades

### 1. Dashboard
- Estatísticas gerais do sistema
- Total de usuários ativos
- Mesas ativas
- Total em apostas
- Depósitos pendentes
- Jogadores online

### 2. Programar Dados
- Definir resultado específico dos dados
- Escolher sala específica ou todas
- Visualizar resultados programados ativos
- Desativar resultados programados

### 3. Depósitos
- Visualizar todos os depósitos
- Aprovar depósitos pendentes
- Rejeitar depósitos
- Ver histórico completo

### 4. Relatórios
- Logs de todas as ações administrativas
- Histórico de atividades
- Filtros por admin e data

### 5. Mesas Online
- Visualizar todas as mesas ativas
- Ver número de jogadores em cada mesa
- Limites de aposta por mesa

### 6. Saldo Total
- Total em apostas ativas
- Histórico completo de apostas
- Total ganho/perdido pelos jogadores

## 🔒 Segurança

- Autenticação via tabela customizada (não usa Supabase Auth)
- Senhas hasheadas com SHA-256
- Sessão armazenada em localStorage
- Validação de CPF no cadastro
- Logs de todas as ações administrativas

## 📝 Notas Importantes

1. **Primeiro Acesso**: Use as credenciais padrão e altere a senha imediatamente
2. **CPF**: O cadastro requer CPF válido (validação implementada)
3. **Resultados Programados**: Podem ser aplicados a uma sala específica ou todas
4. **Depósitos**: Aprovação/rejeição é registrada nos logs
5. **Logs**: Todas as ações são registradas automaticamente

## 🛠️ Desenvolvimento

### Adicionar Nova Funcionalidade

1. Adicione a nova tab no HTML
2. Crie a função de carregamento de dados
3. Adicione ao switch case em `loadTabData()`
4. Crie tabelas/funções SQL se necessário

### Personalizar Estilo

O CSS está inline no arquivo `admin-panel.html`. Para personalizar:
- Cores: Altere os gradientes nos `.stat-card` e `.btn`
- Layout: Modifique o grid em `.stats-grid`
- Tabelas: Ajuste estilos em `table`, `table th`, `table td`

## 📞 Suporte

Para problemas ou dúvidas:
1. Verifique os logs do console do navegador
2. Verifique se as tabelas foram criadas corretamente no Supabase
3. Verifique se as funções SQL estão funcionando

