/**
 * @file dom-scanner.mjs
 * @description Accessibility scanner core.
 * Responsible for crawling the target website, discovering routes,
 * and performing the automated axe-core analysis on identified pages
 * using Playwright for browser orchestration.
 */

import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import pa11y from "pa11y";
import { log, DEFAULTS, writeJson, getInternalPath } from "../core/utils.mjs";
import { ASSET_PATHS, loadAssetJson } from "../core/asset-loader.mjs";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CRAWLER_CONFIG = loadAssetJson(
  ASSET_PATHS.discovery.crawlerConfig,
  "assets/discovery/crawler-config.json",
);
const STACK_DETECTION = loadAssetJson(
  ASSET_PATHS.discovery.stackDetection,
  "assets/discovery/stack-detection.json",
);
const WCAG_REFERENCE = loadAssetJson(
  ASSET_PATHS.reporting.wcagReference,
  "assets/reporting/wcag-reference.json",
);
const AXE_TAGS = [
  "wcag2a",
  "wcag2aa",
  "wcag21a",
  "wcag21aa",
  "wcag22a",
  "wcag22aa",
];

/**
 * Prints the CLI usage instructions and available options to the console.
 */
function printUsage() {
  log.info(`Usage:
  node scripts/engine/dom-scanner.mjs --base-url <url> [options]

Options:
  --routes <csv|newline>      Optional route list (same-origin paths/urls)
  --output <path>             Output JSON path (default: internal)
  --max-routes <number>       Max routes to analyze (default: 10)
  --wait-ms <number>          Time to wait after load (default: 2000)
  --timeout-ms <number>       Request timeout (default: 30000)
  --headless <boolean>        Run headless (default: true)
  --color-scheme <value>      Emulate color scheme: "light" or "dark" (default: "light")
  --screenshots-dir <path>    Directory to save element screenshots (optional)
  --exclude-selectors <csv>   Selectors to exclude from scan
  --only-rule <id>            Only check for this specific rule ID (ignores tags)
  --crawl-depth <number>      How deep to follow links during discovery (1-3, default: 2)
  --wait-until <value>        Page load strategy: domcontentloaded|load|networkidle (default: domcontentloaded)
  --viewport <WxH>            Viewport dimensions as WIDTHxHEIGHT (e.g., 375x812)
  -h, --help                  Show this help
`);
}

/**
 * Parses command-line arguments into a structured configuration object.
 * @param {string[]} argv - Array of command-line arguments (process.argv.slice(2)).
 * @returns {Object} A configuration object for the scanner.
 * @throws {Error} If the required --base-url argument is missing.
 */
function parseArgs(argv) {
  if (argv.includes("--help") || argv.includes("-h")) {
    printUsage();
    process.exit(0);
  }

  const args = {
    baseUrl: "",
    routes: "",
    output: getInternalPath("a11y-scan-results.json"),
    maxRoutes: DEFAULTS.maxRoutes,
    waitMs: DEFAULTS.waitMs,
    timeoutMs: DEFAULTS.timeoutMs,
    headless: DEFAULTS.headless,
    waitUntil: DEFAULTS.waitUntil,
    colorScheme: null,
    screenshotsDir: null,
    excludeSelectors: [],
    onlyRule: null,
    crawlDepth: DEFAULTS.crawlDepth,
    viewport: null,
    axeTags: null,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (!key.startsWith("--")) continue;

    if (key === "--headed") { args.headless = false; continue; }

    const value = argv[i + 1];
    if (value === undefined) continue;

    if (key === "--base-url") args.baseUrl = value;
    if (key === "--routes") args.routes = value;
    if (key === "--output") args.output = value;
    if (key === "--max-routes") args.maxRoutes = Number.parseInt(value, 10);
    if (key === "--wait-ms") args.waitMs = Number.parseInt(value, 10);
    if (key === "--timeout-ms") args.timeoutMs = Number.parseInt(value, 10);
    if (key === "--headless") args.headless = value !== "false";
    if (key === "--only-rule") args.onlyRule = value;
    if (key === "--crawl-depth") args.crawlDepth = Number.parseInt(value, 10);
    if (key === "--wait-until") args.waitUntil = value;
    if (key === "--exclude-selectors")
      args.excludeSelectors = value.split(",").map((s) => s.trim());
    if (key === "--color-scheme") args.colorScheme = value;
    if (key === "--screenshots-dir") args.screenshotsDir = value;
    if (key === "--axe-tags") args.axeTags = value.split(",").map((s) => s.trim());
    if (key === "--viewport") {
      const [w, h] = value.split("x").map(Number);
      if (w && h) args.viewport = { width: w, height: h };
    }
    i += 1;
  }

  args.crawlDepth = Math.min(Math.max(args.crawlDepth, 1), 3);
  if (!args.baseUrl) throw new Error("Missing required --base-url");
  return args;
}

const BLOCKED_EXTENSIONS = new RegExp(
  "\\.(" + CRAWLER_CONFIG.blockedExtensions.join("|") + ")$",
  "i",
);

const PAGINATION_PARAMS = new RegExp(
  "^(" + CRAWLER_CONFIG.paginationParams.join("|") + ")$",
  "i",
);

/**
 * Attempts to discover additional routes by fetching and parsing the sitemap.xml.
 * @param {string} origin - The origin (protocol + domain) of the target site.
 * @returns {Promise<string[]>} A list of discovered route paths/URLs.
 */
