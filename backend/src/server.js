import dotenv from 'dotenv';
import connectDb from './config/db.js';
import app from './app.js';

dotenv.config();

const port = process.env.PORT || 5000;

async function startServer() {
  await connectDb();

  const server = app.listen(port, () => {
    console.log(`API running on port ${port}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${port} is already in use. Please free the port or change PORT in backend/.env.`);
      process.exit(1);
    }
    console.error('Server error:', err);
    process.exit(1);
  });
}

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
