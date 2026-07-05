// server.js - خادوم دردشة خفيف بـ Deno
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { WebSocketServer } from "https://deno.land/std@0.208.0/ws/mod.ts";

// قائمة العملاء
const clients = new Map(); // ws -> { name, id }

// خادوم WebSocket
const wss = new WebSocketServer({ port: 8080 });

wss.on("connection", (ws) => {
  const clientId = crypto.randomUUID().slice(0, 6);
  clients.set(ws, { id: clientId, name: "زائر" });

  // رسالة ترحيب
  ws.send(JSON.stringify({
    type: "system",
    text: "👋 أهلاً بك في غرفة الدردشة!"
  }));

  // إشعار للجميع
  broadcast({
    type: "system",
    text: `🟢 دخل مستخدم جديد`,
    timestamp: new Date().toISOString()
  }, ws);

  // استقبال الرسائل
  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message);
      const client = clients.get(ws);

      if (data.type === "setName" && data.name) {
        const oldName = client.name;
        client.name = data.name.trim().slice(0, 20);
        broadcast({
          type: "system",
          text: `🔄 ${oldName} غيّر اسمه إلى ${client.name}`,
          timestamp: new Date().toISOString()
        });
        return;
      }

      if (data.type === "message" && data.text) {
        broadcast({
          type: "message",
          name: client.name,
          text: data.text.trim(),
          timestamp: new Date().toISOString()
        });
      }
    } catch (_) {
      // تجاهل الأخطاء
    }
  });

  ws.on("close", () => {
    const client = clients.get(ws);
    if (client) {
      broadcast({
        type: "system",
        text: `🔴 غادر ${client.name} الغرفة`,
        timestamp: new Date().toISOString()
      });
      clients.delete(ws);
    }
  });
});

// دالة البث
function broadcast(data, sender = null) {
  const message = JSON.stringify(data);
  for (const client of wss.clients) {
    if (client !== sender && client.isOpen) {
      client.send(message);
    }
  }
}

// خادوم HTTP لخدمة ملفات الواجهة
serve(async (req) => {
  const url = new URL(req.url);
  
  if (url.pathname === "/") {
    // إرجاع ملف HTML
    const html = await Deno.readTextFile("./index.html");
    return new Response(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" }
    });
  }
  
  return new Response("404", { status: 404 });
}, { port: 3000 });

console.log("🚀 خادوم الدردشة يعمل على:");
console.log("   http://localhost:3000");
console.log("   ws://localhost:8080");
console.log("📡 اضغط Ctrl+C للإيقاف");
