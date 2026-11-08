import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';
import { authRouter } from './routes/auth';
import { adminRouter } from './routes/admin';
import { conversationsRouter } from './routes/conversations';
import { setupSocketServer } from './socket';

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);
app.use('/api/conversations', conversationsRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Setup WebSockets
setupSocketServer(io);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(`Live Chat & HelpDesk Engine running on port ${PORT}`);
  console.log(`REST API: http://localhost:${PORT}/api`);
  console.log(`WebSocket: ws://localhost:${PORT}`);
  console.log(`=========================================`);
});
