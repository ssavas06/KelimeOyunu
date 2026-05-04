const fs = require('fs');
const { PdfReader } = require("pdfreader");

async function dumpPdf() {
    let text = "";
    new PdfReader().parseFileItems("kelimeler.pdf", (err, item) => {
        if (err) console.error(err);
        else if (!item) {
            fs.writeFileSync('pdf-text-dump.txt', text);
            console.log("Dumped to pdf-text-dump.txt");
        } else if (item.text) {
            text += item.text + " ";
        }
    });
}

dumpPdf();
