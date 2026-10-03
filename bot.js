const http = require('http');
const https = require('https');
const mineflayer = require('mineflayer');
const config = require('./config.json');

// ====== 1. RENDER PORT BINDING FIX ======
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.write("AFK Engine Live");
  res.end();
}).listen(process.env.PORT || 3000);

let bot;
let reconnectDelay = 5000;

// ====== 2. DISCORD WEBHOOK LAYER ======
function notifyDiscord(msg) {
  if (!config.discordWebhook || !config.discordWebhook.startsWith('https://')) return;
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

// ====== 3. BOT INITIALIZATION ENGINE ======
function initializeBot() {
  console.log(`[NETWORK] Connecting to: ${config.serverHost}:${config.serverPort}`);
  
  bot = mineflayer.createBot({
    host: config.serverHost,
    port: parseInt(config.serverPort),
    username: config.botUsername,
    auth: 'offline',
    version: "1.21", // Works with your server's ViaVersion/ViaBackwards plugins
    viewDistance: config.botChunk,
    hideErrors: true  // Stops unmapped item data packet crashes
  });

  bot.physics = null; // Lightweight option to prevent server strain

  // ====== 4. SPAWN & AUTO-AUTHME LOGIC ======
  bot.once('spawn', () => {
    console.log(`[LIVE] ${config.botUsername} stepped into the world.`);
    reconnectDelay = 5000; // Reset reconnection delays
    
    // Automatically fire commands to outrun AuthMe kick timers
    setTimeout(() => {
      executeAuthentication();
    }, 2000);

    // Turn on safe movement loop
    setTimeout(() => {
      if (bot) bot.setControlState('sneak', true);
      console.log(`✅ ${config.botUsername} is authenticated and active.`);
      notifyDiscord(`✅ **${config.botUsername}** has successfully joined **${config.serverHost}** and is now AFK!`);
    }, 5000);
  });

  // Smart chat reader to login if the server prompts for it
  bot.on('message', (jsonMsg) => {
    const chatText = jsonMsg.toString().toLowerCase();
    if (chatText.includes('register') || chatText.includes('login') || chatText.includes('password')) {
      executeAuthentication();
    }
  });

  // ====== 5. RECONNECT LOOPS ======
  bot.on('error', (err) => {
    if (err.message.includes('PartialReadError')) return; // Ignore version data mismatched strings
    console.error(`[ERROR] ${err.message}`);
  });

  bot.on('end', () => {
    console.log(`[DISCONNECT] Reconnecting in ${reconnectDelay / 1000} seconds...`);
    notifyDiscord(`⛔️ **${config.botUsername}** disconnected. Reconnecting automatically in 15 seconds...`);
    bot = null;
    setTimeout(initializeBot, reconnectDelay);
    reconnectDelay = Math.min(reconnectDelay * 2, 60000); // Exponential backoff safety cap
  });

  bot.on('kick', (reason) => {
    const explanation = typeof reason === 'object' ? JSON.stringify(reason) : reason;
    console.log(`[KICKED] Reason: ${explanation}`);
    notifyDiscord(`❌ **${config.botUsername}** was kicked. Reason: ${explanation}`);
  });
}

function executeAuthentication() {
  if (!bot || !config.authmePassword) return;
  console.log(`[SECURITY] Sending login credentials...`);
  bot.chat(`/register ${config.authmePassword} ${config.authmePassword}`);
  bot.chat(`/login ${config.authmePassword}`);
}

// Kickstart script execution
initializeBot();
