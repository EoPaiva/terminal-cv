"use strict";

const crypto = require("crypto");
const { runLearningSync } = require("./_learning-core.js");

function isProductionRuntime() {
  return process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";
}

function timingSafeCompare(left = "", right = "") {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));

  if (leftBuffer.length !== rightBuffer.length) return false;

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function isAuthorized(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return !isProductionRuntime();

  const authorization = req.headers.authorization || "";
  const bearerToken = authorization.match(/^Bearer\s+(.+)$/i)?.[1] || "";

  if (timingSafeCompare(bearerToken, secret)) return true;

  // Mantem compatibilidade local, mas evita segredo em query string na produção.
  if (!isProductionRuntime()) {
    return timingSafeCompare(req.query?.secret || "", secret);
  }

  return false;
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method && !["GET", "POST"].includes(req.method)) {
    res.statusCode = 405;
    res.setHeader("Allow", "GET, POST");
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ ok: false, error: "METHOD_NOT_ALLOWED" }));
    return;
  }

  if (!isAuthorized(req)) {
    res.statusCode = 401;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ ok: false, error: "UNAUTHORIZED" }));
    return;
  }

  try {
    const data = await runLearningSync();
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.statusCode = 200;
    res.end(JSON.stringify({
      ok: true,
      route: "/api/learning-sync",
      summary: data.summary,
      source: data.source,
      agents: data.agents.length
    }));
  } catch (error) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({
      ok: false,
      error: "LEARNING_SYNC_FAILED",
      message: isProductionRuntime() ? "Falha ao sincronizar dados de aprendizagem." : error.message
    }));
  }
};
