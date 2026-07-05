import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { WebSocketServer } from "https://deno.land/std@0.208.0/ws/mod.ts";

const clients = new Map();

const wss = new WebSocketServer({ port: 8080 });

wss.on("connection", (ws) => {
  const id = crypto.randomUUID().slice(0, 6);
  clients.set(ws, { id, name: `زائر` });

  ws.send(JSON.stringify({ type: "system", text: "👋 أهلاً بك!" }));

  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message);
      const client = clients.get(ws);

      if (data.type === "setName" && data.name) {
        client.name = data.name.trim().slice(0, 20);
        return;
      }

      if (data.type === "message" && data.text) {
        const msg = JSON.stringify({
          type: "message",
          name: client.name,
          text: data.text.trim(),
          timestamp: new Date().toISOString()
        });
        for (const c of wss.clients) {
          if (c.isOpen) c.send(msg);
        }
      }
    } catch (_) {}
  });

  ws.on("close", () => {
    clients.delete(ws);
  });
});

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

console.log("✅ خادوم الدردشة يعمل!");
