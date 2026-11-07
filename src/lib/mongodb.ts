import { MongoClient, Db } from "mongodb";

const uri = process.env.MONGODB_URI || "";
const dbName = process.env.MONGODB_DB || "ratemypatakha";

interface GlobalMongo {
  clientPromise?: Promise<MongoClient | null>;
  indexesCreated?: boolean;
}

const globalForMongo = globalThis as unknown as GlobalMongo;

/**
 * Returns a connection-pooled MongoDB `Db` instance and ensures high-traffic
 * indexes exist on `profiles` (`handle`, `votes`, `patakhaId`).
 */
export async function getMongoDb(): Promise<Db | null> {
  if (!uri || !uri.trim()) {
    return null;
  }

  try {
    if (!globalForMongo.clientPromise) {
      const client = new MongoClient(uri, {
        maxPoolSize: 20,
        minPoolSize: 2,
        serverSelectionTimeoutMS: 4000,
        connectTimeoutMS: 5000,
      });
      globalForMongo.clientPromise = client.connect().catch((err) => {
        console.error("MongoDB connection error (falling back to memory):", err);
        globalForMongo.clientPromise = undefined;
        return null;
      });
    }

    const client = await globalForMongo.clientPromise;
    if (!client) return null;
    const db = client.db(dbName);

    // Ensure indexes once per server lifecycle for fast leaderboard sorting & lookups
    if (!globalForMongo.indexesCreated) {
      globalForMongo.indexesCreated = true;
      const profilesCol = db.collection("profiles");
      await Promise.all([
        profilesCol.createIndex({ handle: 1 }, { unique: true }),
        profilesCol.createIndex({ votes: -1, createdAt: -1 }),
        profilesCol.createIndex({ patakhaId: 1, votes: -1 }),
      ]).catch((e) => console.warn("Index creation warning:", e));
    }

    return db;
  } catch (err) {
    console.error("Failed to get MongoDB instance:", err);
    return null;
  }
}