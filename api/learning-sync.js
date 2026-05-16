"use strict";

const { runLearningSync } = require("./_learning-core.js");

function isAuthorized(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const authorization = req.headers.authorization || "";
  const querySecret = req.query?.secret || "";
  return authorization === `Bearer ${secret}` || querySecret === secret;
}

module.exports = async function handler(req, res) {
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
    res.end(JSON.stringify({ ok: false, error: error.message }));
  }
};
