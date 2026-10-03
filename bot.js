// ====== 1. RENDER KEEP-ALIVE WEB SERVER ======
const http = require('http');
const https = require('https'); // Needed to send messages to Discord
const dns = require('dns');     // Automatically resolves dynamic Aternos addresses
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

// ====== 3. AUTOMATED BOT START ENGINE ======
function startBot() {
  console.log(`[SYSTEM] Resolving current dynamic network routing paths...`);

  // Look up the SRV record to get the shifting dynamic IP address
  dns.resolveSrv(`_minecraft._tcp.${config.serverHost}`, (err, addresses) => {
    let finalHost = config.serverHost;
    let finalPort = config.serverPort;

    if (!err && addresses && addresses.length > 0) {
      finalHost = addresses[0].name;
      finalPort = addresses[0].port;
      console.log(`[DNS] Successfully discovered current live routing path: ${finalHost}:${finalPort}`);
    } else {
      console.log(`[DNS] SRV lookup missed. Falling back to default configuration credentials.`);
    }

    // Launch bot instance
    bot = mineflayer.createBot({
      host: finalHost,
      port: finalPort,
      username: config.botUsername,
      auth: 'offline',
      version: "1.21", 
      viewDistance: config.botChunk,
      hideErrors: true 
    });

    setupBotEvents();
  });
}

function setupBotEvents() {
  let movementPhase = 0;
  const STEP_INTERVAL = 1500;
  const JUMP_DURATION = 500;

  // ====== 4. HARDENED AUTO-AUTH HANDLER ======
  bot.once('spawn', () => {
    console.log(`[SYSTEM] ${config.botUsername} spawned into game canvas.`);
    
    // Delayed sequence ensuring the commands register on the server packet buffer
    setTimeout(() => {
      if (config.authmePassword) {
        console.log(`[AUTH] Deploying authentication sequence commands...`);
        // Sends both commands to cover newly created servers or old registrations
        bot.chat(`/register ${config.authmePassword} ${config.authmePassword}`);
        bot.chat(`/login ${config.authmePassword}`);
      }
    }, 2000); // 2 full seconds ensures chunk spawning phase is finished

    // Safety backup command fire if packet processing lags
    setTimeout(() => {
      if (config.authmePassword) {
        bot.chat(`/login ${config.authmePassword}`);
      }
    }, 4000);

    // Initialize anti-kick jumping movement patterns safely after auth clearing
    setTimeout(() => {
      bot.setControlState('sneak', true);
      console.log(`✅ ${config.botUsername} is authenticated and moving!`);
      sendDiscordMessage(`✅ **${config.botUsername}** has bypassed Auth security loops and is now active on **${config.serverHost}**!`);
    }, 6000);

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
      return; 
    }
    console.error('⚠️ Error:', err);
    sendDiscordMessage(`⚠️ **Bot Error:** ${err.message}`);
  });

  bot.on('end', () => {
    console.log('⛔️ Bot Disconnected! Reconnecting in 15 seconds...');
    sendDiscordMessage(`⛔️ **${config.botUsername}** was disconnected. Re-fetching shifty address layout and logging back in...`);
    
    bot = null;
    setTimeout(startBot, 15000); // 15 seconds allows old ghost sessions to fully timeout on the server side
  });

  bot.on('kick', (reason) => {
    const kickReason = typeof reason === 'object' ? JSON.stringify(reason) : reason;
    console.log(`❌ Kicked from server: ${kickReason}`);
    sendDiscordMessage(`❌ **${config.botUsername}** was kicked. Reason: ${kickReason}`);
  });
}

// Kickstart execution
startBot();
