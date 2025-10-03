# Guia de Instalação - Supabase Realtime para Jogo de Dados

## Passo 1: Configurar o Banco de Dados

### Opção A: Instalação Simples (Recomendada)
1. Abra o **Supabase Dashboard**
2. Vá para **SQL Editor**
3. Copie e cole todo o conteúdo do arquivo `simple-setup.sql`
4. Clique em **Run** para executar

### Opção B: Instalação por Etapas
Se preferir executar por partes:
1. Execute `01-create-tables.sql`
2. Execute `02-enable-rls.sql`  
3. Execute `03-create-functions.sql`
4. Execute `04-create-triggers-and-permissions.sql`
5. Execute `05-enable-realtime.sql`

## Passo 2: Habilitar Realtime no Dashboard

1. No Supabase Dashboard, vá para **Database → Replication**
2. Encontre as tabelas `game_moves` e `current_turn`
3. Clique no toggle para **habilitar** Realtime para ambas as tabelas

## Passo 3: Verificar Configuração

Execute este SQL para verificar se tudo foi criado corretamente:

```sql
-- Verificar se as tabelas existem
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('game_moves', 'current_turn');

-- Verificar se as funções existem
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('handle_dice_roll_simple', 'join_room_simple', 'complete_dice_animation');

-- Verificar se RLS está habilitado
SELECT tablename, rowsecurity FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('game_moves', 'current_turn');
```

## Passo 4: Configurar o Cliente

O código JavaScript já está configurado. Certifique-se de que:

1. O arquivo `js/supabase-realtime-dice.js` está incluído no HTML
2. Sua configuração do Supabase está correta em `js/auth-config.js`
3. O usuário está autenticado antes de tentar jogar

## Passo 5: Testar

1. Inicie o servidor: `npm run dev`
2. Acesse `http://localhost:3000`
3. Faça login com um usuário
4. Entre em uma sala (bronze, prata, ou ouro)
5. Teste o lançamento de dados

## Troubleshooting

### Erro "relation does not exist"
- Certifique-se de que executou o SQL corretamente
- Verifique se está no schema `public`

### Erro "permission denied"
- Verifique se RLS está configurado
- Confirme se o usuário está autenticado

### Animações não sincronizam
- Verifique se Realtime está habilitado no Dashboard
- Confirme se as políticas RLS permitem SELECT

### "Not your turn"
- Este é normal - apenas o jogador da vez pode lançar os dados
- Aguarde sua vez ou teste com múltiplos usuários

## Estrutura Final

Após a instalação, você terá:

```
Supabase Database:
├── Tables:
│   ├── game_moves (com Realtime habilitado)
│   └── current_turn (com Realtime habilitado)
├── Functions:
│   ├── handle_dice_roll_simple()
│   ├── join_room_simple()
│   └── complete_dice_animation()
└── Policies: RLS habilitado com políticas básicas

Cliente JavaScript:
├── supabase-realtime-dice.js (novo)
├── realtime.js (atualizado)
└── CGame.js (atualizado)
```

## Próximos Passos

Após a instalação bem-sucedida:

1. Teste com múltiplos usuários em diferentes navegadores
2. Monitore os logs no Supabase Dashboard
3. Ajuste as políticas RLS conforme necessário
4. Considere adicionar mais funcionalidades como histórico de jogos

## Suporte

Se encontrar problemas:
1. Verifique os logs do navegador (F12 → Console)
2. Verifique os logs do Supabase Dashboard
3. Confirme se todas as etapas foram seguidas corretamente