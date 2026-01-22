// lib/mongodb.ts
import mongoose, { Mongoose, Connection } from "mongoose";

interface MongooseCache {
  conn: Mongoose | null;
  promise: Promise<Mongoose> | null;
}

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/Lemonpay_Portal";

if (!MONGODB_URI) {
  throw new Error("Missing environment variable: MONGODB_URI");
}

// Declare global type
declare global {
  var _mongooseCache: MongooseCache;
}

let cached: MongooseCache = global._mongooseCache;

if (!cached) {
  cached = global._mongooseCache = { conn: null, promise: null };
}

/**
 * Connect to MongoDB database
 * @returns Promise<mongoose.Connection> - Database connection
 */
export async function connectDB(): Promise<Connection> {
  // If already connected, return the existing connection
  if (cached.conn && cached.conn.connection.readyState === 1) {
    console.log("Using existing MongoDB connection");
    return cached.conn.connection;
  }

  if (!cached.promise) {
    const opts: mongoose.ConnectOptions = {
      bufferCommands: false,
      dbName: process.env.DB_NAME || "Lemonpay_Portal",
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    };

    console.log("Connecting to MongoDB...");

    cached.promise = mongoose
      .connect(MONGODB_URI, opts)
      .then((mongooseInstance: Mongoose) => {
        console.log("✅ MongoDB Connected Successfully");
        
        // Check if connection and db are available
        if (mongooseInstance.connection && mongooseInstance.connection.db) {
          console.log(`Database: ${mongooseInstance.connection.db.databaseName}`);
          console.log(`Host: ${mongooseInstance.connection.host}`);
        }
        
        // Set up connection event listeners
        mongooseInstance.connection.on('connected', () => {
          console.log('Mongoose connected to DB');
        });

        mongooseInstance.connection.on('error', (err) => {
          console.error('Mongoose connection error:', err);
        });

        mongooseInstance.connection.on('disconnected', () => {
          console.log('Mongoose disconnected from DB');
        });

        // Graceful shutdown
        process.on('SIGINT', async () => {
          await mongooseInstance.connection.close();
          console.log('Mongoose connection closed due to app termination');
          process.exit(0);
        });

        return mongooseInstance;
      })
      .catch((err: Error) => {
        console.error("❌ MongoDB Connection Error:", err.message);
        cached.promise = null;
        throw new Error(`Failed to connect to MongoDB: ${err.message}`);
      });
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn.connection;
  } catch (error) {
    cached.promise = null;
    throw error;
  }
}

/**
 * Get the current database connection
 * @returns Connection | null
 */
export function getConnection(): Connection | null {
  return cached.conn?.connection || null;
}

/**
 * Check if database is connected
 * @returns boolean
 */
export function isConnected(): boolean {
  const connection = getConnection();
  return connection?.readyState === 1;
}

/**
 * Close the database connection
 */
export async function disconnectDB(): Promise<void> {
  if (cached.conn) {
    await cached.conn.connection.close();
    cached.conn = null;
    cached.promise = null;
    console.log("MongoDB connection closed");
  }
}

/**
 * Handle database errors
 */
export function handleDBError(error: any): { success: boolean; error: string } {
  console.error("Database Error:", error);

  if (error.name === 'MongoNetworkError') {
    return {
      success: false,
      error: "Database connection lost. Please check your network connection."
    };
  }

  if (error.name === 'MongooseError') {
    return {
      success: false,
      error: `Database error: ${error.message}`
    };
  }

  if (error.name === 'ValidationError') {
    const errorMessages = Object.values(error.errors || {}).map((e: any) => e.message).join(', ');
    return {
      success: false,
      error: `Validation error: ${errorMessages}`
    };
  }

  if (error.code === 11000) {
    return {
      success: false,
      error: "Duplicate key error. This record already exists."
    };
  }

  return {
    success: false,
    error: "An unexpected database error occurred."
  };
}

// For backward compatibility
export const connectToDatabase = connectDB;

export default connectDB;