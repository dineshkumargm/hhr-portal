
const pdf = require('pdf-parse');

console.log('Type of pdf:', typeof pdf);
console.log('Is function?', typeof pdf === 'function');
console.log('Keys:', Object.keys(pdf));

if (typeof pdf !== 'function') {
    if (pdf.default && typeof pdf.default === 'function') {
        console.log('Found pdf.default function');
        // Try using default
        const fs = require('fs');
        const path = require('path');
        const directoryPath = 'temp_resumes/j-1767899215996';
        const files = fs.readdirSync(directoryPath).filter(f => f.endsWith('.pdf'));
        const file = files[0];
        const filePath = path.join(directoryPath, file);
        const dataBuffer = fs.readFileSync(filePath);
        pdf.default(dataBuffer).then(data => {
            console.log("Success with default!");
            console.log(data.text.substring(0, 50));
        }).catch(e => console.error(e));
    }
} else {
    console.log('pdf is a function, trying to run...');
    const fs = require('fs');
    const path = require('path');
    const directoryPath = 'temp_resumes/j-1767899215996';
    const files = fs.readdirSync(directoryPath).filter(f => f.endsWith('.pdf'));
    const file = files[0];
    const filePath = path.join(directoryPath, file);
    const dataBuffer = fs.readFileSync(filePath);
    pdf(dataBuffer).then(data => {
        console.log("Success with direct call!");
        console.log(data.text.substring(0, 50));
    }).catch(e => console.error(e));
}
