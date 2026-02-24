const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

// IMPORTANT for Replit proxy
app.set("trust proxy", 1);

// Serve static files BUT do NOT auto-serve index.html
app.use(express.static("public", { index: false }));

// Health check route (REQUIRED for Replit Deployments)
app.get("/", (req, res) => {
  res.status(200).send("OK");
});

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

let players = {};

const ADMIN_PASSWORD = "1234"; // Change this in production

io.on("connection", (socket) => {
  console.log("New connection:", socket.id);

  // Player joins
  socket.on("join", (name) => {
    players[socket.id] = {
      name,
      money: 100,
      bet: 0,
      loan: 0,
      total: 0,
    };
    io.emit("update", players);
  });

  // Player places a bet
  socket.on("bet", (amount) => {
    const p = players[socket.id];
    if (!p) return;

    if (amount > 0 && amount <= p.money) {
      p.bet = amount;
    }

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
    if (!p || amount <= 0) return;

    if (p.money >= amount) {
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

    if (result === "win") {
      change = p.bet;
      p.money += p.bet;
      p.total += p.bet;
    }

    if (result === "lose") {
      change = -p.bet;
      p.money -= p.bet;
      p.total -= p.bet;
    }

    // push = no change
    p.bet = 0;

    io.to(id).emit("resultPopup", { result, change });
    io.emit("update", players);
  });

  socket.on("disconnect", () => {
    delete players[socket.id];
    io.emit("update", players);
  });
});

// REQUIRED for Replit Deployments
const PORT = process.env.PORT || 5000;

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});

// Prevent silent crashes
process.on("uncaughtException", console.error);
process.on("unhandledRejection", console.error);
