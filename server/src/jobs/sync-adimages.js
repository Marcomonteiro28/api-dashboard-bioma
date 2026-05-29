// Roda apenas o step de adimages (util pra testar sem re-syncar tudo)
import "dotenv/config";
import { syncAdImages } from "../meta/loaders.js";

const start = Date.now();
try {
  const rows = await syncAdImages();
  console.log(JSON.stringify({
    ts: new Date().toISOString(),
    kind: "sync.complete",
    job: "adimages",
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
