import React from "react";

export default function SeekerProfile({
  currentUser,
  profileForm,
  setProfileForm,
  handleProfileSave,
}) {
  return (
    <div className="card-modern mx-auto p-4" style={{ maxWidth: "600px" }}>
      <div className="d-flex align-items-center gap-3 mb-4">
        <div
          className="avatar bg-primary text-white fs-3 d-flex align-items-center justify-content-center"
          style={{ width: "60px", height: "60px" }}
        >
          {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : "U"}
        </div>
        <div>
          <h4 className="fw-bold m-0">{currentUser.name}</h4>
          <p className="text-muted m-0">Job Seeker Account</p>
        </div>
      </div>
      <form onSubmit={handleProfileSave}>
        <div className="mb-3">
          <label className="form-label fw-semibold">Full Name</label>
          <input
            type="text"
            className="form-control form-control-modern"
            value={profileForm.name}
            onChange={(e) =>
              setProfileForm({ ...profileForm, name: e.target.value })
            }
            required
          />
        </div>
        <div className="mb-3">
          <label className="form-label fw-semibold">Email Address</label>
          <input
            type="email"
            className="form-control form-control-modern"
            value={profileForm.email}
            onChange={(e) =>
              setProfileForm({ ...profileForm, email: e.target.value })
            }
            required
          />
        </div>
        <div className="mb-3">
          <label className="form-label fw-semibold">
            My Skills (comma separated)
          </label>
          <input
            type="text"
            className="form-control form-control-modern"
            value={profileForm.skills}
            onChange={(e) =>
              setProfileForm({ ...profileForm, skills: e.target.value })
            }
            placeholder="e.g. Java, React, SQL"
          />
        </div>
        <button
          type="submit"
          className="btn btn-modern btn-primary-custom w-100 py-3"
        >
          Save Profile Changes
        </button>
      </form>
    </div>
  );
}