async function discoverFromSitemap(origin) {
  try {
    const res = await fetch(`${origin}/sitemap.xml`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return [];
    const xml = await res.text();
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/gi)].map((m) =>
      m[1].trim(),
    );
    const routes = new Set();
    for (const loc of locs) {
      const normalized = normalizePath(loc, origin);
      if (normalized && normalized !== "/") routes.add(normalized);
    }
    return [...routes];
  } catch {
    return [];
  }
}

/**
 * Fetches and parses robots.txt to identify paths disallowed for crawlers.
 * @param {string} origin - The origin of the target site.
 * @returns {Promise<Set<string>>} A set of disallowed path prefixes.
 */
async function fetchDisallowedPaths(origin) {
  const disallowed = new Set();
  try {
    const res = await fetch(`${origin}/robots.txt`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return disallowed;
    const text = await res.text();
    let inUserAgentAll = false;
    for (const raw of text.split("\n")) {
      const line = raw.trim();
      if (/^User-agent:\s*\*/i.test(line)) {
        inUserAgentAll = true;
        continue;
      }
      if (/^User-agent:/i.test(line)) {
        inUserAgentAll = false;
        continue;
      }
      if (inUserAgentAll) {
        const match = line.match(/^Disallow:\s*(.+)/i);
        if (match) {
          const p = match[1].trim();
          if (p) disallowed.add(p);
        }
      }
    }
  } catch {
    // silent — robots.txt is optional
  }
  return disallowed;
}

/**
 * Checks if a specific route path matches any of the disallowed patterns from robots.txt.
 * @param {string} routePath - The path to check.
 * @param {Set<string>} disallowedPaths - Set of disallowed patterns/prefixes.
 * @returns {boolean} True if the path is disallowed, false otherwise.
 */
function isDisallowedPath(routePath, disallowedPaths) {
  for (const rule of disallowedPaths) {
    if (routePath.startsWith(rule)) return true;
  }
  return false;
}

/**
 * Normalizes a URL or path to a relative hashless path if it belongs to the same origin.
 * @param {string} rawValue - The raw URL or path string to normalize.
 * @param {string} origin - The origin of the target site.
 * @returns {string} The normalized relative path, or an empty string if invalid/external.
 */
export function normalizePath(rawValue, origin) {
  if (!rawValue) return "";
  try {
    const u = new URL(rawValue, origin);
    if (u.origin !== origin) return "";
    if (BLOCKED_EXTENSIONS.test(u.pathname)) return "";
    const hashless = `${u.pathname || "/"}${u.search || ""}`;
    return hashless === "" ? "/" : hashless;
  } catch {
    return "";
  }
}

/**
 * Parses the --routes CLI argument (CSV or newline-separated) into a list of normalized paths.
 * @param {string} routesArg - The raw string from the --routes argument.
 * @param {string} origin - The origin of the target site.
 * @returns {string[]} A list of unique, normalized route paths.
 */
export function parseRoutesArg(routesArg, origin) {
  if (!routesArg.trim()) return [];
  const entries = routesArg
    .split(/[,\n]/)
    .map((v) => v.trim())
    .filter(Boolean);

  const uniq = new Set();
  for (const value of entries) {
    const normalized = normalizePath(value, origin);
    if (normalized) uniq.add(normalized);
  }
  return [...uniq];
}

/**
 * Crawls the website to discover additional routes starting from the base URL.
 * @param {import("playwright").Page} page - The Playwright page object.
 * @param {string} baseUrl - The starting URL for discovery.
 * @param {number} maxRoutes - Maximum number of routes to discover.
 * @param {number} crawlDepth - How deep to follow links (1-3).
 * @returns {Promise<string[]>} A list of discovered route paths.
 */
export async function discoverRoutes(page, baseUrl, maxRoutes, crawlDepth = 2) {
  const origin = new URL(baseUrl).origin;
  const routes = new Set(["/"]);
  const seenPathnames = new Set(["/"]);
  const visited = new Set();
  let frontier = ["/"];

  function extractLinks(hrefs) {
    const newRoutes = [];
    for (const href of hrefs) {
      if (routes.size >= maxRoutes) break;
      const normalized = normalizePath(href, origin);
      if (!normalized) continue;
      try {
        const u = new URL(normalized, origin);
        const hasPagination = [...new URLSearchParams(u.search).keys()].some(
          (k) => PAGINATION_PARAMS.test(k),
        );
        if (hasPagination && seenPathnames.has(u.pathname)) continue;
        seenPathnames.add(u.pathname);
      } catch {
        // keep non-parseable normalized paths as-is
      }
      if (!routes.has(normalized)) {
        routes.add(normalized);
        newRoutes.push(normalized);
      }
    }
    return newRoutes;
  }

  for (let depth = 0; depth < crawlDepth && frontier.length > 0; depth++) {
    const nextFrontier = [];

    for (const routePath of frontier) {
      if (routes.size >= maxRoutes) break;
      if (visited.has(routePath)) continue;
      visited.add(routePath);

      try {
        const targetUrl = new URL(routePath, origin).toString();
        if (page.url() !== targetUrl) {
          await page.goto(targetUrl, {
            waitUntil: "domcontentloaded",
            timeout: 10000,
          });
        }

        const hrefs = await page.$$eval("a[href]", (elements) =>
          elements.map((el) => el.getAttribute("href")),
        );
        nextFrontier.push(...extractLinks(hrefs));
      } catch (error) {
        log.warn(`Discovery skip ${routePath}: ${error.message}`);
      }
    }

    frontier = nextFrontier;
    if (routes.size >= maxRoutes) break;
  }

  log.info(
    `Crawl depth ${Math.min(crawlDepth, 3)}: ${routes.size} route(s) discovered (visited ${visited.size} page(s))`,
  );
  return [...routes].slice(0, maxRoutes);
}

/**
 * Detects the web framework and UI libraries by analyzing the live page in the browser.
 * Inspects meta tags, script sources, global JS variables, HTML attributes, and generated markup.
 * Falls back to package.json analysis only when A11Y_PROJECT_DIR is set (GitHub repo provided).
 * @param {import("playwright").Page} page - The Playwright page instance after navigation.
 * @returns {Promise<Object>} An object containing detected framework, uiLibraries, and cms.
 */
async function detectProjectContext(page) {
  const uiLibraries = [];
  let framework = null;
  let cms = null;

  // --- Browser-based detection (always runs) ---
  try {
    const detection = await page.evaluate(() => {
      const result = { framework: null, cms: null, uiLibraries: [] };
      const html = document.documentElement.outerHTML;
      const head = document.head?.innerHTML || "";
      const scripts = [...document.querySelectorAll("script[src]")].map((s) => s.getAttribute("src") || "");
      const links = [...document.querySelectorAll("link[href]")].map((l) => l.getAttribute("href") || "");
      const allSources = [...scripts, ...links].join(" ");
      const meta = (name) => document.querySelector(`meta[name="${name}"]`)?.getAttribute("content") || "";
      const gen = meta("generator");

      // --- CMS Detection ---
      if (gen.toLowerCase().includes("wordpress") || html.includes("wp-content/") || html.includes("wp-includes/")) {
        result.cms = "wordpress";
      } else if (gen.toLowerCase().includes("drupal") || html.includes("drupal.js") || html.includes("/sites/default/")) {
        result.cms = "drupal";
      } else if (html.includes("cdn.shopify.com") || html.includes("Shopify.theme") || typeof window.Shopify !== "undefined") {
        result.cms = "shopify";
      } else if (gen.toLowerCase().includes("wix") || html.includes("wix.com")) {
        result.cms = "wix";
      } else if (gen.toLowerCase().includes("squarespace") || html.includes("squarespace.com")) {
        result.cms = "squarespace";
      } else if (html.includes("webflow.com") || html.includes("data-wf-")) {
        result.cms = "webflow";
      }

      // --- Framework Detection ---
      if (typeof window.__NEXT_DATA__ !== "undefined" || html.includes("/_next/") || allSources.includes("/_next/")) {
        result.framework = "nextjs";
      } else if (typeof window.__NUXT__ !== "undefined" || html.includes("/_nuxt/") || allSources.includes("/_nuxt/")) {
        result.framework = "nuxt";
      } else if (html.includes("___gatsby") || typeof window.___gatsby !== "undefined") {
        result.framework = "gatsby";
      } else if (html.includes("ng-version") || html.includes("ng-app") || html.includes("angular")) {
        result.framework = "angular";
      } else if (html.includes("data-svelte") || html.includes("__svelte")) {
        result.framework = "svelte";
      } else if (html.includes("data-astro-") || allSources.includes("/astro/")) {
        result.framework = "astro";
      } else if (typeof window.__VUE__ !== "undefined" || html.includes("data-v-") || html.includes("__vue_app__")) {
        result.framework = "vue";
      } else if (typeof window.__REACT_DEVTOOLS_GLOBAL_HOOK__ !== "undefined" || html.includes("data-reactroot") || html.includes("_reactRootContainer")) {
        result.framework = "react";
      }

      // --- UI Library Detection ---
      if (html.includes("data-radix") || html.includes("radix-")) result.uiLibraries.push("radix");
      if (html.includes("chakra-") || html.includes("css-") && html.includes("chakra")) result.uiLibraries.push("chakra");
      if (html.includes("MuiBox") || html.includes("MuiButton") || html.includes("mui-")) result.uiLibraries.push("material-ui");
      if (html.includes("ant-") && html.includes("ant-btn")) result.uiLibraries.push("ant-design");
      if (allSources.includes("headlessui")) result.uiLibraries.push("headless-ui");
      if (html.includes("mantine-") || allSources.includes("mantine")) result.uiLibraries.push("mantine");
      if (html.includes("Polaris-") || allSources.includes("polaris")) result.uiLibraries.push("polaris");
      if (html.includes("p-button") && html.includes("p-component")) result.uiLibraries.push("primevue");
      if (html.includes("v-btn") || html.includes("vuetify")) result.uiLibraries.push("vuetify");
      if (html.includes("swiper-") || allSources.includes("swiper")) result.uiLibraries.push("swiper");
      if (allSources.includes("bootstrap") || html.includes("bootstrap")) result.uiLibraries.push("bootstrap");
      if (allSources.includes("tailwindcss") || html.includes("tailwind")) result.uiLibraries.push("tailwind");

      return result;
    });

    framework = detection.framework;
    cms = detection.cms;
    uiLibraries.push(...detection.uiLibraries);
  } catch (err) {
    log.warn(`Browser-based stack detection failed: ${err.message}`);
  }

  // --- package.json fallback (only if GitHub repo was provided) ---
  const projectDir = process.env.A11Y_PROJECT_DIR;
  if (projectDir) {
    try {
      const pkgPath = path.join(projectDir, "package.json");
      if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
        const allDeps = Object.keys({
          ...(pkg.dependencies || {}),
          ...(pkg.devDependencies || {}),
        });

        if (!framework) {
          for (const [dep, fw] of STACK_DETECTION.frameworkPackageDetectors) {
            if (allDeps.some((d) => d === dep || d.startsWith(`${dep}/`))) {
              framework = fw;
              log.info(`Framework override from package.json: ${fw}`);
              break;
            }
          }
        }

        for (const [prefix, name] of STACK_DETECTION.uiLibraryPackageDetectors) {
          if (!uiLibraries.includes(name) && allDeps.some((d) => d === prefix || d.startsWith(`${prefix}/`))) {
            uiLibraries.push(name);
          }
        }
      }
    } catch { /* package.json unreadable */ }

    if (!framework) {
      for (const [fw, files] of STACK_DETECTION.platformStructureDetectors || []) {
        if (files.some((f) => fs.existsSync(path.join(projectDir, f)))) {
          framework = fw;
          log.info(`Framework detected from file structure: ${fw}`);
          break;
        }
      }
    }
  }

  if (framework) log.info(`Detected framework: ${framework} (from browser)`);
  if (cms) log.info(`Detected CMS: ${cms} (from browser)`);
  if (uiLibraries.length) log.info(`Detected UI libraries: ${uiLibraries.join(", ")}`);

  return { framework, cms, uiLibraries };
}

