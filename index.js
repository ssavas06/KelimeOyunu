const express = require("express");
const Database = require("better-sqlite3");
const path = require("path");
const bcrypt = require("bcryptjs");

const app = express();

// DB bağlantısı
const db = new Database(path.join(__dirname, "database.sqlite"));

// middleware
app.use(express.json());
app.use(express.static("public"));

// basit session (tek kullanıcı)
let currentUser = null;

//////////////////////////////
// AUTH
//////////////////////////////

app.post("/api/login", (req, res) => {
    const { username, password } = req.body;

    const user = db.prepare(
        "SELECT * FROM users WHERE username = ?"
    ).get(username);

    if (!user) {
        return res.status(401).json({ error: "Kullanıcı adı veya şifre yanlış" });
    }

    const isMatch = bcrypt.compareSync(password, user.password);

    if (!isMatch) {
        return res.status(401).json({ error: "Kullanıcı adı veya şifre yanlış" });
    }

    currentUser = user;

    res.json({
        username: user.username,
        level: user.level
    });
});

app.get("/api/me", (req, res) => {
    if (!currentUser) {
        return res.status(401).json({ error: "unauthorized" });
    }

    res.json(currentUser);
});

app.post("/api/logout", (req, res) => {
    currentUser = null;
    res.json({ ok: true });
});

//////////////////////////////
// QUESTION
//////////////////////////////

app.get("/api/question", (req, res) => {
    if (!currentUser) {
        return res.status(401).json({ error: "unauthorized" });
    }

    const mode = req.query.mode || "en-tr";

    const word = db.prepare(`
        SELECT w.*
        FROM words w
        LEFT JOIN user_words uw
        ON w.id = uw.word_id 
        AND uw.user_id = ? 
        AND uw.mode = ?
        WHERE w.level = ?
        AND (uw.learned IS NULL OR uw.learned = 0)
        ORDER BY RANDOM()
        LIMIT 1
    `).get(currentUser.id, mode, currentUser.level);

    if (!word) {
        return res.json({ noWords: true });
    }

    const question = mode === "en-tr" ? word.english : word.turkish;
    const correctAnswer = mode === "en-tr" ? word.turkish : word.english;

    let choices = db.prepare(`
        SELECT ${mode === "en-tr" ? "turkish" : "english"} as val
        FROM words
        ORDER BY RANDOM()
        LIMIT 4
    `).all().map(x => x.val);

    if (!choices.includes(correctAnswer)) {
        choices[0] = correctAnswer;
    }

    choices = choices.sort(() => Math.random() - 0.5);

    res.json({
        question,
        correctAnswer,
        choices,
        wordId: word.id
    });
});

//////////////////////////////
// ANSWER
//////////////////////////////

app.post("/api/answer", (req, res) => {
    const { correct, wordId, mode } = req.body;

    if (!currentUser) {
        return res.status(401).json({ error: "unauthorized" });
    }

    if (correct) {
        db.prepare(`
            INSERT INTO user_words (user_id, word_id, mode, learned)
            VALUES (?, ?, ?, 1)
            ON CONFLICT(user_id, word_id, mode)
            DO UPDATE SET learned = 1, learned_at = CURRENT_TIMESTAMP
        `).run(currentUser.id, wordId, mode);
    }

    res.json({ ok: true });
});

//////////////////////////////
// STATS
//////////////////////////////

app.get("/api/stats", (req, res) => {
    if (!currentUser) {
        return res.status(401).json({ error: "unauthorized" });
    }

    const mode = req.query.mode || "en-tr";

    const total = db.prepare(`
        SELECT COUNT(*) as c
        FROM words
        WHERE level = ?
    `).get(currentUser.level).c;

    const learned = db.prepare(`
        SELECT COUNT(*) as c
        FROM user_words
        WHERE user_id = ? AND mode = ? AND learned = 1
    `).get(currentUser.id, mode).c;

    res.json({
        learnedCount: learned,
        totalCount: total
    });
});

//////////////////////////////
// LEVEL
//////////////////////////////

app.post("/api/user/level", (req, res) => {
    const { level } = req.body;

    if (!currentUser) {
        return res.status(401).json({ error: "unauthorized" });
    }

    db.prepare(
        "UPDATE users SET level = ? WHERE id = ?"
    ).run(level, currentUser.id);

    currentUser.level = level;

    res.json({ ok: true });
});

//////////////////////////////
// RESET
//////////////////////////////

app.post("/api/user/reset", (req, res) => {
    if (!currentUser) {
        return res.status(401).json({ error: "unauthorized" });
    }

    db.prepare(`
        DELETE FROM user_words WHERE user_id = ?
    `).run(currentUser.id);

    res.json({ ok: true });
});

//////////////////////////////
// ERROR HANDLER (ÖNEMLİ)
//////////////////////////////

app.use((err, req, res, next) => {
    console.error("🔥 SERVER ERROR:", err);
    res.status(500).json({ error: err.message });
});

//////////////////////////////
// SERVER
//////////////////////////////

const port = process.env.PORT || 3000;

app.listen(port, () => {
    console.log("Server running on", port);
});