import React from "react";

export default function CompanyDashboard({
  companyMetrics,
  allJobs,
  atsJob,
  selectAtsJob,
  handleDeleteJob,
  displayApplicants,
  handleStatusChange,
  viewResume,
  setShowFindCandidatesModal,
  handleGlobalCandidateSearch,
}) {
  return (
    <div>
      {/* Metrics Cards */}
      <div className="metric-row">
        <div className="metric-card">
          <div className="metric-icon blue">
            <i className="fas fa-users"></i>
          </div>
          <div className="metric-info">
            <h5>Total Candidates</h5>
            <h3>{companyMetrics.totalCandidates}</h3>
            <p className="text-muted small m-0 mt-1">Across all jobs</p>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon pink">
            <i className="fas fa-user-plus"></i>
          </div>
          <div className="metric-info">
            <h5>New Applied</h5>
            <h3>{companyMetrics.newCandidates}</h3>
            <p className="text-muted small m-0 mt-1">Status: Applied</p>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon orange">
            <i className="fas fa-calendar-check"></i>
          </div>
          <div className="metric-info">
            <h5>Upcoming Interviews</h5>
            <h3>{companyMetrics.interviews}</h3>
            <p className="text-muted small m-0 mt-1">Status: Interview</p>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon green">
            <i className="fas fa-user-check"></i>
          </div>
          <div className="metric-info">
            <h5>Candidate Hired</h5>
            <h3>{companyMetrics.hired}</h3>
            <p className="text-muted small m-0 mt-1">Status: Offer</p>
          </div>
        </div>
      </div>

      <div className="row g-4">
        {/* Left Column: Active job postings */}
        <div className="col-xl-4 col-lg-5">
          <div className="card-modern">
            <div className="card-header-modern">
              <h4 className="card-title-modern fw-bold">Active Jobs</h4>
            </div>
            <div className="d-flex flex-column gap-3">
              {allJobs.map((job) => (
                <div
                  key={job.id}
                  className={`p-3 border rounded-3 bg-white shadow-sm d-flex flex-column gap-2 cursor-pointer border-start border-4 ${atsJob?.id === job.id ? "border-primary bg-primary bg-opacity-10" : "border-secondary"}`}
                  onClick={() => selectAtsJob(job)}
                >
                  <div className="d-flex justify-content-between align-items-center">
                    <h6 className="fw-bold mb-0 text-dark">{job.title}</h6>
                    <div className="d-flex align-items-center gap-2">
                      <button
                        className="btn btn-link text-danger p-0 border-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteJob(job.id, job.title);
                        }}
                      >
                        <i className="fas fa-trash-alt"></i>
                      </button>
                    </div>
                  </div>
                  <div className="small text-muted">
                    <i className="fas fa-map-marker-alt me-1"></i>{" "}
                    {job.location || "Remote"}
                  </div>
                  <p className="text-muted small mb-0 text-truncate">
                    Skills: {job.requiredSkills || job.required_skills}
                  </p>
                </div>
              ))}
              {allJobs.length === 0 && (
                <p className="text-muted text-center p-3">
                  No active jobs. Click 'Create Job' to publish one.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: ATS Applicant Tracking pipeline */}
        <div className="col-xl-8 col-lg-7">
          <div className="card-modern h-100">
            <div className="card-header-modern mb-2">
              <div>
                <h4 className="card-title-modern fw-bold">
                  {atsJob ? `ATS: ${atsJob.title}` : "Applicant Tracking System"}
                </h4>
                <p className="text-muted small m-0 mt-1">
                  {atsJob
                    ? "Review candidate profile details, matching percentages, and process stages."
                    : "Select an active job from the left sidebar panel to manage applicants."}
                </p>
              </div>
              {atsJob && (
                <button
                  className="btn btn-outline-primary-custom btn-sm rounded-pill px-3"
                  onClick={() => {
                    setShowFindCandidatesModal(true);
                    handleGlobalCandidateSearch();
                  }}
                >
                  <i className="fas fa-search me-1"></i> Match Seekers
                </button>
              )}
            </div>

            <div className="table-responsive-custom">
              <table className="table table-modern">
                <thead>
                  <tr>
                    <th>Applicant Name</th>
                    <th>Match Score</th>
                    <th>Skills</th>
                    <th>Status Pipeline</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {displayApplicants.map((app) => {
                    const matchScore = app.resumeMatchScore || 0;
                    let scoreClass = "score-high";
                    if (matchScore < 70) scoreClass = "score-med";
                    if (matchScore < 40) scoreClass = "score-low";

                    return (
                      <tr key={app.id}>
                        <td>
                          <div className="candidate-name-cell">
                            <div
                              className="avatar"
                              style={{
                                width: "36px",
                                height: "36px",
                                fontSize: "0.9rem",
                              }}
                            >
                              {app.applicant?.name
                                ? app.applicant.name.charAt(0).toUpperCase()
                                : "U"}
                            </div>
                            <div>
                              <div className="fw-bold text-dark">
                                {app.applicant?.name}
                              </div>
                              <div className="small text-muted">
                                {app.applicant?.email}
                                {!atsJob && app.job?.title && (
                                  <span
                                    className="badge-modern badge-blue ms-2"
                                    style={{ fontSize: "0.65rem", padding: "0.15rem 0.4rem" }}
                                  >
                                    {app.job.title}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="fw-bold">
                            {matchScore.toFixed(0)}%
                          </span>{" "}
                          Match
                          <div className="score-container">
                            <div
                              className={`score-bar ${scoreClass}`}
                              style={{ width: `${matchScore}%` }}
                            ></div>
                          </div>
                        </td>
                        <td>
                          <div className="d-flex flex-wrap gap-1">
                            {app.applicant?.skills ? (
                              app.applicant.skills
                                .split(",")
                                .slice(0, 3)
                                .map((s, idx) => (
                                  <span
                                    key={idx}
                                    className="badge-modern badge-gray"
                                    style={{
                                      fontSize: "0.65rem",
                                      padding: "0.2rem 0.5rem",
                                    }}
                                  >
                                    {s.trim()}
                                  </span>
                                ))
                            ) : (
                              <span className="text-muted small">N/A</span>
                            )}
                          </div>
                        </td>
                        <td>
                          <select
                            className="form-select form-select-sm border-0 bg-light fw-medium"
                            value={app.status}
                            onChange={(e) =>
                              handleStatusChange(app.id, e.target.value)
                            }
                          >
                            <option value="APPLIED">Applied</option>
                            <option value="SCREENING">Screening</option>
                            <option value="ASSESSMENT">Assessment</option>
                            <option value="INTERVIEW">Interview</option>
                            <option value="OFFER">Offer</option>
                            <option value="REJECTED">Rejected</option>
                          </select>
                        </td>
                        <td>
                          <button
                            className="btn btn-resume"
                            onClick={() =>
                              viewResume(
                                app.applicant?.id,
                                app.applicant?.name,
                                app.applicant?.skills,
                              )
                            }
                          >
                            <i className="fas fa-file-pdf me-1"></i> Resume
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {displayApplicants.length === 0 && (
                    <tr>
                      <td colSpan="5" className="text-center py-5 text-muted">
                        <i className="fas fa-folder-open fs-1 mb-3 text-light"></i>
                        <p>
                          {atsJob
                            ? "No applicants have submitted applications for this job post yet."
                            : "No candidate applications submitted yet."}
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
