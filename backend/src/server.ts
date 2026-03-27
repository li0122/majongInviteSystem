import dotenv from "dotenv";
import { createApp } from "./app";
import { connectMongo } from "./config/db";

dotenv.config();

const port = Number(process.env.PORT || 4000);

async function bootstrap() {
  await connectMongo();
  const app = createApp();

  app.listen(port, () => {
    console.log(`Mahjong Match backend running on port ${port}`);
  });
}

bootstrap().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});
