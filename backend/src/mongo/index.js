import mongoose from "mongoose";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

const isInContainer = () => fs.existsSync("/.dockerenv") || fs.existsSync("/run/.containerenv");

const getMongoUri = () => {
  const envUri = process.env.MONGODB_URI || process.env.MONGODB_URL || process.env.MONGO_URI;
  if (envUri) return envUri;

  const dbLink = process.env.DB_LINK;
  if (!dbLink) {
    const defaultHost = isInContainer() ? "mongo" : "localhost";
    return `mongodb://${defaultHost}:27017/ChurchApp`;
  }

  if (dbLink.startsWith("mongodb://") || dbLink.startsWith("mongodb+srv://")) {
    return dbLink;
  }

  const atlasQuery = "retryWrites=true&w=majority&appName=ChurchAppCluster";
  const separator = dbLink.includes("?") ? "&" : "?";
  return `mongodb+srv://${dbLink}${separator}${atlasQuery}`;
};

export const dbConnect = () => {
  const mongoUri = getMongoUri();
  if (!mongoUri) {
    throw new Error("Missing Mongo connection string. Set MONGODB_URI (preferred) or DB_LINK.");
  }

  mongoose.connection.once("open", () => console.log("DB connection"));
  return mongoose.connect(mongoUri, { keepAlive: true });
};
