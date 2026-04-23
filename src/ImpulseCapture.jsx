import { useState } from "react";
import { readFile, writeFile, writeJSON, parseImpulseToJSON, getWeekNumber } from "./github";

export default function ImpulseCapture({ onBack }) {
  const [project, setProject] = useState("");
  const [impulse, setImpulse] = useState("");
  const [microAction, setMicroAction] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function getFilePaths() {
    const now = new Date();
    const year = now.getFullYear();
    const week = getWeekNumber(now);
    const weekStr = `${year}-W${String(week).padStart(2, "0")}`;
    return {
      md: `RECAPS/WEEKLY/${weekStr}_impulse.md`,
      json: `DATA/WEEKLY/${weekStr}_impulse.json`,
      week,
      year,
    };
  }

  async function handleLog() {
    if (!project || !impulse) return;
    setSaving(true);

    const today = new Date().toISOString().split("T")[0];
    const { md, json, week, year } = getFilePaths();
    const newRow = `| | ${project} | ${today} | ${impulse} | ${microAction} | #impulse |`;

    try {
      let existing = "";
      try {
        existing = await readFile(md);
      } catch {
        existing = getBlankLog(today);
      }

      const updated = existing + "\n" + newRow;

      // Write markdown
      await writeFile(md, updated, `Impulse log: ${project} ${today}`);

      // Generate and write JSON sidecar
      const jsonData = parseImpulseToJSON(updated, week, year);
      await writeJSON(json, jsonData, `Data sync: ${project} ${today}`);

      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        setProject("");
        setImpulse("");
        setMicroAction("");
      }, 1500);
    } catch (err) {
      console.error("Failed to log impulse:", err);
    } finally {
      setSaving(false);
    }
  }

  function getBlankLog(today) {
    return `# Daily Impulse Log\n\n## ${today} — Day Log\n\n| # | Project | Date | Impulse / Note | Micro-Action | Tag |\n|---|---------|------|----------------|--------------|-----|\n`;
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <button className="back-btn" onClick={onBack}>
          ← BACK
        </button>
        <span className="dashboard-subtitle">IMPULSE CAPTURE</span>
      </header>

      <div className="impulse-form">
        <div className="form-group">
          <label className="form-label" htmlFor="project">PROJECT</label>
          <input
            id="project"
            className="form-input"
            type="text"
            placeholder="Which project?"
            value={project}
            onChange={(e) => setProject(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="impulse">IMPULSE / NOTE</label>
          <textarea
            id="impulse"
            className="form-textarea"
            placeholder="What just happened, what do you know, what hit you?"
            value={impulse}
            onChange={(e) => setImpulse(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="microaction">MICRO-ACTION (optional)</label>
          <input
            id="microaction"
            className="form-input"
            type="text"
            placeholder="Next obvious step if any"
            value={microAction}
            onChange={(e) => setMicroAction(e.target.value)}
          />
        </div>

        <button
          className="save-btn full-width"
          onClick={handleLog}
          disabled={saving || !project || !impulse}
        >
          {saving ? "LOGGING..." : saved ? "LOGGED ✓" : "LOG IMPULSE"}
        </button>
      </div>
    </div>
  );
}