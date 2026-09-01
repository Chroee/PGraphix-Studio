// Cloudflare Pages Function — admin read/write endpoint for portfolio projects.
//
// Route: /admin/api/projects  (GET, POST, PUT, DELETE)
//
// This route lives under /admin/* on purpose: protect the whole /admin* path
// with Cloudflare Access (Zero Trust -> Access -> Applications -> add an
// application for this domain matching path /admin*) and both the dashboard
// page AND this API are covered by the same login gate. Access sits in front
// of Pages at Cloudflare's edge, so requests from anyone who hasn't signed in
// never reach this code — nothing here needs to re-check identity itself.
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
  const pre = checkPreconditions(context.env);
  if (pre) return pre;
  const projects = await readProjects(context.env);
  return json(projects);
}

export async function onRequestPost(context) {
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