/**
 * Navigates to a route and performs an axe-core accessibility analysis.
 * @param {import("playwright").Page} page - The Playwright page object.
 * @param {string} routeUrl - The full URL of the route to analyze.
 * @param {number} waitMs - Time to wait after page load.
 * @param {string[]} excludeSelectors - CSS selectors to exclude from the scan.
 * @param {string|null} onlyRule - Specific rule ID to check (optional).
 * @param {number} timeoutMs - Navigation and analysis timeout.
 * @param {number} maxRetries - Number of retries on failure.
 * @param {string} waitUntil - Playwright load state strategy.
 * @returns {Promise<Object>} The analysis results for the route.
 */
async function analyzeRoute(
  page,
  routeUrl,
  waitMs,
  excludeSelectors,
  onlyRule,
  timeoutMs = 30000,
  maxRetries = 2,
  waitUntil = "domcontentloaded",
  axeTags = null,
) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      await page.goto(routeUrl, {
        waitUntil,
        timeout: timeoutMs,
      });
      await page
        .waitForLoadState("networkidle", { timeout: waitMs })
        .catch(() => {});

      const builder = new AxeBuilder({ page });

      if (onlyRule) {
        log.info(`Targeted Audit: Only checking rule "${onlyRule}"`);
        builder.withRules([onlyRule]);
      } else {
        const tagsToUse = axeTags || AXE_TAGS;
        builder.withTags(tagsToUse);
      }

      if (Array.isArray(excludeSelectors)) {
        for (const selector of excludeSelectors) {
          builder.exclude(selector);
        }
      }

      const axeResults = await builder.analyze();

      if (!Array.isArray(axeResults?.violations)) {
        throw new Error(
          "axe-core returned an unexpected response — violations array missing.",
        );
      }

      const metadata = await page.evaluate(() => {
        return {
          title: document.title,
        };
      });

      return {
        url: routeUrl,
        violations: axeResults.violations,
        incomplete: axeResults.incomplete,
        passes: axeResults.passes.map((p) => p.id),
        metadata,
      };
    } catch (error) {
      lastError = error;
      if (attempt <= maxRetries) {
        log.warn(
          `[attempt ${attempt}/${maxRetries + 1}] Retrying ${routeUrl}: ${error.message}`,
        );
        await page.waitForTimeout(1000 * attempt);
      }
    }
  }

  log.error(
    `Failed to analyze ${routeUrl} after ${maxRetries + 1} attempts: ${lastError.message}`,
  );
  return {
    url: routeUrl,
    error: lastError.message,
    violations: [],
    passes: [],
    metadata: {},
  };
}

