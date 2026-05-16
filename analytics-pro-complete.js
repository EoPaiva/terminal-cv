(() => {
  "use strict";

  const CONFIG = {
    table: "site_analytics_events",
    visitorKey: "mpaiva_analytics_visitor_id_v6",
    privacyKey: "mpaiva_analytics_privacy_v6",
    localVisitKey: "mpaiva_analytics_local_visit_v6",
    adminFlagKey: "mpaiva_analytics_admin_flag_v1",
    dashboardPeriodKey: "mpaiva_analytics_dashboard_period_v1",
    heartbeatMs: 15000,
    activeSessionWindowMs: 50000,
    dashboardRefreshMs: 10000,
    dashboardLimit: 1500,
    scrollMilestones: [25, 50, 75, 90, 100],
    maxRecentEvents: 28,
    maxJourneySessions: 10,
    maxClickMapItems: 12,
    maxAlerts: 18,
    rageClickWindowMs: 1800,
    rageClickThreshold: 4,
    longSessionAlertSeconds: 120,
    hotLeadScore: 10,
    warmLeadScore: 5
  };

  const state = {
    client: null,
    started: false,
    adminStarted: false,
    realtimeChannel: null,
    visitorId: "",
    sessionId: "",
    sessionStartedAt: Date.now(),
    currentSection: "top",
    currentSectionStartedAt: Date.now(),
    sectionSeconds: {},
    viewedSections: new Set(),
    sentScrollMilestones: new Set(),
    clickMemory: [],
    geo: null,
    heartbeatTimer: null,
    adminCheckTimer: null,
    dashboardTimer: null,
    eventsCache: [],
    dashboardPeriod: localStorage.getItem(CONFIG.dashboardPeriodKey) || "today",
    expandedSessions: new Set(),
    isAdminUser: false
  };

  const $ = (selector, parent = document) => parent.querySelector(selector);
  const $$ = (selector, parent = document) => Array.from(parent.querySelectorAll(selector));

  const safeText = (value, max = 180) => {
    return String(value ?? "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, max);
  };

  const generateId = (prefix) => {
    if (window.crypto?.randomUUID) return `${prefix}_${window.crypto.randomUUID()}`;
    return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  };

  const nowIso = () => new Date().toISOString();

  const isLocalEnvironment = () => {
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;

    return (
      protocol === "file:" ||
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1"
    );
  };

  const shouldDisableAnalyticsInLocal = () => {
    return isLocalEnvironment() && window.MPAIVA_ALLOW_LOCAL_ANALYTICS !== true;
  };

  const isLocalFileUrl = (value) => {
    const text = String(value || "").trim();

    return (
      text.startsWith("file://") ||
      /^[a-zA-Z]:[\\/]/.test(text)
    );
  };

  const getSafeCurrentUrl = () => {
    if (window.location.protocol === "file:") return "local_file_hidden";
    if (isLocalEnvironment()) return "local_dev_hidden";
    return window.location.href;
  };

  const getSupabaseConfig = () => ({
    url: window.MPAIVA_SUPABASE?.url || document.body?.dataset?.supabaseUrl || "",
    key: window.MPAIVA_SUPABASE?.publishableKey || document.body?.dataset?.supabaseKey || ""
  });

  const getClient = () => {
    if (state.client) return state.client;

    const config = getSupabaseConfig();

    if (!window.supabase || !config.url || !config.key) {
      console.warn("[Analytics Complete] Supabase não encontrado.");
      return null;
    }

    state.client = window.supabase.createClient(config.url, config.key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true
      },
      realtime: {
        params: {
          eventsPerSecond: 12
        }
      }
    });

    return state.client;
  };

  const getPrivacySettings = () => {
    try {
      const stored = localStorage.getItem(CONFIG.privacyKey);

      if (!stored) {
        return {
          analyticsEnabled: true,
          interactionsEnabled: true,
          performanceEnabled: true,
          uxEnabled: true,
          mode: "minimal_auto",
          updatedAt: ""
        };
      }

      return {
        analyticsEnabled: true,
        interactionsEnabled: true,
        performanceEnabled: true,
        uxEnabled: true,
        mode: "minimal_auto",
        updatedAt: "",
        ...JSON.parse(stored)
      };
    } catch {
      return {
        analyticsEnabled: true,
        interactionsEnabled: true,
        performanceEnabled: true,
        uxEnabled: true,
        mode: "minimal_auto",
        updatedAt: ""
      };
    }
  };

  const savePrivacySettings = (settings) => {
    const next = {
      ...getPrivacySettings(),
      ...settings,
      updatedAt: nowIso()
    };

    localStorage.setItem(CONFIG.privacyKey, JSON.stringify(next));
    return next;
  };

  const canTrack = (category = "analytics") => {
    const settings = getPrivacySettings();

    if (!settings.analyticsEnabled) return false;

    if (category === "interactions") return Boolean(settings.interactionsEnabled);
    if (category === "performance") return Boolean(settings.performanceEnabled);
    if (category === "ux") return Boolean(settings.uxEnabled);

    return true;
  };

  const getOrCreateVisitorId = () => {
    let visitorId = localStorage.getItem(CONFIG.visitorKey);

    if (!visitorId) {
      visitorId = generateId("visitor");
      localStorage.setItem(CONFIG.visitorKey, visitorId);
    }

    return visitorId;
  };

  const getLocalVisitProfile = () => {
    try {
      const stored = localStorage.getItem(CONFIG.localVisitKey);

      if (!stored) {
        return {
          firstVisitAt: nowIso(),
          previousVisitAt: "",
          lastVisitAt: "",
          visitCount: 0
        };
      }

      return {
        firstVisitAt: "",
        previousVisitAt: "",
        lastVisitAt: "",
        visitCount: 0,
        ...JSON.parse(stored)
      };
    } catch {
      return {
        firstVisitAt: nowIso(),
        previousVisitAt: "",
        lastVisitAt: "",
        visitCount: 0
      };
    }
  };

  const updateLocalVisitProfile = () => {
    const previous = getLocalVisitProfile();

    const next = {
      firstVisitAt: previous.firstVisitAt || nowIso(),
      previousVisitAt: previous.lastVisitAt || "",
      lastVisitAt: nowIso(),
      visitCount: Number(previous.visitCount || 0) + 1
    };

    localStorage.setItem(CONFIG.localVisitKey, JSON.stringify(next));

    return {
      ...next,
      isReturning: Number(previous.visitCount || 0) > 0
    };
  };

  const injectStyles = () => {
    if ($("#analytics-complete-styles")) return;

    const style = document.createElement("style");
    style.id = "analytics-complete-styles";
    style.textContent = `
      .analytics-privacy-footer-wrap {
        width: 100%;
        display: flex;
        justify-content: center;
        margin-top: 1.2rem;
        padding-bottom: .4rem;
      }

      .analytics-privacy-footer-link {
        border: 0;
        background: transparent;
        color: var(--text-color, #94a3b8);
        font-family: "JetBrains Mono", monospace;
        font-size: 10px;
        font-weight: 750;
        letter-spacing: .08em;
        text-transform: uppercase;
        cursor: pointer !important;
        opacity: .58;
        transition: opacity .2s ease, color .2s ease, transform .2s ease;
      }

      .analytics-privacy-footer-link:hover {
        opacity: 1;
        color: var(--accent-color, #10b981);
        transform: translateY(-1px);
      }

      .analytics-privacy-modal {
        position: fixed;
        inset: 0;
        z-index: 100006;
        display: grid;
        place-items: center;
        padding: 1rem;
      }

      .analytics-privacy-backdrop {
        position: absolute;
        inset: 0;
        background: rgba(2, 6, 23, .78);
        backdrop-filter: blur(10px);
      }

      .analytics-privacy-panel {
        position: relative;
        z-index: 1;
        width: min(660px, 100%);
        max-height: 90vh;
        overflow: auto;
        border: 1px solid color-mix(in srgb, var(--accent-color, #10b981) 30%, #1e293b);
        border-radius: 1.2rem;
        padding: 1.15rem;
        background:
          radial-gradient(circle at top right, color-mix(in srgb, var(--accent-color, #10b981) 13%, transparent), transparent 48%),
          rgba(15, 23, 42, .98);
        box-shadow: 0 34px 100px rgba(0, 0, 0, .52);
      }

      .analytics-privacy-close {
        position: absolute;
        top: .75rem;
        right: .75rem;
        width: 2rem;
        height: 2rem;
        border: 1px solid #1e293b;
        border-radius: 999px;
        background: rgba(2, 6, 23, .62);
        color: #f8fafc;
        cursor: pointer !important;
      }

      .analytics-kicker {
        display: block;
        color: var(--accent-color, #10b981);
        font-family: "JetBrains Mono", monospace;
        font-size: 9px;
        font-weight: 900;
        letter-spacing: .18em;
        text-transform: uppercase;
        margin-bottom: .38rem;
      }

      .analytics-privacy-panel h3,
      .analytics-clean-header h3 {
        color: var(--title-color, #fff);
      }

      .analytics-privacy-panel h3 {
        margin: 0 2rem .55rem 0;
        font-size: 1.1rem;
        font-weight: 850;
      }

      .analytics-privacy-panel p,
      .analytics-clean-header p {
        color: var(--text-color, #94a3b8);
        font-size: .8rem;
        line-height: 1.52;
        margin: .35rem 0 0;
      }

      .analytics-privacy-options {
        display: grid;
        gap: .62rem;
        margin-top: 1rem;
      }

      .analytics-privacy-option {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 1rem;
        align-items: center;
        border: 1px solid #1e293b;
        border-radius: .95rem;
        padding: .78rem;
        background: rgba(2, 6, 23, .34);
      }

      .analytics-privacy-option strong {
        display: block;
        color: #f8fafc;
        font-size: .85rem;
      }

      .analytics-privacy-option small {
        display: block;
        color: #94a3b8;
        font-size: .74rem;
        line-height: 1.42;
        margin-top: .16rem;
      }

      .analytics-privacy-option input {
        width: 1.15rem;
        height: 1.15rem;
        accent-color: var(--accent-color, #10b981);
        cursor: pointer !important;
      }

      .analytics-privacy-actions {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: .5rem;
        flex-wrap: wrap;
        margin-top: .9rem;
      }

      .analytics-button {
        border: 1px solid #1e293b;
        border-radius: 999px;
        padding: .62rem .78rem;
        background: rgba(2, 6, 23, .44);
        color: #f8fafc;
        font-family: "JetBrains Mono", monospace;
        font-size: 9px;
        font-weight: 900;
        letter-spacing: .08em;
        text-transform: uppercase;
        cursor: pointer !important;
        transition: transform .2s ease, border-color .2s ease, color .2s ease, background .2s ease;
      }

      .analytics-button:hover {
        transform: translateY(-1px);
        border-color: var(--accent-color, #10b981);
      }

      .analytics-button.primary {
        background: var(--accent-color, #10b981);
        color: #020617;
        border-color: var(--accent-color, #10b981);
      }

      .analytics-button.danger {
        color: #fca5a5;
        border-color: rgba(248, 113, 113, .36);
      }

      .analytics-complete-dashboard {
        display: grid;
        gap: 1rem;
        margin-bottom: 1rem;
      }

      .analytics-clean-header {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 1rem;
        flex-wrap: wrap;
        border: 1px solid color-mix(in srgb, var(--accent-color, #10b981) 24%, #1e293b);
        border-radius: 1.1rem;
        padding: 1rem;
        background:
          radial-gradient(circle at top left, color-mix(in srgb, var(--accent-color, #10b981) 12%, transparent), transparent 42%),
          rgba(2, 6, 23, .32);
      }

      .analytics-clean-header h3 {
        font-size: 1.15rem;
        font-weight: 850;
        margin: 0;
      }

      .analytics-header-actions {
        display: grid;
        gap: .5rem;
        justify-items: end;
      }

      .analytics-clean-sync {
        color: var(--text-color, #94a3b8);
        font-family: "JetBrains Mono", monospace;
        font-size: 10px;
      }

      .analytics-period-filter {
        display: flex;
        align-items: center;
        gap: .35rem;
        flex-wrap: wrap;
        justify-content: flex-end;
      }

      .analytics-period-filter button {
        border: 1px solid #1e293b;
        border-radius: 999px;
        background: rgba(2, 6, 23, .45);
        color: var(--text-color, #94a3b8);
        font-family: "JetBrains Mono", monospace;
        font-size: 9px;
        font-weight: 900;
        letter-spacing: .06em;
        text-transform: uppercase;
        padding: .48rem .62rem;
        cursor: pointer !important;
      }

      .analytics-period-filter button.active {
        background: var(--accent-color, #10b981);
        color: #020617;
        border-color: var(--accent-color, #10b981);
      }

      .analytics-summary-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: .72rem;
      }

      .analytics-summary-card,
      .analytics-metric-card,
      .analytics-panel-card {
        border: 1px solid #1e293b;
        border-radius: 1rem;
        background: rgba(2, 6, 23, .34);
      }

      .analytics-summary-card {
        position: relative;
        overflow: hidden;
        padding: .85rem;
      }

      .analytics-summary-card::before {
        content: "";
        position: absolute;
        inset: 0;
        background: radial-gradient(circle at top right, color-mix(in srgb, var(--accent-color, #10b981) 12%, transparent), transparent 44%);
        pointer-events: none;
      }

      .analytics-summary-card > * {
        position: relative;
        z-index: 1;
      }

      .analytics-summary-card span,
      .analytics-metric-card span {
        display: block;
        color: var(--text-color, #94a3b8);
        font-family: "JetBrains Mono", monospace;
        font-size: 8.5px;
        font-weight: 850;
        letter-spacing: .1em;
        text-transform: uppercase;
      }

      .analytics-summary-card strong {
        display: block;
        color: var(--title-color, #fff);
        font-size: .96rem;
        line-height: 1.2;
        margin-top: .35rem;
      }

      .analytics-summary-card small {
        display: block;
        color: var(--text-color, #94a3b8);
        font-size: .7rem;
        line-height: 1.35;
        margin-top: .35rem;
      }

      .analytics-metric-grid {
        display: grid;
        grid-template-columns: repeat(6, minmax(0, 1fr));
        gap: .72rem;
      }

      .analytics-metric-card {
        padding: .85rem;
      }

      .analytics-metric-card strong {
        display: block;
        color: var(--title-color, #fff);
        font-size: 1.35rem;
        line-height: 1.1;
        margin-top: .35rem;
      }

      .analytics-section-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: .78rem;
      }

      .analytics-panel-card {
        padding: .9rem;
        min-width: 0;
      }

      .analytics-panel-title {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: .75rem;
        margin-bottom: .75rem;
      }

      .analytics-panel-title strong {
        color: var(--title-color, #fff);
        font-size: .94rem;
      }

      .analytics-panel-title small {
        color: var(--text-color, #94a3b8);
        font-family: "JetBrains Mono", monospace;
        font-size: 9px;
        text-align: right;
      }

      .analytics-list {
        display: grid;
        gap: .52rem;
        max-height: 420px;
        overflow: auto;
        padding-right: .2rem;
      }

      .analytics-row {
        border: 1px solid rgba(30, 41, 59, .86);
        border-radius: .85rem;
        padding: .68rem;
        background: rgba(15, 23, 42, .42);
      }

      .analytics-row-main {
        display: flex;
        justify-content: space-between;
        gap: .8rem;
        align-items: flex-start;
      }

      .analytics-row strong {
        display: block;
        color: var(--title-color, #fff);
        font-size: .8rem;
      }

      .analytics-row span {
        display: block;
        color: var(--text-color, #94a3b8);
        font-size: .72rem;
        margin-top: .15rem;
      }

      .analytics-row code {
        display: block;
        color: var(--accent-color, #10b981);
        font-family: "JetBrains Mono", monospace;
        font-size: .64rem;
        margin-top: .22rem;
        word-break: break-all;
      }

      .analytics-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 999px;
        border: 1px solid color-mix(in srgb, var(--accent-color, #10b981) 28%, #1e293b);
        color: var(--accent-color, #10b981);
        padding: .22rem .45rem;
        font-family: "JetBrains Mono", monospace;
        font-size: .62rem;
        font-weight: 900;
        white-space: nowrap;
      }

      .analytics-priority-alta {
        color: #020617;
        background: #22c55e;
        border-color: #22c55e;
      }

      .analytics-priority-média {
        color: #facc15;
        border-color: rgba(250, 204, 21, .38);
      }

      .analytics-priority-baixa {
        color: #94a3b8;
        border-color: #334155;
      }

      .analytics-bar-list {
        display: grid;
        gap: .52rem;
      }

      .analytics-bar-row {
        display: grid;
        gap: .38rem;
        border: 1px solid rgba(30, 41, 59, .86);
        border-radius: .85rem;
        padding: .68rem;
        background: rgba(15, 23, 42, .42);
      }

      .analytics-bar-top {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr) auto;
        align-items: center;
        gap: .62rem;
      }

      .analytics-pos {
        width: 1.75rem;
        height: 1.75rem;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: .55rem;
        background: color-mix(in srgb, var(--accent-color, #10b981) 12%, transparent);
        color: var(--accent-color, #10b981);
        font-family: "JetBrains Mono", monospace;
        font-size: .66rem;
        font-weight: 900;
      }

      .analytics-bar-info strong {
        display: block;
        color: var(--title-color, #fff);
        font-size: .8rem;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .analytics-bar-info small {
        display: block;
        color: var(--text-color, #94a3b8);
        font-family: "JetBrains Mono", monospace;
        font-size: .64rem;
        line-height: 1.35;
        margin-top: .12rem;
      }

      .analytics-percent {
        color: var(--accent-color, #10b981);
        font-family: "JetBrains Mono", monospace;
        font-size: .76rem;
        font-weight: 900;
      }

      .analytics-bar-track {
        height: 5px;
        overflow: hidden;
        border-radius: 999px;
        background: rgba(30, 41, 59, .8);
      }

      .analytics-bar-track span {
        display: block;
        height: 100%;
        border-radius: inherit;
        background: linear-gradient(90deg, var(--accent-color, #10b981), #67e8f9);
      }

      .analytics-funnel {
        display: grid;
        gap: .55rem;
      }

      .analytics-funnel-step {
        display: grid;
        gap: .35rem;
      }

      .analytics-funnel-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        color: var(--title-color, #fff);
        font-size: .8rem;
      }

      .analytics-journey-details {
        border: 1px solid rgba(30, 41, 59, .86);
        border-radius: .95rem;
        background: rgba(15, 23, 42, .42);
        overflow: hidden;
      }

      .analytics-journey-summary {
        list-style: none;
        cursor: pointer;
        padding: .76rem;
      }

      .analytics-journey-summary::-webkit-details-marker {
        display: none;
      }

      .analytics-journey-summary:hover {
        background: rgba(255, 255, 255, .025);
      }

      .analytics-journey-summary-main {
        display: flex;
        justify-content: space-between;
        gap: .85rem;
        align-items: flex-start;
      }

      .analytics-journey-summary strong {
        display: block;
        color: var(--title-color, #fff);
        font-size: .84rem;
      }

      .analytics-journey-summary span {
        display: block;
        color: var(--text-color, #94a3b8);
        font-size: .72rem;
        margin-top: .18rem;
      }

      .analytics-journey-summary code {
        display: block;
        color: var(--accent-color, #10b981);
        font-family: "JetBrains Mono", monospace;
        font-size: .64rem;
        margin-top: .28rem;
        word-break: break-all;
      }

      .analytics-journey-last-action {
        margin-top: .65rem;
        border: 1px solid rgba(30, 41, 59, .72);
        border-radius: .75rem;
        padding: .55rem;
        background: rgba(2, 6, 23, .22);
      }

      .analytics-journey-last-action b {
        display: block;
        color: var(--title-color, #fff);
        font-size: .72rem;
      }

      .analytics-journey-last-action span {
        display: block;
        color: var(--text-color, #94a3b8);
        font-size: .7rem;
        margin-top: .18rem;
      }

      .analytics-journey-body {
        border-top: 1px solid rgba(30, 41, 59, .82);
        padding: .75rem;
        background: rgba(2, 6, 23, .24);
      }

      .analytics-journey-reasons {
        border: 1px solid rgba(30, 41, 59, .72);
        border-radius: .75rem;
        padding: .58rem;
        margin-bottom: .7rem;
        background: rgba(15, 23, 42, .42);
      }

      .analytics-journey-reasons strong {
        display: block;
        color: var(--title-color, #fff);
        font-size: .74rem;
      }

      .analytics-journey-reasons span {
        display: block;
        color: var(--text-color, #94a3b8);
        font-size: .7rem;
        margin-top: .18rem;
      }

      .analytics-timeline {
        position: relative;
        display: grid;
        gap: .4rem;
        padding-left: .75rem;
      }

      .analytics-timeline::before {
        content: "";
        position: absolute;
        left: .18rem;
        top: .15rem;
        bottom: .15rem;
        width: 1px;
        background: color-mix(in srgb, var(--accent-color, #10b981) 28%, #1e293b);
      }

      .analytics-timeline-item {
        position: relative;
        color: var(--text-color, #94a3b8);
        font-size: .7rem;
        line-height: 1.35;
      }

      .analytics-timeline-item::before {
        content: "";
        position: absolute;
        left: -.72rem;
        top: .3rem;
        width: .36rem;
        height: .36rem;
        border-radius: 999px;
        background: var(--accent-color, #10b981);
        box-shadow: 0 0 12px color-mix(in srgb, var(--accent-color, #10b981) 50%, transparent);
      }

      .analytics-day-hour-grid {
        display: grid;
        gap: .58rem;
      }

      .analytics-day-hour-card {
        position: relative;
        overflow: hidden;
      }

      .analytics-day-hour-card::before {
        content: "";
        position: absolute;
        inset: 0;
        background:
          radial-gradient(circle at top right, color-mix(in srgb, var(--accent-color, #10b981) 10%, transparent), transparent 46%);
        opacity: .8;
        pointer-events: none;
      }

      .analytics-day-hour-card > * {
        position: relative;
        z-index: 1;
      }

      .analytics-mini-kicker {
        display: block;
        color: var(--accent-color, #10b981) !important;
        font-family: "JetBrains Mono", monospace;
        font-size: .58rem !important;
        font-weight: 900;
        letter-spacing: .14em;
        text-transform: uppercase;
        margin: 0 0 .28rem !important;
        opacity: .9;
      }

      .analytics-day-hour-card strong {
        font-size: .86rem !important;
      }

      .analytics-day-hour-card span:not(.analytics-mini-kicker) {
        font-size: .75rem !important;
      }

      .analytics-day-hour-today {
        border-color: color-mix(in srgb, var(--accent-color, #10b981) 32%, #1e293b);
        background:
          linear-gradient(135deg, color-mix(in srgb, var(--accent-color, #10b981) 8%, transparent), rgba(15, 23, 42, .42)),
          rgba(15, 23, 42, .42);
      }

      .analytics-day-hour-lines {
        display: grid;
        gap: .4rem;
        margin-top: .58rem;
      }

      .analytics-day-hour-lines span {
        display: flex !important;
        align-items: center;
        justify-content: space-between;
        gap: .75rem;
        border: 1px solid rgba(30, 41, 59, .72);
        border-radius: .7rem;
        padding: .52rem .6rem;
        background: rgba(2, 6, 23, .28);
      }

      .analytics-day-hour-lines b {
        color: var(--title-color, #fff);
        font-size: .72rem;
        font-weight: 850;
      }

      @media (max-width: 1180px) {
        .analytics-metric-grid {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }

        .analytics-summary-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }

      @media (max-width: 900px) {
        .analytics-section-grid {
          grid-template-columns: 1fr;
        }

        .analytics-clean-header,
        .analytics-header-actions {
          justify-items: start;
        }

        .analytics-period-filter {
          justify-content: flex-start;
        }
      }

      @media (max-width: 620px) {
        .analytics-metric-grid,
        .analytics-summary-grid {
          grid-template-columns: 1fr 1fr;
        }

        .analytics-privacy-actions {
          display: grid;
          grid-template-columns: 1fr;
        }

        .analytics-button {
          width: 100%;
        }

        .analytics-journey-summary-main {
          display: grid;
          gap: .55rem;
        }

        .analytics-day-hour-lines span {
          align-items: flex-start;
          flex-direction: column;
        }
      }
    `;

    document.head.appendChild(style);
  };

  const showPrivacyFooterLink = () => {
    if ($("#analytics-privacy-footer-link")) return;

    const footer = document.querySelector("footer");
    const target = footer || document.body;

    const wrapper = document.createElement("div");
    wrapper.className = "analytics-privacy-footer-wrap";
    wrapper.innerHTML = `
      <button
        id="analytics-privacy-footer-link"
        class="analytics-privacy-footer-link"
        type="button"
        aria-label="Abrir preferências de privacidade"
      >
        Privacidade
      </button>
    `;

    target.appendChild(wrapper);

    $("#analytics-privacy-footer-link")?.addEventListener("click", showPrivacyModal);
  };

  const closePrivacyModal = () => {
    $("#analytics-privacy-modal")?.remove();
  };

  function showPrivacyModal() {
    closePrivacyModal();

    const settings = getPrivacySettings();

    const modal = document.createElement("div");
    modal.id = "analytics-privacy-modal";
    modal.className = "analytics-privacy-modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-label", "Preferências de privacidade");
    modal.innerHTML = `
      <div class="analytics-privacy-backdrop" data-analytics-privacy-close></div>

      <div class="analytics-privacy-panel">
        <button type="button" class="analytics-privacy-close" data-analytics-privacy-close aria-label="Fechar">
          ×
        </button>

        <span class="analytics-kicker">/ central_de_privacidade</span>
        <h3>Preferências de analytics</h3>

        <p>
          Configure quais métricas anônimas este navegador pode enviar.
          O site continua funcionando mesmo com analytics desligado.
        </p>

        <div class="analytics-privacy-options">
          <label class="analytics-privacy-option">
            <span>
              <strong>Analytics anônimo</strong>
              <small>ID anônimo, sessão, origem, cidade/UF aproximada, dispositivo, sistema e navegador.</small>
            </span>
            <input id="privacy-analytics-enabled" type="checkbox" ${settings.analyticsEnabled ? "checked" : ""}>
          </label>

          <label class="analytics-privacy-option">
            <span>
              <strong>Eventos de interação</strong>
              <small>Cliques em botões, links, CTAs, projetos, WhatsApp, GitHub, LinkedIn e navegação.</small>
            </span>
            <input id="privacy-interactions-enabled" type="checkbox" ${settings.interactionsEnabled ? "checked" : ""}>
          </label>

          <label class="analytics-privacy-option">
            <span>
              <strong>Performance</strong>
              <small>Tempo de carregamento, lentidão, conexão estimada e falhas técnicas.</small>
            </span>
            <input id="privacy-performance-enabled" type="checkbox" ${settings.performanceEnabled ? "checked" : ""}>
          </label>

          <label class="analytics-privacy-option">
            <span>
              <strong>Diagnóstico de UX</strong>
              <small>Cliques sem ação, cliques repetidos, imagens quebradas e links internos quebrados.</small>
            </span>
            <input id="privacy-ux-enabled" type="checkbox" ${settings.uxEnabled ? "checked" : ""}>
          </label>
        </div>

        <div class="analytics-privacy-actions">
          <button type="button" class="analytics-button danger" id="privacy-disable-all">
            Recusar tudo
          </button>

          <button type="button" class="analytics-button" id="privacy-save-custom">
            Salvar
          </button>

          <button type="button" class="analytics-button primary" id="privacy-accept-all">
            Aceitar tudo
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    $$("[data-analytics-privacy-close]").forEach((element) => {
      element.addEventListener("click", closePrivacyModal);
    });

    $("#privacy-disable-all")?.addEventListener("click", () => {
      savePrivacySettings({
        analyticsEnabled: false,
        interactionsEnabled: false,
        performanceEnabled: false,
        uxEnabled: false,
        mode: "rejected"
      });

      closePrivacyModal();

      sendEvent("analytics_opt_out", {
        metadata: {
          action: "privacy_center_disable_all"
        }
      }, { force: true });
    });

    $("#privacy-accept-all")?.addEventListener("click", () => {
      savePrivacySettings({
        analyticsEnabled: true,
        interactionsEnabled: true,
        performanceEnabled: true,
        uxEnabled: true,
        mode: "accepted_all"
      });

      closePrivacyModal();
      startAnalytics();
    });

    $("#privacy-save-custom")?.addEventListener("click", () => {
      const analyticsEnabled = Boolean($("#privacy-analytics-enabled")?.checked);
      const interactionsEnabled = Boolean($("#privacy-interactions-enabled")?.checked);
      const performanceEnabled = Boolean($("#privacy-performance-enabled")?.checked);
      const uxEnabled = Boolean($("#privacy-ux-enabled")?.checked);

      savePrivacySettings({
        analyticsEnabled,
        interactionsEnabled,
        performanceEnabled,
        uxEnabled,
        mode: analyticsEnabled ? "customized" : "rejected"
      });

      closePrivacyModal();

      if (analyticsEnabled) {
        startAnalytics();
      }
    });
  }

  const detectDeviceType = () => {
    const ua = navigator.userAgent || "";
    const width = window.innerWidth || 0;
    const touch = navigator.maxTouchPoints || 0;

    if (/iPad|Tablet/i.test(ua)) return "tablet";
    if (/Android/i.test(ua) && !/Mobile/i.test(ua)) return "tablet";
    if (/Mobi|Android|iPhone|iPod/i.test(ua)) return "mobile";
    if (width <= 640 && touch > 0) return "mobile";
    if (width <= 1024 && touch > 0) return "tablet";

    return "desktop";
  };

  const detectOS = () => {
    const ua = navigator.userAgent || "";
    const platform = navigator.platform || "";
    const touch = navigator.maxTouchPoints || 0;

    if (/Android/i.test(ua)) return "Android";
    if (/iPhone|iPad|iPod/i.test(ua)) return "iOS";
    if (platform === "MacIntel" && touch > 1) return "iOS";
    if (/Win/i.test(platform)) return "Windows";
    if (/Mac/i.test(platform)) return "macOS";
    if (/Linux/i.test(platform)) return "Linux";

    return "Outro";
  };

  const detectBrowser = () => {
    const ua = navigator.userAgent || "";

    if (/Edg\//.test(ua)) return "Edge";
    if (/OPR\//.test(ua)) return "Opera";
    if (/SamsungBrowser\//.test(ua)) return "Samsung Internet";
    if (/Chrome\//.test(ua) && !/Edg\//.test(ua)) return "Chrome";
    if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) return "Safari";
    if (/Firefox\//.test(ua)) return "Firefox";

    return "Outro";
  };

  const detectBot = () => {
    const ua = navigator.userAgent || "";
    const language = navigator.language || "";

    const botPattern = /bot|crawler|spider|crawling|preview|facebookexternalhit|slurp|bingpreview|headless|phantom|puppeteer|playwright/i;
    const reasons = [];

    if (botPattern.test(ua)) reasons.push("user_agent_suspeito");
    if (navigator.webdriver) reasons.push("webdriver_ativo");
    if (!language) reasons.push("sem_idioma");
    if ((navigator.plugins?.length || 0) === 0 && detectDeviceType() === "desktop") {
      reasons.push("sem_plugins_desktop");
    }

    return {
      suspected: reasons.length > 0,
      reasons
    };
  };

  const normalizeRegionName = (value) => {
    return safeText(value, 80)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  };

  const getBrazilUf = (region, regionCode = "") => {
    const code = safeText(regionCode, 8).toUpperCase();

    if (/^[A-Z]{2}$/.test(code)) return code;

    const map = {
      acre: "AC",
      alagoas: "AL",
      amapa: "AP",
      amazonas: "AM",
      bahia: "BA",
      ceara: "CE",
      "distrito federal": "DF",
      "espirito santo": "ES",
      goias: "GO",
      maranhao: "MA",
      "mato grosso": "MT",
      "mato grosso do sul": "MS",
      "minas gerais": "MG",
      para: "PA",
      paraiba: "PB",
      parana: "PR",
      pernambuco: "PE",
      piaui: "PI",
      "rio de janeiro": "RJ",
      "rio grande do norte": "RN",
      "rio grande do sul": "RS",
      rondonia: "RO",
      roraima: "RR",
      "santa catarina": "SC",
      "sao paulo": "SP",
      sergipe: "SE",
      tocantins: "TO"
    };

    return map[normalizeRegionName(region)] || code || "";
  };

  const normalizeGeo = (data = {}) => {
    const country = safeText(data.country || data.country_name || data.country_code, 80);
    const region = safeText(data.region || data.region_name, 80);
    const regionCode = safeText(data.region_code || data.regionCode, 20);
    const city = safeText(data.city, 80);
    const uf = ["Brazil", "Brasil", "BR"].includes(country)
      ? getBrazilUf(region, regionCode)
      : regionCode || region;

    return {
      country,
      region,
      regionCode,
      uf,
      city,
      cityRegion: city && uf ? `${city} / ${uf}` : city || ""
    };
  };

  const fetchGeoData = async () => {
    try {
      const response = await fetch("https://ipwho.is/", { cache: "no-store" });
      const data = await response.json();

      if (data?.success !== false) {
        return normalizeGeo(data);
      }
    } catch {
      /* fallback abaixo */
    }

    try {
      const response = await fetch("https://ipapi.co/json/", { cache: "no-store" });
      const data = await response.json();

      return normalizeGeo(data);
    } catch {
      return normalizeGeo();
    }
  };

  const getUtm = () => {
    const params = new URLSearchParams(window.location.search);

    return {
      utm_source: safeText(params.get("utm_source"), 80),
      utm_medium: safeText(params.get("utm_medium"), 80),
      utm_campaign: safeText(params.get("utm_campaign"), 100),
      utm_content: safeText(params.get("utm_content"), 100),
      utm_term: safeText(params.get("utm_term"), 100)
    };
  };

  const getReferrerHost = () => {
    if (!document.referrer) return "";

    try {
      return new URL(document.referrer).hostname.replace(/^www\./, "");
    } catch {
      return safeText(document.referrer, 180);
    }
  };

  const classifyOrigin = () => {
    const utm = getUtm();
    const referrer = getReferrerHost();
    const source = utm.utm_source.toLowerCase();

    if (source) return `Campanha UTM: ${utm.utm_source}`;
    if (!referrer) return "Direto";

    const ref = referrer.toLowerCase();

    if (ref.includes("google.")) return "Google";
    if (ref.includes("instagram.")) return "Instagram";
    if (ref.includes("linkedin.")) return "LinkedIn";
    if (ref.includes("github.")) return "GitHub";
    if (ref.includes("whatsapp.") || ref.includes("wa.me")) return "WhatsApp";
    if (ref.includes("facebook.") || ref.includes("fb.")) return "Facebook";
    if (ref.includes("t.co") || ref.includes("twitter.") || ref.includes("x.com")) return "X/Twitter";
    if (ref.includes("bing.")) return "Bing";

    return referrer || "Outro site";
  };

  const cleanHref = (href) => {
    if (!href) return "";

    if (isLocalFileUrl(href)) {
      return "local_file_hidden";
    }

    if (href === "local_file_hidden" || href === "local_dev_hidden") {
      return href;
    }

    try {
      const url = new URL(href, window.location.href);

      if (url.protocol === "file:") return "local_file_hidden";

      if (
        url.hostname === "localhost" ||
        url.hostname === "127.0.0.1" ||
        url.hostname === "::1"
      ) {
        return "local_dev_hidden";
      }

      return url.href.slice(0, 260);
    } catch {
      return safeText(href, 260);
    }
  };

  const getCurrentSection = () => {
    const sections = [
      ...$$("main section[id]"),
      ...$$("nav[id]"),
      ...$$("footer[id]"),
      ...$$("[data-analytics-section]")
    ];

    let best = "top";
    let bestScore = -Infinity;

    sections.forEach((section) => {
      const rect = section.getBoundingClientRect();
      const visible = rect.bottom > 0 && rect.top < window.innerHeight;

      if (!visible) return;

      const centerDistance = Math.abs(rect.top + rect.height / 2 - window.innerHeight / 2);
      const score = -centerDistance;

      if (score > bestScore) {
        bestScore = score;
        best = section.id || section.dataset.analyticsSection || "section";
      }
    });

    return best;
  };

  const getElementLabel = (element) => {
    return safeText(
      element?.getAttribute("aria-label") ||
      element?.getAttribute("title") ||
      element?.dataset?.projectName ||
      element?.dataset?.caseTitle ||
      element?.textContent ||
      element?.tagName?.toLowerCase() ||
      "elemento",
      110
    );
  };

  const getElementSelector = (element) => {
    if (!element) return "";

    const tag = element.tagName.toLowerCase();

    if (element.id) return `${tag}#${element.id}`;

    const classes = Array.from(element.classList || [])
      .slice(0, 3)
      .map((className) => `.${className}`)
      .join("");

    const dataKey =
      element.dataset?.projectName ||
      element.dataset?.caseTitle ||
      element.getAttribute("aria-label") ||
      "";

    if (dataKey) return `${tag}${classes}[data-label="${safeText(dataKey, 40)}"]`;

    return `${tag}${classes}`;
  };

  const isInteractiveElement = (element) => {
    if (!element) return false;

    return Boolean(
      element.closest("a, button, input, select, textarea, label, summary, [role='button'], [tabindex], .hover-target, .swiper-button-next, .swiper-button-prev")
    );
  };

  const getClickPosition = (event) => {
    const doc = document.documentElement;
    const pageWidth = Math.max(1, doc.scrollWidth);
    const pageHeight = Math.max(1, doc.scrollHeight);

    return {
      x: Math.round(event.pageX || 0),
      y: Math.round(event.pageY || 0),
      viewportX: Math.round(event.clientX || 0),
      viewportY: Math.round(event.clientY || 0),
      percentX: Math.round(((event.pageX || 0) / pageWidth) * 100),
      percentY: Math.round(((event.pageY || 0) / pageHeight) * 100)
    };
  };

  const getContext = () => {
    const utm = getUtm();
    const bot = detectBot();

    return {
      page_path: window.location.pathname || "/",
      page_title: document.title || "",
      referrer: getReferrerHost() || "direto",
      origin_source: classifyOrigin(),
      ...utm,
      device_type: detectDeviceType(),
      device_os: detectOS(),
      browser: detectBrowser(),
      viewport_width: Math.round(window.innerWidth || 0),
      viewport_height: Math.round(window.innerHeight || 0),
      screen_width: Math.round(window.screen?.width || 0),
      screen_height: Math.round(window.screen?.height || 0),
      language: navigator.language || "",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "",
      bot
    };
  };

  const buildPayload = (eventType, payload = {}) => {
    const context = getContext();
    const geo = state.geo || normalizeGeo();

    return {
      visitor_id: state.visitorId || getOrCreateVisitorId(),
      session_id: state.sessionId || generateId("session"),
      event_type: safeText(eventType, 64),

      page_path: safeText(context.page_path, 180),
      page_title: safeText(context.page_title, 180),
      referrer: safeText(context.referrer, 180),

      utm_source: context.utm_source,
      utm_medium: context.utm_medium,
      utm_campaign: context.utm_campaign,

      section_id: safeText(payload.section_id || state.currentSection || "top", 80),
      element_label: safeText(payload.element_label, 120),
      element_selector: safeText(payload.element_selector, 160),
      element_href: safeText(payload.element_href, 260),

      device_type: context.device_type,
      device_os: context.device_os,
      browser: context.browser,

      viewport_width: context.viewport_width,
      viewport_height: context.viewport_height,
      screen_width: context.screen_width,
      screen_height: context.screen_height,

      language: safeText(context.language, 40),
      timezone: safeText(context.timezone, 80),

      duration_seconds: Number(payload.duration_seconds || 0),

      metadata: {
        ...(payload.metadata || {}),
        privacy_mode: getPrivacySettings().mode,
        origin_source: context.origin_source,
        utm_content: context.utm_content,
        utm_term: context.utm_term,
        geo,
        bot: context.bot,
        url: cleanHref(getSafeCurrentUrl()),
        online: navigator.onLine,
        session_started_at: new Date(state.sessionStartedAt).toISOString()
      }
    };
  };

  const markAdminTrackingDisabled = () => {
    state.isAdminUser = true;

    try {
      localStorage.setItem(CONFIG.adminFlagKey, JSON.stringify({
        enabled: true,
        expiresAt: Date.now() + 12 * 60 * 60 * 1000
      }));
    } catch {
      /* silencioso */
    }
  };

  const shouldIgnoreTrackingForAdmin = () => {
    if (state.isAdminUser) return true;
    if (document.body.classList.contains("admin-modal-open")) return true;

    try {
      const stored = JSON.parse(localStorage.getItem(CONFIG.adminFlagKey) || "{}");

      if (stored?.enabled && Number(stored.expiresAt || 0) > Date.now()) {
        return true;
      }

      if (stored?.expiresAt && Number(stored.expiresAt) <= Date.now()) {
        localStorage.removeItem(CONFIG.adminFlagKey);
      }
    } catch {
      localStorage.removeItem(CONFIG.adminFlagKey);
    }

    return false;
  };

  async function sendEvent(eventType, payload = {}, options = {}) {
    if (shouldIgnoreTrackingForAdmin() && !options.force && !options.allowAdmin) {
      return false;
    }

    if (shouldDisableAnalyticsInLocal() && !options.allowLocal) {
      return false;
    }

    if (!options.force && !canTrack()) return false;

    const client = getClient();
    const config = getSupabaseConfig();
    const eventPayload = buildPayload(eventType, payload);

    if (options.keepalive && config.url && config.key) {
      try {
        await fetch(`${config.url}/rest/v1/${CONFIG.table}`, {
          method: "POST",
          keepalive: true,
          headers: {
            apikey: config.key,
            Authorization: `Bearer ${config.key}`,
            "Content-Type": "application/json",
            Prefer: "return=minimal"
          },
          body: JSON.stringify(eventPayload)
        });

        return true;
      } catch {
        return false;
      }
    }

    if (!client) return false;

    const { error } = await client.from(CONFIG.table).insert(eventPayload);

    if (error) {
      console.warn("[Analytics Complete] Erro ao enviar evento:", error.message);
      return false;
    }

    return true;
  }

  const flushSectionTime = (keepalive = false) => {
    const now = Date.now();
    const seconds = Math.floor((now - state.currentSectionStartedAt) / 1000);

    if (seconds >= 2) {
      state.sectionSeconds[state.currentSection] = (state.sectionSeconds[state.currentSection] || 0) + seconds;

      sendEvent("section_time", {
        section_id: state.currentSection,
        duration_seconds: seconds,
        metadata: {
          section_total_seconds: state.sectionSeconds[state.currentSection]
        }
      }, { keepalive });
    }

    state.currentSectionStartedAt = now;
  };

  const handleSectionChange = () => {
    const next = getCurrentSection();

    if (!next || next === state.currentSection) return;

    flushSectionTime(false);

    state.currentSection = next;
    state.currentSectionStartedAt = Date.now();
    state.viewedSections.add(next);

    sendEvent("section_view", {
      section_id: next,
      metadata: {
        viewed_sections: Array.from(state.viewedSections)
      }
    });

    if (/servicos|serviços/i.test(next)) {
      sendEvent("funnel_step", {
        section_id: next,
        metadata: {
          step: "view_services"
        }
      });
    }

    if (/cases|projetos|produção|producao/i.test(next)) {
      sendEvent("funnel_step", {
        section_id: next,
        metadata: {
          step: "view_projects"
        }
      });
    }

    if (/contato|contact/i.test(next)) {
      sendEvent("funnel_step", {
        section_id: next,
        metadata: {
          step: "view_contact"
        }
      });
    }
  };

  const handleScrollDepth = () => {
    const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const percent = Math.min(100, Math.round((scrollTop / maxScroll) * 100));

    CONFIG.scrollMilestones.forEach((milestone) => {
      if (percent >= milestone && !state.sentScrollMilestones.has(milestone)) {
        state.sentScrollMilestones.add(milestone);

        sendEvent("scroll_depth", {
          section_id: state.currentSection,
          metadata: {
            percent: milestone
          }
        });
      }
    });
  };

  const classifyClickIntent = (target, href, label) => {
    const text = `${label} ${href} ${target.id || ""} ${Array.from(target.classList || []).join(" ")}`.toLowerCase();

    if (text.includes("wa.me") || text.includes("whatsapp")) return "whatsapp";
    if (text.includes("mailto:") || text.includes("email")) return "email";
    if (text.includes("linkedin")) return "linkedin";
    if (text.includes("github")) return "github";
    if (text.includes("orçamento") || text.includes("orcamento") || text.includes("contato") || text.includes("contact")) return "contact";
    if (text.includes("projeto") || text.includes("project") || target.closest(".production-card, .case-card")) return "project";
    if (href && !href.startsWith(window.location.origin) && !href.startsWith("#")) return "external";

    return "navigation";
  };

  const handleInteractiveClick = (event) => {
    if (!canTrack("interactions")) return;

    const target = event.target.closest("a, button, [role='button']");
    if (!target) return;

    if (
      target.closest("#production-admin-panel") ||
      target.closest("#admin-project-editor") ||
      target.closest("#analytics-privacy-modal") ||
      target.closest("#analytics-privacy-footer-link")
    ) {
      return;
    }

    const href = target.href || target.getAttribute("href") || target.dataset?.projectUrl || "";
    const hrefClean = cleanHref(href);
    const label = getElementLabel(target);
    const selector = getElementSelector(target);
    const intent = classifyClickIntent(target, hrefClean, label);
    const position = getClickPosition(event);

    sendEvent("click", {
      section_id: state.currentSection,
      element_label: label,
      element_selector: selector,
      element_href: hrefClean,
      metadata: {
        intent,
        position,
        tag: target.tagName.toLowerCase()
      }
    });

    if (["whatsapp", "email", "contact"].includes(intent)) {
      sendEvent("funnel_step", {
        section_id: state.currentSection,
        element_label: label,
        element_selector: selector,
        element_href: hrefClean,
        metadata: {
          step: "click_contact",
          intent,
          position
        }
      });
    }

    if (intent === "project") {
      sendEvent("project_interest", {
        section_id: state.currentSection,
        element_label: label,
        element_selector: selector,
        element_href: hrefClean,
        metadata: {
          position
        }
      });
    }
  };

  const looksLikeDeadClickCandidate = (element) => {
    if (!element) return false;

    return Boolean(
      element.closest(
        ".case-card, .service-card, .differential-card, .production-card-body, .case-preview, .metric-box, .mock-window, img, [data-project-name]"
      )
    );
  };

  const handleUxClick = (event) => {
    if (!canTrack("ux")) return;

    const target = event.target;
    const selector = getElementSelector(target);
    const position = getClickPosition(event);
    const time = Date.now();

    state.clickMemory = state.clickMemory
      .filter((item) => time - item.time <= CONFIG.rageClickWindowMs)
      .concat({
        time,
        selector,
        x: position.viewportX,
        y: position.viewportY
      });

    const similarClicks = state.clickMemory.filter((item) => {
      const sameSelector = item.selector === selector;
      const closeX = Math.abs(item.x - position.viewportX) <= 22;
      const closeY = Math.abs(item.y - position.viewportY) <= 22;

      return sameSelector && closeX && closeY;
    });

    if (similarClicks.length >= CONFIG.rageClickThreshold) {
      sendEvent("rage_click", {
        section_id: state.currentSection,
        element_label: getElementLabel(target),
        element_selector: selector,
        metadata: {
          count: similarClicks.length,
          position
        }
      });

      state.clickMemory = [];
      return;
    }

    if (!isInteractiveElement(target) && looksLikeDeadClickCandidate(target)) {
      sendEvent("dead_click", {
        section_id: state.currentSection,
        element_label: getElementLabel(target),
        element_selector: selector,
        metadata: {
          label: "Clique sem ação",
          meaning: "O visitante clicou em uma área que parece interativa, mas não executou nenhuma ação.",
          position
        }
      });
    }
  };

  const recordPerformance = () => {
    if (!canTrack("performance")) return;

    window.addEventListener("load", () => {
      window.setTimeout(() => {
        const navigation = performance.getEntriesByType?.("navigation")?.[0];
        const paint = performance.getEntriesByType?.("paint") || [];
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;

        const firstPaint = paint.find((item) => item.name === "first-paint")?.startTime || 0;
        const firstContentfulPaint = paint.find((item) => item.name === "first-contentful-paint")?.startTime || 0;

        const loadTimeMs = navigation
          ? Math.round(navigation.loadEventEnd - navigation.startTime)
          : 0;

        const domContentLoadedMs = navigation
          ? Math.round(navigation.domContentLoadedEventEnd - navigation.startTime)
          : 0;

        const ttfbMs = navigation
          ? Math.round(navigation.responseStart - navigation.requestStart)
          : 0;

        sendEvent("performance", {
          metadata: {
            loadTimeMs,
            domContentLoadedMs,
            ttfbMs,
            firstPaintMs: Math.round(firstPaint),
            firstContentfulPaintMs: Math.round(firstContentfulPaint),
            connectionType: connection?.effectiveType || "",
            downlink: connection?.downlink || "",
            saveData: Boolean(connection?.saveData),
            status:
              loadTimeMs <= 1800 ? "rápido" :
              loadTimeMs <= 4200 ? "aceitável" :
              "lento"
          }
        });
      }, 0);
    }, { once: true });
  };

  const recordErrors = () => {
    window.addEventListener("error", (event) => {
      if (!canTrack("performance")) return;

      const target = event.target;

      if (target && target !== window && target.tagName) {
        const tag = target.tagName.toLowerCase();

        if (tag === "img") {
          sendEvent("image_error", {
            metadata: {
              src: cleanHref(target.currentSrc || target.src || ""),
              alt: safeText(target.alt, 120),
              selector: getElementSelector(target)
            }
          });

          return;
        }

        if (tag === "link" || tag === "script") {
          sendEvent("resource_error", {
            metadata: {
              tag,
              href: cleanHref(target.href || target.src || ""),
              selector: getElementSelector(target)
            }
          });

          return;
        }
      }

      sendEvent("site_error", {
        metadata: {
          message: safeText(event.message, 240),
          source: safeText(event.filename, 240),
          line: event.lineno || 0,
          column: event.colno || 0
        }
      });
    }, true);

    window.addEventListener("unhandledrejection", (event) => {
      if (!canTrack("performance")) return;

      sendEvent("site_error", {
        metadata: {
          message: safeText(event.reason?.message || event.reason || "Promise rejeitada", 240),
          type: "unhandledrejection"
        }
      });
    });
  };

  const checkBrokenInternalLinks = () => {
    if (!canTrack("ux")) return;
    if (isLocalEnvironment()) return;

    window.setTimeout(() => {
      $$("a[href]").forEach((anchor) => {
        const rawHref = anchor.getAttribute("href") || "";

        if (
          !rawHref ||
          rawHref.startsWith("mailto:") ||
          rawHref.startsWith("tel:") ||
          rawHref.startsWith("https://wa.me") ||
          rawHref.startsWith("file:")
        ) {
          return;
        }

        if (/\.(pdf|doc|docx|xls|xlsx|zip|rar)$/i.test(rawHref.split("?")[0])) {
          return;
        }

        if (rawHref.startsWith("#")) {
          const id = rawHref.slice(1);

          if (id && !document.getElementById(id)) {
            sendEvent("broken_link", {
              element_label: getElementLabel(anchor),
              element_selector: getElementSelector(anchor),
              element_href: rawHref,
              metadata: {
                type: "missing_anchor_target"
              }
            });
          }

          return;
        }

        try {
          const url = new URL(rawHref, window.location.href);

          if (url.origin !== window.location.origin) return;
          if (url.protocol === "file:") return;

          fetch(url.href, { method: "GET", cache: "no-store" })
            .then((response) => {
              if (!response.ok) {
                sendEvent("broken_link", {
                  element_label: getElementLabel(anchor),
                  element_selector: getElementSelector(anchor),
                  element_href: cleanHref(url.href),
                  metadata: {
                    type: "same_origin_http_error",
                    status: response.status
                  }
                });
              }
            })
            .catch(() => {
              sendEvent("broken_link", {
                element_label: getElementLabel(anchor),
                element_selector: getElementSelector(anchor),
                element_href: cleanHref(url.href),
                metadata: {
                  type: "same_origin_fetch_failed"
                }
              });
            });
        } catch {
          /* href inválido ignorado */
        }
      });
    }, 2500);
  };

  const startAnalytics = () => {
    if (state.started || !canTrack() || shouldDisableAnalyticsInLocal() || shouldIgnoreTrackingForAdmin()) return;

    const client = getClient();
    if (!client) return;

    const visitProfile = updateLocalVisitProfile();

    state.started = true;
    state.visitorId = getOrCreateVisitorId();
    state.sessionId = generateId("session");
    state.sessionStartedAt = Date.now();
    state.currentSection = getCurrentSection();
    state.currentSectionStartedAt = Date.now();
    state.viewedSections.add(state.currentSection);

    fetchGeoData().then((geo) => {
      state.geo = geo;

      const bot = detectBot();

      sendEvent("session_start", {
        section_id: state.currentSection,
        metadata: {
          message: "+ Pessoa acabou de entrar no site",
          visitor_type: visitProfile.isReturning ? "recorrente" : "novo",
          is_returning: visitProfile.isReturning,
          visit_count: visitProfile.visitCount,
          first_visit_at: visitProfile.firstVisitAt,
          previous_visit_at: visitProfile.previousVisitAt
        }
      });

      sendEvent("funnel_step", {
        section_id: state.currentSection,
        metadata: {
          step: "entered"
        }
      });

      sendEvent("section_view", {
        section_id: state.currentSection,
        metadata: {
          viewed_sections: Array.from(state.viewedSections)
        }
      });

      if (visitProfile.isReturning) {
        sendEvent("returning_visitor", {
          section_id: state.currentSection,
          metadata: {
            visit_count: visitProfile.visitCount,
            previous_visit_at: visitProfile.previousVisitAt
          }
        });
      }

      if (bot.suspected) {
        sendEvent("bot_suspected", {
          section_id: state.currentSection,
          metadata: {
            reasons: bot.reasons
          }
        });
      }
    });

    document.addEventListener("click", handleInteractiveClick, true);
    document.addEventListener("click", handleUxClick, true);

    let ticking = false;

    window.addEventListener("scroll", () => {
      if (ticking) return;

      ticking = true;

      requestAnimationFrame(() => {
        ticking = false;
        handleSectionChange();
        handleScrollDepth();
      });
    }, { passive: true });

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        flushSectionTime(true);

        sendEvent("tab_hidden", {
          section_id: state.currentSection,
          duration_seconds: Math.floor((Date.now() - state.sessionStartedAt) / 1000),
          metadata: {
            section_seconds: state.sectionSeconds,
            viewed_sections: Array.from(state.viewedSections)
          }
        }, { keepalive: true });

        return;
      }

      state.currentSectionStartedAt = Date.now();

      sendEvent("tab_visible", {
        section_id: state.currentSection
      });
    });

    window.addEventListener("beforeunload", () => {
      flushSectionTime(true);

      sendEvent("session_end", {
        section_id: state.currentSection,
        duration_seconds: Math.floor((Date.now() - state.sessionStartedAt) / 1000),
        metadata: {
          section_seconds: state.sectionSeconds,
          viewed_sections: Array.from(state.viewedSections),
          scroll_milestones: Array.from(state.sentScrollMilestones),
          exit_section: state.currentSection
        }
      }, { keepalive: true });
    });

    state.heartbeatTimer = window.setInterval(() => {
      sendEvent("heartbeat", {
        section_id: state.currentSection,
        duration_seconds: Math.floor((Date.now() - state.sessionStartedAt) / 1000),
        metadata: {
          section_seconds: state.sectionSeconds,
          viewed_sections: Array.from(state.viewedSections)
        }
      });
    }, CONFIG.heartbeatMs);

    recordPerformance();
    recordErrors();
    checkBrokenInternalLinks();
  };

  const formatTime = (value, withSeconds = false) => {
    if (!value) return "--";

    try {
      return new Date(value).toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: withSeconds ? "2-digit" : undefined
      });
    } catch {
      return "--";
    }
  };

  const formatDuration = (seconds) => {
    const total = Math.max(0, Math.floor(Number(seconds) || 0));
    const minutes = Math.floor(total / 60);
    const rest = total % 60;

    if (minutes <= 0) return `${rest}s`;
    return `${minutes}m ${String(rest).padStart(2, "0")}s`;
  };

  const countBy = (items, getter) => {
    return items.reduce((map, item) => {
      const key = safeText(getter(item) || "Não identificado", 110);
      map[key] = (map[key] || 0) + 1;
      return map;
    }, {});
  };

  const topEntry = (map, fallback = "--") => {
    const entries = Object.entries(map || {});
    if (!entries.length) return fallback;
    return entries.sort((a, b) => b[1] - a[1])[0][0];
  };

  const groupBySession = (events) => {
    const sessions = new Map();

    events.forEach((event) => {
      if (!sessions.has(event.session_id)) {
        sessions.set(event.session_id, []);
      }

      sessions.get(event.session_id).push(event);
    });

    return Array.from(sessions.entries())
      .map(([sessionId, sessionEvents]) => ({
        sessionId,
        events: sessionEvents.sort((a, b) => new Date(a.created_at) - new Date(b.created_at)),
        latestAt: Math.max(...sessionEvents.map((event) => new Date(event.created_at).getTime()))
      }))
      .sort((a, b) => b.latestAt - a.latestAt);
  };

  const getActiveSessions = (events) => {
    const cutoff = Date.now() - CONFIG.activeSessionWindowMs;
    const latest = new Map();

    events.forEach((event) => {
      const time = new Date(event.created_at).getTime();

      if (time < cutoff || event.event_type === "session_end") return;

      latest.set(event.session_id, event);
    });

    return Array.from(latest.values());
  };

  const getEventTitle = (event) => {
    const map = {
      session_start: "+ Pessoa entrou no site",
      returning_visitor: "Visitante recorrente voltou",
      click: "Clique registrado",
      project_interest: "Clique em projeto",
      section_view: "Seção visualizada",
      section_time: "Tempo por seção",
      scroll_depth: "Scroll registrado",
      heartbeat: "Sessão ativa",
      performance: "Performance",
      site_error: "Erro JavaScript",
      image_error: "Imagem quebrada",
      resource_error: "Recurso falhou",
      broken_link: "Link quebrado",
      dead_click: "Clique sem ação",
      rage_click: "Cliques repetidos",
      bot_suspected: "Acesso automatizado suspeito",
      funnel_step: "Etapa do funil",
      session_end: "Sessão finalizada",
      tab_hidden: "Aba oculta",
      tab_visible: "Aba visível",
      analytics_opt_out: "Analytics recusado"
    };

    return map[event.event_type] || event.event_type;
  };

  const isRealClickEvent = (event) => {
    return event?.event_type === "click";
  };

  const isVisitEvent = (event) => {
    return event?.event_type === "session_start";
  };

  const isTechnicalEvent = (event) => {
    return [
      "heartbeat",
      "performance",
      "section_time",
      "scroll_depth",
      "tab_hidden",
      "tab_visible"
    ].includes(event?.event_type);
  };

  const isIssueEvent = (event) => {
    return [
      "site_error",
      "image_error",
      "resource_error",
      "broken_link",
      "dead_click",
      "rage_click"
    ].includes(event?.event_type);
  };

  const isCleanDashboardEvent = (event) => {
    const url = String(event?.metadata?.url || "");
    const href = String(event?.element_href || "");
    const referrer = String(event?.referrer || "");

    if (url.includes("local_file_hidden") || url.includes("local_dev_hidden")) return false;
    if (href.includes("local_file_hidden") || href.includes("local_dev_hidden")) return false;
    if (url.startsWith("file:") || href.startsWith("file:") || referrer.startsWith("file:")) return false;

    return true;
  };

  const getPeriodStart = (period) => {
    const now = new Date();

    if (period === "today") {
      return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    }

    if (period === "7d") {
      return Date.now() - 7 * 24 * 60 * 60 * 1000;
    }

    if (period === "30d") {
      return Date.now() - 30 * 24 * 60 * 60 * 1000;
    }

    return 0;
  };

  const getFilteredDashboardEvents = (events) => {
    const period = state.dashboardPeriod || "today";
    const start = getPeriodStart(period);

    return (events || [])
      .filter(isCleanDashboardEvent)
      .filter((event) => {
        if (!start) return true;
        return new Date(event.created_at).getTime() >= start;
      });
  };

  const getPeriodLabel = () => {
    const map = {
      today: "Hoje",
      "7d": "Últimos 7 dias",
      "30d": "Últimos 30 dias",
      all: "Todo período"
    };

    return map[state.dashboardPeriod || "today"] || "Hoje";
  };

  const createShortVisitorId = (visitorId = "") => {
    const compact = String(visitorId)
      .replace(/^visitor_/, "")
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase();

    const suffix = compact.slice(-6) || "000000";

    return `Visitante #${suffix}`;
  };

  const getSessionDuration = (sessionEvents = []) => {
    if (!sessionEvents.length) return 0;

    const times = sessionEvents
      .map((event) => new Date(event.created_at).getTime())
      .filter(Boolean);

    if (!times.length) return 0;

    const min = Math.min(...times);
    const max = Math.max(...times);

    return Math.max(0, Math.floor((max - min) / 1000));
  };

  const getSessionClicks = (sessionEvents = []) => {
    return sessionEvents.filter(isRealClickEvent);
  };

  const getSessionSections = (sessionEvents = []) => {
    return new Set(
      sessionEvents
        .map((event) => safeText(event.section_id || "", 80))
        .filter(Boolean)
    );
  };

  const getLastImportantAction = (sessionEvents = []) => {
    const important = sessionEvents
      .filter((event) => [
        "click",
        "project_interest",
        "returning_visitor",
        "session_start",
        "funnel_step"
      ].includes(event.event_type))
      .slice()
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];

    if (!important) {
      const last = sessionEvents[sessionEvents.length - 1];

      return {
        title: last ? getEventTitle(last) : "Sem ação registrada",
        time: last?.created_at || "",
        detail: last?.section_id || ""
      };
    }

    return {
      title: getEventTitle(important),
      time: important.created_at,
      detail: important.element_label || important.section_id || important.metadata?.intent || ""
    };
  };

  const normalizeUtmSourceName = (source = "") => {
    const value = safeText(source, 80).toLowerCase();

    if (!value) return "";

    if (["ig", "instagram", "insta"].includes(value)) return "Instagram";
    if (["fb", "facebook", "meta"].includes(value)) return "Facebook";
    if (["wpp", "whatsapp", "wa"].includes(value)) return "WhatsApp";
    if (["linkedin", "in"].includes(value)) return "LinkedIn";
    if (["google", "gads", "googleads", "ads"].includes(value)) return "Google";
    if (["github"].includes(value)) return "GitHub";

    return safeText(source, 80);
  };

  const isSelfReferral = (value = "") => {
    const text = safeText(value, 180).toLowerCase();
    const host = window.location.hostname.replace(/^www\./, "").toLowerCase();

    if (!text) return false;
    if (host && text.includes(host)) return true;
    if (text.includes("upaiva.dev")) return true;

    return false;
  };

  const getFriendlyOriginFromEvent = (event = {}) => {
    const utmSource = safeText(event.utm_source || event.metadata?.utm_source || "", 80);
    const rawOrigin = safeText(event.metadata?.origin_source || event.referrer || "", 180);
    const normalizedUtm = normalizeUtmSourceName(utmSource);

    if (normalizedUtm) {
      return `${normalizedUtm} via campanha`;
    }

    if (/campanha utm:/i.test(rawOrigin)) {
      const extracted = rawOrigin.split(":").slice(1).join(":").trim();
      const normalized = normalizeUtmSourceName(extracted);

      if (normalized) return `${normalized} via campanha`;
      return "Campanha identificada";
    }

    if (!rawOrigin || rawOrigin === "direto" || rawOrigin === "Direto") {
      return "Acesso direto";
    }

    if (isSelfReferral(rawOrigin)) {
      return "Tráfego interno";
    }

    const raw = rawOrigin.toLowerCase();

    if (raw.includes("instagram")) return "Instagram";
    if (raw.includes("google")) return "Google";
    if (raw.includes("linkedin")) return "LinkedIn";
    if (raw.includes("github")) return "GitHub";
    if (raw.includes("whatsapp") || raw.includes("wa.me")) return "WhatsApp";
    if (raw.includes("facebook") || raw.includes("fb.")) return "Facebook";
    if (raw.includes("bing")) return "Bing";
    if (raw.includes("x.com") || raw.includes("twitter") || raw.includes("t.co")) return "X/Twitter";

    return rawOrigin;
  };

  const getOriginExplanation = (name = "") => {
    const text = name.toLowerCase();

    if (text.includes("campanha")) return "Link marcado com UTM para medir divulgação.";
    if (text.includes("direto")) return "Sem origem enviada pelo navegador ou app.";
    if (text.includes("interno")) return "Navegação dentro do próprio site.";
    if (text.includes("instagram")) return "Origem social do Instagram.";
    if (text.includes("whatsapp")) return "Origem provável de compartilhamento.";
    if (text.includes("google")) return "Origem de busca ou campanha Google.";

    return "Origem externa identificada.";
  };

  const getSessionMainEvent = (sessionEvents = []) => {
    return (
      sessionEvents.find((event) => event.event_type === "session_start") ||
      sessionEvents.find((event) => event.metadata?.geo?.cityRegion) ||
      sessionEvents[0] ||
      {}
    );
  };

  const getSessionStats = (events, getter) => {
    const sessions = groupBySession(events);
    const stats = {};

    sessions.forEach((session) => {
      const sessionEvents = session.events || [];
      const main = getSessionMainEvent(sessionEvents);
      const key = safeText(getter(sessionEvents, main, session) || "Não identificado", 120);

      if (!key || key === "Não identificado") return;

      if (!stats[key]) {
        stats[key] = {
          label: key,
          sessions: 0,
          visitors: new Set(),
          clicks: 0,
          technicalRecords: 0,
          lastAt: ""
        };
      }

      const clicks = sessionEvents.filter(isRealClickEvent).length;
      const technicalRecords = sessionEvents.filter(isTechnicalEvent).length;

      stats[key].sessions += 1;
      stats[key].clicks += clicks;
      stats[key].technicalRecords += technicalRecords;

      if (main.visitor_id) {
        stats[key].visitors.add(main.visitor_id);
      }

      const last = sessionEvents[sessionEvents.length - 1];

      if (last?.created_at) {
        stats[key].lastAt = last.created_at;
      }
    });

    return Object.fromEntries(
      Object.entries(stats).map(([key, value]) => [
        key,
        {
          ...value,
          visitorsCount: value.visitors.size
        }
      ])
    );
  };

  const renderStatsList = (statsMap, options = {}) => {
    const limit = options.limit || 10;
    const emptyText = options.emptyText || "Sem dados suficientes ainda.";
    const formatter = options.formatter || ((item) => ({
      title: item.label,
      subtitle: `${item.clicks} cliques · ${item.sessions} sessões · ${item.visitorsCount} visitantes`
    }));

    const entries = Object.values(statsMap || {})
      .sort((a, b) => {
        if (b.clicks !== a.clicks) return b.clicks - a.clicks;
        return b.sessions - a.sessions;
      })
      .slice(0, limit);

    const totalClicks = entries.reduce((sum, item) => sum + Number(item.clicks || 0), 0);
    const totalSessions = entries.reduce((sum, item) => sum + Number(item.sessions || 0), 0);
    const base = totalClicks > 0 ? totalClicks : Math.max(1, totalSessions);

    if (!entries.length) {
      return `
        <div class="analytics-row">
          <strong>${safeText(emptyText)}</strong>
          <span>Aguarde novos cliques e sessões reais no site.</span>
        </div>
      `;
    }

    return entries.map((item, index) => {
      const value = totalClicks > 0 ? item.clicks : item.sessions;
      const percent = (Number(value || 0) / base) * 100;
      const width = Math.max(4, Math.min(100, percent));
      const formatted = formatter(item, percent);

      return `
        <div class="analytics-bar-row">
          <div class="analytics-bar-top">
            <span class="analytics-pos">${String(index + 1).padStart(2, "0")}</span>

            <span class="analytics-bar-info">
              <strong>${safeText(formatted.title, 100)}</strong>
              <small>${safeText(formatted.subtitle, 180)}</small>
            </span>

            <span class="analytics-percent">
              ${percent.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%
            </span>
          </div>

          <div class="analytics-bar-track">
            <span style="width:${width}%"></span>
          </div>
        </div>
      `;
    }).join("");
  };

  const getCityFromSession = (sessionEvents = []) => {
    const eventWithGeo = sessionEvents.find((event) => event.metadata?.geo?.cityRegion);
    return eventWithGeo?.metadata?.geo?.cityRegion || "";
  };

  const getMaxConcurrentUsers = (events = []) => {
    const sessions = groupBySession(events);
    const points = [];

    sessions.forEach((session) => {
      const sessionEvents = session.events || [];
      const times = sessionEvents
        .map((event) => new Date(event.created_at).getTime())
        .filter(Boolean);

      if (!times.length) return;

      const start = Math.min(...times);
      const end = Math.max(...times) + CONFIG.activeSessionWindowMs;

      points.push({ time: start, delta: 1 });
      points.push({ time: end, delta: -1 });
    });

    points.sort((a, b) => {
      if (a.time !== b.time) return a.time - b.time;
      return b.delta - a.delta;
    });

    let current = 0;
    let max = 0;
    let maxAt = "";

    points.forEach((point) => {
      current += point.delta;

      if (current > max) {
        max = current;
        maxAt = new Date(point.time).toISOString();
      }
    });

    return {
      count: max,
      at: maxAt
    };
  };

  const getDayHourData = (events) => {
    const byDay = {};
    const byHour = {};
    const todayByHour = {};

    const todayDate = new Date();
    const todayKey = todayDate.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit"
    });

    const createBucket = () => ({
      visits: 0,
      clicks: 0,
      sessions: new Set()
    });

    events.forEach((event) => {
      const date = new Date(event.created_at);

      if (Number.isNaN(date.getTime())) return;

      const day = date.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit"
      });

      const hour = `${String(date.getHours()).padStart(2, "0")}h`;

      byDay[day] ||= createBucket();
      byHour[hour] ||= createBucket();

      if (event.session_id) {
        byDay[day].sessions.add(event.session_id);
        byHour[hour].sessions.add(event.session_id);
      }

      if (isVisitEvent(event)) {
        byDay[day].visits += 1;
        byHour[hour].visits += 1;
      }

      if (isRealClickEvent(event)) {
        byDay[day].clicks += 1;
        byHour[hour].clicks += 1;
      }

      if (day === todayKey) {
        todayByHour[hour] ||= createBucket();

        if (event.session_id) {
          todayByHour[hour].sessions.add(event.session_id);
        }

        if (isVisitEvent(event)) {
          todayByHour[hour].visits += 1;
        }

        if (isRealClickEvent(event)) {
          todayByHour[hour].clicks += 1;
        }
      }
    });

    const normalizeBucket = (bucket = createBucket()) => ({
      visits: Number(bucket.visits || 0),
      clicks: Number(bucket.clicks || 0),
      sessions: bucket.sessions?.size || 0
    });

    const getTopBucket = (map) => {
      const entries = Object.entries(map || {});

      if (!entries.length) {
        return {
          label: "--",
          visits: 0,
          clicks: 0,
          sessions: 0
        };
      }

      const [label, bucket] = entries.sort((a, b) => {
        const aData = normalizeBucket(a[1]);
        const bData = normalizeBucket(b[1]);

        const aScore = (aData.visits * 3) + (aData.clicks * 2) + aData.sessions;
        const bScore = (bData.visits * 3) + (bData.clicks * 2) + bData.sessions;

        return bScore - aScore;
      })[0];

      return {
        label,
        ...normalizeBucket(bucket)
      };
    };

    const todayTotal = Object.values(todayByHour).reduce((total, bucket) => {
      const normalized = normalizeBucket(bucket);

      total.visits += normalized.visits;
      total.clicks += normalized.clicks;
      total.sessions += normalized.sessions;

      return total;
    }, {
      visits: 0,
      clicks: 0,
      sessions: 0
    });

    return {
      byDay,
      byHour,
      todayKey,
      todayTotal,
      todayByHour,
      topDay: getTopBucket(byDay),
      topHour: getTopBucket(byHour),
      todayTopHour: getTopBucket(todayByHour)
    };
  };

  const formatVisitClickText = (bucket = {}) => {
    const visits = Number(bucket.visits || 0);
    const clicks = Number(bucket.clicks || 0);

    const visitText = visits === 1 ? "visita" : "visitas";
    const clickText = clicks === 1 ? "clique" : "cliques";

    return `${visits} ${visitText} · ${clicks} ${clickText}`;
  };

  const renderDayHourPanel = (dayHour) => {
    const topDay = dayHour?.topDay || {
      label: "--",
      visits: 0,
      clicks: 0
    };

    const topHour = dayHour?.topHour || {
      label: "--",
      visits: 0,
      clicks: 0
    };

    const todayTotal = dayHour?.todayTotal || {
      visits: 0,
      clicks: 0
    };

    const todayTopHour = dayHour?.todayTopHour || {
      label: "--",
      visits: 0,
      clicks: 0
    };

    return `
      <div class="analytics-day-hour-grid">
        <div class="analytics-row analytics-day-hour-card">
          <span class="analytics-mini-kicker">pico diário</span>
          <strong>Dia com mais atividade</strong>
          <span>${safeText(topDay.label)} · ${formatVisitClickText(topDay)}</span>
        </div>

        <div class="analytics-row analytics-day-hour-card">
          <span class="analytics-mini-kicker">pico por hora</span>
          <strong>Horário com mais atividade</strong>
          <span>${safeText(topHour.label)} · ${formatVisitClickText(topHour)}</span>
        </div>

        <div class="analytics-row analytics-day-hour-card analytics-day-hour-today">
          <span class="analytics-mini-kicker">hoje · ${safeText(dayHour?.todayKey || "--")}</span>
          <strong>Resumo de hoje</strong>

          <div class="analytics-day-hour-lines">
            <span>
              <b>Total</b>
              ${formatVisitClickText(todayTotal)}
            </span>

            <span>
              <b>Horário com mais atividade</b>
              ${safeText(todayTopHour.label)} · ${formatVisitClickText(todayTopHour)}
            </span>
          </div>
        </div>
      </div>
    `;
  };

  const getLeadScoreForSession = (sessionEvents) => {
    let score = 0;
    const reasons = new Set();

    const hasEvent = (type) => sessionEvents.some((event) => event.event_type === type);
    const hasSection = (pattern) => sessionEvents.some((event) => pattern.test(event.section_id || ""));
    const hasClickIntent = (intent) => sessionEvents.some((event) => event.event_type === "click" && event.metadata?.intent === intent);

    const maxDuration = Math.max(...sessionEvents.map((event) => Number(event.duration_seconds || 0)), 0);
    const totalSectionTime = sessionEvents
      .filter((event) => event.event_type === "section_time")
      .reduce((sum, event) => sum + Number(event.duration_seconds || 0), 0);

    const maxScroll = Math.max(
      ...sessionEvents
        .filter((event) => event.event_type === "scroll_depth")
        .map((event) => Number(event.metadata?.percent || 0)),
      0
    );

    if (maxDuration >= 30 || totalSectionTime >= 30) {
      score += 1;
      reasons.add("ficou mais de 30s");
    }

    if (maxDuration >= 120 || totalSectionTime >= 120) {
      score += 3;
      reasons.add("ficou mais de 2min");
    }

    if (hasSection(/servicos|serviços/i)) {
      score += 2;
      reasons.add("viu serviços");
    }

    if (hasSection(/cases|projetos|produção|producao/i)) {
      score += 3;
      reasons.add("viu projetos");
    }

    if (hasClickIntent("project") || hasEvent("project_interest")) {
      score += 3;
      reasons.add("clicou em projeto");
    }

    if (hasClickIntent("whatsapp")) {
      score += 6;
      reasons.add("clicou no WhatsApp");
    }

    if (hasClickIntent("email") || hasClickIntent("contact")) {
      score += 5;
      reasons.add("clicou em contato");
    }

    if (maxScroll >= 75) {
      score += 2;
      reasons.add("rolou mais de 75%");
    }

    if (hasEvent("returning_visitor")) {
      score += 2;
      reasons.add("visitante recorrente");
    }

    if (hasEvent("bot_suspected")) {
      score -= 3;
      reasons.add("possível bot filtrado");
    }

    return {
      score: Math.max(0, score),
      level:
        score >= CONFIG.hotLeadScore ? "quente" :
        score >= CONFIG.warmLeadScore ? "morno" :
        "frio",
      reasons: Array.from(reasons)
    };
  };

  const getFunnelData = (events) => {
    const sessions = groupBySession(events);
    const stageSessions = {
      entered: new Set(),
      services: new Set(),
      projects: new Set(),
      contact: new Set()
    };

    sessions.forEach(({ sessionId, events: sessionEvents }) => {
      if (sessionEvents.some((event) => event.event_type === "session_start" || event.metadata?.step === "entered")) {
        stageSessions.entered.add(sessionId);
      }

      if (sessionEvents.some((event) => /servicos|serviços/i.test(event.section_id || "") || event.metadata?.step === "view_services")) {
        stageSessions.services.add(sessionId);
      }

      if (sessionEvents.some((event) => /cases|projetos|produção|producao/i.test(event.section_id || "") || event.metadata?.step === "view_projects")) {
        stageSessions.projects.add(sessionId);
      }

      if (sessionEvents.some((event) => event.metadata?.step === "click_contact" || ["whatsapp", "email", "contact"].includes(event.metadata?.intent))) {
        stageSessions.contact.add(sessionId);
      }
    });

    return [
      { key: "entered", label: "Entrou no site", count: stageSessions.entered.size },
      { key: "services", label: "Viu serviços", count: stageSessions.services.size },
      { key: "projects", label: "Viu projetos", count: stageSessions.projects.size },
      { key: "contact", label: "Clicou em contato", count: stageSessions.contact.size }
    ];
  };

  const getRetentionData = (events) => {
    const timeBySection = {};

    events.forEach((event) => {
      const section = safeText(event.section_id || "top", 80);

      if (event.event_type === "section_time") {
        timeBySection[section] = (timeBySection[section] || 0) + Number(event.duration_seconds || 0);
      }
    });

    return {
      timeBySection
    };
  };

  const getAlertFromEvent = (event, sessionEvents = []) => {
    const city = event.metadata?.geo?.cityRegion || "Cidade não identificada";
    const device = `${event.device_type || "--"} · ${event.device_os || "--"}`;

    if (event.event_type === "session_start") {
      if (event.metadata?.is_returning) {
        return {
          type: "returning",
          title: "+ Visitante recorrente voltou ao site",
          description: `${createShortVisitorId(event.visitor_id)} · ${city} · ${device}`
        };
      }

      return {
        type: "entry",
        title: "+ Pessoa acabou de entrar no site",
        description: `${createShortVisitorId(event.visitor_id)} · ${city} · ${device}`
      };
    }

    if (event.event_type === "click" && event.metadata?.intent === "whatsapp") {
      return {
        type: "whatsapp",
        title: "+ Pessoa clicou no WhatsApp",
        description: `${createShortVisitorId(event.visitor_id)} · ${event.element_label || "WhatsApp"} · ${city}`
      };
    }

    if (event.event_type === "click" && ["email", "contact"].includes(event.metadata?.intent)) {
      return {
        type: "contact",
        title: "+ Pessoa demonstrou intenção de contato",
        description: `${createShortVisitorId(event.visitor_id)} · ${event.element_label || "Contato"} · ${city}`
      };
    }

    if (event.event_type === "project_interest") {
      return {
        type: "project",
        title: "+ Pessoa clicou em um projeto",
        description: `${createShortVisitorId(event.visitor_id)} · ${event.element_label || "Projeto"} · ${city}`
      };
    }

    if (event.event_type === "section_view" && /cases|projetos|produção|producao/i.test(event.section_id || "")) {
      return {
        type: "projects_view",
        title: "+ Pessoa visualizou projetos",
        description: `${createShortVisitorId(event.visitor_id)} · ${event.section_id} · ${city}`
      };
    }

    if (event.event_type === "heartbeat" && Number(event.duration_seconds || 0) >= CONFIG.longSessionAlertSeconds) {
      return {
        type: "long_session",
        title: "+ Pessoa ficou mais de 2 minutos no site",
        description: `${createShortVisitorId(event.visitor_id)} · ${formatDuration(event.duration_seconds)} · ${city}`
      };
    }

    if (event.event_type === "site_error" || event.event_type === "image_error" || event.event_type === "broken_link") {
      return {
        type: "technical",
        title: "Problema técnico detectado",
        description: `${getEventTitle(event)} · ${event.page_path || "/"}`
      };
    }

    if (event.event_type === "rage_click") {
      return {
        type: "ux",
        title: "Possível problema de UX",
        description: `Cliques repetidos em ${event.element_label || event.element_selector || "elemento"}`
      };
    }

    if (sessionEvents.length) {
      const lead = getLeadScoreForSession(sessionEvents);

      if (lead.score >= CONFIG.hotLeadScore) {
        return {
          type: "hot_lead",
          title: "+ Possível lead quente detectado",
          description: `${createShortVisitorId(event.visitor_id)} · ${lead.score} pts · ${lead.reasons.join(", ")}`
        };
      }
    }

    return null;
  };

  const getAlertPriority = (alert) => {
    if (!alert) return 0;

    const high = ["whatsapp", "contact", "hot_lead"];
    const medium = ["returning", "project", "projects_view", "long_session", "technical", "ux"];

    if (high.includes(alert.type)) return 3;
    if (medium.includes(alert.type)) return 2;

    return 1;
  };

  const getAlertPriorityLabel = (priority) => {
    if (priority >= 3) return "alta";
    if (priority === 2) return "média";
    return "baixa";
  };

  const renderAlerts = (events) => {
    const sessions = groupBySession(events);
    const sessionMap = new Map(sessions.map((item) => [item.sessionId, item.events]));

    const alerts = [];

    events.forEach((event) => {
      const alert = getAlertFromEvent(event, sessionMap.get(event.session_id) || []);

      if (alert) {
        const priority = getAlertPriority(alert);

        alerts.push({
          ...alert,
          priority,
          created_at: event.created_at
        });
      }
    });

    if (!alerts.length) {
      return `
        <div class="analytics-row">
          <strong>Nenhum alerta inteligente ainda</strong>
          <span>Alertas aparecem quando há WhatsApp, retorno, lead quente, erro ou possível problema de UX.</span>
        </div>
      `;
    }

    const unique = [];
    const seen = new Set();

    alerts
      .sort((a, b) => {
        if (b.priority !== a.priority) return b.priority - a.priority;
        return new Date(b.created_at) - new Date(a.created_at);
      })
      .forEach((alert) => {
        const key = `${alert.type}_${alert.title}_${alert.description}_${alert.created_at}`;

        if (seen.has(key)) return;

        seen.add(key);
        unique.push(alert);
      });

    return unique.slice(0, CONFIG.maxAlerts).map((alert) => `
      <div class="analytics-row">
        <div class="analytics-row-main">
          <div>
            <strong>${safeText(alert.title, 100)}</strong>
            <span>${safeText(alert.description, 180)}</span>
          </div>

          <span class="analytics-badge analytics-priority-${getAlertPriorityLabel(alert.priority)}">
            ${getAlertPriorityLabel(alert.priority)}
          </span>
        </div>

        <code>${formatTime(alert.created_at, true)}</code>
      </div>
    `).join("");
  };

  const renderBarList = (map, options = {}) => {
    const limit = options.limit || 10;
    const emptyText = options.emptyText || "Sem dados suficientes ainda.";
    const formatter = options.formatter || ((name) => ({ title: name, subtitle: "" }));
    const valueFormatter = options.valueFormatter || ((value) => `${value}`);

    const entries = Object.entries(map || {})
      .filter(([name]) => name && name !== "Não identificado")
      .sort((a, b) => Number(b[1]) - Number(a[1]))
      .slice(0, limit);

    const total = Math.max(1, Object.values(map || {}).reduce((sum, value) => sum + Number(value || 0), 0));

    if (!entries.length) {
      return `
        <div class="analytics-row">
          <strong>${safeText(emptyText)}</strong>
          <span>Aguarde novos cliques no site.</span>
        </div>
      `;
    }

    return entries.map(([name, value], index) => {
      const percent = (Number(value) / total) * 100;
      const width = Math.max(4, Math.min(100, percent));
      const formatted = formatter(name, value, percent);

      return `
        <div class="analytics-bar-row">
          <div class="analytics-bar-top">
            <span class="analytics-pos">${String(index + 1).padStart(2, "0")}</span>

            <span class="analytics-bar-info">
              <strong>${safeText(formatted.title, 100)}</strong>
              <small>${safeText(formatted.subtitle || valueFormatter(value), 120)}</small>
            </span>

            <span class="analytics-percent">
              ${percent.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%
            </span>
          </div>

          <div class="analytics-bar-track">
            <span style="width:${width}%"></span>
          </div>
        </div>
      `;
    }).join("");
  };

  const renderFunnel = (funnelData) => {
    const base = Math.max(1, funnelData[0]?.count || 0);

    return `
      <div class="analytics-funnel">
        ${funnelData.map((step) => {
          const percent = (step.count / base) * 100;
          const width = Math.max(4, Math.min(100, percent));

          return `
            <div class="analytics-funnel-step">
              <div class="analytics-funnel-top">
                <span>${safeText(step.label)}</span>
                <strong>${step.count} · ${percent.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%</strong>
              </div>

              <div class="analytics-bar-track">
                <span style="width:${width}%"></span>
              </div>
            </div>
          `;
        }).join("")}
      </div>
    `;
  };

  const renderJourneys = (sessions) => {
    state.expandedSessions ||= new Set();

    if (!sessions.length) {
      return `
        <div class="analytics-row">
          <strong>Nenhuma jornada ainda</strong>
          <span>Quando visitantes navegarem, as linhas do tempo aparecerão aqui.</span>
        </div>
      `;
    }

    return sessions.slice(0, CONFIG.maxJourneySessions).map(({ sessionId, events }) => {
      const first = events[0] || {};
      const last = events[events.length - 1] || {};
      const lead = getLeadScoreForSession(events);
      const clicks = getSessionClicks(events);
      const sections = getSessionSections(events);
      const lastAction = getLastImportantAction(events);
      const duration = getSessionDuration(events);
      const visitorName = createShortVisitorId(first.visitor_id || sessionId);
      const city = first.metadata?.geo?.cityRegion || getCityFromSession(events) || "Cidade não identificada";
      const os = first.device_os || "--";
      const browser = first.browser || "--";
      const device = first.device_type || "--";
      const isOpen = state.expandedSessions.has(sessionId);

      return `
        <details class="analytics-journey-details" data-journey-id="${safeText(sessionId, 120)}" ${isOpen ? "open" : ""}>
          <summary class="analytics-journey-summary">
            <div class="analytics-journey-summary-main">
              <div>
                <strong>${safeText(visitorName)}</strong>
                <span>${safeText(device)} · ${safeText(os)} · ${safeText(browser)} · ${safeText(city)}</span>
                <span>${clicks.length} clique${clicks.length === 1 ? "" : "s"} · ${sections.size} seção${sections.size === 1 ? "" : "ões"} · ${formatDuration(duration)}</span>
                <code>${formatTime(first.created_at)} até ${formatTime(last.created_at)}</code>
              </div>

              <span class="analytics-badge">${lead.score} pts · ${lead.level}</span>
            </div>

            <div class="analytics-journey-last-action">
              <b>Última ação importante</b>
              <span>
                ${safeText(lastAction.title, 90)}
                ${lastAction.detail ? ` · ${safeText(lastAction.detail, 70)}` : ""}
                ${lastAction.time ? ` · ${formatTime(lastAction.time, true)}` : ""}
              </span>
            </div>
          </summary>

          <div class="analytics-journey-body">
            <div class="analytics-journey-reasons">
              <strong>Motivos do lead score</strong>
              <span>${lead.reasons.length ? safeText(lead.reasons.join(", "), 220) : "Sem sinais fortes ainda."}</span>
            </div>

            <div class="analytics-timeline">
              ${events
                .filter((event) => !["heartbeat", "tab_visible", "tab_hidden"].includes(event.event_type))
                .slice(0, 22)
                .map((event) => `
                  <div class="analytics-timeline-item">
                    ${formatTime(event.created_at, true)} — ${safeText(getEventTitle(event), 80)}
                    ${event.section_id ? ` · ${safeText(event.section_id, 50)}` : ""}
                    ${event.element_label ? ` · ${safeText(event.element_label, 70)}` : ""}
                  </div>
                `).join("")}
            </div>
          </div>
        </details>
      `;
    }).join("");
  };

  const bindJourneyExpansion = () => {
    state.expandedSessions ||= new Set();

    $$(".analytics-journey-details").forEach((details) => {
      if (details.dataset.bound === "true") return;

      details.dataset.bound = "true";

      details.addEventListener("toggle", () => {
        const sessionId = details.dataset.journeyId;

        if (!sessionId) return;

        if (details.open) {
          state.expandedSessions.add(sessionId);
        } else {
          state.expandedSessions.delete(sessionId);
        }
      });
    });
  };

  const bindDashboardControls = () => {
    $$("[data-analytics-period]").forEach((button) => {
      const period = button.dataset.analyticsPeriod;

      button.classList.toggle("active", period === state.dashboardPeriod);

      if (button.dataset.bound === "true") return;

      button.dataset.bound = "true";

      button.addEventListener("click", () => {
        state.dashboardPeriod = period || "today";
        localStorage.setItem(CONFIG.dashboardPeriodKey, state.dashboardPeriod);

        $$("[data-analytics-period]").forEach((item) => {
          item.classList.toggle("active", item.dataset.analyticsPeriod === state.dashboardPeriod);
        });

        renderDashboard(state.eventsCache);
      });
    });
  };

  const renderExecutiveSummary = ({ events, activeSessions, sessions, clicks, hotLeads }) => {
    const origins = getSessionStats(events, (sessionEvents, main) => getFriendlyOriginFromEvent(main));
    const devices = getSessionStats(events, (sessionEvents, main) => main.device_type || "");
    const cities = getSessionStats(events, (sessionEvents) => getCityFromSession(sessionEvents));

    const topOrigin = Object.values(origins).sort((a, b) => b.sessions - a.sessions)[0];
    const topDevice = Object.values(devices).sort((a, b) => b.clicks - a.clicks || b.sessions - a.sessions)[0];
    const topCity = Object.values(cities).sort((a, b) => b.sessions - a.sessions)[0];

    return `
      <article class="analytics-summary-card">
        <span>${safeText(getPeriodLabel())}</span>
        <strong>${sessions.length} sessões · ${clicks.length} cliques</strong>
        <small>${activeSessions.length} ativo(s) agora · ${hotLeads.length} lead(s) quente(s)</small>
      </article>

      <article class="analytics-summary-card">
        <span>Principal origem</span>
        <strong>${safeText(topOrigin?.label || "Sem origem ainda")}</strong>
        <small>${topOrigin ? `${topOrigin.sessions} sessões · ${topOrigin.clicks} cliques` : "Aguardando dados reais"}</small>
      </article>

      <article class="analytics-summary-card">
        <span>Principal dispositivo</span>
        <strong>${safeText(topDevice?.label || "Sem dispositivo ainda")}</strong>
        <small>${topDevice ? `${topDevice.sessions} sessões · ${topDevice.clicks} cliques` : "Aguardando cliques"}</small>
      </article>

      <article class="analytics-summary-card">
        <span>Localização destaque</span>
        <strong>${safeText(topCity?.label || "Sem cidade/UF ainda")}</strong>
        <small>${topCity ? `${topCity.visitorsCount} visitante(s) · ${topCity.sessions} sessões` : "Aguardando sessões com cidade"}</small>
      </article>
    `;
  };

  const ensureDashboard = () => {
    const analyticsTab =
      $("#admin-tab-analytics") ||
      $("#analytics-panel") ||
      $("[data-admin-tab='analytics']");

    if (!analyticsTab) return null;

    let dashboard = $("#analytics-complete-dashboard");

    if (dashboard) return dashboard;

    dashboard = document.createElement("section");
    dashboard.id = "analytics-complete-dashboard";
    dashboard.className = "analytics-complete-dashboard";
    dashboard.innerHTML = `
      <div class="analytics-clean-header">
        <div>
          <span class="analytics-kicker">/ analytics_complete</span>
          <h3>Analytics completo e limpo</h3>
          <p>Leitura baseada em sessões, cliques reais, origem, localização, jornadas, UX, performance e lead score anônimo.</p>
        </div>

        <div class="analytics-header-actions">
          <div class="analytics-period-filter" aria-label="Filtro de período">
            <button type="button" data-analytics-period="today">Hoje</button>
            <button type="button" data-analytics-period="7d">7 dias</button>
            <button type="button" data-analytics-period="30d">30 dias</button>
            <button type="button" data-analytics-period="all">Tudo</button>
          </div>

          <span id="analytics-sync-label" class="analytics-clean-sync">Sincronizando...</span>
        </div>
      </div>

      <div id="panel-executive-summary" class="analytics-summary-grid"></div>

      <div class="analytics-metric-grid">
        <div class="analytics-metric-card">
          <span>Visitantes</span>
          <strong id="metric-visitors">--</strong>
        </div>

        <div class="analytics-metric-card">
          <span>Ativos agora</span>
          <strong id="metric-active">--</strong>
        </div>

        <div class="analytics-metric-card">
          <span>Sessões</span>
          <strong id="metric-sessions">--</strong>
        </div>

        <div class="analytics-metric-card">
          <span>Cliques</span>
          <strong id="metric-clicks">--</strong>
        </div>

        <div class="analytics-metric-card">
          <span>Leads quentes</span>
          <strong id="metric-hot-leads">--</strong>
        </div>

        <div class="analytics-metric-card">
          <span>Erros/UX</span>
          <strong id="metric-issues">--</strong>
        </div>
      </div>

      <div class="analytics-section-grid">
        <article class="analytics-panel-card">
          <div class="analytics-panel-title">
            <strong>Funil de conversão</strong>
            <small>entrada → serviços → projetos → contato</small>
          </div>
          <div id="panel-funnel"></div>
        </article>

        <article class="analytics-panel-card">
          <div class="analytics-panel-title">
            <strong>Top 10 cidades / UF</strong>
            <small>sessões, visitantes e cliques</small>
          </div>
          <div id="panel-cities" class="analytics-bar-list"></div>
        </article>
      </div>

      <div class="analytics-section-grid">
        <article class="analytics-panel-card">
          <div class="analytics-panel-title">
            <strong>Sessões ativas</strong>
            <small>tempo real</small>
          </div>
          <div id="panel-active-sessions" class="analytics-list"></div>
        </article>

        <article class="analytics-panel-card">
          <div class="analytics-panel-title">
            <strong>Alertas inteligentes</strong>
            <small>prioridade alta, média e baixa</small>
          </div>
          <div id="panel-alerts" class="analytics-list"></div>
        </article>
      </div>

      <div class="analytics-section-grid">
        <article class="analytics-panel-card">
          <div class="analytics-panel-title">
            <strong>Jornada individual</strong>
            <small>clique para expandir</small>
          </div>
          <div id="panel-journeys" class="analytics-list"></div>
        </article>

        <article class="analytics-panel-card">
          <div class="analytics-panel-title">
            <strong>Histórico de cliques</strong>
            <small>interações reais recentes</small>
          </div>
          <div id="panel-events" class="analytics-list"></div>
        </article>
      </div>

      <div class="analytics-section-grid">
        <article class="analytics-panel-card">
          <div class="analytics-panel-title">
            <strong>Mapa de cliques</strong>
            <small>elementos mais clicados</small>
          </div>
          <div id="panel-click-map" class="analytics-bar-list"></div>
        </article>

        <article class="analytics-panel-card">
          <div class="analytics-panel-title">
            <strong>Problemas de UX</strong>
            <small>cliques sem ação, repetidos e links reais</small>
          </div>
          <div id="panel-ux" class="analytics-list"></div>
        </article>
      </div>

      <div class="analytics-section-grid">
        <article class="analytics-panel-card">
          <div class="analytics-panel-title">
            <strong>Retenção e simultâneos</strong>
            <small>tempo por seção e pico online</small>
          </div>
          <div id="panel-retention" class="analytics-list"></div>
        </article>

        <article class="analytics-panel-card">
          <div class="analytics-panel-title">
            <strong>Dia e horário</strong>
            <small>visitas e cliques</small>
          </div>
          <div id="panel-day-hour" class="analytics-list"></div>
        </article>
      </div>

      <div class="analytics-section-grid">
        <article class="analytics-panel-card">
          <div class="analytics-panel-title">
            <strong>Mobile vs Desktop</strong>
            <small>cliques, sessões e visitantes</small>
          </div>
          <div id="panel-devices" class="analytics-bar-list"></div>
        </article>

        <article class="analytics-panel-card">
          <div class="analytics-panel-title">
            <strong>Sistemas operacionais</strong>
            <small>cliques, sessões e visitantes</small>
          </div>
          <div id="panel-os" class="analytics-bar-list"></div>
        </article>
      </div>

      <div class="analytics-section-grid">
        <article class="analytics-panel-card">
          <div class="analytics-panel-title">
            <strong>Origem do acesso</strong>
            <small>direto, social, campanha e tráfego interno</small>
          </div>
          <div id="panel-origins" class="analytics-bar-list"></div>
        </article>

        <article class="analytics-panel-card">
          <div class="analytics-panel-title">
            <strong>Erros e performance</strong>
            <small>falhas técnicas filtradas</small>
          </div>
          <div id="panel-technical" class="analytics-list"></div>
        </article>
      </div>

      <div class="analytics-section-grid">
        <article class="analytics-panel-card">
          <div class="analytics-panel-title">
            <strong>Visitantes novos/recorrentes</strong>
            <small>sessões reais</small>
          </div>
          <div id="panel-visitor-type" class="analytics-bar-list"></div>
        </article>

        <article class="analytics-panel-card">
          <div class="analytics-panel-title">
            <strong>Bots ou acessos suspeitos</strong>
            <small>limpeza de métricas</small>
          </div>
          <div id="panel-bots" class="analytics-list"></div>
        </article>
      </div>
    `;

    analyticsTab.prepend(dashboard);

    bindDashboardControls();

    return dashboard;
  };

  const renderDashboard = (events) => {
    const dashboard = ensureDashboard();
    if (!dashboard) return;

    bindDashboardControls();

    const cleanEvents = getFilteredDashboardEvents(events || []);
    const sessions = groupBySession(cleanEvents);
    const activeSessions = getActiveSessions(events || []);
    const visitors = new Set(cleanEvents.map((event) => event.visitor_id).filter(Boolean));
    const clicks = cleanEvents.filter(isRealClickEvent);
    const issues = cleanEvents.filter(isIssueEvent);
    const hotLeads = sessions.filter((session) => getLeadScoreForSession(session.events).score >= CONFIG.hotLeadScore);

    const cityStats = getSessionStats(cleanEvents, (sessionEvents) => getCityFromSession(sessionEvents));
    const clickMap = countBy(clicks, (event) => event.element_label || event.element_selector || "Clique");
    const deviceStats = getSessionStats(cleanEvents, (sessionEvents, main) => main.device_type || "");
    const osStats = getSessionStats(cleanEvents, (sessionEvents, main) => main.device_os || "");
    const originStats = getSessionStats(cleanEvents, (sessionEvents, main) => getFriendlyOriginFromEvent(main));
    const visitorTypeStats = getSessionStats(
      cleanEvents.filter((event) => event.event_type === "session_start"),
      (sessionEvents, main) => main.metadata?.visitor_type || "novo"
    );

    const retention = getRetentionData(cleanEvents);
    const concurrency = getMaxConcurrentUsers(cleanEvents);
    const dayHour = getDayHourData(cleanEvents);
    const funnel = getFunnelData(cleanEvents);
    const bots = cleanEvents.filter((event) => event.event_type === "bot_suspected" || event.metadata?.bot?.suspected);

    $("#metric-visitors").textContent = String(visitors.size);
    $("#metric-active").textContent = String(activeSessions.length);
    $("#metric-sessions").textContent = String(sessions.length);
    $("#metric-clicks").textContent = String(clicks.length);
    $("#metric-hot-leads").textContent = String(hotLeads.length);
    $("#metric-issues").textContent = String(issues.length);
    $("#analytics-sync-label").textContent = `Atualizado: ${formatTime(nowIso(), true)} · ${getPeriodLabel()}`;

    $("#panel-executive-summary").innerHTML = renderExecutiveSummary({
      events: cleanEvents,
      activeSessions,
      sessions,
      clicks,
      hotLeads
    });

    $("#panel-funnel").innerHTML = renderFunnel(funnel);

    $("#panel-cities").innerHTML = renderStatsList(cityStats, {
      limit: 10,
      emptyText: "Sem cidades/UF ainda",
      formatter: (item) => {
        const [city, uf] = safeText(item.label).split("/").map((part) => part.trim());

        return {
          title: city || item.label,
          subtitle: `${uf ? `UF: ${uf}` : "UF não identificada"} · ${item.sessions} sessão${item.sessions === 1 ? "" : "ões"} · ${item.visitorsCount} visitante${item.visitorsCount === 1 ? "" : "s"} · ${item.clicks} clique${item.clicks === 1 ? "" : "s"}`
        };
      }
    });

    $("#panel-active-sessions").innerHTML = activeSessions.slice(0, 12).map((event) => `
      <div class="analytics-row">
        <div class="analytics-row-main">
          <div>
            <strong>${safeText(createShortVisitorId(event.visitor_id || event.session_id))}</strong>
            <span>${safeText(event.device_type || "--")} · ${safeText(event.device_os || "--")} · ${safeText(event.browser || "--")}</span>
            <span>${safeText(event.section_id || "top")} · ${safeText(event.metadata?.geo?.cityRegion || "Cidade não identificada")}</span>
          </div>
          <span class="analytics-badge">${formatTime(event.created_at, true)}</span>
        </div>
      </div>
    `).join("") || `
      <div class="analytics-row">
        <strong>Nenhuma sessão ativa agora</strong>
        <span>Quando alguém entrar, aparecerá aqui em tempo real.</span>
      </div>
    `;

    $("#panel-alerts").innerHTML = renderAlerts(cleanEvents);

    $("#panel-journeys").innerHTML = renderJourneys(sessions);
    bindJourneyExpansion();

    $("#panel-events").innerHTML = clicks.slice(0, CONFIG.maxRecentEvents).map((event) => `
      <div class="analytics-row">
        <div class="analytics-row-main">
          <div>
            <strong>${safeText(event.element_label || "Clique registrado", 90)}</strong>
            <span>${safeText(event.section_id || "top", 70)} · ${safeText(event.metadata?.intent || "interação", 70)}</span>
          </div>
          <span class="analytics-badge">${formatTime(event.created_at, true)}</span>
        </div>
        <code>${safeText(createShortVisitorId(event.visitor_id || event.session_id), 90)} · ${safeText(event.device_os || "--", 30)} · ${safeText(event.browser || "--", 30)}</code>
      </div>
    `).join("") || `
      <div class="analytics-row">
        <strong>Nenhum clique ainda</strong>
        <span>Cliques em botões, links, projetos, CTAs e contatos aparecerão aqui.</span>
      </div>
    `;

    $("#panel-click-map").innerHTML = renderBarList(clickMap, {
      limit: CONFIG.maxClickMapItems,
      emptyText: "Nenhum clique registrado ainda",
      formatter: (name, value) => ({
        title: name,
        subtitle: `${value} clique${value === 1 ? "" : "s"}`
      })
    });

    $("#panel-ux").innerHTML = issues.slice(0, 16).map((event) => `
      <div class="analytics-row">
        <strong>${safeText(getEventTitle(event), 90)}</strong>
        <span>${safeText(event.element_label || event.metadata?.message || event.metadata?.src || event.element_href || "Diagnóstico registrado", 130)}</span>
        <code>${formatTime(event.created_at, true)} · ${safeText(event.section_id || "top", 60)}</code>
      </div>
    `).join("") || `
      <div class="analytics-row">
        <strong>Nenhum problema detectado</strong>
        <span>Cliques sem ação, cliques repetidos, links quebrados e imagens quebradas aparecerão aqui.</span>
      </div>
    `;

    $("#panel-retention").innerHTML = `
      <div class="analytics-row">
        <strong>Maior retenção</strong>
        <span>${safeText(topEntry(retention.timeBySection, "--"))} · ${formatDuration(retention.timeBySection[topEntry(retention.timeBySection, "")] || 0)}</span>
      </div>

      <div class="analytics-row">
        <strong>Maior número de usuários simultâneos</strong>
        <span>${concurrency.count} pessoa${concurrency.count === 1 ? "" : "s"} online ao mesmo tempo${concurrency.at ? ` · pico em ${formatTime(concurrency.at, true)}` : ""}</span>
      </div>

      <div class="analytics-row">
        <strong>Top seções por tempo</strong>
        <span>${Object.entries(retention.timeBySection).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([section, seconds]) => `${section}: ${formatDuration(seconds)}`).join(" · ") || "Sem dados ainda"}</span>
      </div>
    `;

    $("#panel-day-hour").innerHTML = renderDayHourPanel(dayHour);

    $("#panel-devices").innerHTML = renderStatsList(deviceStats, {
      limit: 6,
      emptyText: "Sem dispositivos ainda",
      formatter: (item) => ({
        title: item.label,
        subtitle: `${item.clicks} clique${item.clicks === 1 ? "" : "s"} · ${item.sessions} sessão${item.sessions === 1 ? "" : "ões"} · ${item.visitorsCount} visitante${item.visitorsCount === 1 ? "" : "s"}`
      })
    });

    $("#panel-os").innerHTML = renderStatsList(osStats, {
      limit: 8,
      emptyText: "Sem sistemas ainda",
      formatter: (item) => ({
        title: item.label,
        subtitle: `${item.clicks} clique${item.clicks === 1 ? "" : "s"} · ${item.sessions} sessão${item.sessions === 1 ? "" : "ões"} · ${item.visitorsCount} visitante${item.visitorsCount === 1 ? "" : "s"}`
      })
    });

    $("#panel-origins").innerHTML = renderStatsList(originStats, {
      limit: 10,
      emptyText: "Sem origem ainda",
      formatter: (item) => ({
        title: item.label,
        subtitle: `${item.sessions} sessão${item.sessions === 1 ? "" : "ões"} · ${item.clicks} clique${item.clicks === 1 ? "" : "s"} · ${getOriginExplanation(item.label)}`
      })
    });

    $("#panel-technical").innerHTML = cleanEvents
      .filter((event) => ["performance", "site_error", "image_error", "resource_error", "broken_link"].includes(event.event_type))
      .slice(0, 14)
      .map((event) => `
        <div class="analytics-row">
          <strong>${safeText(getEventTitle(event), 90)}</strong>
          <span>
            ${event.event_type === "performance"
              ? `Load: ${event.metadata?.loadTimeMs || 0}ms · ${event.metadata?.status || "--"}`
              : safeText(event.metadata?.message || event.metadata?.src || event.element_href || "Falha registrada", 140)
            }
          </span>
          <code>${formatTime(event.created_at, true)}</code>
        </div>
      `).join("") || `
        <div class="analytics-row">
          <strong>Nenhum erro técnico</strong>
          <span>Performance, imagens, links e erros JS aparecerão aqui.</span>
        </div>
      `;

    $("#panel-visitor-type").innerHTML = renderStatsList(visitorTypeStats, {
      limit: 4,
      emptyText: "Sem visitantes classificados ainda",
      formatter: (item) => ({
        title: item.label === "novo" ? "Novos visitantes" : "Visitantes recorrentes",
        subtitle: `${item.sessions} sessão${item.sessions === 1 ? "" : "ões"} · ${item.clicks} clique${item.clicks === 1 ? "" : "s"}`
      })
    });

    $("#panel-bots").innerHTML = bots.slice(0, 12).map((event) => `
      <div class="analytics-row">
        <strong>Possível acesso automatizado</strong>
        <span>${safeText((event.metadata?.bot?.reasons || event.metadata?.reasons || []).join(", ") || "Sinal suspeito", 150)}</span>
        <code>${safeText(createShortVisitorId(event.visitor_id || event.session_id), 90)} · ${formatTime(event.created_at, true)}</code>
      </div>
    `).join("") || `
      <div class="analytics-row">
        <strong>Nenhum bot detectado</strong>
        <span>Acessos suspeitos serão separados aqui.</span>
      </div>
    `;
  };

  async function loadDashboard() {
    const client = getClient();
    if (!client) return;

    const { data, error } = await client
      .from(CONFIG.table)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(CONFIG.dashboardLimit);

    if (error) {
      console.warn("[Analytics Complete] Dashboard indisponível:", error.message);
      return;
    }

    state.eventsCache = data || [];
    renderDashboard(state.eventsCache);
  }

  const startRealtimeDashboard = () => {
    const client = getClient();

    if (!client || state.realtimeChannel) return;

    state.realtimeChannel = client
      .channel("mpaiva-analytics-complete-admin-only")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: CONFIG.table
        },
        (payload) => {
          state.eventsCache = [payload.new, ...state.eventsCache].slice(0, CONFIG.dashboardLimit);
          renderDashboard(state.eventsCache);
        }
      )
      .subscribe((status) => {
        const label = $("#analytics-sync-label");

        if (label) {
          label.textContent = `Realtime: ${status} · ${getPeriodLabel()}`;
        }
      });
  };

  const startAdminDashboard = () => {
    if (state.adminStarted) return;

    const check = async () => {
      const client = getClient();
      if (!client) return;

      const { data } = await client.auth.getSession();
      const logged = Boolean(data?.session?.user);

      if (!logged) return;

      markAdminTrackingDisabled();

      state.adminStarted = true;

      ensureDashboard();
      loadDashboard();
      startRealtimeDashboard();

      window.clearInterval(state.adminCheckTimer);

      state.dashboardTimer = window.setInterval(loadDashboard, CONFIG.dashboardRefreshMs);
    };

    state.adminCheckTimer = window.setInterval(check, 2500);
    check();

    const observer = new MutationObserver(() => {
      if (state.adminStarted) {
        ensureDashboard();
        bindDashboardControls();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  };

  const boot = () => {
    injectStyles();
    showPrivacyFooterLink();

    state.visitorId = getOrCreateVisitorId();

    if (!shouldDisableAnalyticsInLocal() && canTrack() && !shouldIgnoreTrackingForAdmin()) {
      startAnalytics();
    } else if (shouldDisableAnalyticsInLocal()) {
      console.info("[Analytics Complete] Coleta desativada em ambiente local para evitar poluir o painel.");
    }

    startAdminDashboard();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();