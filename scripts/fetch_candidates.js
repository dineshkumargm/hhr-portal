
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

const CandidateSchema = new mongoose.Schema({
    id: String,
    name: String,
    role: String,
    associatedJdId: String,
    resumeBase64: String,
    resumeMimeType: String
}, { strict: false });

const Candidate = mongoose.model('Candidate', CandidateSchema);

const main = async () => {
    try {
        await mongoose.connect(MONGODB_URI);

        const candidates = await Candidate.find({});
        console.log(`Found ${candidates.length} candidates in total.`);

        // Group by Job ID
        const jobsMap = {};
        candidates.forEach(c => {
            const jid = c.associatedJdId || 'unknown';
            if (!jobsMap[jid]) jobsMap[jid] = [];
            jobsMap[jid].push(c);
        });

        console.log("Candidates per Job:");
        Object.keys(jobsMap).forEach(jid => {
            console.log(`- Job ID: ${jid}, Count: ${jobsMap[jid].length}`);
        });

        // Pick the job with most candidates (excluding unknown if possible, or just max)
        let targetJdId = Object.keys(jobsMap).sort((a, b) => jobsMap[b].length - jobsMap[a].length)[0];

        if (!targetJdId || jobsMap[targetJdId].length === 0) {
            console.log("No candidates found.");
            return;
        }

        console.log(`\nSelected Job ID: ${targetJdId} for extraction.`);

        const outputDir = `temp_resumes/${targetJdId}`;
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const selectedCandidates = jobsMap[targetJdId];
        let savedCount = 0;

        selectedCandidates.forEach(c => {
            if (c.resumeBase64) {
                const ext = c.resumeMimeType === 'application/pdf' ? 'pdf' :
                    c.resumeMimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ? 'docx' : 'bin';
                const filename = `${c.name.replace(/[^a-z0-9]/gi, '_')}_${c.id}.${ext}`;
                const filePath = path.join(outputDir, filename);

                fs.writeFileSync(filePath, Buffer.from(c.resumeBase64, 'base64'));
                console.log(`Saved: ${filename}`);
                savedCount++;
            } else {
                console.log(`Skipped ${c.name} (No Base64 content)`);
            }
        });

        console.log(`\nExtracted ${savedCount} resumes to ${outputDir}`);

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
};

main();
