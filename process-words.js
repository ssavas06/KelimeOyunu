const fs = require('fs');

const items = JSON.parse(fs.readFileSync('words-coords.json', 'utf8'));

// Group by y coordinate
// Since y might be slightly different due to floating point, we'll round it or use a tolerance
const lines = {};
let pageOffset = 0;
let lastY = 0;

items.forEach(item => {
    // If y jumps back up significantly, it's a new page
    if (item.y < lastY - 2) {
        pageOffset += 50; // Assume roughly 50 units per page height
    }
    const absoluteY = pageOffset + item.y;
    lastY = item.y;

    const yKey = Math.round(absoluteY * 10) / 10;
    if (!lines[yKey]) lines[yKey] = [];
    lines[yKey].push(item);
});

const words = [];
Object.keys(lines).sort((a, b) => a - b).forEach(y => {
    const row = lines[y].sort((a, b) => a.x - b.x);
    // Find EN (x < 7) and TR (x > 7)
    let en = "";
    let tr = "";
    row.forEach(item => {
        if (item.x < 7) en += item.text;
        else tr += item.text;
    });

    en = en.trim();
    tr = tr.trim();

    // Filter out headers or numbers
    if (en && tr && isNaN(en) && en.length > 1) {
        words.push({ english: en, turkish: tr });
    }
});

console.log("Total words extracted:", words.length);
fs.writeFileSync('words-final.json', JSON.stringify(words, null, 2));
