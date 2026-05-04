const fs = require('fs');
const pdf = require('pdf-parse');

async function checkPdf() {
    let dataBuffer = fs.readFileSync('kelimeler.pdf');
    try {
        const data = await pdf(dataBuffer);
        console.log("PDF Text Sample:");
        console.log(data.text.substring(0, 500));
    } catch (error) {
        console.error("Error reading PDF:", error);
    }
}

checkPdf();
