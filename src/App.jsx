import { useState } from "react";
import Dashboard from "./Dashboard";
import ProjectView from "./ProjectView";
import ImpulseCapture from "./ImpulseCapture";
import WeeklyRecap from "./WeeklyRecap";

export default function App() {
  const [currentView, setCurrentView] = useState("dashboard");
  const [selectedProject, setSelectedProject] = useState(null);

  function openProject(path) {
    setSelectedProject(path);
    setCurrentView("project");
  }

  function goBack() {
    setCurrentView("dashboard");
    setSelectedProject(null);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "#fff" }}>
      {currentView === "dashboard" && (
        <Dashboard
          onSelectProject={openProject}
          onImpulse={() => setCurrentView("impulse")}
          onRecap={() => setCurrentView("recap")}
        />
      )}
      {currentView === "project" && (
        <ProjectView path={selectedProject} onBack={goBack} />
      )}
      {currentView === "impulse" && (
        <ImpulseCapture onBack={goBack} />
      )}
      {currentView === "recap" && (
        <WeeklyRecap onBack={goBack} />
      )}
    </div>
  );
}