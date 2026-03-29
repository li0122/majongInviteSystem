import mongoose from "mongoose";

export async function connectMongo() {
  const uri = process.env.MONGO_URI ?? process.env.MONGODB_URI;

  if (!uri) {
    throw new Error("MONGO_URI (or MONGODB_URI) is required");
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: Number(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS ?? 10000),
    });

    console.log(`MongoDB connected (${redactMongoUri(uri)})`);
  } catch (error) {
    if (isLoopbackMongoUri(uri)) {
      console.error(
        "MongoDB URI points to localhost/loopback. In cloud VM deployments, localhost only refers to the VM itself.",
      );
    }

    throw error;
  }
}

function redactMongoUri(uri: string): string {
  return uri.replace(/\/\/([^@/]+)@/, "//***@");
}

function isLoopbackMongoUri(uri: string): boolean {
  return /localhost|127\.0\.0\.1|\[::1\]|::1/.test(uri);
}
