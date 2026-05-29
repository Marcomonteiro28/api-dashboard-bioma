// Roda apenas o step de creatives (util para refazer o loader sem disparar tudo)
import "dotenv/config";
import { syncCreatives } from "../meta/loaders.js";

const start = Date.now();
try {
  const rows = await syncCreatives();
  console.log(JSON.stringify({
    ts: new Date().toISOString(),
    kind: "sync.complete",
    job: "creatives",
    rows,
    durationMs: Date.now() - start,
  }));
} catch (err) {
  console.error(JSON.stringify({
    ts: new Date().toISOString(),
    kind: "sync.fatal",
    message: err.message,
  }));
  process.exit(1);
}
