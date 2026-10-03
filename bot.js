const http = require('http');
const https = require('https');
const mineflayer = require('mineflayer');
const config = require('./config.json');

// ====== RENDER KEEP-ALIVE NETWORKING ======
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.write("AFK Engine Live");
  res.end();
}).listen(process.env.PORT || 3000);

let bot;
let reconnectDelay = 5000;

// ====== DISCORD LOGGING LAYER ======
function notifyDiscord(msg) {
  if (!config.discordWebhook || config.discordWebhook.includes('://discord.com')) return;
  const payload = JSON.stringify({ content: msg });
  const url = new URL(config.discordWebhook);
  
  const req = https.request({
    hostname: url.hostname,
    path: url.pathname + url.search,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': payload.length
    }
  });
  req.write(payload);
  req.end();
}

// ====== CORE CLIENT FACTORY ======
function initializeBot() {
  console.log(`[NETWORK] Target routing initialized: ${config.serverHost}:${config.serverPort}`);
  
  bot = mineflayer.createBot({
    host: config.serverHost,
    port: parseInt(config.serverPort),
    username: config.botUsername,
    auth: 'offline',
    version: "1.21", // Translated natively via ViaVersion + ViaBackwards
    viewDistance: config.botChunk,
    skipValidation: true,
    hideErrors: true
  });

  // Strip physics and tracking engines to prevent packet parsing crashes
  bot.physics = null;

  bot.once('spawn', () => {
    console.log(`[LIVE] ${config.botUsername} successfully spawned.`);
    reconnectDelay = 5000; // Reset reconnection delays on success
    
    // Fallback automated authentication sequence
    setTimeout(() => {
      executeAuthentication();
    }, 2000);
  });

  bot.on('message', (jsonMsg) => {
    const context = jsonMsg.toString().toLowerCase();
    if (context.includes('register') || context.includes('login') || context.includes('password')) {
      executeAuthentication();
    }
  });

  bot.on('error', (err) => {
    if (err.message.includes('PartialReadError')) return;
    console.error(`[ERROR] Stream anomaly: ${err.message}`);
  });

  bot.on('end', () => {
    console.log(`[DISCONNECT] Stream closed. Re-indexing socket in ${reconnectDelay / 1000}s...`);
    notifyDiscord(`⛔️ **${config.botUsername}** disconnected silently. Re-indexing connection socket...`);
    bot = null;
    setTimeout(initializeBot, reconnectDelay);
    reconnectDelay = Math.min(reconnectDelay * 2, 60000); // Exponential backoff safety cap
  });

  bot.on('kick', (reason) => {
    const explanation = typeof reason === 'object' ? JSON.stringify(reason) : reason;
    console.log(`[KICKED] Server drop reason: ${explanation}`);
  });
}

function executeAuthentication() {
  if (!bot || !config.authmePassword) return;
  console.log(`[SECURITY] Firing account pass tokens...`);
  bot.chat(`/register ${config.authmePassword} ${config.authmePassword}`);
  bot.chat(`/login ${config.authmePassword}`);
}

// Execute Instance
initializeBot();
