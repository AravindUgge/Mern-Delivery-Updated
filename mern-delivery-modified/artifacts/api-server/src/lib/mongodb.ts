import mongoose from "mongoose";
import { logger } from "./logger";

const MONGODB_URI = process.env.MONGODB_URI;

export async function connectMongoDB(): Promise<void> {
  if (!MONGODB_URI) {
    throw new Error(
      "MONGODB_URI must be set. Please add your MongoDB connection string as an environment variable.",
    );
  }

  try {
    await mongoose.connect(MONGODB_URI);
    logger.info("Connected to MongoDB");
  } catch (err) {
    logger.error({ err }, "Failed to connect to MongoDB");
    throw err;
  }
}

mongoose.connection.on("error", (err) => {
  logger.error({ err }, "MongoDB connection error");
});

mongoose.connection.on("disconnected", () => {
  logger.warn("MongoDB disconnected");
});
