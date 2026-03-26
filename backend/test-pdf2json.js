const fs = require('fs');
const PDFParser = require("pdf2json");

const pdfParser = new PDFParser();

pdfParser.on("pdfParser_dataError", errData => console.error(errData.parserError));
pdfParser.on("pdfParser_dataReady", pdfData => {
  const page = pdfData.formImage.Pages[0];
  const texts = page.Texts.map(t => ({ x: t.x, y: t.y, text: decodeURIComponent(t.R[0].T) }));
  console.log(texts.slice(0, 30));
});

pdfParser.loadPDF("/Users/cemilfahreci/Downloads/yemek-liste.pdf");
