const pdfParse = require('pdf-parse');

async function checkPDF() {
  try {
    const response = await fetch('https://www.yasar.edu.tr/yemek-liste.pdf');
    if (!response.ok) throw new Error("Failed to fetch");
    const buffer = await response.arrayBuffer();
    
    const data = await pdfParse(Buffer.from(buffer));
    console.log("PDF TEXT EXTRACTED:");
    console.log(data.text.substring(0, 2000)); // Print the first 2000 characters
  } catch (err) {
    console.error("Error fetching or parsing:", err.message);
  }
}

checkPDF();