/**
 * Writes scan progress to a JSON file for real-time UI updates.
 * @param {string} step - Current step identifier.
 * @param {"pending"|"running"|"done"|"error"} status - Step status.
 * @param {Object} [extra={}] - Additional metadata.
 */
function writeProgress(step, status, extra = {}) {
  const progressPath = getInternalPath("progress.json");
  let progress = {};
  try {
    if (fs.existsSync(progressPath)) {
      progress = JSON.parse(fs.readFileSync(progressPath, "utf-8"));
    }
  } catch { /* ignore */ }
  progress.steps = progress.steps || {};
  progress.steps[step] = { status, updatedAt: new Date().toISOString(), ...extra };
  progress.currentStep = step;
  fs.mkdirSync(path.dirname(progressPath), { recursive: true });
  fs.writeFileSync(progressPath, JSON.stringify(progress, null, 2));
}

/**
 * Runs CDP (Chrome DevTools Protocol) accessibility checks using Playwright's CDP session.
 * Catches issues axe-core may miss: missing accessible names, broken focus order,
 * aria-hidden on focusable elements, and missing form labels.
 * @param {import("playwright").Page} page - The Playwright page object.
 * @returns {Promise<Object[]>} Array of CDP-sourced violations in axe-compatible format.
 */
async function runCdpChecks(page) {
  const violations = [];
  try {
    const cdp = await page.context().newCDPSession(page);

    // Get the full accessibility tree
    const { nodes } = await cdp.send("Accessibility.getFullAXTree");

    for (const node of nodes) {
      const role = node.role?.value || "";
      const name = node.name?.value || "";
      const properties = node.properties || [];
      const ignored = node.ignored || false;

      if (ignored) continue;

      const focusable = properties.find((p) => p.name === "focusable")?.value?.value === true;
      const hidden = properties.find((p) => p.name === "hidden")?.value?.value === true;

      // Check: interactive elements without accessible names
      const interactiveRoles = ["button", "link", "textbox", "combobox", "listbox", "menuitem", "tab", "checkbox", "radio", "switch", "slider"];
      if (interactiveRoles.includes(role) && !name.trim()) {
        const backendId = node.backendDOMNodeId;
        let selector = "";
        try {
          if (backendId) {
            const { object } = await cdp.send("DOM.resolveNode", { backendNodeId: backendId });
            if (object?.objectId) {
              const result = await cdp.send("Runtime.callFunctionOn", {
                objectId: object.objectId,
                functionDeclaration: `function() {
                  if (this.id) return '#' + this.id;
                  if (this.className && typeof this.className === 'string') return this.tagName.toLowerCase() + '.' + this.className.trim().split(/\\s+/).join('.');
                  return this.tagName.toLowerCase();
                }`,
                returnByValue: true,
              });
              selector = result.result?.value || "";
            }
          }
        } catch { /* fallback: no selector */ }

        const cdpNameMeta = CDP_RULE_MAP["cdp-missing-accessible-name"] || {};
        violations.push({
          id: "cdp-missing-accessible-name",
          canonical_rule_id: cdpNameMeta.canonical || "button-name",
          wcag_criterion_id: cdpNameMeta.wcagCriterionId || "4.1.2",
          impact: "serious",
          tags: cdpNameMeta.tags || ["wcag2a", "wcag412", "cdp-check"],
          description: `Interactive element with role "${role}" has no accessible name`,
          help: "Interactive elements must have an accessible name",
          helpUrl: "https://dequeuniversity.com/rules/axe/4.11/button-name",
          source: "cdp",
          nodes: [{
            any: [],
            all: [{
              id: "cdp-accessible-name",
              data: { role, name: "(empty)" },
              relatedNodes: [],
              impact: "serious",
              message: `Element with role "${role}" has no accessible name in the accessibility tree`,
            }],
            none: [],
            impact: "serious",
            html: `<${role} aria-role="${role}">`,
            target: selector ? [selector] : [`[role="${role}"]`],
            failureSummary: `Fix all of the following:\n  Element with role "${role}" has no accessible name`,
          }],
        });
      }

      // Check: aria-hidden on focusable elements
      if (hidden && focusable) {
        const cdpHiddenMeta = CDP_RULE_MAP["cdp-aria-hidden-focusable"] || {};
        violations.push({
          id: "cdp-aria-hidden-focusable",
          canonical_rule_id: cdpHiddenMeta.canonical || "aria-hidden-focus",
          wcag_criterion_id: cdpHiddenMeta.wcagCriterionId || "4.1.2",
          impact: "serious",
          tags: cdpHiddenMeta.tags || ["wcag2a", "wcag412", "cdp-check"],
          description: `Focusable element with role "${role}" is aria-hidden`,
          help: "aria-hidden elements must not be focusable",
          helpUrl: "https://dequeuniversity.com/rules/axe/4.11/aria-hidden-focus",
          source: "cdp",
          nodes: [{
            any: [],
            all: [{
              id: "cdp-hidden-focusable",
              data: { role },
              relatedNodes: [],
              impact: "serious",
              message: `Focusable element with role "${role}" is hidden from the accessibility tree`,
            }],
            none: [],
            impact: "serious",
            html: `<element role="${role}" aria-hidden="true">`,
            target: [`[role="${role}"]`],
            failureSummary: `Fix all of the following:\n  Focusable element is hidden from the accessibility tree`,
          }],
        });
      }
    }

    await cdp.detach();
  } catch (err) {
    log.warn(`CDP checks failed (non-fatal): ${err.message}`);
  }
  return violations;
}

