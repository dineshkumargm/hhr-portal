
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Request Logger
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} [${req.method}] ${req.url}`);
    next();
});

const PORT = 5001;
const MONGODB_URI = process.env.MONGODB_URI;

let isConnected = false;
export const connectToDatabase = async () => {
    if (isConnected) {
        console.log('=> Using existing database connection');
        return;
    }
    console.log('=> Using new database connection');
    try {
        await mongoose.connect(MONGODB_URI);
        isConnected = true;
        console.log('Connected to MongoDB Atlas');

        // CLEANUP: Drop legacy unique index on email for candidates if it exists
        try {
            await mongoose.connection.collection('candidates').dropIndex('email_1');
            console.log('Dropped legacy index: email_1');
        } catch (e) {
            // Index might not exist, ignore
        }
    } catch (err) {
        console.error('MongoDB connection error:', err);
        throw err;
    }
};

// Auto-connect for local dev only
if (!process.env.VERCEL) {
    connectToDatabase();
}

// Schemas
const UserSchema = new mongoose.Schema({
    id: { type: String, unique: true },
    name: String,
    email: { type: String, unique: true },
    password: String, // Simple for now
    avatar: String,
    title: String,
    about: String,
    location: String,
    stats: {
        hired: { type: String, default: '0' },
        timeToHire: { type: String, default: '0 Days' },
        efficiency: { type: String, default: '0%' }
    },
    settings: {
        companyName: String,
        industry: String,
        aiRigorous: { type: Boolean, default: true },
        aiBiasRedaction: { type: Boolean, default: false },
        emailDigests: { type: Boolean, default: true }
    }
}, { timestamps: true });

const JobSchema = new mongoose.Schema({
    id: { type: String, unique: true },
    title: String,
    department: String,
    location: String,
    type: String,
    status: String,
    applicantsCount: { type: Number, default: 0 },
    matchesCount: { type: Number, default: 0 },
    skills: [String],
    jdUrl: String,
    jdFileName: String,
    userId: String
}, { toJSON: { virtuals: true }, toObject: { virtuals: true } });

// Ensure id exists even for legacy data
JobSchema.virtual('id_alias').get(function () {
    return this.id || this._id.toString();
});

const CandidateSchema = new mongoose.Schema({
    id: { type: String, unique: true },
    name: String,
    role: String,
    company: String,
    location: String,
    appliedDate: String,
    status: String,
    matchScore: Number,
    avatar: String,
    associatedJdId: String,
    analysis: String,
    resumeBase64: String,
    resumeMimeType: String,
    userId: String
}, { toJSON: { virtuals: true }, toObject: { virtuals: true } });

const ActivitySchema = new mongoose.Schema({
    id: String,
    user: String,
    action: String,
    target: String,
    time: String,
    avatar: String,
    userId: String
}, { toJSON: { virtuals: true }, toObject: { virtuals: true } });

const User = mongoose.model('User', UserSchema);
const Job = mongoose.model('Job', JobSchema);
const Candidate = mongoose.model('Candidate', CandidateSchema);
const Activity = mongoose.model('Activity', ActivitySchema);

// AUTH ROUTES
app.post('/api/auth/register', async (req, res) => {
    try {
        if (!req.body || !req.body.name || !req.body.email || !req.body.password) {
            return res.status(400).json({ error: 'Missing required fields (name, email, password)' });
        }
        const { name, email, password } = req.body;
        const exists = await User.findOne({ email });
        if (exists) return res.status(400).json({ error: 'User already exists' });

        const id = `u-${Date.now()}`;
        const user = new User({ id, name, email, password });
        await user.save();
        const userObj = user.toObject();
        delete userObj.password;
        res.json(userObj);
    } catch (err) {
        console.error('Registration error:', err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log(`Login attempt: email=${email}, password=${password}`);

        const user = await User.findOne({ email, password });
        if (!user) {
            console.log('Login failed: Invalid credentials');
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        console.log('Login successful:', user.email);
        const userObj = user.toObject();
        delete userObj.password;
        res.json(userObj);
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: err.message });
    }
});

// USER ROUTES
app.get('/api/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const query = { id }; // Helper to support both ObjectId and custom ID if needed, but strict 'id' is safer for now
        const user = await User.findOne(query);
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.patch('/api/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findOneAndUpdate({ id }, req.body, { new: true });
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// API Routes
app.get('/api/jobs', async (req, res) => {
    const userId = req.query.userId;
    const query = userId ? { userId } : {};
    const rawJobs = await Job.find(query);
    const normalizedJobs = rawJobs.map(j => {
        const obj = j.toJSON();
        return { ...obj, id: obj.id || obj._id.toString() };
    });
    res.json(normalizedJobs);
});

app.post('/api/jobs', async (req, res) => {
    const job = new Job(req.body);
    await job.save();
    res.json(job);
});

app.patch('/api/jobs/:id', async (req, res) => {
    const { id } = req.params;
    const query = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { id };
    const job = await Job.findOneAndUpdate(query, req.body, { new: true });
    res.json(job);
});

app.delete('/api/jobs/:id', async (req, res) => {
    const { id } = req.params;
    const query = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { id };
    await Job.findOneAndDelete(query);
    res.json({ message: 'Job deleted successfully' });
});

// OPTIMIZED: Exclude resumeBase64 from list view
app.get('/api/candidates', async (req, res) => {
    const query = req.query || {};
    res.json(await Candidate.find(query).select('-resumeBase64'));
});

// NEW: Endpoint for single candidate with all fields
app.get('/api/candidates/:id', async (req, res) => {
    res.json(await Candidate.findOne({ id: req.params.id }));
});

app.post('/api/candidates', async (req, res) => {
    try {
        const candidate = new Candidate(req.body);
        await candidate.save();
        res.json(candidate);
    } catch (err) {
        console.error('Candidate save error:', err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/activities', async (req, res) => {
    const userId = req.query.userId;
    const query = userId ? { userId } : {};
    res.json(await Activity.find(query).sort({ _id: -1 }).limit(10));
});

app.post('/api/activities', async (req, res) => {
    const activity = new Activity(req.body);
    await activity.save();
    res.json(activity);
});

// Seed Endpoint
app.post('/api/seed', async (req, res) => {
    const { jobs, candidates, activities, userId } = req.body;
    const userQuery = userId ? { userId } : {};
    await Job.deleteMany(userQuery);
    await Candidate.deleteMany(userQuery);
    await Activity.deleteMany(userQuery);

    const jobsWithUser = jobs.map(j => ({ ...j, userId }));
    const candidatesWithUser = candidates.map(c => ({ ...c, userId }));
    const activitiesWithUser = activities.map(a => ({ ...a, userId }));

    await Job.insertMany(jobsWithUser);
    await Candidate.insertMany(candidatesWithUser);
    await Activity.insertMany(activitiesWithUser);
    res.json({ message: 'Database seeded for user successfully' });
});

// Conditionally listen if not in Vercel environment
if (!process.env.VERCEL) {
    app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
}

export default app;
