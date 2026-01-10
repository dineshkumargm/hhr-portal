
import fs from 'fs';

const content = `MONGODB_URI=mongodb+srv://sanjayravicl_db_user:Sanjay_130@hr-platform.61ucsfo.mongodb.net/?appName=HR-Platform
VITE_GEMINI_API_KEY=AIzaSyCOo3NXzBptHor1tcZJ0xD8dWkpUzwaiGM`;

fs.writeFileSync('.env.local', content, 'utf8');
console.log('Fixed .env.local encoding with new API Key');