/**
 * Pa11y technique → canonical axe rule ID map.
 * Loaded from wcag-reference.json (pa11yCanonicalMap key).
 * @type {Object<string, string>}
 */
const PA11Y_CANONICAL_MAP = WCAG_REFERENCE.pa11yCanonicalMap || {};

/**
 * CDP rule metadata loaded from wcag-reference.json.
 * Maps CDP rule IDs to canonical axe equivalents for dedup and enrichment.
 * @type {Object<string, { canonical: string, axeEquivalents: string[], wcagCriterionId: string, tags: string[] }>}
 */
const CDP_RULE_MAP = WCAG_REFERENCE.cdpRuleMap || {};

/**
 * Given a pa11y issue.code (e.g. "WCAG2AA.Principle1.Guideline1_4.1_4_3.G145.Fail"),
 * returns the canonical axe rule ID or null.
 * @param {string} code - The pa11y issue code.
 * @returns {{ canonicalRuleId: string|null, wcagCriterionId: string|null }}
 */
function canonicalizePa11yCode(code) {
  let wcagCriterionId = null;
  let canonicalRuleId = null;

  if (!code) return { canonicalRuleId, wcagCriterionId };

  // Extract WCAG criterion: e.g. "1_4_3" → "1.4.3"
  const wcagMatch = code.match(/Guideline(\d+)_(\d+)\.(\d+)_(\d+)_(\d+)/);
  if (wcagMatch) {
    wcagCriterionId = `${wcagMatch[3]}.${wcagMatch[4]}.${wcagMatch[5]}`;
  }

  // Extract technique fragment: everything after the criterion segment
  // e.g. "WCAG2AA.Principle1.Guideline1_4.1_4_3.G145.Fail" → "G145.Fail"
  const parts = code.split(".");
  // Find index of the criterion part (e.g. "1_4_3")
  let techStartIdx = -1;
  for (let i = 0; i < parts.length; i++) {
    if (/^\d+_\d+(_\d+)?$/.test(parts[i])) {
      techStartIdx = i + 1;
      break;
    }
  }

  if (techStartIdx > 0 && techStartIdx < parts.length) {
    const techFragment = parts.slice(techStartIdx).join(".").toLowerCase();
    if (PA11Y_CANONICAL_MAP[techFragment]) {
      canonicalRuleId = PA11Y_CANONICAL_MAP[techFragment];
    }
  }

  return { canonicalRuleId, wcagCriterionId };
}

