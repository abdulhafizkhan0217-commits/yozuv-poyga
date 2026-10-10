const express = require("express"), http = require("http"), path = require("path");
const { Server } = require("socket.io");
const T = require("./public/texts.js");

const app = express();
app.use(express.static(path.join(__dirname, "public")));
app.get("/health", (q, r) => r.send("ok"));
const server = http.createServer(app);
const io = new Server(server);

const rooms = new Map();
const MAX_PLAYERS = 8, COUNTDOWN_MS = 4000, RACE_LIMIT_MS = 120000;

function newCode() {
  const c = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; let s;
  do { s = Array.from({ length: 4 }, () => c[Math.random() * c.length | 0]).join(""); } while (rooms.has(s));
  return s;
}
const cleanName = n => String(n || "").replace(/[<>&"]/g, "").trim().slice(0, 14) || "O'yinchi";
const cleanIdx = (v, max) => { v = Number(v) | 0; return v >= 0 && v < max ? v : 0; };
const pub = r => ({
  code: r.code, host: r.host, state: r.state, cat: r.cat,
  players: [...r.players].map(([id, p]) => ({ id, name: p.name, car: p.car, hue: p.hue, p: p.p, wpm: p.wpm, place: p.place }))
});
const push = r => io.to(r.code).emit("room", pub(r));

function endRace(r) {
  if (r.state !== "race") return;
  clearTimeout(r.timer);
  r.state = "lobby";
  const list = [...r.players].map(([id, p]) => ({ id, name: p.name, p: p.p, wpm: p.wpm, place: p.place }));
  list.sort((a, b) => (a.place && b.place) ? a.place - b.place : a.place ? -1 : b.place ? 1 : b.p - a.p);
  list.forEach((x, i) => x.rank = i + 1);
  io.to(r.code).emit("end", { results: list, room: pub(r) });
}
function leave(socket) {
  const code = socket.data.room; if (!code) return;
  socket.leave(code); socket.data.room = null;
  const r = rooms.get(code); if (!r) return;
  r.players.delete(socket.id);
  if (!r.players.size) { clearTimeout(r.timer); rooms.delete(code); return; }
  if (r.host === socket.id) r.host = r.players.keys().next().value;
  push(r);
  if (r.state === "race" && [...r.players.values()].every(p => p.place)) endRace(r);
}
function join(socket, r, d) {
  r.players.set(socket.id, { name: cleanName(d.name), car: cleanIdx(d.car, 6), hue: cleanIdx(d.hue, 6), p: 0, wpm: 0, place: 0 });
  socket.join(r.code); socket.data.room = r.code;
  push(r);
}

io.on("connection", socket => {
  socket.on("create", (d, cb) => {
    leave(socket);
    const r = { code: newCode(), host: socket.id, state: "lobby", cat: ["m", "q", "u"].includes(d && d.cat) ? d.cat : "m", players: new Map(), text: "", startAt: 0, finished: 0 };
    rooms.set(r.code, r); join(socket, r, d || {});
    cb && cb({ ok: true, code: r.code });
  });
  socket.on("join", (d, cb) => {
    d = d || {}; const r = rooms.get(String(d.code || "").toUpperCase().trim());
    if (!r) return cb && cb({ ok: false, error: "Bunday xona topilmadi" });
    if (r.state !== "lobby") return cb && cb({ ok: false, error: "Poyga ketmoqda, keyinroq urinib ko'ring" });
    if (r.players.size >= MAX_PLAYERS) return cb && cb({ ok: false, error: "Xona to'lgan" });
    leave(socket); join(socket, r, d);
    cb && cb({ ok: true, code: r.code });
  });
  socket.on("cat", c => {
    const r = rooms.get(socket.data.room);
    if (r && r.host === socket.id && r.state === "lobby" && ["m", "q", "u"].includes(c)) { r.cat = c; push(r); }
  });
  socket.on("start", () => {
    const r = rooms.get(socket.data.room);
    if (!r || r.host !== socket.id || r.state !== "lobby" || r.players.size < 2) return;
    r.state = "race"; r.text = T.make(r.cat, r.text); r.finished = 0;
    r.startAt = Date.now() + COUNTDOWN_MS;
    r.players.forEach(p => { p.p = 0; p.wpm = 0; p.place = 0; });
    io.to(r.code).emit("go", { text: r.text, startAt: r.startAt, serverNow: Date.now(), room: pub(r) });
    r.timer = setTimeout(() => endRace(r), COUNTDOWN_MS + RACE_LIMIT_MS);
  });
  socket.on("progress", d => {
    const r = rooms.get(socket.data.room); if (!r || r.state !== "race") return;
    const me = r.players.get(socket.id); if (!me || me.place) return;
    const elapsed = (Date.now() - r.startAt) / 1000; if (elapsed < 0) return;
    let p = Math.max(0, Math.min(1, Number(d && d.p) || 0));
    if (p * r.text.length > elapsed * 30 + 8) return; // juda tez, e'tiborga olinmaydi
    if (p < me.p) return;
    me.p = p; me.wpm = Math.min(400, Math.round(Number(d.wpm) || 0));
    if (p >= 1) {
      me.place = ++r.finished;
      me.wpm = Math.round(r.text.length / 5 / (Math.max(elapsed, 1) / 60));
    }
    io.to(r.code).emit("prog", { id: socket.id, p: me.p, wpm: me.wpm, place: me.place });
    if (p >= 1 && [...r.players.values()].every(x => x.place)) setTimeout(() => endRace(r), 800);
  });
  socket.on("leave", () => leave(socket));
  socket.on("disconnect", () => leave(socket));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("Yozuv Poygasi: http://localhost:" + PORT));
