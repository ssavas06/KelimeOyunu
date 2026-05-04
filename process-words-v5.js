const fs = require('fs');

const items = JSON.parse(fs.readFileSync('words-coords-paged.json', 'utf8'));

const pages = {};
items.forEach(item => {
    if (!pages[item.page]) pages[item.page] = {};
    // Use a small tolerance for Y coordinates to group items in the same line
    const yKey = (Math.round(item.y * 10) / 10).toFixed(1); 
    if (!pages[item.page][yKey]) pages[item.page][yKey] = [];
    pages[item.page][yKey].push(item);
});

let allWords = [];

Object.keys(pages).sort((a, b) => a - b).forEach(page => {
    const lines = pages[page];
    Object.keys(lines).sort((a, b) => a - b).forEach(y => {
        const row = lines[y].sort((a, b) => a.x - b.x);
        
        // We have 4 potential columns of interest (ignoring the numbers and dots)
        // Col 1: EN, Col 2: TR, Col 3: EN, Col 4: TR
        // Numbers are usually at x < 3 and x around 19-20
        
        let c1 = "", c2 = "", c3 = "", c4 = "";
        
        row.forEach(item => {
            const text = item.text.trim();
            if (!text || text === "............") return;
            
            // Check if it's a number (like "1." or "251.")
            if (/^\d+\.$/.test(text)) return;

            if (item.x < 8) c1 += " " + text;
            else if (item.x < 18) c2 += " " + text;
            else if (item.x < 25) c3 += " " + text;
            else c4 += " " + text;
        });

        c1 = c1.trim(); c2 = c2.trim(); c3 = c3.trim(); c4 = c4.trim();

        if (c1 && c2) {
            allWords.push({ english: c1, turkish: c2 });
        }
        if (c3 && c4) {
            allWords.push({ english: c3, turkish: c4 });
        }
    });
});

console.log("Total words extracted:", allWords.length);

// Now, the user says the words are already in 250-word groups and sorted within them.
// But we should probably just take the first 250, sort them, and assign Level 1, etc.
// Actually, if they are already sorted, we just assign levels.
// BUT the user says: "Each 250 word group is alphabetically sorted within itself."
// And "When transferring, set first 250 to Level 1, second to Level 2..."

const levels = [];
for (let i = 0; i < allWords.length; i += 250) {
    let group = allWords.slice(i, i + 250);
    // Sort each group alphabetically by English
    group.sort((a, b) => a.english.localeCompare(b.english));
    
    const level = Math.floor(i / 250) + 1;
    group = group.map(w => ({ ...w, level }));
    levels.push(...group);
}

fs.writeFileSync('words-final.json', JSON.stringify(levels, null, 2));
console.log(`Successfully processed ${levels.length} words into words-final.json`);
