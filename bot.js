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

let bot;

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

// ====== 3. STABLE BOT START ENGINE ======
function startBot() {
  console.log(`[SYSTEM] Knocking on Aternos network pipelines: ${config.serverHost}:${config.serverPort}`);

  bot = mineflayer.createBot({
    host: config.serverHost,
    port: parseInt(config.serverPort),
    username: config.botUsername,
    auth: 'offline',
    version: "1.21", // Handled smoothly via ViaBackwards plugin
    viewDistance: config.botChunk,
    hideErrors: true 
  });

  setupBotEvents();
}

function setupBotEvents() {
  let movementPhase = 0;
  const STEP_INTERVAL = 1500;
  const JUMP_DURATION = 500;

  // ====== 4. INSTANT SPAWN & AUTO-AUTH HANDLER ======
  bot.once('spawn', () => {
    console.log(`[SUCCESS] ${config.botUsername} successfully stepped into the world canvas!`);
    
    // Instantly bomb chat with logins to outrun AuthMe kick timers
    setTimeout(() => {
      if (config.authmePassword) {
        console.log(`[AUTH] Dispatching automated passwords...`);
        bot.chat(`/register ${config.authmePassword} ${config.authmePassword}`);
        bot.chat(`/login ${config.authmePassword}`);
      }
    }, 1000);

    // Turn on loops
    setTimeout(() => {
      bot.setControlState('sneak', true);
      console.log(`✅ ${config.botUsername} is authenticated and moving!`);
      sendDiscordMessage(`✅ **${config.botUsername}** has successfully logged into **${config.serverHost}** and is now running AFK!`);
    }, 4000);

    setTimeout(movementCycle, STEP_INTERVAL);
  });

  // Backup Chat Listener for Security Plugins
  bot.on('message', (jsonMsg) => {
    const chatLine = jsonMsg.toString().toLowerCase();
    if (chatLine.includes('register') || chatLine.includes('login') || chatLine.includes('password')) {
      if (config.authmePassword) {
        bot.chat(`/register ${config.authmePassword} ${config.authmePassword}`);
        bot.chat(`/login ${config.authmePassword}`);
      }
    }
  });

  function movementCycle() {
    if (!bot || !bot.entity) return;

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
          if(bot) bot.setControlState('jump', false);
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

  // ====== 5. AGGRESSIVE RECONNECT TIMEOUTS ======
  bot.on('error', (err) => {
    if (err.message.includes('PartialReadError') || err.message.includes('undefined')) {
      return; 
    }
    console.error('⚠️ Error Log:', err.message);
  });

  bot.on('end', () => {
    console.log('⛔️ Connection closed. Forcing reconnection loop in 10 seconds...');
    bot = null;
    setTimeout(startBot, 10000); 
  });

  bot.on('kick', (reason) => {
    const kickReason = typeof reason === 'object' ? JSON.stringify(reason) : reason;
    console.log(`❌ Kicked from server: ${kickReason}`);
  });
}

// Fire the loop engine
startBot();
