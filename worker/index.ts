import cron from "node-cron";
import { runChecks } from "./checker";

console.log("Upleus worker starting...");

// Run every minute
cron.schedule("* * * * *", async () => {
  console.log(`[${new Date().toISOString()}] Running checks...`);
  try {
    await runChecks();
  } catch (err) {
    console.error("Check run failed:", err);
  }
});

console.log("Worker running. Checks will start on the next minute.");