/**
 * Runs pa11y (HTML CodeSniffer) against the already-loaded page URL.
 * Catches WCAG violations that axe-core may miss, particularly around
 * heading hierarchy, link purpose, and form associations.
 * @param {string} routeUrl - The URL to scan.
 * @param {string[]} [axeTags] - WCAG level tags for standard filtering.
 * @returns {Promise<Object[]>} Array of pa11y-sourced violations in axe-compatible format.
 */
async function runPa11yChecks(routeUrl, axeTags) {
  const violations = [];
  try {
    // Determine WCAG standard from axeTags
    let standard = "WCAG2AA";
    if (axeTags) {
      if (axeTags.includes("wcag2aaa")) standard = "WCAG2AAA";
      else if (axeTags.includes("wcag2aa") || axeTags.includes("wcag21aa") || axeTags.includes("wcag22aa")) standard = "WCAG2AA";
      else if (axeTags.includes("wcag2a")) standard = "WCAG2A";
    }

    const results = await pa11y(routeUrl, {
      standard,
      timeout: 30000,
      wait: 2000,
      chromeLaunchConfig: {
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      },
      // Ignore rules that axe-core already covers well
      ignore: [
        "WCAG2AA.Principle1.Guideline1_4.1_4_3.G18.Fail", // color-contrast (axe handles)
        "WCAG2AA.Principle4.Guideline4_1.4_1_2.H91.A.NoContent", // link-name (axe handles)
      ],
    });

    // Map pa11y severity: 1=Error, 2=Warning, 3=Notice
    const impactMap = { 1: "serious", 2: "moderate", 3: "minor" };

    for (const issue of results.issues || []) {
      if (issue.type === "notice") continue; // skip notices

      const impact = impactMap[issue.typeCode] || "moderate";

      // Canonicalize pa11y code → axe rule ID + WCAG criterion
      const { canonicalRuleId, wcagCriterionId } = canonicalizePa11yCode(issue.code);

      // The "id" field uses the canonical rule ID when available for intelligence lookup,
      // otherwise falls back to the original pa11y-prefixed ID.
      const sourceRuleId = `pa11y-${(issue.code || "unknown").replace(/\./g, "-").toLowerCase().slice(0, 60)}`;
      const ruleId = canonicalRuleId || sourceRuleId;

      violations.push({
        id: ruleId,
        source_rule_id: sourceRuleId,
        canonical_rule_id: canonicalRuleId,
        wcag_criterion_id: wcagCriterionId,
        impact,
        tags: ["pa11y-check", ...(wcagCriterionId ? [`wcag${wcagCriterionId.replace(/\./g, "")}`] : [])],
        description: issue.message || "pa11y detected an accessibility issue",
        help: issue.message?.split(".")[0] || "Accessibility issue detected by HTML CodeSniffer",
        helpUrl: wcagCriterion
          ? `https://www.w3.org/WAI/WCAG21/Understanding/${wcagCriterion.replace(/\./g, "")}`
          : "https://squizlabs.github.io/HTML_CodeSniffer/",
        source: "pa11y",
        nodes: [{
          any: [],
          all: [{
            id: "pa11y-check",
            data: { code: issue.code, context: issue.context?.slice(0, 200) },
            relatedNodes: [],
            impact,
            message: issue.message || "",
          }],
          none: [],
          impact,
          html: issue.context || "",
          target: issue.selector ? [issue.selector] : [],
          failureSummary: `Fix all of the following:\n  ${issue.message || "Accessibility issue"}`,
        }],
      });
    }
  } catch (err) {
    log.warn(`pa11y checks failed (non-fatal): ${err.message}`);
  }
  return violations;
}

/**
 * Normalizes a CSS selector for deduplication purposes.
 * Strips nth-child indices and whitespace differences.
 * @param {string} selector
 * @returns {string}
 */
