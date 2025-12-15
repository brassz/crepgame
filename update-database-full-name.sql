-- ==================================================
-- ATUALIZAÇÃO: Adicionar campo full_name na tabela profiles
-- ==================================================
-- Execute este script no Supabase SQL Editor para adicionar o campo de nome completo

-- Adicionar coluna full_name se não existir
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS full_name TEXT;

-- Atualizar a função handle_new_user para incluir full_name
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, username, full_name, balance)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        1000.00
    );
    RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Comentário para confirmar
SELECT 'Campo full_name adicionado com sucesso!' as status;
