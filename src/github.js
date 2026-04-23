const owner = import.meta.env.VITE_GITHUB_OWNER;
const repo = import.meta.env.VITE_GITHUB_REPO;
const token = import.meta.env.VITE_GITHUB_TOKEN;

const headers = {
  Authorization: `token ${token}`,
  Accept: "application/vnd.github.v3+json",
};

const BASE = 'https://api.github.com'

// READ a file from GitHub
export async function readFile(path) {
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
    { headers }
  );
  const data = await res.json();
  return atob(data.content);
}

// WRITE a file to GitHub
export async function writeFile(path, content, message) {
  let sha;
  try {
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
      { headers }
    );
    const data = await res.json();
    sha = data.sha;
  } catch (e) {
    sha = undefined;
  }

  await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
    method: "PUT",
    headers,
    body: JSON.stringify({
      message,
      content: btoa(unescape(encodeURIComponent(content))),
      sha,
    }),
  });
}

// WRITE JSON sidecar file
export async function writeJSON(path, data, message) {
  await writeFile(path, JSON.stringify(data, null, 2), message);
}

// LIST files in a folder
export async function listFiles(path) {
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
    { headers }
  );
  const data = await res.json();
  return data;
}

// PARSE impulse markdown into JSON
export function parseImpulseToJSON(markdown, week, year) {
  const rows = markdown
    .split("\n")
    .filter((line) => line.startsWith("|") && !line.startsWith("| #") && !line.startsWith("|--") && !line.startsWith("| ---"))
    .map((line) => {
      const cols = line.split("|").map((c) => c.trim()).filter(Boolean);
      return {
        project: cols[1] || "",
        date: cols[2] || "",
        impulse: cols[3] || "",
        microAction: cols[4] || "",
        tag: cols[5] || "#impulse",
      };
    })
    .filter((row) => row.project);

  return {
    week,
    year,
    type: "impulse",
    generated: new Date().toISOString().split("T")[0],
    entries: rows,
    projects: [...new Set(rows.map((r) => r.project))],
  };
}

// PARSE project ledger markdown into JSON
export function parseLedgerToJSON(markdown, projectName) {
  const lines = markdown.split("\n");

  const status = lines.find((l) => l.includes("Current Status"))
    ?.split(":")[1]?.trim() || "Unknown";

  const category = lines.find((l) => l.includes("Category"))
    ?.split(":")[1]?.trim() || "Unknown";

  const goal = lines.find((l) => l.includes("Goal"))
    ?.split(":")[1]?.trim() || "";

  const started = lines.find((l) => l.includes("Started"))
    ?.split(":")[1]?.trim() || "";

  const weeklyRows = lines
    .filter((l) => l.startsWith("|W"))
    .map((line) => {
      const cols = line.split("|").map((c) => c.trim()).filter(Boolean);
      return {
        week: cols[0] || "",
        date: cols[1] || "",
        progress: cols[2] || "",
        blockers: cols[3] || "",
        decision: cols[4] || "",
        reason: cols[5] || "",
      };
    });

  return {
    project: projectName,
    type: "ledger",
    status,
    category,
    goal,
    started,
    generated: new Date().toISOString().split("T")[0],
    weeklyLog: weeklyRows,
  };
}

// GET week number
export function getWeekNumber(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  return (
    1 +
    Math.round(
      ((d.getTime() - week1.getTime()) / 86400000 -
        3 +
        ((week1.getDay() + 6) % 7)) /
        7
    )
  );
}