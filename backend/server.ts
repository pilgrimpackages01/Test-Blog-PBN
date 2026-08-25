import express from 'express';
import path from 'path';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables from the root .env file in monorepo dev environments
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

const app = express();
const PORT = process.env.PORT || 3001;

// Enable CORS for external frontend applications
app.use(cors());
app.use(express.json());

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI;
const DataSchema = new mongoose.Schema({
  heading: { type: String, required: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

let DataModel: mongoose.Model<any>;
const inMemoryData: { _id: string, heading: string, content: string, createdAt: Date }[] = [];

if (MONGODB_URI) {
  mongoose.connect(MONGODB_URI)
    .then(() => {
      console.log('Connected to MongoDB');
      DataModel = mongoose.model('Data', DataSchema);
    })
    .catch(err => console.error('MongoDB connection error:', err));
} else {
  console.warn('MONGODB_URI not found. Data will be saved in memory only (cleared on restart).');
}

// API Routes
app.get('/api/data', async (req, res) => {
  try {
    if (DataModel) {
      const data = await DataModel.find().sort({ createdAt: -1 }).limit(100);
      res.json(data);
    } else {
      res.json(inMemoryData.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

app.post('/api/data', async (req, res) => {
  try {
    const { heading, content } = req.body;
    if (!heading || !content) return res.status(400).json({ error: 'Heading and content are required' });

    if (DataModel) {
      const newData = new DataModel({ heading, content });
      await newData.save();
      res.status(201).json(newData);
    } else {
      const newData = {
        _id: Math.random().toString(36).substring(7),
        heading,
        content,
        createdAt: new Date()
      };
      inMemoryData.push(newData);
      res.status(201).json(newData);
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to save data' });
  }
});

// Serve the Admin Dashboard UI statically
app.use(express.static(path.join(process.cwd(), 'public')));
app.get('*', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend API running on port ${PORT}`);
});
