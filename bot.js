// ====== RENDER LIVE PORT BINDING ======
const http = require('http');
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.write("Bot Engine Live");
  res.end();
}).listen(process.env.PORT || 3000);

console.log('🔧 Bot starting...');

// ====== ORIGINAL REPOSITORY CODE ======
const mineflayer = require('mineflayer');
const config = require('./config.json');

console.log('📋 Config loaded:', {
  host: config.serverHost,
  port: config.serverPort,
  username: config.botUsername,
  chunk: config.botChunk
});

const BOT_PASSWORD = 'ChooseABotPassword123';

let authHandled = false;
let reconnectDelay = 3000;
const MAX_RECONNECT_DELAY = 60000;

let bot;

function createBot() {
  console.log('🤖 Creating bot...');
  try {
    bot = mineflayer.createBot({
      host: config.serverHost,
      port: config.serverPort,
      username: config.botUsername,
      auth: 'offline',
      version: false,
      viewDistance: config.botChunk
    });

    console.log('✅ Bot object created');

    bot.on('connect', () => {
      console.log('🌐 Connected to server');
    });

    bot.on('login', () => {
      console.log('🔑 Logged in to server');
    });

    bot.on('spawn', onSpawn);
    bot.on('message', onMessage);
    bot.on('error', onError);
    bot.on('end', onEnd);

    console.log('✅ Events registered');
  } catch (e) {
    console.error('❌ Error creating bot:', e.message);
    console.error(e);
  }
}

function sendLogin() {
  if (bot && bot.entity) {
    bot.chat(`/login ${BOT_PASSWORD}`);
    console.log('🔐 Login command sent');
  } else {
    console.log('⚠️ Cannot send login - bot or entity not ready');
  }
}

function sendRegister() {
  if (bot && bot.entity) {
    bot.chat(`/register ${BOT_PASSWORD} ${BOT_PASSWORD}`);
    console.log('📝 Register command sent');
  } else {
    console.log('⚠️ Cannot send register - bot or entity not ready');
  }
}

function onSpawn() {
  console.log(`✅ ${config.botUsername} spawned! Authenticating...`);
  reconnectDelay = 3000;
  authHandled = false;

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
  console.log('💬 Message received:', jsonMsg.toString());
  
  if (/password|login|register|successful/.test(text) && !authHandled) {
    console.log(`🔔 Auth prompt detected`);
    authHandled = true;
    
    setTimeout(() => {
      sendLogin();
    }, 300);
  }
}

function onError(err) {
  console.error('⚠️ Error event:', err.message);
  console.error('Error code:', err.code);
  console.error('Full error:', err);
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

console.log('🚀 Attempting connection to', config.serverHost + ':' + config.serverPort);
createBot();
console.log('✅ Bot creation initiated');
