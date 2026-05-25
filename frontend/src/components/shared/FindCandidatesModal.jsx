import React from "react";

export default function FindCandidatesModal({
  showFindCandidatesModal,
  setShowFindCandidatesModal,
  globalCandidateResults,
  viewResume,
}) {
  if (!showFindCandidatesModal) return null;

  return (
    <div
      className="modal show d-block bg-dark bg-opacity-50"
      tabIndex="-1"
    >
      <div className="modal-dialog modal-dialog-centered modal-xl">
        <div className="modal-content border-0 rounded-4 shadow-lg">
          <div className="modal-header bg-primary text-white p-4 rounded-top-4">
            <h5 className="modal-title fw-bold">
              <i className="fas fa-users-cog me-2"></i> AI Candidate Matching Engine
            </h5>
            <button
              type="button"
              className="btn-close btn-close-white"
              onClick={() => setShowFindCandidatesModal(false)}
            ></button>
          </div>
          <div className="modal-body p-4 bg-light">
            <p className="text-muted mb-4">
              These candidates are registered on OLPReact and have skill sets
              matching your active job post criteria.
            </p>
            <div className="table-responsive">
              <table className="table table-modern">
                <thead>
                  <tr>
                    <th>Candidate Name</th>
                    <th>Email Contact</th>
                    <th>Registered Skills</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {globalCandidateResults.map((seeker) => (
                    <tr key={seeker.id}>
                      <td>
                        <div className="candidate-name-cell">
                          <div className="avatar">
                            {seeker.name
                              ? seeker.name.charAt(0).toUpperCase()
                              : "U"}
                          </div>
                          <div className="fw-bold text-dark">{seeker.name}</div>
                        </div>
                      </td>
                      <td className="text-muted">{seeker.email}</td>
                      <td>
                        <div className="d-flex flex-wrap gap-1">
                          {seeker.skills ? (
                            seeker.skills.split(",").map((s, idx) => (
                              <span
                                key={idx}
                                className="badge-modern badge-gray"
                                style={{ fontSize: "0.7rem" }}
                              >
                                {s.trim()}
                              </span>
                            ))
                          ) : (
                            <span className="text-muted small">None listed</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <button
                          className="btn btn-resume"
                          onClick={() =>
                            viewResume(seeker.id, seeker.name, seeker.skills)
                          }
                        >
                          <i className="fas fa-file-pdf me-1"></i> View Resume
                        </button>
                      </td>
                    </tr>
                  ))}
                  {globalCandidateResults.length === 0 && (
                    <tr>
                      <td colSpan="4" className="text-center py-5 text-muted">
                        <i className="fas fa-users-slash fs-1 mb-3 text-light"></i>
                        <p>No registered candidates found matching your criteria.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div className="modal-footer p-3 bg-white d-flex justify-content-end">
            <button
              type="button"
              className="btn btn-modern btn-light border px-4"
              onClick={() => setShowFindCandidatesModal(false)}
            >
              Close Matching Engine
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
