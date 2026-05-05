const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');

async function initDb() {
    const db = new Database('./database.sqlite');
    
    // Performance optimization
    db.pragma('journal_mode = WAL');

    // Users table
    db.prepare(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password TEXT,
            level INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `).run();

    // Words table
    db.prepare(`
        CREATE TABLE IF NOT EXISTS words (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            english TEXT,
            turkish TEXT,
            level INTEGER
        )
    `).run();

    // User progress table
    db.prepare(`
        CREATE TABLE IF NOT EXISTS user_words (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            word_id INTEGER,
            mode TEXT, -- 'en-tr' or 'tr-en'
            learned BOOLEAN DEFAULT 1,
            learned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (word_id) REFERENCES words(id),
            UNIQUE(user_id, word_id, mode)
        )
    `).run();

    // Create default user if not exists
    const defaultUser = db.prepare('SELECT * FROM users WHERE username = ?').get('Hamza');
    if (!defaultUser) {
        const hashedPassword = await bcrypt.hash('1234', 10);
        db.prepare('INSERT INTO users (username, password, level) VALUES (?, ?, ?)').run('Hamza', hashedPassword, 1);
        console.log('Default user "Hamza" created.');
    }

    // Add some helper methods to mimic the 'sqlite' package API used in server.js
    return {
        get: (sql, params) => Promise.resolve(db.prepare(sql).get(...(params || []))),
        all: (sql, params) => Promise.resolve(db.prepare(sql).all(...(params || []))),
        run: (sql, params) => Promise.resolve(db.prepare(sql).run(...(params || []))),
        prepare: (sql) => {
            const stmt = db.prepare(sql);
            return Promise.resolve({
                run: (...params) => Promise.resolve(stmt.run(...params)),
                finalize: () => Promise.resolve()
            });
        },
        exec: (sql) => Promise.resolve(db.exec(sql))
    };
}

module.exports = { initDb };

