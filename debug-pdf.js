const { PdfReader } = require("pdfreader");
const fs = require('fs');

const items = [];
new PdfReader().parseFileItems("kelimeler.pdf", (err, item) => {
  if (err) {
      console.error("error:", err);
  } else if (!item) {
      // Process items
      const words = items.filter(i => i.trim() !== '' && isNaN(i.trim()));
      console.log("Total non-empty non-number items:", words.length);
      fs.writeFileSync('words-debug.json', JSON.stringify(words, null, 2));
      process.exit(0);
  } else if (item.text) {
      items.push(item.text);
  }
});
