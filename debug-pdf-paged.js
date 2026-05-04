const { PdfReader } = require("pdfreader");
const fs = require('fs');

const items = [];
let currentPage = 0;
new PdfReader().parseFileItems("kelimeler.pdf", (err, item) => {
  if (err) {
      console.error("error:", err);
  } else if (!item) {
      fs.writeFileSync('words-coords-paged.json', JSON.stringify(items, null, 2));
      process.exit(0);
  } else if (item.page) {
      currentPage = item.page;
  } else if (item.text) {
      items.push({ text: item.text, x: item.x, y: item.y, page: currentPage });
  }
});
