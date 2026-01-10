
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

const JobSchema = new mongoose.Schema({
    id: { type: String },
    title: String,
    department: String,
    location: String,
    type: String,
    status: String,
    skills: [String],
    description: String,
    jdUrl: String,
    userId: String
}, { strict: false });

const Job = mongoose.model('Job', JobSchema);

const main = async () => {
    try {
        await mongoose.connect(MONGODB_URI);
        const jobs = await Job.find({});
        fs.writeFileSync('jobs_dump.json', JSON.stringify(jobs, null, 2));
        console.log(`Dumped ${jobs.length} jobs to jobs_dump.json`);
    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
};

main();
