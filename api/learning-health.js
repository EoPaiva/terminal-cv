"use strict";

module.exports = async function handler(req, res) {
  if (req.method && req.method !== "GET") {
    res.statusCode = 405;
    res.setHeader("Allow", "GET");
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ ok: false, error: "METHOD_NOT_ALLOWED" }));
    return;
  }

  const hasPrivateCredential =
    Boolean(process.env.ALURA_EMAIL && process.env.ALURA_PASSWORD) ||
    Boolean(process.env.ALURA_SESSION_COOKIE) ||
    Boolean(process.env.ALURA_PRIVATE_PROGRESS_JSON);
  const hasDashboardCredential = Boolean(process.env.ALURA_DASHBOARD_API_URL || process.env.ALURA_DASHBOARD_API_TOKEN);

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
      configured: hasPrivateCredential,
      status: hasPrivateCredential ? "configured" : "not_configured",
      secretExposed: false
    },
    dashboardApi: {
      enabled: hasDashboardCredential,
      configured: hasDashboardCredential,
      status: hasDashboardCredential ? "configured" : "not_configured",
      secretExposed: false
    },
    profileCertificates: {
      enabled: true,
      hasPublicProfileUrl: true,
      source: "public-profile",
      status: "fallback_ready"
    },
    performanceSync: {
      enabled: process.env.ALURA_PRIVATE_SYNC === "true" || hasDashboardCredential,
      available: hasDashboardCredential || hasPrivateCredential,
      source: hasDashboardCredential ? "dashboard-api" : "private-dashboard",
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
