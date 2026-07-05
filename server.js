// server.js - نسخة متوافقة مع Deno Deploy
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { WebSocketServer } from "https://deno.land/std@0.208.0/ws/mod.ts";

const clients = new Map();

const wss = new WebSocketServer({ port: 8080 });

wss.on("connection", (ws) => {
  const id = crypto.randomUUID().slice(0, 6);
  clients.set(ws, { id, name: `زائر_${id}` });

  ws.send(JSON.stringify({ type: "system", text: "👋 أهلاً بك!" }));

  broadcast({ type: "system", text: `🟢 دخل مستخدم جديد` }, ws);

  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message);
      const client = clients.get(ws);

      if (data.type === "setName" && data.name) {
        client.name = data.name.trim().slice(0, 20);
        broadcast({ type: "system", text: `🔄 غيّر اسمه إلى ${client.name}` });
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
    } catch (_) {}
  });

  ws.on("close", () => {
    const client = clients.get(ws);
    if (client) {
      broadcast({ type: "system", text: `🔴 غادر ${client.name}` });
      clients.delete(ws);
    }
  });
});

function broadcast(data, sender = null) {
  const msg = JSON.stringify(data);
  for (const client of wss.clients) {
    if (client !== sender && client.isOpen) client.send(msg);
  }
}

serve(async (req) => {
  const url = new URL(req.url);
  if (url.pathname === "/") {
    try {
      return new Response(await Deno.readTextFile("./index.html"), {
        headers: { "Content-Type": "text/html; charset=utf-8" }
      });
    } catch {
      return new Response("index.html غير موجود", { status: 404 });
    }
  }
  return new Response("404", { status: 404 });
}, { port: 3000 });

console.log("✅ خادوم Deno يعمل!");
