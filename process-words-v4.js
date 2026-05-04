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
        
        let c1 = "", c2 = "", c3 = "", c4 = "";
        row.forEach(item => {
            if (item.x < 7) c1 += item.text;
            else if (item.x < 16) c2 += item.text;
            else if (item.x < 24) c3 += item.text;
            else c4 += item.text;
        });

        c1 = c1.trim(); c2 = c2.trim(); c3 = c3.trim(); c4 = c4.trim();

        if (c1 && c2 && isNaN(c1) && c1.length > 1) {
            words.push({ english: c1, turkish: c2 });
        }
        if (c3 && c4 && isNaN(c3) && c3.length > 1) {
            words.push({ english: c3, turkish: c4 });
        }
    });
});

console.log("Total words extracted:", words.length);
if (words.length > 0) {
    console.log("Sample 1:", words[0]);
    console.log("Sample 2:", words[1]);
}

const wordsWithLevels = words.map((w, index) => {
    let level = 1;
    if (index >= 750) level = 4;
    else if (index >= 500) level = 3;
    else if (index >= 250) level = 2;
    return { ...w, level };
});

fs.writeFileSync('words-final.json', JSON.stringify(wordsWithLevels, null, 2));
