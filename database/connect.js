import { MongoClient } from 'mongodb';

let client;
let database;

const connectToDb = async () => {
  
  if (database) {
    return database;
  } 

  const connectionString = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB_NAME;

  if (!connectionString) {
    throw new Error('MONGODB_URI is required.');
  }

  if (!dbName) {
    throw new Error('MONGODB_DB_NAME is required.');
  }

  const client = new MongoClient(connectionString, {
    serverSelectionTimeoutMS: 5000
  });


  await client.connect();
  database = client.db(dbName);
  console.log(`✅ MongoDB connected: ${process.env.MONGODB_DB_NAME}`);
  return database;
};

const getDb = () => {
  if (!database) {
    throw new Error('Database not initialized. Call connectToDb first.');
  }
  return database;
};

export { connectToDb, getDb };