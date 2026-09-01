// Cloudflare Pages Function — public read endpoint for the portfolio grid.
//
// Route: GET /api/projects
//
// Reads the project list from Cloudflare KV (binding name: PROJECTS_KV — set
// this up in the Pages project's Settings -> Functions -> KV namespace
// bindings, for both Production and Preview). On first request ever, if the
// "projects" key doesn't exist yet, this seeds it with the studio's original
// sample portfolio so the site isn't empty on day one — everything after
// that comes from what's added/edited/removed in /admin.

const SEED_PROJECTS = [
  {
    id: "ec-wordmark-badge",
    title: "Primary Wordmark & Badge",
    client: "Emerald City RP",
    category: "logos",
    imageUrl: "",
    meta: [
      { label: "Format", value: "SVG / PNG" },
      { label: "Concepts", value: "3 delivered" },
      { label: "Revisions", value: "2 rounds" },
    ],
  },
  {
    id: "redwood-patrol-livery",
    title: "Patrol Fleet Livery",
    client: "Redwood County SO",
    category: "liveries",
    imageUrl: "",
    meta: [
      { label: "Vehicles", value: "4 units" },
      { label: "Template", value: "Vanilla-ready" },
      { label: "Files", value: "PSD + PNG" },
    ],
  },
  {
    id: "redwood-interceptor-pack",
    title: "Interceptor Build Pack",
    client: "Redwood County SO",
    category: "vehicles",
    imageUrl: "",
    meta: [
      { label: "Angles", value: "6 renders" },
      { label: "Livery", value: "Integrated" },
      { label: "Export", value: "Server-ready" },
    ],
  },
  {
    id: "redwood-multisiren-config",
    title: "Multi-Siren Lightbar Configuration",
    client: "Redwood County SO",
    category: "sirens",
    imageUrl: "",
    meta: [
      { label: "Patterns", value: "12 modes" },
      { label: "Sync", value: "Livery-matched" },
      { label: "Files", value: "Meta / XML" },
    ],
  },
  {
    id: "sapphire-logo-suite",
    title: "Nightlife Logo Suite",
    client: "Sapphire Nights",
    category: "logos",
    imageUrl: "",
    meta: [
      { label: "Format", value: "SVG / PNG" },
      { label: "Variants", value: "Light + dark" },
      { label: "Extras", value: "Menu emblem" },
    ],
  },
  {
    id: "vantage-gt-wrap",
    title: "GT Series Race Wrap",
    client: "Vantage Racing League",
    category: "liveries",
    imageUrl: "",
    meta: [
      { label: "Vehicles", value: "1 body kit" },
      { label: "Sponsors", value: "6 plates" },
      { label: "Files", value: "PSD + PNG" },
    ],
  },
  {
    id: "vantage-race-recap",
    title: "Race Day Recap Edit",
    client: "Vantage Racing League",
    category: "media",
    imageUrl: "",
    meta: [
      { label: "Length", value: "2:40 edit" },
      { label: "Format", value: "1080p / 60fps" },
      { label: "Delivery", value: "MP4" },
    ],
  },
  {
    id: "vantage-gt86-build",
    title: "GT86 Full Build",
    client: "Vantage Racing League",
    category: "vehicles",
    imageUrl: "",
    meta: [
      { label: "Angles", value: "8 renders" },
      { label: "Livery", value: "Integrated" },
      { label: "Export", value: "Server-ready" },
    ],
  },
  {
    id: "metro-cab-light",
    title: "Cab Light Package",
    client: "Metro Fire & Rescue",
    category: "sirens",
    imageUrl: "",
    meta: [
      { label: "Patterns", value: "8 modes" },
      { label: "Sync", value: "Livery-matched" },
      { label: "Files", value: "Meta / XML" },
    ],
  },
  {
    id: "ec-launch-trailer",
    title: "Server Launch Trailer",
    client: "Emerald City RP",
    category: "media",
    imageUrl: "",
    meta: [
      { label: "Length", value: "1:15 trailer" },
      { label: "Format", value: "1080p / 60fps" },
      { label: "Delivery", value: "MP4" },
    ],
  },
  {
    id: "skyline-cab-livery",
    title: "Fleet Cab Livery",
    client: "Skyline Cab Co.",
    category: "liveries",
    imageUrl: "",
    meta: [
      { label: "Vehicles", value: "3 units" },
      { label: "Template", value: "Vanilla-ready" },
      { label: "Files", value: "PSD + PNG" },
    ],
  },
];

function json(data, status, extraHeaders) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: Object.assign(
      { "Content-Type": "application/json", "Cache-Control": "public, max-age=30" },
      extraHeaders || {}
    ),
  });
}

export async function onRequestGet(context) {
  const { env } = context;

  if (!env.PROJECTS_KV) {
    return json(
      { error: "PROJECTS_KV binding is not configured on this Pages project." },
      500,
      { "Cache-Control": "no-store" }
    );
  }

  let raw = await env.PROJECTS_KV.get("projects");
  if (raw === null) {
    raw = JSON.stringify(SEED_PROJECTS);
    await env.PROJECTS_KV.put("projects", raw);
  }

  let projects;
  try {
    projects = JSON.parse(raw);
  } catch (err) {
    projects = [];
  }

  return json(projects);
}
