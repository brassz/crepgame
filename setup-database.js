#!/usr/bin/env node

/**
 * Quick Setup Script for Supabase Multiplayer Database
 * 
 * This script helps you set up the database for the multiplayer craps game.
 * 
 * Usage:
 * node setup-database.js
 * 
 * Make sure you have your Supabase credentials configured in auth-config.js first!
 */

const fs = require('fs');
const path = require('path');

console.log('🎲 SUPABASE MULTIPLAYER CRAPS GAME - DATABASE SETUP');
console.log('====================================================\n');

// Check if required files exist
const sqlFile = path.join(__dirname, 'database-setup.sql');
const authConfigFile = path.join(__dirname, 'game', 'js', 'auth-config.js');

if (!fs.existsSync(sqlFile)) {
    console.error('❌ Arquivo database-setup.sql não encontrado!');
    process.exit(1);
}

if (!fs.existsSync(authConfigFile)) {
    console.error('❌ Arquivo game/js/auth-config.js não encontrado!');
    console.error('   Configure suas credenciais do Supabase primeiro.');
    process.exit(1);
}

// Read and display the SQL content size
const sqlContent = fs.readFileSync(sqlFile, 'utf8');
const lineCount = sqlContent.split('\n').length;

console.log('✅ Arquivos necessários encontrados:');
console.log(`   📄 database-setup.sql (${lineCount} linhas)`);
console.log(`   🔑 auth-config.js`);
console.log();

// Read auth config to show current settings (without exposing keys)
try {
    const authConfig = fs.readFileSync(authConfigFile, 'utf8');
    const urlMatch = authConfig.match(/SUPABASE_URL\s*=\s*["']([^"']+)["']/);
    const keyMatch = authConfig.match(/SUPABASE_ANON_KEY\s*=\s*["']([^"']{20})/);
    
    if (urlMatch) {
        console.log(`🔗 Supabase URL configurada: ${urlMatch[1]}`);
    } else {
        console.log('⚠️  URL do Supabase não configurada em auth-config.js');
    }
    
    if (keyMatch) {
        console.log(`🔑 Chave Anon configurada: ${keyMatch[1]}...`);
    } else {
        console.log('⚠️  Chave Anon não configurada em auth-config.js');
    }
    console.log();
} catch (error) {
    console.error('❌ Erro ao ler auth-config.js:', error.message);
}

console.log('📋 PRÓXIMOS PASSOS:');
console.log('===================');
console.log();
console.log('1. 🔧 CONFIGURAR CREDENCIAIS (se ainda não fez):');
console.log('   - Acesse seu projeto Supabase');
console.log('   - Vá em Settings → API');
console.log('   - Copie Project URL e anon public key');
console.log('   - Cole no arquivo game/js/auth-config.js');
console.log();

console.log('2. 💾 EXECUTAR SCRIPT SQL:');
console.log('   - Abra seu Supabase Dashboard');
console.log('   - Vá para SQL Editor');
console.log('   - Cole TODO o conteúdo de database-setup.sql');
console.log('   - Clique em RUN para executar');
console.log();

console.log('3. ✅ VERIFICAR INSTALAÇÃO:');
console.log('   Execute no SQL Editor:');
console.log('   ');
console.log('   SELECT room_type, count(*) as total_salas,');
console.log('          string_agg(room_name, \', \') as salas');
console.log('   FROM public.game_rooms');
console.log('   GROUP BY room_type;');
console.log();

console.log('4. 🚀 INICIAR SERVIDOR:');
console.log('   npm run dev');
console.log();

console.log('📁 ARQUIVOS CRIADOS:');
console.log('=====================');
console.log('✅ database-setup.sql       - Script completo do banco');
console.log('✅ game/js/supabase-multiplayer.js - Cliente Supabase');
console.log('✅ SUPABASE_SETUP.md        - Documentação completa');
console.log('✅ game/js/realtime.js      - Atualizado com integração');
console.log('✅ game/index.html          - Atualizado com novos scripts');
console.log();

console.log('🎯 FUNCIONALIDADES IMPLEMENTADAS:');
console.log('==================================');
console.log('✅ Salas únicas por tipo (BRONZE, PRATA, OURO)');
console.log('✅ Distribuição automática de jogadores');
console.log('✅ Sistema de apostas em tempo real');
console.log('✅ Sincronização de dados entre jogadores');
console.log('✅ Histórico completo de jogadas');
console.log('✅ Gestão automática de saldos');
console.log('✅ Row Level Security (RLS)');
console.log('✅ Fallback para Socket.io se necessário');
console.log();

console.log('🔄 SISTEMA DE SALAS:');
console.log('====================');
console.log('• BRONZE (1 sala): R$50 - R$1.000');
console.log('• PRATA  (1 sala): R$100 - R$3.000');
console.log('• OURO   (1 sala): R$200 - R$5.000');
console.log('• Máximo: 8 jogadores por sala');
console.log('• Total: 3 salas únicas (bronze, prata, ouro)');
console.log();

console.log('🎮 COMO TESTAR:');
console.log('===============');
console.log('1. Execute database-setup.sql no Supabase');
console.log('2. Configure as credenciais em auth-config.js');
console.log('3. npm run dev');
console.log('4. Abra http://localhost:3000');
console.log('5. Faça login/registro');
console.log('6. Escolha uma sala (Bronze/Prata/Ouro)');
console.log('7. Faça apostas e jogue!');
console.log();

console.log('📚 Para mais detalhes, consulte SUPABASE_SETUP.md');
console.log();
console.log('🎲 Boa sorte com seu jogo multiplayer!');