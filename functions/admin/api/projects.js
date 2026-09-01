// Cloudflare Pages Function — admin read/write endpoint for portfolio projects.
//
// Route: /admin/api/projects  (GET, POST, PUT, DELETE)
//
// Protected by a shared passcode: every request must carry a header
// `X-Admin-Passcode` matching the ADMIN_PASSCODE secret configured on this
// Pages project (Settings -> Variables and Secrets -> add ADMIN_PASSCODE).
// admin/index.html shows a passcode gate before the dashboard and attaches
// this header on every call it makes here.
//
// If you'd rather gate this at Cloudflare's edge instead (Zero Trust ->
// Access -> Applications, path /admin*), you can layer that on top of this —
// it costs nothing to have both — but this passcode check is what actually
// protects the API today, since Access has to be deliberately set up per
// account and this file can't assume that's been done.
//
// Uses the same PROJECTS_KV binding as the public /api/projects endpoint —
// same namespace, same "projects" key, so writes here show up on the site
// immediately (public reads are cached up to 30s, see functions/api/projects.js).

const CATEGORIES = ["logos", "liveries", "vehicles", "sirens", "media"];

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

// Fails closed: if ADMIN_PASSCODE isn't configured, every request is
// rejected rather than left open. The response doesn't say which case
// applies (not configured vs. wrong passcode) so an unauthenticated caller
// can't use it to fingerprint the deployment's configuration state.
function checkAuth(request, env) {
  const expected = env.ADMIN_PASSCODE;
  const provided = request.headers.get("X-Admin-Passcode");
  if (!expected || !provided || provided !== expected) {
    return json({ error: "Unauthorized" }, 401);
  }
  return null;
}

async function readProjects(env) {
  const raw = await env.PROJECTS_KV.get("projects");
  if (raw === null) return [];
  try {
    return JSON.parse(raw);
  } catch (err) {
    return [];
  }
}

async function writeProjects(env, projects) {
  await env.PROJECTS_KV.put("projects", JSON.stringify(projects));
}

function cleanMeta(meta) {
  if (!Array.isArray(meta)) return [];
  return meta
    .filter(function (m) { return m && (m.label || m.value); })
    .slice(0, 3)
    .map(function (m) {
      return {
        label: (m.label || "").toString().slice(0, 30),
        value: (m.value || "").toString().slice(0, 40),
      };
    });
}

function validate(body) {
  if (!body || typeof body !== "object") return "Invalid request body.";
  if (!body.title || typeof body.title !== "string" || !body.title.trim()) return "Title is required.";
  if (!body.client || typeof body.client !== "string" || !body.client.trim()) return "Client / server name is required.";
  if (CATEGORIES.indexOf(body.category) === -1) return "Category must be one of: " + CATEGORIES.join(", ") + ".";
  return null;
}

function checkPreconditions(env) {
  if (!env.PROJECTS_KV) {
    return json({ error: "PROJECTS_KV binding is not configured on this Pages project." }, 500);
  }
  return null;
}

export async function onRequestGet(context) {
  const authErr = checkAuth(context.request, context.env);
  if (authErr) return authErr;
  const pre = checkPreconditions(context.env);
  if (pre) return pre;
  const projects = await readProjects(context.env);
  return json(projects);
}

export async function onRequestPost(context) {
  const authErr = checkAuth(context.request, context.env);
  if (authErr) return authErr;
  const pre = checkPreconditions(context.env);
  if (pre) return pre;

  const { request, env } = context;
  let body;
  try {
    body = await request.json();
  } catch (err) {
    return json({ error: "Invalid JSON body." }, 400);
  }

  const err = validate(body);
  if (err) return json({ error: err }, 400);

  const projects = await readProjects(env);
  const project = {
    id: crypto.randomUUID(),
    title: body.title.trim().slice(0, 120),
    client: body.client.trim().slice(0, 120),
    category: body.category,
    imageUrl: (body.imageUrl || "").toString().trim().slice(0, 500),
    meta: cleanMeta(body.meta),
    createdAt: new Date().toISOString(),
  };

  projects.unshift(project);
  await writeProjects(env, projects);
  return json(project, 201);
}

export async function onRequestPut(context) {
  const authErr = checkAuth(context.request, context.env);
  if (authErr) return authErr;
  const pre = checkPreconditions(context.env);
  if (pre) return pre;

  const { request, env } = context;
  let body;
  try {
    body = await request.json();
  } catch (err) {
    return json({ error: "Invalid JSON body." }, 400);
  }

  if (!body.id || typeof body.id !== "string") return json({ error: "id is required." }, 400);
  const err = validate(body);
  if (err) return json({ error: err }, 400);

  const projects = await readProjects(env);
  const idx = projects.findIndex(function (p) { return p.id === body.id; });
  if (idx === -1) return json({ error: "Project not found." }, 404);

  projects[idx] = {
    id: projects[idx].id,
    title: body.title.trim().slice(0, 120),
    client: body.client.trim().slice(0, 120),
    category: body.category,
    imageUrl: (body.imageUrl || "").toString().trim().slice(0, 500),
    meta: cleanMeta(body.meta),
    createdAt: projects[idx].createdAt,
    updatedAt: new Date().toISOString(),
  };

  await writeProjects(env, projects);
  return json(projects[idx]);
}

export async function onRequestDelete(context) {
  const authErr = checkAuth(context.request, context.env);
  if (authErr) return authErr;
  const pre = checkPreconditions(context.env);
  if (pre) return pre;

  const { request, env } = context;
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) return json({ error: "id query parameter is required." }, 400);

  const projects = await readProjects(env);
  const next = projects.filter(function (p) { return p.id !== id; });
  if (next.length === projects.length) return json({ error: "Project not found." }, 404);

  await writeProjects(env, next);
  return json({ ok: true });
}
