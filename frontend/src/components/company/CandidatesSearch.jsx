import React from "react";

export default function CandidatesSearch({
  globalSearchQuery,
  setGlobalSearchQuery,
  handleGlobalCandidateSearch,
  candidateDisplayList,
  viewResume,
}) {
  return (
    <div className="card-modern">
      <h4 className="fw-bold mb-4">All Active Candidates Database</h4>
      <div className="topbar-search w-100 mb-4 position-relative">
        <i className="fas fa-search"></i>
        <input
          type="text"
          placeholder="Search candidate by name or skill keywords..."
          value={globalSearchQuery}
          onChange={(e) => setGlobalSearchQuery(e.target.value)}
          style={{ paddingRight: "100px" }}
        />
        <button
          className="btn btn-primary-custom position-absolute top-50 end-0 translate-middle-y me-1 rounded-pill py-2"
          onClick={handleGlobalCandidateSearch}
          style={{ padding: "0.4rem 1.25rem" }}
        >
          Search
        </button>
      </div>

      <div className="table-responsive-custom">
        <table className="table table-modern">
          <thead>
            <tr>
              <th>Candidate Name</th>
              <th>Email Contact</th>
              <th>Registered Skills</th>
              <th>Action View</th>
            </tr>
          </thead>
          <tbody>
            {candidateDisplayList.map((seeker) => (
              <tr key={seeker.id}>
                <td>
                  <div className="candidate-name-cell">
                    <div className="avatar">
                      {seeker.name ? seeker.name.charAt(0).toUpperCase() : "U"}
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
            {candidateDisplayList.length === 0 && (
              <tr>
                <td colSpan="4" className="text-center py-5 text-muted">
                  <i className="fas fa-users-slash fs-1 mb-3 text-light"></i>
                  <p>No candidate applications submitted yet.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
