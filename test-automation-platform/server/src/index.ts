import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import authRoutes from './routes/auth';
import testRoutes from './routes/tests';
import featuresRoutes from './routes/features';
import githubRoutes from './routes/github';
import reportRoutes from './routes/reports';
import webAnalysisRoutes from './routes/webAnalysis';
import interactiveTestRoutes from './routes/interactiveTest';
import { errorHandler } from './middleware/errorHandler';
import { authMiddleware } from './middleware/auth';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/features', authMiddleware, featuresRoutes);
app.use('/api/tests', authMiddleware, testRoutes);
app.use('/api/github', authMiddleware, githubRoutes);
app.use('/api/reports', authMiddleware, reportRoutes);
app.use('/api/web-analysis', authMiddleware, webAnalysisRoutes);
app.use('/api/interactive-test', interactiveTestRoutes);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});