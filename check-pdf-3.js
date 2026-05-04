const { PdfReader } = require("pdfreader");

new PdfReader().parseFileItems("kelimeler.pdf", (err, item) => {
  if (err) console.error("error:", err);
  else if (!item) console.log("done");
  else if (item.text) console.log(item.text);
});
