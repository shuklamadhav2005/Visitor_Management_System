import mongoose from 'mongoose';

async function connectDb() {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGODB_URL;

  if (!mongoUri) {
    throw new Error('MONGODB_URI or MONGODB_URL is not defined');
  }

  await mongoose.connect(mongoUri);
  console.log('MongoDB connected');
}

export default connectDb;
