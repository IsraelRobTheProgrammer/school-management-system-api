import app from "./app";
import { env } from "./config/env";
import { prisma } from "./config/database";

const server = app.listen(env.PORT, () => {
  console.log(`\n Server running in ${env.NODE_ENV} mode`);
  console.log(` Listening on http://localhost:${env.PORT}`);
  console.log(` API base: http://localhost:${env.PORT}/api/${env.API_VERSION}\n`);
});

/**
 * Graceful shutdown: on SIGTERM/SIGINT, stop accepting new connections,
 * finish in-flight requests, then disconnect from the database.
 * This prevents data corruption on container restarts or deployments.
 */
const shutdown = async (signal: string) => {
  console.log(`\n Received ${signal}. Shutting down gracefully...`);

  server.close(async () => {
    console.log(" HTTP server closed.");

    await prisma.$disconnect();
    console.log(" Database disconnected.");

    process.exit(0);
  });

  // Force exit if graceful shutdown takes too long
  setTimeout(() => {
    console.error(" Graceful shutdown timed out. Forcing exit.");
    process.exit(1);
  }, 10_000);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

// Catch unhandled promise rejections — log and exit cleanly
process.on("unhandledRejection", (reason) => {
  console.error(" Unhandled Rejection:", reason);
  shutdown("unhandledRejection");
});
