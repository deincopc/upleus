import "dotenv/config";
// The standalone worker uses the shared checker logic from src/lib/runChecks.
// It creates its own Prisma connection (needed for the long-running process).
export { runChecks } from "../src/lib/runChecks";
