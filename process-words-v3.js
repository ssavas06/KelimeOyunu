const fs = require('fs');

const items = JSON.parse(fs.readFileSync('words-coords-paged.json', 'utf8'));

const pages = {};
items.forEach(item => {
    if (!pages[item.page]) pages[item.page] = {};
    const yKey = item.y.toFixed(2);
    if (!pages[item.page][yKey]) pages[item.page][yKey] = [];
    pages[item.page][yKey].push(item);
});

const words = [];
Object.keys(pages).sort((a, b) => a - b).forEach(page => {
    const lines = pages[page];
    Object.keys(lines).sort((a, b) => a - b).forEach(y => {
        const row = lines[y].sort((a, b) => a.x - b.x);
        let left = "";
        let right = "";
        row.forEach(item => {
            if (item.x < 7) left += item.text;
            else right += item.text;
        });

        left = left.trim();
        right = right.trim();

        if (left && right && isNaN(left) && left.length > 1) {
            words.push({ english: left, turkish: right });
        }
    });
});

console.log("Total words extracted:", words.length);
if (words.length > 0) {
    console.log("Sample 1:", words[0]);
    console.log("Sample 5:", words[4]);
}

const wordsWithLevels = words.map((w, index) => {
    let level = 1;
    if (index >= 750) level = 4;
    else if (index >= 500) level = 3;
    else if (index >= 250) level = 2;
    return { ...w, level };
});

fs.writeFileSync('words-final.json', JSON.stringify(wordsWithLevels, null, 2));
