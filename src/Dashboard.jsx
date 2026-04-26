import { useEffect, useState } from "react";
import { listFiles } from "./github";

const priorityMap = {
  "college-courses": 1,
  "blockchain-content-brand": 1,
  "client-website": 1,
  "win-ai": 2,
  "isc2-cc": 2,
  "credit-repair": 2,
  "mahari-brand": 3,
  "getting-a-car": 3,
  "vend-w-royal": 4,
  "mahari-transfer-portal": 4,
};

const priorityLabel = {
  1: "Priority I",
  2: "Priority II",
  3: "Priority III",
  4: "Priority IV",
};

const priorityColor = {
  1: "#2563eb",
  2: "#4b79c4",
  3: "#6b7280",
  4: "#374151",
};

export default function Dashboard({ onSelectProject, onImpulse, onRecap }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProjects() {
      try {
        const files = await listFiles("PROJECTS");
        setProjects(files.filter((f) => f.name.endsWith(".md")));
      } catch (err) {
        console.error("Failed to load projects:", err);
      } finally {
        setLoading(false);
      }
    }
    loadProjects();
  }, []);

  const getProjectName = (filename) =>
    filename.replace("-ledger.md", "").replace(/-/g, " ").toUpperCase();

  const getKey = (filename) =>
    filename.replace("-ledger.md", "").toLowerCase();

  const getPriority = (filename) => priorityMap[getKey(filename)] || 5;

  const sorted = [...projects].sort(
    (a, b) => getPriority(a.name) - getPriority(b.name)
  );

  if (loading)
    return (
      <div className="loading">
        <span>Loading</span>
      </div>
    );

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <p className="dashboard-subtitle">SYSTEM</p>
        <h1 className="dashboard-title">Recap</h1>
      </header>

      <div className="project-list">
        {sorted.map((file) => {
          const priority = getPriority(file.name);
          return (
            <div key={file.sha} className="project-card" onClick={() => onSelectProject(`PROJECTS/${file.name}`)}>
              <div className="project-card-left">
                <span className="project-name">{getProjectName(file.name)}</span>
              </div>
              <div className="project-card-right">
                <span
                  className="priority-badge"
                  style={{ color: priorityColor[priority] }}
                >
                  {priorityLabel[priority]}
                </span>
              </div>
            </div>
          );
        })}
      </div>
        <button
        className="save-btn full-width"
         style={{ marginTop: "2rem" }}
            onClick={onImpulse}
        >               
            + LOG IMPULSE
        </button>
    </div>
  );
}