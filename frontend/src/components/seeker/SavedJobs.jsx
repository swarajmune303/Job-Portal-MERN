import React from "react";

export default function SavedJobs({
  allJobs,
  savedJobs,
  toggleSaveJob,
  applyJob,
}) {
  const displayList = allJobs.filter((job) => savedJobs.includes(job.id));

  return (
    <div>
      <h4 className="fw-bold mb-4">Your Saved Jobs</h4>
      <div className="job-grid">
        {displayList.map((job) => {
          const isSaved = true;
          const companyName = job.company?.name || "Unknown Company";
          return (
            <div key={job.id} className="job-card">
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
        {displayList.length === 0 && (
          <p className="text-muted">No saved jobs yet.</p>
        )}
      </div>
    </div>
  );
}
