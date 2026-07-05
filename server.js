// أضف هذه الدوال في server.js

// ===== إرسال قائمة المستخدمين =====
function sendUserList() {
  const userList = Array.from(clients.values()).map(c => ({
    name: c.name,
    online: true
  }));
  
  const message = JSON.stringify({
    type: 'users',
    users: userList
  });
  
  for (const client of wss.clients) {
    if (client.isOpen) {
      client.send(message);
    }
  }
}

// عند اتصال مستخدم جديد، أضف:
// بعد clients.set(ws, client)
sendUserList();

// عند تغيير الاسم، أضف:
// بعد تحديث الاسم
sendUserList();

// عند مغادرة مستخدم، أضف:
// قبل clients.delete(ws)
sendUserList();

// استقبال طلب قائمة المستخدمين من العميل:
// في ws.on('message') أضف:
if (data.type === 'getUsers') {
  sendUserList();
  return;
}
