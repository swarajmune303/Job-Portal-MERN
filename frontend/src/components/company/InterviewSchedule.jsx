import React from "react";

export default function InterviewSchedule({ companyApplications, viewResume }) {
  const getInterviewApps = () => {
    const localApps = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith("localApps_")) {
        localApps.push(...(JSON.parse(localStorage.getItem(key)) || []));
      }
    }

    const allCompanyApps = [...(companyApplications || [])];
    localApps.forEach((la) => {
      if (
        !allCompanyApps.some(
          (a) =>
            a.id === la.id ||
            (a.job?.id === la.job?.id &&
              (a.applicant?.id === la.applicant?.id || a.user_id === la.user_id)),
        )
      ) {
        allCompanyApps.push(la);
      }
    });

    return allCompanyApps.filter((app) => app.status === "INTERVIEW");
  };

  const interviews = getInterviewApps();

  return (
    <div className="card-modern">
      <h4 className="fw-bold mb-2">Recruiter Interview Schedule</h4>
      <p className="text-muted small mb-4">
        Candidates who successfully navigated screening/assessment stages and
        are currently scheduled for interviews.
      </p>
      <div className="table-responsive-custom">
        <table className="table table-modern">
          <thead>
            <tr>
              <th>Candidate Profile</th>
              <th>Required Job Title</th>
              <th>Skills Match</th>
              <th>Action View</th>
            </tr>
          </thead>
          <tbody>
            {interviews.map((app) => (
              <tr key={app.id}>
                <td>
                  <div className="candidate-name-cell">
                    <div className="avatar">
                      {app.applicant?.name
                        ? app.applicant.name.charAt(0).toUpperCase()
                        : "U"}
                    </div>
                    <div>
                      <div className="fw-bold text-dark">
                        {app.applicant?.name}
                      </div>
                      <div className="small text-muted">{app.applicant?.email}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <h6 className="fw-bold m-0 text-primary">{app.job?.title}</h6>
                  <span className="small text-muted">
                    Company Reference Job Post
                  </span>
                </td>
                <td>
                  <span className="fw-bold text-success">
                    {(app.resumeMatchScore || 0).toFixed(0)}% Match
                  </span>
                  <div className="score-container" style={{ width: "100px" }}>
                    <div
                      className="score-bar score-high"
                      style={{ width: `${app.resumeMatchScore || 0}%` }}
                    ></div>
                  </div>
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
                    <i className="fas fa-file-pdf me-1"></i> View Resume
                  </button>
                </td>
              </tr>
            ))}
            {interviews.length === 0 && (
              <tr>
                <td colSpan="4" className="text-center py-5 text-muted">
                  <i className="fas fa-calendar-times fs-1 mb-3 text-light"></i>
                  <p>No candidates scheduled for interviews yet.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
