const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

let players = {};

const ADMIN_PASSWORD = "1234"; // set your admin password

io.on("connection", (socket) => {
  console.log("New connection:", socket.id);

  // Player joins
  socket.on("join", (name) => {
    players[socket.id] = { name, money: 100, bet: 0, loan: 0, total: 0 };
    io.emit("update", players);
  });

  // Player places a bet
  socket.on("bet", (amount) => {
    const p = players[socket.id];
    if (!p) return;
    if (amount <= p.money && amount > 0) p.bet = amount;
    io.emit("update", players);
  });

  // Player takes custom loan
  socket.on("takeLoanCustom", (amount) => {
    const p = players[socket.id];
    if (!p || amount <= 0) return;
    p.money += amount;
    p.loan += amount;
    io.emit("update", players);
  });

  // Player pays loan partially
  socket.on("payLoanPartial", (amount) => {
    const p = players[socket.id];
    if (!p) return;
    if (amount > 0 && p.money >= amount) {
      const pay = Math.min(amount, p.loan);
      p.loan -= pay;
      p.money -= pay;
    }
    io.emit("update", players);
  });

  // Admin sets result for a player
  socket.on("adminResult", ({ id, result }) => {
    const p = players[id];
    if (!p) return;

    let change = 0;
    if (result === "win") { change = p.bet; p.money += p.bet; p.total += p.bet; }
    if (result === "lose") { change = -p.bet; p.money -= p.bet; p.total -= p.bet; }
    // push = no change
    p.bet = 0;

    io.to(id).emit("resultPopup", { result, change });
    io.emit("update", players);
  });

  // Player disconnects
  socket.on("disconnect", () => {
    delete players[socket.id];
    io.emit("update", players);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));