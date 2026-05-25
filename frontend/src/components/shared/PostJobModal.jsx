import React from "react";

export default function PostJobModal({
  showPostJobModal,
  setShowPostJobModal,
  jobForm,
  setJobForm,
  handlePostJob,
}) {
  if (!showPostJobModal) return null;

  return (
    <div
      className="modal show d-block bg-dark bg-opacity-50"
      tabIndex="-1"
    >
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content border-0 rounded-4 shadow-lg">
          <div className="modal-header bg-primary text-white p-4 rounded-top-4">
            <h5 className="modal-title fw-bold">
              <i className="fas fa-plus-circle me-2"></i> Post New Job Opening
            </h5>
            <button
              type="button"
              className="btn-close btn-close-white"
              onClick={() => setShowPostJobModal(false)}
            ></button>
          </div>
          <form onSubmit={handlePostJob}>
            <div className="modal-body p-4 bg-light">
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label fw-semibold">Job Title</label>
                  <input
                    type="text"
                    className="form-control form-control-modern"
                    placeholder="e.g. Senior Software Engineer"
                    value={jobForm.title}
                    onChange={(e) =>
                      setJobForm({ ...jobForm, title: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-semibold">Job Location</label>
                  <input
                    type="text"
                    className="form-control form-control-modern"
                    placeholder="e.g. New York, NY / Remote"
                    value={jobForm.location}
                    onChange={(e) =>
                      setJobForm({ ...jobForm, location: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="col-12">
                  <label className="form-label fw-semibold">
                    Required Professional Skills
                  </label>
                  <input
                    type="text"
                    className="form-control form-control-modern"
                    placeholder="e.g. React, Node.js, AWS (comma-separated)"
                    value={jobForm.requiredSkills}
                    onChange={(e) =>
                      setJobForm({
                        ...jobForm,
                        requiredSkills: e.target.value,
                      })
                    }
                    required
                  />
                </div>
                <div className="col-12">
                  <label className="form-label fw-semibold">Job Description</label>
                  <textarea
                    className="form-control form-control-modern"
                    rows="5"
                    placeholder="Detail the roles, responsibilities, and required background context..."
                    value={jobForm.description}
                    onChange={(e) =>
                      setJobForm({ ...jobForm, description: e.target.value })
                    }
                    required
                  ></textarea>
                </div>
              </div>
            </div>
            <div className="modal-footer p-3 bg-white d-flex justify-content-end gap-2">
              <button
                type="button"
                className="btn btn-modern btn-light border px-4"
                onClick={() => setShowPostJobModal(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-modern btn-primary-custom px-4"
              >
                Publish Opening
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
