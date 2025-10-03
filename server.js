const path = require('path');
const express = require('express');

const app = express();

// Static files (serve the game)
app.use('/', express.static(path.join(__dirname, 'game')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Craps game server running with Supabase Realtime' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
  console.log('Using Supabase Realtime for multiplayer functionality');
});

