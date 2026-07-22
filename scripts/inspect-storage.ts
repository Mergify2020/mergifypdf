import { processNextStorageInspectionJob } from "../src/lib/storageInspectionWorker";

const requested = Number(process.env.STORAGE_INSPECTION_BATCH_SIZE ?? "10");
const batchSize = Number.isSafeInteger(requested) && requested >= 1 && requested <= 100
  ? requested
  : 10;

let processed = 0;
let operationalFailures = 0;
let rejected = 0;

for (let index = 0; index < batchSize; index += 1) {
  const result = await processNextStorageInspectionJob();
  if (result.outcome === "idle") break;
  processed += 1;
  if (result.outcome === "retry") operationalFailures += 1;
  if (result.outcome === "rejected") rejected += 1;
}

console.log(JSON.stringify({
  worker: "storage-inspection",
  processed,
  rejected,
  operationalFailures,
}));

if (operationalFailures > 0) process.exitCode = 1;
