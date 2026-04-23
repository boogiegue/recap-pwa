import { useEffect, useState } from "react";
import { readFile } from "./github";
import { marked } from "marked";
import EditView from "./EditView";

export default function ProjectView({ path, onBack }) {
  const [content, setContent] = useState("");
  const [rawContent, setRawContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const raw = await readFile(path);
        setRawContent(raw);
        setContent(marked(raw));
      } catch (err) {
        console.error("Failed to load project:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [path]);

  function handleSave(newContent) {
    setRawContent(newContent);
    setContent(marked(newContent));
    setEditing(false);
  }

  if (loading)
    return (
      <div className="loading">
        <span>Loading</span>
      </div>
    );

  if (editing)
    return (
      <EditView
        path={path}
        rawContent={rawContent}
        onBack={() => setEditing(false)}
        onSave={handleSave}
      />
    );

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <button className="back-btn" onClick={onBack}>
          ← BACK
        </button>
        <button className="save-btn" onClick={() => setEditing(true)}>
          EDIT
        </button>
      </header>
      <div
        className="markdown-body"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    </div>
  );
}