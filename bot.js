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

// ====== 3. AUTOMATED BOT START & RECONNECT ENGINE ======
function startBot() {
  console.log(`[SYSTEM] Attempting to connect bot instance...`);
  
  bot = mineflayer.createBot({
    host: config.serverHost,
    port: config.serverPort,
    username: config.botUsername,
    auth: 'offline',
    version: "1.21", 
    viewDistance: config.botChunk,
    hideErrors: true // Suppress unmapped version asset crashes
  });

  let movementPhase = 0;
  const STEP_INTERVAL = 1500;
  const JUMP_DURATION = 500;

  // ====== 4. SPAWN & AUTO-AUTH HANDLER ======
  bot.once('spawn', () => {
    console.log(`[SYSTEM] ${config.botUsername} spawned into world.`);
    
    // Fire Auth login text sequences right away to avoid idle kick timers
    setTimeout(() => {
      if (config.authmePassword) {
        console.log(`[AUTH] Automating password credentials...`);
        bot.chat(`/register ${config.authmePassword} ${config.authmePassword}`);
        bot.chat(`/login ${config.authmePassword}`);
      }
    }, 1500);

    // Turn on loops
    setTimeout(() => {
      bot.setControlState('sneak', true);
      console.log(`✅ ${config.botUsername} is safe and moving!`);
      sendDiscordMessage(`✅ **${config.botUsername}** has successfully logged into **${config.serverHost}**!`);
    }, 4000);

    setTimeout(movementCycle, STEP_INTERVAL);
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

  // ====== 5. RECONNECT HOOK EVENTS ======
  bot.on('error', (err) => {
    if (err.message.includes('PartialReadError') || err.message.includes('undefined')) {
      return; // Ignore internal registry parsing mismatched warning configurations
    }
    console.error('⚠️ Error:', err);
    sendDiscordMessage(`⚠️ **Bot Error:** ${err.message}`);
  });

  // Reconnect if the stream stops or the bot is dropped/kicked
  bot.on('end', () => {
    console.log('⛔️ Bot Disconnected! Reconnecting in 10 seconds...');
    sendDiscordMessage(`⛔️ **${config.botUsername}** disconnected silently. Reconnecting automatically in 10 seconds...`);
    
    // Clean old instances out of memory and try again
    bot = null;
    setTimeout(startBot, 10000); 
  });

  bot.on('kick', (reason) => {
    const kickReason = typeof reason === 'object' ? JSON.stringify(reason) : reason;
    console.log(`❌ Kicked: ${kickReason}`);
    sendDiscordMessage(`❌ **${config.botUsername}** was kicked. Reason: ${kickReason}`);
  });
}

// Start the loop engine
startBot();
