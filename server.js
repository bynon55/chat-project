const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// تخزين العملاء المتصلين
const clients = new Map(); // ws -> { name }

app.use(express.static(path.join(__dirname, 'public')));

wss.on('connection', (ws) => {
  // إضافة عميل جديد
  clients.set(ws, { name: 'زائر' });
  
  // إرسال قائمة العملاء للجميع
  broadcastUsers();

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      const client = clients.get(ws);

      // تغيير الاسم
      if (data.type === 'setName' && data.name) {
        client.name = data.name.trim().slice(0, 20);
        broadcastUsers();
        broadcastMessage('system', `🔄 ${client.name} دخل إلى الدردشة`);
        return;
      }

      // رسالة عامة
      if (data.type === 'message' && data.text) {
        broadcastMessage('public', data.text, client.name);
        return;
      }

      // رسالة خاصة (دردشة فردية)
      if (data.type === 'private' && data.to && data.text) {
        sendPrivateMessage(data.to, client.name, data.text);
        return;
      }
    } catch (e) {
      console.error('خطأ:', e);
    }
  });

  ws.on('close', () => {
    const client = clients.get(ws);
    if (client) {
      clients.delete(ws);
      broadcastUsers();
      broadcastMessage('system', `🔴 غادر ${client.name}`);
    }
  });
});

// دوال مساعدة
function broadcastUsers() {
  const userList = Array.from(clients.values()).map(c => c.name);
  const msg = JSON.stringify({ type: 'users', users: userList });
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) client.send(msg);
  });
}

function broadcastMessage(type, text, sender = null) {
  const msg = JSON.stringify({ type, text, sender, timestamp: new Date().toISOString() });
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) client.send(msg);
  });
}

function sendPrivateMessage(to, from, text) {
  const msg = JSON.stringify({
    type: 'private',
    from,
    text,
    timestamp: new Date().toISOString()
  });
  
  wss.clients.forEach((client, ws) => {
    const clientInfo = clients.get(ws);
    if (clientInfo && clientInfo.name === to && ws.readyState === WebSocket.OPEN) {
      ws.send(msg);
    }
  });
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 خادوم الدردشة يعمل على http://localhost:${PORT}`);
});
