import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import dotenv from "dotenv";
import "./passport.js";
import { dbConnect } from "./mongo/index.js";
import { meRoutes, authRoutes } from "./routes/index.js";
import path from "path";
import * as fs from "fs";
import cron from "node-cron";
import ReseedAction from "./mongo/ReseedAction.js";
import peopleRoutes from "./routes/people/index.js";

dotenv.config();

const PORT = process.env.PORT || 8080;
const app = express();

// Updated CORS configuration
const corsOptions = {
  origin: [
    process.env.APP_URL_CLIENT,
    "http://localhost:3000",
    "http://10.0.0.8:3000",
  ],
  credentials: true,
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "cache-control",
    "X-Requested-With",
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
};

dbConnect();

app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use("/people", peopleRoutes);

app.get("/", function (req, res) {
  const __dirname = fs.realpathSync(".");
  res.sendFile(path.join(__dirname, "/src/landing/index.html"));
});

app.use("/", authRoutes);
app.use("/me", meRoutes);

if (process.env.SCHEDULE_HOUR) {
  cron.schedule(`0 */${process.env.SCHEDULE_HOUR} * * *'`, () => {
    ReseedAction();
  });
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server listening on:`);
  console.log(`  - Local:   http://localhost:${PORT}`);
  console.log(`  - Network: http://10.0.0.8:${PORT}`);
});