function normalizeSelector(selector) {
  if (!selector) return "";
  return selector
    .replace(/:nth-child\(\d+\)/g, "")
    .replace(/:nth-of-type\(\d+\)/g, "")
    .replace(/\[\d+\]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * Returns the canonical rule ID for deduplication.
 * For pa11y violations this is the canonical_rule_id field (axe-style).
 * For axe/cdp violations this is the id field.
 * @param {Object} violation
 * @returns {string}
 */
function getDedupeRuleId(violation) {
  return violation.canonical_rule_id || violation.id || "";
}

/**
 * Merges violations from multiple sources (axe-core, CDP, pa11y) and deduplicates.
 * Deduplication uses canonical rule ID + normalized selector.
 * Priority: axe > cdp > pa11y — richer payloads survive.
 * @param {Object[]} axeViolations - Violations from axe-core.
 * @param {Object[]} cdpViolations - Violations from CDP checks.
 * @param {Object[]} pa11yViolations - Violations from pa11y.
 * @returns {Object[]} Merged and deduplicated violations array.
 */
function mergeViolations(axeViolations, cdpViolations, pa11yViolations) {
  const seen = new Map(); // key → violation (keeps highest-priority source)
  const merged = [];

  /**
   * Builds a dedup key from canonical rule ID + normalized first selector.
   * @param {Object} v
   * @returns {string}
   */
  function makeKey(v) {
    const ruleId = getDedupeRuleId(v);
    const target = normalizeSelector(v.nodes?.[0]?.target?.[0] || "");
    return `${ruleId}::${target}`;
  }

  // axe-core results are primary — add them first (highest priority)
  for (const v of axeViolations) {
    const key = makeKey(v);
    seen.set(key, v);
    merged.push(v);
  }

  // Add CDP violations if not already covered by axe
  for (const v of cdpViolations) {
    // Resolve axe equivalents from externalized CDP rule map
    const cdpMeta = CDP_RULE_MAP[v.id] || {};
    const equivRules = cdpMeta.axeEquivalents || [];
    const target = normalizeSelector(v.nodes?.[0]?.target?.[0] || "");
    const isDuplicate = equivRules.some((r) => seen.has(`${r}::${target}`));
    if (!isDuplicate) {
      const key = makeKey(v);
      if (!seen.has(key)) {
        seen.set(key, v);
        merged.push(v);
      }
    }
  }

  // Add pa11y violations only if the canonical rule + selector isn't already covered
  for (const v of pa11yViolations) {
    const key = makeKey(v);
    if (!seen.has(key)) {
      // Also check if any axe/cdp violation covers the same normalized selector
      // with the same canonical rule (handles case where pa11y id differs but canonical matches)
      const canonicalId = v.canonical_rule_id;
      const target = normalizeSelector(v.nodes?.[0]?.target?.[0] || "");
      let alreadyCovered = false;
      if (canonicalId && target) {
        alreadyCovered = seen.has(`${canonicalId}::${target}`);
      }
      if (!alreadyCovered) {
        seen.set(key, v);
        merged.push(v);
      }
    }
  }

  return merged;
}

/**
 * The main execution function for the accessibility scanner.
 * Coordinates browser setup, crawling/discovery, parallel scanning, and result saving.
 * @throws {Error} If navigation to the base URL fails or browser setup issues occur.
 */
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const baseUrl = new URL(args.baseUrl).toString();
  const origin = new URL(baseUrl).origin;

  log.info(`Starting accessibility audit for ${baseUrl}`);

  const primaryViewport = args.viewport || {
    width: DEFAULTS.viewports[0].width,
    height: DEFAULTS.viewports[0].height,
  };

  const browser = await chromium.launch({
    headless: args.headless,
  });
  const context = await browser.newContext({
    viewport: primaryViewport,
    reducedMotion: "no-preference",
    colorScheme: args.colorScheme || DEFAULTS.colorScheme,
    forcedColors: "none",
    locale: "en-US",
  });
  const page = await context.newPage();

  let routes = [];
  let projectContext = { framework: null, uiLibraries: [] };
  try {
    await page.goto(baseUrl, {
      waitUntil: args.waitUntil,
      timeout: args.timeoutMs,
    });

    projectContext = await detectProjectContext(page);

    const cliRoutes = parseRoutesArg(args.routes, origin);

    if (cliRoutes.length > 0) {
      routes = cliRoutes.slice(0, args.maxRoutes);
    } else if (baseUrl.startsWith("file://")) {
      routes = [""];
    } else {
      log.info("Autodiscovering routes...");
      const sitemapRoutes = await discoverFromSitemap(origin);
      if (sitemapRoutes.length > 0) {
        routes = [...new Set(["/", ...sitemapRoutes])].slice(0, args.maxRoutes);
        log.info(
          `Sitemap: ${routes.length} route(s) discovered from /sitemap.xml`,
        );
      } else {
        const crawled = await discoverRoutes(
          page,
          baseUrl,
          args.maxRoutes,
          args.crawlDepth,
        );
        routes = [...crawled];
      }
      if (routes.length === 0) routes = ["/"];
    }
  } catch (err) {
    log.error(`Fatal: Could not load base URL ${baseUrl}: ${err.message}`);
    await browser.close();
    process.exit(1);
  }

  /**
   * Selectors that should never be targeted for element screenshots.
   * @type {Set<string>}
   */
  const SKIP_SELECTORS = new Set(["html", "body", "head", ":root", "document"]);

  /**
   * Captures a screenshot of an element associated with an accessibility violation.
   * @param {import("playwright").Page} tabPage - The Playwright page object.
   * @param {Object} violation - The axe-core violation object.
   * @param {number} routeIndex - The index of the current route (used for filenames).
   */
  async function captureElementScreenshot(tabPage, violation, routeIndex) {
    if (!args.screenshotsDir) return;
    const firstNode = violation.nodes?.[0];
    if (!firstNode || firstNode.target.length > 1) return;
    const selector = firstNode.target[0];
    if (!selector || SKIP_SELECTORS.has(selector.toLowerCase())) return;
    try {
      fs.mkdirSync(args.screenshotsDir, { recursive: true });
      const safeRuleId = violation.id.replace(/[^a-z0-9-]/g, "-");
      const filename = `${routeIndex}-${safeRuleId}.png`;
      const screenshotPath = path.join(args.screenshotsDir, filename);
      await tabPage
        .locator(selector)
        .first()
        .scrollIntoViewIfNeeded({ timeout: 1500 });
      await tabPage.evaluate((sel) => {
        const el = document.querySelector(sel);
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const overlay = document.createElement("div");
        overlay.id = "__a11y_highlight__";
        Object.assign(overlay.style, {
          position: "fixed",
          top: `${rect.top}px`,
          left: `${rect.left}px`,
          width: `${rect.width || 40}px`,
          height: `${rect.height || 20}px`,
          outline: "3px solid #ef4444",
          outlineOffset: "2px",
          backgroundColor: "rgba(239,68,68,0.12)",
          zIndex: "2147483647",
          pointerEvents: "none",
          boxSizing: "border-box",
        });
        document.body.appendChild(overlay);
      }, selector);
      await tabPage.screenshot({ path: screenshotPath });
      violation.screenshot_path = `screenshots/${filename}`;
      await tabPage.evaluate(() =>
        document.getElementById("__a11y_highlight__")?.remove(),
      );
    } catch (err) {
      log.warn(
        `Screenshot skipped for "${violation.id}" (${selector}): ${err.message}`,
      );
      await tabPage
        .evaluate(() => document.getElementById("__a11y_highlight__")?.remove())
        .catch(() => {});
    }
  }

  /** @const {number} Default concurrency level for parallel scanning tabs. */
  const TAB_CONCURRENCY = 3;
  let results = [];
  let total = 0;

  try {
    const disallowed = await fetchDisallowedPaths(origin);
    if (disallowed.size > 0) {
      const before = routes.length;
      routes = routes.filter((r) => !isDisallowedPath(r, disallowed));
      const skipped = before - routes.length;
      if (skipped > 0)
        log.info(`robots.txt: ${skipped} route(s) excluded (Disallow rules)`);
    }

    results = new Array(routes.length);
    total = routes.length;

    log.info(
      `Targeting ${routes.length} routes (${Math.min(TAB_CONCURRENCY, routes.length)} parallel tabs): ${routes.join(", ")}`,
    );

    const tabPages = [page];
    for (let t = 1; t < Math.min(TAB_CONCURRENCY, routes.length); t++) {
      tabPages.push(await context.newPage());
    }

    // Initialize progress
    writeProgress("browser", "done");
    writeProgress("page", "running");

    for (let i = 0; i < routes.length; i += tabPages.length) {
      const batch = [];
      for (let j = 0; j < tabPages.length && i + j < routes.length; j++) {
        const idx = i + j;
        const tabPage = tabPages[j];
        batch.push(
          (async () => {
            const routePath = routes[idx];
            log.info(`[${idx + 1}/${total}] Scanning: ${routePath}`);
            const targetUrl = new URL(routePath, baseUrl).toString();

            writeProgress("page", "done");

            // Step 1: axe-core
            writeProgress("axe", "running");
            const result = await analyzeRoute(
              tabPage,
              targetUrl,
              args.waitMs,
              args.excludeSelectors,
              args.onlyRule,
              args.timeoutMs,
              2,
              args.waitUntil,
              args.axeTags,
            );
            const axeViolationCount = result.violations?.length || 0;
            writeProgress("axe", "done", { found: axeViolationCount });
            log.info(`axe-core: ${axeViolationCount} violation(s) found`);

            // Step 2: CDP checks
            writeProgress("cdp", "running");
            const cdpViolations = await runCdpChecks(tabPage);
            writeProgress("cdp", "done", { found: cdpViolations.length });
            log.info(`CDP checks: ${cdpViolations.length} issue(s) found`);

            // Step 3: pa11y
            writeProgress("pa11y", "running");
            const pa11yViolations = await runPa11yChecks(targetUrl, args.axeTags);
            writeProgress("pa11y", "done", { found: pa11yViolations.length });
            log.info(`pa11y: ${pa11yViolations.length} issue(s) found`);

            // Step 4: Merge results
            writeProgress("merge", "running");
            const mergedViolations = mergeViolations(
              result.violations || [],
              cdpViolations,
              pa11yViolations,
            );
            writeProgress("merge", "done", {
              axe: axeViolationCount,
              cdp: cdpViolations.length,
              pa11y: pa11yViolations.length,
              merged: mergedViolations.length,
            });
            log.info(`Merged: ${mergedViolations.length} total unique violations (axe: ${axeViolationCount}, cdp: ${cdpViolations.length}, pa11y: ${pa11yViolations.length})`);

            // Screenshots for merged violations
            if (args.screenshotsDir && mergedViolations) {
              for (const violation of mergedViolations) {
                await captureElementScreenshot(tabPage, violation, idx);
              }
            }
            results[idx] = {
              path: routePath,
              ...result,
              violations: mergedViolations,
              incomplete: result.incomplete || [],
            };
          })(),
        );
      }
      await Promise.all(batch);
    }
  } finally {
    await browser.close();
  }

  const payload = {
    generated_at: new Date().toISOString(),
    base_url: baseUrl,
    onlyRule: args.onlyRule || null,
    projectContext,
    routes: results,
  };

  writeJson(args.output, payload);
  log.success(`Routes scan complete. Results saved to ${args.output}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    log.error(`Scanner Execution Error: ${error.message}`);
    process.exit(1);
  });
}
