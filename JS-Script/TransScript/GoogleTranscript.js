const { readFile } = require('node:fs/promises');

async function extractTextFromFile(filePath) {
  try {
    const fileContent = await readFile(filePath, 'utf-8');
    const captionData = JSON.parse(fileContent);

    const transcript = captionData.events
      ?.flatMap(event => event.segs || [])
      .map(seg => seg.utf8)
      .filter(Boolean)
      .join('');

    console.log(transcript);
  } catch (error) {
    console.error("Error reading file:", error);
  }
}

extractTextFromFile('Transcript.json'); // Replace with your target filename