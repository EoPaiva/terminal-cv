"use strict";

module.exports = async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
  res.statusCode = 200;
  res.end(JSON.stringify({
    ok: true,
    service: "M PAIVA Learning OS",
    status: "online",
    ping: "green",
    provider: "rules/no-openai",
    agents: 21,
    privateSync: {
      enabled: process.env.ALURA_PRIVATE_SYNC === "true",
      authMode: process.env.ALURA_AUTH_MODE || "cookie-or-json",
      hasSessionCookie: Boolean(process.env.ALURA_SESSION_COOKIE),
      hasPrivateJson: Boolean(process.env.ALURA_PRIVATE_PROGRESS_JSON),
      hasEmail: Boolean(process.env.ALURA_EMAIL),
      hasPassword: Boolean(process.env.ALURA_PASSWORD),
      hasCredentialsEnv: Boolean(process.env.ALURA_EMAIL && process.env.ALURA_PASSWORD),
      secretExposed: false
    },
    dashboardApi: {
      enabled: Boolean(process.env.ALURA_DASHBOARD_API_URL || process.env.ALURA_DASHBOARD_API_TOKEN),
      hasUrl: Boolean(process.env.ALURA_DASHBOARD_API_URL),
      hasToken: Boolean(process.env.ALURA_DASHBOARD_API_TOKEN),
      status: (process.env.ALURA_DASHBOARD_API_URL || process.env.ALURA_DASHBOARD_API_TOKEN) ? "configured" : "not_configured",
      secretExposed: false
    },
    profileCertificates: {
      enabled: true,
      hasPublicProfileUrl: true,
      source: "public-profile",
      status: "fallback_ready"
    },
    performanceSync: {
      enabled: process.env.ALURA_PRIVATE_SYNC === "true" || Boolean(process.env.ALURA_DASHBOARD_API_URL || process.env.ALURA_DASHBOARD_API_TOKEN),
      available: Boolean(process.env.ALURA_DASHBOARD_API_URL || process.env.ALURA_DASHBOARD_API_TOKEN) || Boolean(process.env.ALURA_EMAIL && process.env.ALURA_PASSWORD) || Boolean(process.env.ALURA_SESSION_COOKIE) || Boolean(process.env.ALURA_PRIVATE_PROGRESS_JSON),
      source: (process.env.ALURA_DASHBOARD_API_URL || process.env.ALURA_DASHBOARD_API_TOKEN) ? "dashboard-api" : "private-dashboard",
      expectedMetrics: [
        "ranking30Days",
        "points",
        "completedCoursesDashboard",
        "resolvedExercises",
        "resolvedForumTopics",
        "forumPosts"
      ]
    },
    openAiUsed: false,
    syncedAt: new Date().toISOString()
  }));
};
