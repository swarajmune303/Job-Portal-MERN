import React from "react";

export default function JobsManagement({
  currentUser,
  allJobs,
  handleDeleteJob,
  setActiveTab,
  selectAtsJob,
  setShowPostJobModal,
}) {
  return (
    <div className="card-modern">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="fw-bold m-0">Company Job Openings</h4>
        <button
          className="btn btn-primary-custom btn-modern"
          onClick={() => setShowPostJobModal(true)}
        >
          <i className="fas fa-plus"></i> Create Job Opening
        </button>
      </div>
      <div className="job-grid">
        {allJobs.map((job) => (
          <div key={job.id} className="job-card">
            <div className="d-flex justify-content-between">
              <div className="job-company-logo">
                {currentUser.name.charAt(0).toUpperCase()}
              </div>
              <button
                className="btn btn-light rounded-circle p-2 shadow-sm border-0 text-danger"
                onClick={() => handleDeleteJob(job.id, job.title)}
                style={{ width: "40px", height: "40px" }}
              >
                <i className="fas fa-trash-alt"></i>
              </button>
            </div>
            <h5 className="job-title">{job.title}</h5>
            <div className="company-name">
              <i className="fas fa-building me-1"></i> {currentUser.name}
            </div>
            <div className="job-location text-muted small mb-2">
              <i className="fas fa-map-marker-alt me-1"></i>{" "}
              {job.location || "Remote"}
            </div>
            <p className="job-desc">{job.description || ""}</p>
            <div className="d-flex flex-wrap gap-2 mb-3">
              {(job.requiredSkills || job.required_skills || "")
                .split(",")
                .map((skill, i) => (
                  <span key={i} className="badge-modern badge-gray">
                    {skill.trim()}
                  </span>
                ))}
            </div>
            <div className="job-card-footer mt-auto">
              <span className="badge bg-success text-white py-2 px-3 rounded-pill">
                Active Status
              </span>
              <button
                className="btn btn-outline-primary-custom btn-sm px-3 py-2 rounded-pill"
                onClick={() => {
                  setActiveTab("dashboard");
                  selectAtsJob(job);
                }}
              >
                View ATS pipeline
              </button>
            </div>
          </div>
        ))}
        {allJobs.length === 0 && (
          <p className="text-muted">
            No published openings yet. Click Create Job to publish one.
          </p>
        )}
      </div>
    </div>
  );
}
