import React from "react";

export default function FindJobs({
  allJobs,
  jobSearch,
  savedJobs,
  toggleSaveJob,
  applyJob,
}) {
  const getDisplayJobsList = () => {
    const sortedJobs = [...allJobs].sort((a, b) => b.id - a.id);
    if (jobSearch.trim() === "") {
      return sortedJobs.slice(0, 12);
    } else {
      return sortedJobs.filter(
        (j) =>
          (j.title || "")
            .toLowerCase()
            .includes(jobSearch.toLowerCase()) ||
          (j.description || "")
            .toLowerCase()
            .includes(jobSearch.toLowerCase()) ||
          (j.requiredSkills || j.required_skills || "")
            .toLowerCase()
            .includes(jobSearch.toLowerCase()) ||
          (j.location || "")
            .toLowerCase()
            .includes(jobSearch.toLowerCase()),
      );
    }
  };

  const displayList = getDisplayJobsList();

  return (
    <div>
      <h4 className="fw-bold mb-4">All Available Jobs</h4>
      <div className="job-grid">
        {displayList.map((job) => {
          const isSaved = savedJobs.includes(job.id);
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
          <p className="text-muted">No jobs found matching your search.</p>
        )}
      </div>
    </div>
  );
}
