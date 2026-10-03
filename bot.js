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

const BOT_PASSWORD = 'ChooseABotPassword123';

let authHandled = false;
let reconnectDelay = 3000;
const MAX_RECONNECT_DELAY = 60000;

let bot;

function createBot() {
  bot = mineflayer.createBot({
    host: config.serverHost,
    port: config.serverPort,
    username: config.botUsername,
    auth: 'offline',
    version: false,
    viewDistance: config.botChunk
  });

  bot.on('spawn', onSpawn);
  bot.on('message', onMessage);
  bot.on('error', onError);
  bot.on('end', onEnd);
}

function sendLogin() {
  if (bot && bot.entity) {
    bot.chat(`/login ${BOT_PASSWORD}`);
    console.log('🔐 Login command sent');
  }
}

function sendRegister() {
  if (bot && bot.entity) {
    bot.chat(`/register ${BOT_PASSWORD} ${BOT_PASSWORD}`);
    console.log('📝 Register command sent');
  }
}

function onSpawn() {
  reconnectDelay = 3000;
  authHandled = false;

  console.log(`✅ ${config.botUsername} spawned! Authenticating...`);

  setTimeout(() => {
    sendLogin();
  }, 500);

  setTimeout(() => {
    sendRegister();
  }, 1500);

  console.log('🚶 Standing idle to avoid invalid move packet kicks');
}

function onMessage(jsonMsg) {
  const text = jsonMsg.toString().toLowerCase();
  
  if (/password|login|register|successful/.test(text) && !authHandled) {
    console.log(`🔔 Auth prompt: ${jsonMsg.toString()}`);
    authHandled = true;
    
    setTimeout(() => {
      sendLogin();
    }, 300);
  }
}

function onError(err) {
  console.error('⚠️ Error:', err.message);
}

function onEnd() {
  console.log('⛔️ Bot Disconnected!');
  authHandled = false;

  console.log(`🔄 Reconnecting in ${reconnectDelay}ms...`);
  setTimeout(() => {
    reconnectDelay = Math.min(reconnectDelay * 1.5, MAX_RECONNECT_DELAY);
    createBot();
  }, reconnectDelay);
}

createBot();
