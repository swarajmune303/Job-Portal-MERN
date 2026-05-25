import React from "react";

export default function Topbar({
  currentUser,
  activeTab,
  setActiveTab,
  jobSearch,
  setJobSearch,
  globalSearchQuery,
  setGlobalSearchQuery,
  handleGlobalCandidateSearch,
  unreadCount,
  notifications,
  setNotifications,
  setShowPostJobModal,
}) {
  if (!currentUser) return null;

  return (
    <div className="topbar">
      <div className="topbar-search d-none d-md-block">
        <i className="fas fa-search"></i>
        {currentUser.role === "SEEKER" ? (
          <input
            type="text"
            placeholder="Search jobs, skills or companies..."
            value={jobSearch}
            onChange={(e) => {
              setJobSearch(e.target.value);
              if (activeTab !== "find") {
                setActiveTab("find");
              }
            }}
          />
        ) : (
          <input
            type="text"
            placeholder="Search candidate by name or skill..."
            value={globalSearchQuery}
            onChange={(e) => setGlobalSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setActiveTab("candidates");
                handleGlobalCandidateSearch();
              }
            }}
          />
        )}
      </div>

      <div className="d-flex align-items-center gap-3">
        {currentUser.role === "COMPANY" && (
          <button
            className="btn btn-primary-custom btn-modern me-3"
            onClick={() => setShowPostJobModal(true)}
          >
            <i className="fas fa-plus"></i> Create Job
          </button>
        )}

        {/* Notification Bell Dropdown */}
        <div className="dropdown">
          <button
            className="btn btn-light rounded-circle p-2 position-relative dropdown-toggle border-0"
            data-bs-toggle="dropdown"
            style={{ content: "none" }}
          >
            <i className="fas fa-bell text-muted"></i>
            {unreadCount > 0 && (
              <span className="position-absolute top-0 start-100 translate-middle p-1 bg-danger border border-light rounded-circle"></span>
            )}
          </button>
          <div
            className="dropdown-menu dropdown-menu-end p-0 border-0 shadow-lg"
            style={{
              width: "320px",
              borderRadius: "12px",
              overflow: "hidden",
            }}
          >
            <div className="p-3 bg-primary text-white d-flex justify-content-between align-items-center">
              <h6 className="m-0 fw-bold">
                <i className="fas fa-bell me-2"></i> Notifications
              </h6>
              <span className="badge bg-white text-primary rounded-pill small">
                {unreadCount} New
              </span>
            </div>
            <div
              className="d-flex flex-column"
              style={{
                maxHeight: "300px",
                overflowY: "auto",
                background: "white",
              }}
            >
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-muted small">
                  <i className="fas fa-bell-slash d-block fs-3 mb-2 text-light"></i>
                  No notifications yet
                </div>
              ) : (
                notifications.map((n) => {
                  let icon = "fa-info-circle text-primary";
                  if (n.type === "SUCCESS") icon = "fa-check-circle text-success";
                  if (n.type === "WARNING") icon = "fa-exclamation-circle text-warning";
                  if (n.type === "MATCH") icon = "fa-briefcase text-purple";

                  return (
                    <div
                      key={n.id}
                      className={`p-3 border-bottom d-flex gap-3 align-items-start ${n.read ? "" : "bg-light fw-semibold"}`}
                    >
                      <i className={`fas ${icon} fs-5 mt-1`}></i>
                      <div style={{ flex: "1", minWidth: "0" }}>
                        <p
                          className="m-0 small text-dark"
                          style={{ lineHeight: "1.4" }}
                        >
                          {n.text}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <div className="p-2 border-top bg-light text-center">
              <a
                href="#"
                className="text-decoration-none small fw-semibold text-primary"
                onClick={(e) => {
                  e.preventDefault();
                  const key = `notifications_${currentUser.id}`;
                  const list = JSON.parse(localStorage.getItem(key)) || [];
                  const updated = list.map((n) => ({ ...n, read: true }));
                  localStorage.setItem(key, JSON.stringify(updated));
                  setNotifications(updated);
                }}
              >
                Mark all as read
              </a>
            </div>
          </div>
        </div>

        <div
          className="user-profile-badge"
          onClick={() => setActiveTab("profile")}
          style={{ cursor: "pointer" }}
        >
          <div className="avatar">
            {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : "U"}
          </div>
          <span className="fw-semibold me-2">
            {currentUser.name || "User"}
          </span>
        </div>
      </div>
    </div>
  );
}
