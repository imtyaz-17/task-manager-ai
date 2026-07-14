const express = require("express");
const http = require("http");

const app = express();
const PORT = process.env.PORT || 3000;
const API_URL = process.env.API_URL || "http://localhost:8000";

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

function apiRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_URL);
    const payload = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname,
        method,
        headers: {
          "Content-Type": "application/json",
          ...(payload ? { "Content-Length": Buffer.byteLength(payload) } : {}),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          let parsed = null;
          if (data) {
            try {
              parsed = JSON.parse(data);
            } catch {
              parsed = data;
            }
          }
          resolve({ status: res.statusCode, body: parsed });
        });
      }
    );
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderPage(tasks, error) {
  const rows = tasks
    .map(
      (task) => `
      <li class="task ${task.completed ? "done" : ""}">
        <form method="post" action="/toggle/${task.id}" class="toggle">
          <button type="submit" aria-label="Toggle complete">${task.completed ? "✓" : "○"}</button>
        </form>
        <div class="content">
          <strong>${escapeHtml(task.title)}</strong>
          ${task.description ? `<p>${escapeHtml(task.description)}</p>` : ""}
        </div>
        <form method="post" action="/delete/${task.id}">
          <button type="submit" class="danger">Delete</button>
        </form>
      </li>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Task Manager</title>
  <style>
    :root {
      --bg: #0f172a;
      --panel: #1e293b;
      --text: #e2e8f0;
      --muted: #94a3b8;
      --accent: #38bdf8;
      --danger: #f87171;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      font-family: "Segoe UI", system-ui, sans-serif;
      background: radial-gradient(circle at top, #1e3a5f, var(--bg));
      color: var(--text);
      padding: 2rem 1rem;
    }
    main {
      max-width: 640px;
      margin: 0 auto;
    }
    h1 { margin: 0 0 0.25rem; font-size: 2rem; }
    .sub { color: var(--muted); margin-bottom: 1.5rem; }
    form.create, ul {
      background: var(--panel);
      border-radius: 12px;
      padding: 1rem;
      margin-bottom: 1rem;
    }
    input, textarea, button {
      font: inherit;
      border-radius: 8px;
      border: 1px solid #334155;
      background: #0f172a;
      color: var(--text);
      padding: 0.6rem 0.75rem;
    }
    input, textarea { width: 100%; margin-bottom: 0.75rem; }
    button {
      cursor: pointer;
      background: var(--accent);
      color: #0f172a;
      border: none;
      font-weight: 600;
    }
    button.danger { background: transparent; color: var(--danger); }
    ul { list-style: none; }
    .task {
      display: flex;
      gap: 0.75rem;
      align-items: flex-start;
      padding: 0.75rem 0;
      border-bottom: 1px solid #334155;
    }
    .task:last-child { border-bottom: none; }
    .task.done .content { opacity: 0.55; text-decoration: line-through; }
    .content { flex: 1; }
    .content p { margin: 0.25rem 0 0; color: var(--muted); }
    .error {
      background: #7f1d1d;
      color: #fecaca;
      padding: 0.75rem 1rem;
      border-radius: 8px;
      margin-bottom: 1rem;
    }
    .toggle button {
      width: 2rem;
      height: 2rem;
      padding: 0;
      background: #334155;
      color: var(--text);
    }
  </style>
</head>
<body>
  <main>
    <h1>Task Manager</h1>
    <p class="sub">Create, complete, and delete tasks.</p>
    ${error ? `<div class="error">${escapeHtml(error)}</div>` : ""}
    <form class="create" method="post" action="/tasks">
      <input name="title" placeholder="Task title" required maxlength="255" />
      <textarea name="description" placeholder="Description (optional)" rows="2" maxlength="1000"></textarea>
      <button type="submit">Add task</button>
    </form>
    <ul>${rows || "<li class='sub'>No tasks yet.</li>"}</ul>
  </main>
</body>
</html>`;
}

app.get("/", async (_req, res) => {
  try {
    const result = await apiRequest("GET", "/tasks");
    if (result.status >= 400) {
      return res.status(502).send(renderPage([], "Could not load tasks from API"));
    }
    res.send(renderPage(result.body || [], null));
  } catch (err) {
    res.status(502).send(renderPage([], `API unavailable: ${err.message}`));
  }
});

app.post("/tasks", async (req, res) => {
  try {
    await apiRequest("POST", "/tasks", {
      title: req.body.title,
      description: req.body.description || null,
    });
    res.redirect("/");
  } catch (err) {
    res.status(502).send(renderPage([], `Failed to create task: ${err.message}`));
  }
});

app.post("/toggle/:id", async (req, res) => {
  try {
    const current = await apiRequest("GET", `/tasks/${req.params.id}`);
    if (current.status === 404) return res.redirect("/");
    await apiRequest("PATCH", `/tasks/${req.params.id}`, {
      completed: !current.body.completed,
    });
    res.redirect("/");
  } catch (err) {
    res.status(502).send(renderPage([], `Failed to update task: ${err.message}`));
  }
});

app.post("/delete/:id", async (req, res) => {
  try {
    await apiRequest("DELETE", `/tasks/${req.params.id}`);
    res.redirect("/");
  } catch (err) {
    res.status(502).send(renderPage([], `Failed to delete task: ${err.message}`));
  }
});

app.listen(PORT, () => {
  console.log(`Frontend listening on http://0.0.0.0:${PORT}`);
});
