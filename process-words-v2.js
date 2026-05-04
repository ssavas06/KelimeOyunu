const fs = require('fs');

const items = JSON.parse(fs.readFileSync('words-coords-paged.json', 'utf8'));

const lines = {};

items.forEach(item => {
    const key = `${item.page}-${item.y.toFixed(2)}`;
    if (!lines[key]) lines[key] = [];
    lines[key].push(item);
});

const words = [];
Object.keys(lines).sort().forEach(key => {
    const row = lines[key].sort((a, b) => a.x - b.x);
    let en = "";
    let tr = "";
    row.forEach(item => {
        if (item.x < 7) en += item.text;
        else tr += item.text;
    });

    en = en.trim();
    tr = tr.trim();

    if (en && tr && isNaN(en) && en.length > 1) {
        words.push({ english: en, turkish: tr });
    }
});

console.log("Total words extracted:", words.length);
// Assign levels
const wordsWithLevels = words.map((w, index) => {
    let level = 1;
    if (index >= 750) level = 4;
    else if (index >= 500) level = 3;
    else if (index >= 250) level = 2;
    return { ...w, level };
});

fs.writeFileSync('words-final.json', JSON.stringify(wordsWithLevels, null, 2));
