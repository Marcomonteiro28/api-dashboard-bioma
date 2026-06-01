#!/usr/bin/env node
/**
 * Gera um refresh token OAuth pra usar com a Google Ads API.
 *
 * Pré-requisitos:
 *   - OAuth 2.0 Client ID criado em console.cloud.google.com/apis/credentials
 *     (tipo "Desktop app" ou "Web application" com redirect http://localhost)
 *   - Conta Google que tem acesso à MCC do Google Ads
 *
 * Uso:
 *   1. export GADS_OAUTH_CLIENT_ID=... GADS_OAUTH_CLIENT_SECRET=...
 *   2. node scripts/gads-refresh-token.mjs
 *   3. Abre o link impresso no navegador, autoriza, copia o "code" da URL
 *   4. Cola o code no terminal
 *   5. Refresh token impresso → cola em GADS_REFRESH_TOKEN no .env
 */

import "dotenv/config";
import readline from "node:readline/promises";
import { stdin, stdout } from "node:process";

const clientId = process.env.GADS_OAUTH_CLIENT_ID;
const clientSecret = process.env.GADS_OAUTH_CLIENT_SECRET;
const redirectUri = process.env.GADS_OAUTH_REDIRECT_URI || "urn:ietf:wg:oauth:2.0:oob";
const scope = "https://www.googleapis.com/auth/adwords";

if (!clientId || !clientSecret) {
  console.error("ERRO: defina GADS_OAUTH_CLIENT_ID e GADS_OAUTH_CLIENT_SECRET no .env primeiro");
  process.exit(1);
}

// OOB foi descontinuado pelo Google em 2022. Pra Desktop apps, use loopback (http://localhost).
// Se você criou o OAuth client como "Desktop" recente, o Google força loopback.
// Se "Web app", pode usar http://localhost com a porta que registrou nos redirects.
const isLoopback = redirectUri.startsWith("http://localhost");

const authParams = new URLSearchParams({
  client_id: clientId,
  redirect_uri: redirectUri,
  response_type: "code",
  scope,
  access_type: "offline",
  prompt: "consent", // força reemissão do refresh token mesmo se já autorizou antes
});

const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${authParams}`;

console.log("\n=== Google Ads OAuth — refresh token generator ===\n");
console.log("1) Abra o link abaixo no navegador (logue com a conta Google que tem acesso à MCC):\n");
console.log(authUrl + "\n");

if (isLoopback) {
  console.log("2) Após autorizar, vai redirecionar pra " + redirectUri + "?code=...");
  console.log("   Copie SÓ o valor de `code` da URL (entre `code=` e `&` ou fim).");
} else {
  console.log("2) Após autorizar, a página vai mostrar um código. Copie ele.");
}

const rl = readline.createInterface({ input: stdin, output: stdout });
const code = (await rl.question("\n3) Cole o code aqui: ")).trim();
rl.close();

if (!code) {
  console.error("ERRO: code vazio");
  process.exit(1);
}

console.log("\nTrocando code por refresh token...");

const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  }),
});

const json = await tokenRes.json();

if (!tokenRes.ok) {
  console.error("\nERRO ao trocar code por token:");
  console.error(JSON.stringify(json, null, 2));
  process.exit(1);
}

console.log("\n=== SUCESSO ===\n");

// Grava direto no .env (sem expor refresh token no stdout).
import { readFileSync, writeFileSync, existsSync } from "node:fs";
const envPath = ".env";
if (!existsSync(envPath)) {
  console.error("ERRO: .env não encontrado. Crie um e rode de novo.");
  process.exit(1);
}
const current = readFileSync(envPath, "utf8");
const withoutOldToken = current
  .split(/\r?\n/)
  .filter((line) => !line.startsWith("GADS_REFRESH_TOKEN="))
  .join("\n");
const newContent =
  withoutOldToken.trimEnd() + "\nGADS_REFRESH_TOKEN=" + json.refresh_token + "\n";
writeFileSync(envPath, newContent, "utf8");

console.log("✅ Refresh token gravado em .env como GADS_REFRESH_TOKEN");
console.log("   Scope: " + json.scope);
console.log("   (Access token de 1h tambem foi retornado mas nao foi gravado)\n");
console.log("⚠️  Em produção (Cloud Run), grave em Secret Manager como gads-refresh-token");
console.log("   gcloud secrets create gads-refresh-token --data-file=<(echo -n \"<token>\")\n");
console.log("Proximo passo: configura GADS_DEVELOPER_TOKEN, GADS_CUSTOMER_IDS,");
console.log("GADS_LOGIN_CUSTOMER_ID no .env e roda: npm run sync:gads\n");
