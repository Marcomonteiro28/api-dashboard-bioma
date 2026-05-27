import "dotenv/config";
import { applyViews } from "../meta/views.js";

try {
  await applyViews();
  console.log("Views aplicadas com sucesso.");
} catch (err) {
  console.error("Erro ao aplicar views:", err.message);
  process.exit(1);
}
