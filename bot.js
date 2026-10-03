// ====== 1. RENDER KEEP-ALIVE WEB SERVER ======
const http = require('http');
const https = require('https'); // Needed to send messages to Discord
http.createServer((req, res) => {
  res.write("Bot is running!");
  res.end();
}).listen(process.env.PORT || 3000);

// ====== DEPENDENCIES & CONFIG ======
const mineflayer = require('mineflayer');
const config = require('./config.json');

// ====== 2. DISCORD WEBHOOK FUNCTION ======
function sendDiscordMessage(message) {
  if (!config.discordWebhook || config.discordWebhook.includes("PASTE_YOUR")) return;
  
  const data = JSON.stringify({ content: message });
  const url = new URL(config.discordWebhook);
  
  const options = {
    hostname: url.hostname,
    path: url.pathname + url.search,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length,
    },
  };

  const req = https.request(options);
  req.write(data);
  req.end();
}

// ====== 3. BOT INITIALIZATION ======
const bot = mineflayer.createBot({
  host: config.serverHost,
  port: config.serverPort,
  username: config.botUsername,
  auth: 'offline',
  version: "1.21", 
  viewDistance: config.botChunk,
  hideErrors: true // Ignores unknown game registry asset packets
});

let movementPhase = 0;
const STEP_INTERVAL = 1500;
const JUMP_DURATION = 500;

// ====== 4. SPAWN & AUTO-AUTH HANDLER ======
bot.on('spawn', () => {
  console.log(`[SYSTEM] ${config.botUsername} spawned.`);
  
  // Handle /register and /login sequences for AuthMe
  setTimeout(() => {
    if (config.authmePassword) {
      console.log(`[AUTH] Sending login/registration strings...`);
      bot.chat(`/register ${config.authmePassword} ${config.authmePassword}`);
      bot.chat(`/login ${config.authmePassword}`);
    }
  }, 1500);

  // Initialize movement cycle safely after login commands execute
  setTimeout(() => {
    bot.setControlState('sneak', true);
    console.log(`✅ ${config.botUsername} is ready and moving!`);
    sendDiscordMessage(`✅ **${config.botUsername}** has successfully connected to **${config.serverHost}**!`);
  }, 4000);

  setTimeout(movementCycle, STEP_INTERVAL);
});

function movementCycle() {
  if (!bot.entity) return;

  switch (movementPhase) {
    case 0:
      bot.setControlState('forward', true);
      bot.setControlState('back', false);
      bot.setControlState('jump', false);
      break;
    case 1:
      bot.setControlState('forward', false);
      bot.setControlState('back', true);
      bot.setControlState('jump', false);
      break;
    case 2:
      bot.setControlState('forward', false);
      bot.setControlState('back', false);
      bot.setControlState('jump', true);
      setTimeout(() => {
        bot.setControlState('jump', false);
      }, JUMP_DURATION);
      break;
    case 3:
      bot.setControlState('forward', false);
      bot.setControlState('back', false);
      bot.setControlState('jump', false);
      break;
  }

  movementPhase = (movementPhase + 1) % 4;
  setTimeout(movementCycle, STEP_INTERVAL);
}

// ====== 5. ERROR, KICK, & DISCORD LOGGING ======
bot.on('error', (err) => {
  // Suppress PartialRead data errors completely so they don't disconnect the bot
  if (err.message.includes('PartialReadError') || err.message.includes('undefined')) {
    console.log('[NETWORK] Suppressed packet parsing version mismatch warning.');
    return;
  }
  console.error('⚠️ Error:', err);
  sendDiscordMessage(`⚠️ **Bot Error:** ${err.message}`);
});

bot.on('end', () => {
  console.log('⛔️ Bot Disconnected!');
  sendDiscordMessage(`⛔️ **${config.botUsername}** has disconnected from the server.`);
});

bot.on('kick', (reason) => {
  const kickReason = typeof reason === 'object' ? JSON.stringify(reason) : reason;
  sendDiscordMessage(`❌ **${config.botUsername}** was kicked. Reason: ${kickReason}`);
});
