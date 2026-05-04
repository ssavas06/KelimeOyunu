const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const bcrypt = require('bcryptjs');

async function initDb() {
    const db = await open({
        filename: './database.sqlite',
        driver: sqlite3.Database
    });

    // Users table
    await db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password TEXT,
            level INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Words table
    await db.exec(`
        CREATE TABLE IF NOT EXISTS words (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            english TEXT,
            turkish TEXT,
            level INTEGER
        )
    `);

    // User progress table
    await db.exec(`
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
    `);

    // Create default user if not exists
    const defaultUser = await db.get('SELECT * FROM users WHERE username = ?', ['Hamza']);
    if (!defaultUser) {
        const hashedPassword = await bcrypt.hash('1234', 10);
        await db.run('INSERT INTO users (username, password, level) VALUES (?, ?, ?)', ['Hamza', hashedPassword, 1]);
        console.log('Default user "Hamza" created.');
    }

    return db;
}

module.exports = { initDb };
