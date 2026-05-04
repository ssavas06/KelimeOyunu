const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const app = express();
const db = new sqlite3.Database("database.sqlite");

app.use(express.json());
app.use(express.static("public"));

// örnek API
app.get("/words", (req, res) => {
  db.all("SELECT * FROM words", (err, rows) => {
    if (err) return res.status(500).send(err);
    res.json(rows);
  });
});

// frontend
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log("Server running on", port);
});