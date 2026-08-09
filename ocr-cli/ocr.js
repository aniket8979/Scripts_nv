const Tesseract = require('tesseract.js');
const path = require('path');

// Get the image path from the CLI arguments
const imagePath = process.argv[2];

if (!imagePath) {
  console.error("Error: Please provide a path to an image file.");
  console.log("ocr <path-to-image>");
  process.exit(1);
}

const absolutePath = path.resolve(imagePath);

console.log(`--- Processing: ${path.basename(absolutePath)} ---`);

Tesseract.recognize(
  absolutePath,
  'eng', // Language code (English)
  { 
    logger: m => {
      // Log progress (optional, shows status in console)
      if (m.status === 'recognizing text') {
        process.stdout.write(`\rProgress: ${Math.floor(m.progress * 100)}%`);
      }
    }
  }
).then(({ data: { text } }) => {
  console.log("\n\n--- Extracted Text ---");
  console.log(text);
  console.log("----------------------");
}).catch(err => {
  console.error("OCR Error:", err.message);
});