
import fs from 'fs';
import path from 'path';
import pdf from 'pdf-parse';

const directoryPath = 'temp_resumes/j-1767899215996';
const outputPath = 'resumes_text.json';

const main = async () => {
    try {
        const files = fs.readdirSync(directoryPath).filter(f => f.endsWith('.pdf'));
        const results = [];

        console.log(`Processing ${files.length} PDFs...`);

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
