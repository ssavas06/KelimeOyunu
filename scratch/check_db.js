const Database = require('better-sqlite3');
const db = new Database('./database.sqlite');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('Tables:', tables);
for (const table of tables) {
    const schema = db.prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name='${table.name}'`).get();
    console.log(`Schema for ${table.name}:`, schema.sql);
}
db.close();
