const { PdfReader } = require("pdfreader");
const fs = require('fs');

const items = [];
new PdfReader().parseFileItems("kelimeler.pdf", (err, item) => {
  if (err) {
      console.error("error:", err);
  } else if (!item) {
      fs.writeFileSync('words-coords.json', JSON.stringify(items, null, 2));
      console.log("Done. Items saved to words-coords.json");
      process.exit(0);
  } else if (item.text) {
      items.push({ text: item.text, x: item.x, y: item.y });
  }
});
