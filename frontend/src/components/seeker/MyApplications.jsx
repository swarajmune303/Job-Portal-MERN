import React from "react";

export default function MyApplications({ myApplications }) {
  return (
    <div>
      <h4 className="fw-bold mb-4">My Applications Pipeline</h4>
      <div className="d-flex flex-column gap-3">
        {myApplications.map((app) => {
          let badgeClass = "badge-gray";
          if (app.status === "SCREENING") badgeClass = "badge-blue";
          if (app.status === "ASSESSMENT") badgeClass = "badge-yellow";
          if (app.status === "INTERVIEW") badgeClass = "badge-purple";
          if (app.status === "OFFER") badgeClass = "badge-green";
          if (app.status === "REJECTED") badgeClass = "badge-red";

          return (
            <div
              key={app.id}
              className="d-flex justify-content-between align-items-center p-4 border rounded-3 bg-white shadow-sm"
            >
              <div>
                <h5 className="fw-bold mb-1 text-dark">{app.job?.title}</h5>
                <p className="text-muted mb-0">
                  <i className="fas fa-building me-1"></i>{" "}
                  {app.job?.company?.name} &nbsp;&bull;&nbsp;{" "}
                  <i className="fas fa-map-marker-alt me-1"></i>{" "}
                  {app.job?.location || "Remote"}
                </p>
                <div className="mt-2">
                  <span className="small text-muted">
                    Screening Resume Match:
                  </span>
                  <span className="fw-bold text-primary ms-1">
                    {(app.resumeMatchScore || 0).toFixed(0)}%
                  </span>
                </div>
                <div className="d-flex flex-wrap gap-2 mt-2">
                  <span className="small text-muted align-self-center">
                    Required Skills:
                  </span>
                  {(app.job?.requiredSkills || app.job?.required_skills || "")
                    .split(",")
                    .map((skill, i) => skill.trim() && (
                      <span
                        key={i}
                        className="badge-modern badge-gray"
                        style={{ fontSize: "0.75rem" }}
                      >
                        {skill.trim()}
                      </span>
                    ))}
                </div>
              </div>
              <div className="text-end">
                <span className={`badge-modern fs-6 px-3 py-2 ${badgeClass}`}>
                  {app.status}
                </span>
              </div>
            </div>
          );
        })}
        {myApplications.length === 0 && (
          <p className="text-muted">You haven't applied to any jobs yet.</p>
        )}
      </div>
    </div>
  );
}
