// ====== RENDER LIVE PORT BINDING ======
const http = require('http');
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.write("Bot Engine Live");
  res.end();
}).listen(process.env.PORT || 3000);

// ====== ORIGINAL REPOSITORY CODE ======
const mineflayer = require('mineflayer');
const config = require('./config.json');

const BOT_PASSWORD = '123123123';
const AUTH_KEYWORDS = [
  'login', 'register', 'password', 'authenticate',
  'sign in', 'account', 'credentials'
];

const bot = mineflayer.createBot({
  host: config.serverHost,
  port: config.serverPort,
  username: config.botUsername,
  auth: 'offline',
  version: false,
  viewDistance: config.botChunk
});

let movementPhase = 0;
const STEP_INTERVAL = 1500;
const STEP_SPEED    = 1;
const JUMP_DURATION = 500;

bot.on('spawn', () => {
  // ====== AUTOMATED AUTH ======
  setTimeout(() => {
    bot.chat(`/login ${BOT_PASSWORD}`);
    console.log('🔐 Login attempt sent');
  }, 1000);

  setTimeout(() => {
    bot.chat(`/register ${BOT_PASSWORD} ${BOT_PASSWORD}`);
    console.log('📝 Register attempt sent (fallback)');
  }, 3000);
  // ==========================

  setTimeout(() => {
    bot.setControlState('sneak', true);
    console.log(`✅ ${config.botUsername} is Ready!`);
  }, 5000);

  setTimeout(movementCycle, STEP_INTERVAL);
});

bot.on('message', (jsonMsg) => {
  const text = jsonMsg.toString().toLowerCase();
  const needsAuth = AUTH_KEYWORDS.some(keyword => text.includes(keyword));

  if (needsAuth) {
    console.log(`🔔 Auth prompt detected: ${jsonMsg.toString()}`);

    setTimeout(() => {
      bot.chat(`/login ${BOT_PASSWORD}`);
      console.log('🔐 Auto-responding with login command');
    }, 500);

    setTimeout(() => {
      bot.chat(`/register ${BOT_PASSWORD} ${BOT_PASSWORD}`);
      console.log('📝 Auto-responding with register command');
    }, 1500);
  }
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

bot.on('error', (err) => {
  console.error('⚠️ Error:', err);
});

bot.on('end', () => {
  console.log('⛔️ Bot Disconnected!');
});
