// Teste simples de conexão Socket.IO
const { io } = require('socket.io-client');

const serverUrl = process.argv[2] || 'http://localhost:3000';
console.log('Testando conexão com:', serverUrl);

const socket = io(serverUrl, {
  transports: ['websocket', 'polling']
});

socket.on('connect', () => {
  console.log('✅ Conectado com sucesso! ID:', socket.id);
  
  // Testa entrada em sala
  socket.emit('join_room', 'bronze');
  
  setTimeout(() => {
    console.log('✅ Teste concluído');
    process.exit(0);
  }, 2000);
});

socket.on('room_config', (config) => {
  console.log('✅ Configuração da sala recebida:', config);
});

socket.on('players_update', (count) => {
  console.log('✅ Atualização de jogadores:', count);
});

socket.on('connect_error', (error) => {
  console.error('❌ Erro de conexão:', error.message);
  process.exit(1);
});

socket.on('disconnect', () => {
  console.log('🔌 Desconectado');
});

// Timeout de segurança
setTimeout(() => {
  console.error('❌ Timeout - conexão não estabelecida em 10s');
  process.exit(1);
}, 10000);