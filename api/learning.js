"use strict";

const { runLearningSync } = require("./_learning-core.js");

module.exports = async function handler(req, res) {
  if (req.method && req.method !== "GET") {
    res.statusCode = 405;
    res.setHeader("Allow", "GET");
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ ok: false, error: "METHOD_NOT_ALLOWED" }));
    return;
  }

  try {
    const data = await runLearningSync();
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "s-maxage=21600, stale-while-revalidate=86400");
    res.statusCode = 200;
    res.end(JSON.stringify(data));
  } catch (error) {
    const isProduction = process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({
      ok: false,
      error: "LEARNING_SYNC_FAILED",
      message: isProduction ? "Falha ao carregar dados de aprendizagem." : error.message,
      syncedAt: new Date().toISOString()
    }));
  }
};
