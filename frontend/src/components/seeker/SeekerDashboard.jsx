import React from "react";

export default function SeekerDashboard({
  currentUser,
  seekerMetrics,
  isPro,
  setShowProModal,
  allJobs,
  savedJobs,
  toggleSaveJob,
  applyJob,
  viewResume,
  handleResumeUpload,
  myApplications,
  setActiveTab,
}) {
  const companyJobsList = [...allJobs]
    .sort((a, b) => b.id - a.id)
    .slice(0, 6);

  return (
    <div>
      {/* Metrics Row */}
      <div className="metric-row">
        <div className="metric-card">
          <div className="metric-icon blue">
            <i className="fas fa-check-circle"></i>
          </div>
          <div className="metric-info">
            <h5>Job Applied</h5>
            <h3>{seekerMetrics.applied}</h3>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon orange">
            <i className="fas fa-bookmark"></i>
          </div>
          <div className="metric-info">
            <h5>Saved Jobs</h5>
            <h3>{seekerMetrics.saved}</h3>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon green">
            <i className="fas fa-envelope-open-text"></i>
          </div>
          <div className="metric-info">
            <h5>Job Offers</h5>
            <h3>{seekerMetrics.offers}</h3>
          </div>
        </div>
      </div>

      {/* Upgrade Pro Banner */}
      {!isPro && (
        <div className="upgrade-banner">
          <div className="upgrade-text d-flex align-items-center gap-3">
            <div
              className="metric-icon"
              style={{
                background: "rgba(255,255,255,0.2)",
                color: "white",
              }}
            >
              <i className="fas fa-star"></i>
            </div>
            <div>
              <h4>See jobs where you'd be a top applicant</h4>
              <p>Try PRO free for 6 months and boost your visibility.</p>
            </div>
          </div>
          <button
            className="btn btn-light fw-bold rounded-pill px-4 text-primary"
            onClick={() => setShowProModal(true)}
          >
            GO PRO
          </button>
        </div>
      )}

      {/* Job recommendations grid and Resume panel */}
      <div className="row g-4">
        <div className="col-xl-8 col-lg-7">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h4 className="fw-bold m-0">Recommended For You</h4>
            <button
              className="btn btn-outline-primary btn-sm rounded-pill px-3"
              onClick={() => setActiveTab("find")}
            >
              View All
            </button>
          </div>

          <div className="job-grid">
            {companyJobsList.map((job) => {
              const isSaved = savedJobs.includes(job.id);
              const companyName = job.company?.name || "Unknown Company";
              return (
                <div
                  key={job.id}
                  className={`job-card ${isPro ? "top-applicant-card" : ""}`}
                >
                  <div className="d-flex justify-content-between">
                    <div className="job-company-logo">
                      {companyName.charAt(0).toUpperCase()}
                    </div>
                    <button
                      className="btn btn-light rounded-circle p-2 shadow-sm border-0"
                      onClick={() => toggleSaveJob(job.id, job.title)}
                      style={{ width: "40px", height: "40px" }}
                    >
                      <i
                        className={`fa-heart ${isSaved ? "fas text-danger" : "far text-muted"}`}
                      ></i>
                    </button>
                  </div>
                  <h5 className="job-title">{job.title}</h5>
                  <div className="company-name">
                    <i className="fas fa-building me-1"></i> {companyName}
                  </div>
                  <div className="job-location text-muted small mb-2">
                    <i className="fas fa-map-marker-alt me-1"></i>{" "}
                    {job.location || "Remote"}
                  </div>
                  <p className="job-desc">
                    {(job.description || "").length > 100
                      ? (job.description || "").substring(0, 100) + "..."
                      : job.description || ""}
                  </p>
                  <div className="d-flex flex-wrap gap-2 mb-3">
                    {(job.requiredSkills || job.required_skills || "")
                      .split(",")
                      .map((skill, i) => (
                        <span key={i} className="badge-modern badge-gray">
                          {skill.trim()}
                        </span>
                      ))}
                  </div>
                  <div className="job-card-footer">
                    <span className="text-muted small">
                      <i className="fas fa-clock me-1"></i> Full Time
                    </span>
                    <button
                      className="btn btn-modern btn-primary-custom btn-sm px-4"
                      onClick={() => applyJob(job)}
                    >
                      Apply
                    </button>
                  </div>
                </div>
              );
            })}
            {allJobs.length === 0 && (
              <p className="text-muted">Loading active jobs...</p>
            )}
          </div>
        </div>

        <div className="col-xl-4 col-lg-5">
          {/* Resume Card */}
          <div className="card-modern">
            <div className="card-header-modern">
              <h4 className="card-title-modern fw-bold">My Resume</h4>
            </div>
            <div id="resumeCardContent">
              {currentUser.resumeFilename ? (
                <div className="p-3 border rounded-3 bg-white shadow-sm d-flex flex-column gap-3 text-center border-start border-4 border-success">
                  <div className="d-flex align-items-center gap-3 text-start">
                    <div
                      className="bg-success text-white rounded-circle d-flex align-items-center justify-content-center"
                      style={{
                        width: "44px",
                        height: "44px",
                        fontSize: "1.25rem",
                      }}
                    >
                      <i className="fas fa-file-pdf"></i>
                    </div>
                    <div style={{ flex: "1", minWidth: "0" }}>
                      <h6
                        className="fw-bold text-dark mb-0 text-truncate"
                        title={currentUser.resumeFilename}
                      >
                        {currentUser.resumeFilename}
                      </h6>
                      <p className="text-muted small mb-0">Resume active</p>
                    </div>
                  </div>
                  <div className="d-flex gap-2">
                    <button
                      className="btn btn-resume btn-sm w-100"
                      onClick={() =>
                        viewResume(
                          currentUser.id,
                          currentUser.name,
                          currentUser.skills,
                        )
                      }
                    >
                      <i className="fas fa-eye me-1"></i> View
                    </button>
                    <button
                      className="btn btn-outline-primary-custom btn-sm w-100"
                      onClick={() =>
                        document.getElementById("resumeFileInput").click()
                      }
                    >
                      <i className="fas fa-sync me-1"></i> Replace
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  className="upload-area"
                  onClick={() =>
                    document.getElementById("resumeFileInput").click()
                  }
                >
                  <i className="fas fa-cloud-upload-alt upload-icon"></i>
                  <h5 className="fw-bold">Upload Resume</h5>
                  <p className="text-muted small mb-0">PDF, DOCX up to 5MB</p>
                </div>
              )}
              <input
                type="file"
                id="resumeFileInput"
                className="d-none"
                onChange={handleResumeUpload}
                accept=".pdf,.doc,.docx"
              />
            </div>
          </div>

          {/* Recent Applications Card */}
          <div className="card-modern mt-4">
            <div className="card-header-modern">
              <h4 className="card-title-modern fw-bold">Recent Applications</h4>
            </div>
            <div className="d-flex flex-column gap-3">
              {myApplications.slice(0, 4).map((app) => {
                let badgeClass = "badge-gray";
                if (app.status === "SCREENING") badgeClass = "badge-blue";
                if (app.status === "ASSESSMENT") badgeClass = "badge-yellow";
                if (app.status === "INTERVIEW") badgeClass = "badge-purple";
                if (app.status === "OFFER") badgeClass = "badge-green";
                if (app.status === "REJECTED") badgeClass = "badge-red";

                return (
                  <div
                    key={app.id}
                    className="p-3 border rounded-3 bg-white shadow-sm d-flex flex-column gap-2"
                  >
                    <div className="d-flex justify-content-between align-items-start">
                      <div>
                        <h6 className="fw-bold mb-1">{app.job?.title}</h6>
                        <p className="text-muted small mb-0">
                          <i className="fas fa-building me-1"></i>{" "}
                          {app.job?.company?.name}
                        </p>
                      </div>
                      <span className={`badge-modern ${badgeClass}`}>
                        {app.status}
                      </span>
                    </div>
                    <div className="d-flex flex-wrap gap-1 mt-1">
                      {(app.job?.requiredSkills || app.job?.required_skills || "")
                        .split(",")
                        .slice(0, 3)
                        .map((skill, i) => skill.trim() && (
                          <span
                            key={i}
                            className="badge-modern badge-gray"
                            style={{ fontSize: "0.65rem", padding: "0.15rem 0.4rem" }}
                          >
                            {skill.trim()}
                          </span>
                        ))}
                    </div>
                  </div>
                );
              })}
              {myApplications.length === 0 && (
                <p className="text-muted small">No applications yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
