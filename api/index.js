import app, { connectToDatabase } from '../server.js';

export default async (req, res) => {
    await connectToDatabase();
    app(req, res);
};
