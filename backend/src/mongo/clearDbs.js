import mongoose from "mongoose";
import { peopleModel } from "../schemas/people.schema.js";
import { dbConnect } from "../mongo/index.js";

async function clear() {
  dbConnect();
  await peopleModel.deleteMany({});
  console.log("DB cleared");
}

clear().then(() => {
  mongoose.connection.close();
});
