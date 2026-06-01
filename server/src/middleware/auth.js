import { OAuth2Client } from "google-auth-library";
import { config } from "../config.js";

const client = config.auth.googleClientId
  ? new OAuth2Client(config.auth.googleClientId)
  : null;

function isEmailAllowed(email) {
  if (!email) return false;
  const lower = email.toLowerCase();
  if (config.auth.allowedEmails.includes(lower)) return true;
  if (config.auth.allowedDomains.some((d) => lower.endsWith("@" + d))) return true;
  return false;
}

/**
 * Middleware que exige um ID token Google valido + email autorizado.
 *
 * Em dev local (sem GOOGLE_CLIENT_ID no .env), o middleware deixa passar
 * sem checar nada - mantem o comportamento atual do servidor de desenv.
 *
 * Em producao, todas as rotas /api/* sao protegidas:
 * - Frontend envia Authorization: Bearer <google-id-token>
 * - validamos com a lib oficial google-auth-library
 * - verificamos email contra allowedDomains/allowedEmails
 */
export async function requireAuth(req, res, next) {
  if (!client) {
    // Auth desligado (dev local). Segue.
    return next();
  }

  const header = req.header("authorization") || req.header("Authorization") || "";
  const token = header.replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    return res.status(401).json({ error: "Auth required: missing Bearer token" });
  }

  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: config.auth.googleClientId,
    });
    const payload = ticket.getPayload();
    const email = (payload?.email || "").toLowerCase();
    const emailVerified = payload?.email_verified === true;

    if (!emailVerified) {
      return res.status(403).json({ error: "Email não verificado", email });
    }
    if (!isEmailAllowed(email)) {
      console.warn(JSON.stringify({
        ts: new Date().toISOString(),
        kind: "auth.denied",
        email,
        domain: email.split("@")[1] || null,
      }));
      return res.status(403).json({
        error: "Email não autorizado",
        email,
        hint: "Solicite ao admin que adicione seu email à allowlist (ALLOWED_EMAILS).",
      });
    }

    req.user = {
      email,
      name: payload?.name || null,
      picture: payload?.picture || null,
      sub: payload?.sub || null,
    };
    next();
  } catch (err) {
    return res.status(401).json({
      error: "Token Google inválido ou expirado",
      detail: err.message,
    });
  }
}
