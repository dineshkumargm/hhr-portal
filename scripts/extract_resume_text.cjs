
const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');

const directoryPath = 'temp_resumes/j-1767899215996';
const outputPath = 'resumes_text.json';

const main = async () => {
    try {
        if (!fs.existsSync(directoryPath)) {
            console.error(`Directory not found: ${directoryPath}`);
            return;
        }

        const files = fs.readdirSync(directoryPath).filter(f => f.endsWith('.pdf'));
        const results = [];

        console.log(`Processing ${files.length} PDFs from ${directoryPath}...`);

        for (const file of files) {
            const filePath = path.join(directoryPath, file);
            const dataBuffer = fs.readFileSync(filePath);

            try {
                const data = await pdf(dataBuffer);
                results.push({
                    filename: file,
                    text: data.text
                });
                console.log(`Parsed: ${file}`);
            } catch (err) {
                console.error(`Error parsing ${file}:`, err);
            }
        }

        fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
        console.log(`Saved text to ${outputPath}`);
    } catch (e) {
        console.error(e);
    }
};

main();
