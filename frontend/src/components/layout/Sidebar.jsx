import React from "react";

export default function Sidebar({ currentUser, activeTab, setActiveTab, logout }) {
  if (!currentUser) return null;

  return (
    <nav
      className={`sidebar ${currentUser.role === "SEEKER" ? "sidebar-light" : "sidebar-dark"}`}
    >
      <a href="#" className="brand text-decoration-none">
        {currentUser.role === "SEEKER" ? (
          <>
            <div className="brand-icon">JP</div>
            <span>JobPortal</span>
          </>
        ) : (
          <>
            <div className="brand-icon">
              <i className="fas fa-building text-white fs-5"></i>
            </div>
            <span>JobPortal Company</span>
          </>
        )}
      </a>

      <ul className="sidebar-nav mt-2">
        {currentUser.role === "SEEKER" ? (
          <>
            <li>
              <a
                className={activeTab === "dashboard" ? "active" : ""}
                onClick={() => setActiveTab("dashboard")}
              >
                <i className="fas fa-home me-2"></i> Dashboard
              </a>
            </li>
            <li>
              <a
                className={activeTab === "find" ? "active" : ""}
                onClick={() => setActiveTab("find")}
              >
                <i className="fas fa-briefcase me-2"></i> Find Jobs
              </a>
            </li>
            <li>
              <a
                className={activeTab === "saved" ? "active" : ""}
                onClick={() => setActiveTab("saved")}
              >
                <i className="fas fa-heart me-2"></i> Saved Jobs
              </a>
            </li>
            <li>
              <a
                className={activeTab === "applications" ? "active" : ""}
                onClick={() => setActiveTab("applications")}
              >
                <i className="fas fa-file-alt me-2"></i> My Applications
              </a>
            </li>
            <li>
              <a
                className={activeTab === "profile" ? "active" : ""}
                onClick={() => setActiveTab("profile")}
              >
                <i className="fas fa-user me-2"></i> Profile
              </a>
            </li>
          </>
        ) : (
          <>
            <li>
              <a
                className={activeTab === "dashboard" ? "active" : ""}
                onClick={() => setActiveTab("dashboard")}
              >
                <i className="fas fa-th-large me-2"></i> Dashboard
              </a>
            </li>
            <li>
              <a
                className={activeTab === "candidates" ? "active" : ""}
                onClick={() => setActiveTab("candidates")}
              >
                <i className="fas fa-users me-2"></i> Candidates
              </a>
            </li>
            <li>
              <a
                className={activeTab === "jobs" ? "active" : ""}
                onClick={() => setActiveTab("jobs")}
              >
                <i className="fas fa-briefcase me-2"></i> Jobs
              </a>
            </li>
            <li>
              <a
                className={activeTab === "schedule" ? "active" : ""}
                onClick={() => setActiveTab("schedule")}
              >
                <i className="fas fa-calendar-alt me-2"></i> Schedule
              </a>
            </li>
            <li>
              <a
                className={activeTab === "profile" ? "active" : ""}
                onClick={() => setActiveTab("profile")}
              >
                <i className="fas fa-user me-2"></i> Profile
              </a>
            </li>
          </>
        )}
      </ul>

      <div className="sidebar-bottom">
        <ul className="sidebar-nav">
          <li>
            <button
              onClick={logout}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                padding: "0.875rem 1.25rem",
                borderRadius: "var(--radius-md)",
                textDecoration: "none",
                fontWeight: "500",
                fontSize: "0.95rem",
                transition: "all 0.2s ease",
                cursor: "pointer",
                width: "100%",
                background: "transparent",
                border: "none",
                textAlign: "left",
                color: "#EF4444"
              }}
            >
              <i className="fas fa-sign-out-alt"></i> Logout
            </button>
          </li>
        </ul>
      </div>
    </nav>
  );
}
