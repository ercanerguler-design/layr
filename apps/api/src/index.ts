import "dotenv/config";
import { config } from "./config.js";
import { buildApp } from "./app.js";

const start = async () => {
  const app = await buildApp();

  try {
    await app.listen({ port: config.port, host: "0.0.0.0" });
    app.log.info(
      `🚀 LAYR API running on http://0.0.0.0:${config.port}`
    );
    app.log.info(
      `📚 Swagger docs at http://0.0.0.0:${config.port}/docs`
    );
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

// Graceful shutdown
process.on("SIGTERM", async () => {
  const app = await buildApp();
  await app.close();
  process.exit(0);
});

start();
