import { useState, useEffect } from "react";
import { listFiles, readFile, writeFile, writeJSON, parseLedgerToJSON, getWeekNumber } from "./github";

const DECISIONS = ["Continue", "Adjust", "Pause", "Kill"];

export default function WeeklyRecap({ onBack }) {
  const [step, setStep] = useState(0);
  const [projects, setProjects] = useState([]);
  const [currentProject, setCurrentProject] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const [form, setForm] = useState({
    outcome: "",
    progress: "",
    milestone: "",
    blockers: "",
    actions: ["", "", ""],
    decision: "Continue",
    reason: "",
  });

  const [allEntries, setAllEntries] = useState([]);

  useEffect(() => {
    async function load() {
      try {
        const files = await listFiles("PROJECTS");
        const mdFiles = files.filter((f) => f.name.endsWith(".md"));
        setProjects(mdFiles);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function getProjectName(filename) {
    return filename.replace("-ledger.md", "").replace(/-/g, " ").toUpperCase();
  }

  function resetForm() {
    setForm({
      outcome: "",
      progress: "",
      milestone: "",
      blockers: "",
      actions: ["", "", ""],
      decision: "Continue",
      reason: "",
    });
  }

  async function handleNext() {
    const project = projects[currentProject];
    const entry = { project: getProjectName(project.name), ...form };
    const updated = [...allEntries, entry];
    setAllEntries(updated);

    if (currentProject + 1 < projects.length) {
      setCurrentProject(currentProject + 1);
      resetForm();
    } else {
      // All projects done — save recap
      setSaving(true);
      try {
        await saveRecap(updated);
        setDone(true);
      } catch (err) {
        console.error("Failed to save recap:", err);
      } finally {
        setSaving(false);
      }
    }
  }

  async function saveRecap(entries) {
    const now = new Date();
    const week = getWeekNumber(now);
    const year = now.getFullYear();
    const weekStr = `${year}-W${String(week).padStart(2, "0")}`;

    let md = `# Weekly Recap — ${weekStr}\n\n`;

    for (const entry of entries) {
      md += `## ${entry.project}\n\n`;
      md += `- **Outcome:** ${entry.outcome}\n`;
      md += `- **Progress:** ${entry.progress}\n`;
      md += `- **Milestone:** ${entry.milestone}\n`;
      md += `- **Blockers:** ${entry.blockers}\n`;
      md += `- **Next actions:**\n`;
      entry.actions.filter(Boolean).forEach((a) => {
        md += `  - ${a}\n`;
      });
      md += `- **Decision:** ${entry.decision}\n`;
      md += `- **Reason:** ${entry.reason}\n\n---\n\n`;
    }

    const mdPath = `RECAPS/WEEKLY/${weekStr}_recap.md`;
    const jsonPath = `DATA/WEEKLY/${weekStr}_recap.json`;

    await writeFile(mdPath, md, `Weekly recap: ${weekStr}`);
    await writeJSON(jsonPath, {
      week,
      year,
      type: "recap",
      generated: now.toISOString().split("T")[0],
      projects: entries,
    }, `Data sync: recap ${weekStr}`);

    // Update each project ledger
    for (const entry of entries) {
      const file = projects.find(
        (p) => getProjectName(p.name) === entry.project
      );
      if (!file) continue;
      try {
        const raw = await readFile(`PROJECTS/${file.name}`);
        const today = now.toISOString().split("T")[0];
        const newRow = `\n|W${week}|${today}|${entry.progress}|${entry.blockers}|${entry.decision}|${entry.reason}|`;
        const updated = raw + newRow;
        await writeFile(`PROJECTS/${file.name}`, updated, `Weekly update: ${file.name}`);
        const jsonData = parseLedgerToJSON(updated, getProjectName(file.name));
        await writeJSON(`DATA/PROJECTS/${file.name.replace("-ledger.md", "")}.json`, jsonData, `Data sync: ${file.name}`);
      } catch (err) {
        console.error(`Failed to update ledger for ${file.name}:`, err);
      }
    }
  }

  if (loading) return <div className="loading"><span>Loading</span></div>;

  if (done) return (
    <div className="dashboard">
      <header className="dashboard-header">
        <button className="back-btn" onClick={onBack}>← BACK</button>
      </header>
      <div style={{ textAlign: "center", paddingTop: "4rem" }}>
        <h1 className="dashboard-title">Done.</h1>
        <p style={{ color: "var(--text-muted)", marginTop: "1rem", fontSize: "0.8rem", letterSpacing: "0.1em" }}>
          Recap saved. Ledgers updated. Data synced.
        </p>
      </div>
    </div>
  );

  const project = projects[currentProject];

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <button className="back-btn" onClick={onBack}>← BACK</button>
        <span className="dashboard-subtitle">
          {currentProject + 1} / {projects.length}
        </span>
      </header>

      <div style={{ marginBottom: "2rem", borderBottom: "1px solid var(--border)", paddingBottom: "1rem" }}>
        <p className="dashboard-subtitle">WEEKLY RECAP</p>
        <h2 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "1.8rem", letterSpacing: "0.05em" }}>
          {getProjectName(project.name)}
        </h2>
      </div>

      <div className="impulse-form">
        <div className="form-group">
          <label className="form-label" htmlFor="outcome">OUTCOME THIS WEEK</label>
          <textarea id="outcome" className="form-textarea" style={{ height: "80px" }}
            value={form.outcome} onChange={(e) => setForm({ ...form, outcome: e.target.value })} />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="progress">PROGRESS</label>
          <textarea id="progress" className="form-textarea" style={{ height: "80px" }}
            value={form.progress} onChange={(e) => setForm({ ...form, progress: e.target.value })} />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="milestone">MILESTONE / % COMPLETE</label>
          <input id="milestone" className="form-input"
            value={form.milestone} onChange={(e) => setForm({ ...form, milestone: e.target.value })} />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="blockers">BLOCKERS</label>
          <input id="blockers" className="form-input"
            value={form.blockers} onChange={(e) => setForm({ ...form, blockers: e.target.value })} />
        </div>

        <div className="form-group">
          <label className="form-label">NEXT MICRO-ACTIONS (MAX 3)</label>
          {form.actions.map((action, i) => (
            <input key={i} className="form-input" style={{ marginBottom: "0.5rem" }}
              placeholder={`Action ${i + 1}`}
              value={action}
              onChange={(e) => {
                const updated = [...form.actions];
                updated[i] = e.target.value;
                setForm({ ...form, actions: updated });
              }} />
          ))}
        </div>

        <div className="form-group">
          <label className="form-label">DECISION</label>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {DECISIONS.map((d) => (
              <button key={d}
                onClick={() => setForm({ ...form, decision: d })}
                style={{
                  padding: "0.5rem 1rem",
                  border: `1px solid ${form.decision === d ? "var(--blue)" : "var(--border)"}`,
                  background: form.decision === d ? "var(--blue)" : "transparent",
                  color: form.decision === d ? "#fff" : "var(--text-muted)",
                  fontFamily: "Inter, sans-serif",
                  fontSize: "0.65rem",
                  letterSpacing: "0.15em",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}>
                {d.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="reason">REASON (1 LINE)</label>
          <input id="reason" className="form-input"
            value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
        </div>

        <button className="save-btn full-width" onClick={handleNext} disabled={saving}>
          {saving ? "SAVING..." : currentProject + 1 < projects.length ? "NEXT PROJECT →" : "FINISH RECAP"}
        </button>
      </div>
    </div>
  );
}