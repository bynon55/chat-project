const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const clients = new Map();

app.use(express.static(path.join(__dirname, 'public')));

wss.on('connection', (ws) => {
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  clients.set(ws, { id, name: 'زائر' });

  ws.send(JSON.stringify({ type: 'system', text: '👋 أهلاً بك في دردشة عربية!' }));

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      const client = clients.get(ws);

      if (data.type === 'setName' && data.name) {
        client.name = data.name.trim().slice(0, 20);
        broadcast({ type: 'system', text: `🔄 ${client.name} دخل إلى الدردشة` });
        sendUserList();
        return;
      }

      if (data.type === 'message' && data.text) {
        broadcast({
          type: 'public',
          sender: client.name,
          text: data.text.trim(),
          timestamp: new Date().toISOString()
        });
        return;
      }

      if (data.type === 'private' && data.to && data.text) {
        sendPrivateMessage(data.to, client.name, data.text);
        return;
      }
    } catch (error) {
      console.error('خطأ:', error);
    }
  });

  ws.on('close', () => {
    const client = clients.get(ws);
    if (client) {
      clients.delete(ws);
      sendUserList();
      broadcast({ type: 'system', text: `🔴 غادر ${client.name}` });
    }
  });
});

function broadcast(data) {
  const msg = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  });
}

function sendPrivateMessage(to, from, text) {
  const msg = JSON.stringify({
    type: 'private',
    from,
    text,
    timestamp: new Date().toISOString()
  });
  wss.clients.forEach((client) => {
    const clientInfo = clients.get(client);
    if (clientInfo && clientInfo.name === to && client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  });
}

function sendUserList() {
  const userList = Array.from(clients.values()).map(c => c.name);
  const msg = JSON.stringify({ type: 'users', users: userList });
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  });
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 خادوم دردشة عربية يعمل على المنفذ ${PORT}`);
});
