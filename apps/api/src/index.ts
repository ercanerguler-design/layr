import "dotenv/config";
import { server } from "./app.js";
import { config } from "./config.js";

await server.listen({ port: config.port, host: "0.0.0.0" });
server.log.info(`LAYR API running on http://0.0.0.0:${config.port}`);
