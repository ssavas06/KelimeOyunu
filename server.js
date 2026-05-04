const express = require('express');
const { initDb } = require('./db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = 'kelime_oyunu_gizli_anahtar';

app.use(express.json());
app.use(cookieParser());
app.use(cors());
app.use(express.static('public'));

let db;

async function startServer() {
    db = await initDb();

    // Import words from words-final.json if table is empty or count differs
    const wordCount = await db.get('SELECT COUNT(*) as count FROM words');
    if (fs.existsSync('words-final.json')) {
        const wordsData = JSON.parse(fs.readFileSync('words-final.json', 'utf8'));
        if (wordCount.count !== wordsData.length) {
            console.log(`Word count changed (${wordCount.count} -> ${wordsData.length}). Re-importing...`);
            await db.run('DELETE FROM user_words');
            await db.run('DELETE FROM words');
            await db.run('DELETE FROM sqlite_sequence WHERE name="words"');
            const stmt = await db.prepare('INSERT INTO words (english, turkish, level) VALUES (?, ?, ?)');
            for (const w of wordsData) {
                await stmt.run(w.english, w.turkish, w.level);
            }
            await stmt.finalize();
            console.log(`${wordsData.length} words imported to database.`);
        }
    }

    app.listen(PORT, () => {
        console.log(`Server running at http://localhost:${PORT}`);
    });
}

// Auth Middleware
const authenticateToken = (req, res, next) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: 'Yetkisiz erişim' });

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.status(403).json({ error: 'Oturum geçersiz' });
        req.user = user;
        next();
    });
};

// Auth Routes
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await db.get('SELECT * FROM users WHERE username = ?', [username]);
    
    if (user && await bcrypt.compare(password, user.password)) {
        const token = jwt.sign({ id: user.id, username: user.username }, SECRET_KEY, { expiresIn: '30d' });
        res.cookie('token', token, { httpOnly: true, maxAge: 30 * 24 * 60 * 60 * 1000 });
        res.json({ id: user.id, username: user.username, level: user.level });
    } else {
        res.status(401).json({ error: 'Hatalı kullanıcı adı veya şifre' });
    }
});

app.post('/api/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ message: 'Başarıyla çıkış yapıldı' });
});

app.get('/api/me', authenticateToken, async (req, res) => {
    const user = await db.get('SELECT id, username, level FROM users WHERE id = ?', [req.user.id]);
    res.json(user);
});

app.post('/api/user/level', authenticateToken, async (req, res) => {
    const { level } = req.body;
    if (level >= 1 && level <= 4) {
        await db.run('UPDATE users SET level = ? WHERE id = ?', [level, req.user.id]);
        res.json({ success: true, level });
    } else {
        res.status(400).json({ error: 'Geçersiz seviye' });
    }
});

app.post('/api/user/reset', authenticateToken, async (req, res) => {
    try {
        await db.run('DELETE FROM user_words WHERE user_id = ?', [req.user.id]);
        res.json({ success: true });
    } catch (err) {
        console.error('Database reset error:', err);
        res.status(500).json({ error: 'Veritabanı hatası' });
    }
});

// Game Routes
app.get('/api/question', authenticateToken, async (req, res) => {
    const { mode } = req.query; // 'en-tr' or 'tr-en'
    const user = await db.get('SELECT level FROM users WHERE id = ?', [req.user.id]);
    
    // Get a word the user hasn't learned yet at their current level in this specific mode
    const word = await db.get(`
        SELECT * FROM words 
        WHERE level = ? 
        AND id NOT IN (SELECT word_id FROM user_words WHERE user_id = ? AND learned = 1 AND mode = ?)
        ORDER BY RANDOM() LIMIT 1
    `, [user.level, req.user.id, mode]);

    if (!word) {
        // Check if there are any words left in this level for this mode
        const totalInLevel = await db.get('SELECT COUNT(*) as count FROM words WHERE level = ?', [user.level]);
        const learnedInLevel = await db.get('SELECT COUNT(*) as count FROM user_words WHERE user_id = ? AND mode = ? AND word_id IN (SELECT id FROM words WHERE level = ?)', [req.user.id, mode, user.level]);
        
        if (totalInLevel.count > 0 && learnedInLevel.count >= totalInLevel.count) {
            // Level completed! Move to next level if possible
            if (user.level < 4) {
                await db.run('UPDATE users SET level = level + 1 WHERE id = ?', [req.user.id]);
                return res.json({ levelUp: true, nextLevel: user.level + 1 });
            } else {
                return res.json({ allCompleted: true });
            }
        }
        return res.json({ noWords: true });
    }

    // Get 3 random wrong answers from the same level
    const wrongAnswers = await db.all(`
        SELECT ${mode === 'en-tr' ? 'turkish' : 'english'} as answer 
        FROM words 
        WHERE level = ? AND id != ?
        ORDER BY RANDOM() LIMIT 3
    `, [user.level, word.id]);

    const correctAnswer = mode === 'en-tr' ? word.turkish : word.english;
    const questionText = mode === 'en-tr' ? word.english : word.turkish;

    const choices = [...wrongAnswers.map(a => a.answer), correctAnswer].sort(() => Math.random() - 0.5);

    res.json({
        wordId: word.id,
        question: questionText,
        choices,
        correctAnswer
    });
});

app.post('/api/answer', authenticateToken, async (req, res) => {
    const { wordId, correct, mode } = req.body;
    if (correct && mode) {
        await db.run('INSERT OR IGNORE INTO user_words (user_id, word_id, learned, mode) VALUES (?, ?, 1, ?)', [req.user.id, wordId, mode]);
    }
    res.json({ success: true });
});

app.get('/api/stats', authenticateToken, async (req, res) => {
    const { mode } = req.query;
    const stats = await db.get(`
        SELECT 
            (SELECT COUNT(*) FROM user_words WHERE user_id = ? AND mode = ?) as learnedCount,
            (SELECT COUNT(*) FROM words) as totalCount
        FROM users WHERE id = ?
    `, [req.user.id, mode, req.user.id]);
    res.json(stats);
});

startServer();
