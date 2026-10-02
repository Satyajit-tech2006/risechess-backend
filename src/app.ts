import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import prisma from './prisma';

import authRoutes from './routes/auth.routes';
import studentRoutes from './routes/student.routes';
import coachRoutes from './routes/coach.routes';
import batchRoutes from './routes/batch.routes';
import tagRoutes from './routes/tag.routes';
import { errorHandler } from './middlewares/error.middleware';

const app: Application = express();

// Global Middlewares
app.use(cors());
app.use(express.json());

// Health Check
app.get('/health', async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', db: 'connected', timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ status: 'error', db: 'disconnected', error });
  }
});

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/students', studentRoutes);
app.use('/api/v1/coaches', coachRoutes);
app.use('/api/v1/batches', batchRoutes);
app.use('/api/v1/tags', tagRoutes);

// Centralized Error Handling (must remain after all route mounts)
app.use(errorHandler);

export default app;