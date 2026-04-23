import { useState } from "react";
import { writeFile, writeJSON, parseLedgerToJSON } from "./github";

export default function EditView({ path, rawContent, onBack, onSave }) {
  const [content, setContent] = useState(rawContent);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function getJSONPath(mdPath) {
    // Convert PROJECTS/college-courses-ledger.md → DATA/PROJECTS/college-courses.json
    const filename = mdPath.split("/").pop();
    const projectName = filename.replace("-ledger.md", "");
    return `DATA/PROJECTS/${projectName}.json`;
  }

  function getProjectName(mdPath) {
    const filename = mdPath.split("/").pop();
    return filename.replace("-ledger.md", "").replace(/-/g, " ");
  }

  async function handleSave() {
    setSaving(true);
    try {
      // Write markdown
      await writeFile(path, content, `Update ${path}`);

      // Generate and write JSON sidecar
      const projectName = getProjectName(path);
      const jsonData = parseLedgerToJSON(content, projectName);
      const jsonPath = getJSONPath(path);
      await writeJSON(jsonPath, jsonData, `Data sync: ${projectName}`);

      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        onSave(content);
      }, 1500);
    } catch (err) {
      console.error("Failed to save:", err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <button className="back-btn" onClick={onBack}>
          ← BACK
        </button>
        <button
          className="save-btn"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "SAVING..." : saved ? "SAVED ✓" : "SAVE"}
        </button>
      </header>
      <textarea
        className="editor"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        spellCheck={false}
      />
    </div>
  );
}