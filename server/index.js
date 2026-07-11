import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { authMiddleware } from './middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import authRouter from './routes/auth.js';
import usersRouter from './routes/users.js';
import yachtsRouter from './routes/yachts.js';
import bookingsRouter from './routes/bookings.js';
import settingsRouter from './routes/settings.js';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(authMiddleware);

// Mount routers
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/yachts', yachtsRouter);
app.use('/api/bookings', bookingsRouter);
app.use('/api/settings', settingsRouter);

// Serve static assets in production
if (process.env.NODE_ENV === 'production') {
  const clientDistPath = path.join(__dirname, '../client/dist');
  app.use(express.static(clientDistPath));
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(clientDistPath, 'index.html'));
  });
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`YachtFlow Express Server running on http://localhost:${PORT}`);
});
export default app;
