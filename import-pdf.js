const { PdfReader } = require("pdfreader");
const fs = require('fs');

async function importPdf() {
    console.log("Reading kelimeler.pdf...");
    const items = [];
    let currentPage = 0;

    return new Promise((resolve, reject) => {
        new PdfReader().parseFileItems("kelimeler.pdf", (err, item) => {
            if (err) reject(err);
            else if (!item) {
                processItems(items).then(resolve);
            } else if (item.page) {
                currentPage = item.page;
            } else if (item.text) {
                items.push({ text: item.text, x: item.x, y: item.y, page: currentPage });
            }
        });
    });
}

async function processItems(items) {
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
            
            // Handle 4 column layout (EN TR EN TR)
            let c1 = "", c2 = "", c3 = "", c4 = "";
            row.forEach(item => {
                if (item.x < 7) c1 += item.text;
                else if (item.x < 16) c2 += item.text;
                else if (item.x < 24) c3 += item.text;
                else c4 += item.text;
            });

            c1 = c1.trim(); c2 = c2.trim(); c3 = c3.trim(); c4 = c4.trim();

            if (c1 && c2 && isNaN(c1) && c1.length > 1) words.push({ english: c1, turkish: c2 });
            if (c3 && c4 && isNaN(c3) && c3.length > 1) words.push({ english: c3, turkish: c4 });
        });
    });

    // Assign levels
    const wordsWithLevels = words.map((w, index) => {
        let level = 1;
        if (index >= 750) level = 4;
        else if (index >= 500) level = 3;
        else if (index >= 250) level = 2;
        return { ...w, level };
    });

    fs.writeFileSync('words-final.json', JSON.stringify(wordsWithLevels, null, 2));
    console.log(`Successfully extracted ${words.length} words to words-final.json`);
}

importPdf().catch(console.error);
