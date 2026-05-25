import React from "react";

export default function AuthScreen({
  isLogin,
  setIsLogin,
  regRole,
  setRegRole,
  authForm,
  setAuthForm,
  resetEmail,
  setResetEmail,
  showForgotModal,
  setShowForgotModal,
  handleAuthSubmit,
  handleForgotSubmit,
}) {
  return (
    <div className="split-screen">
      <div className="split-left d-none d-lg-flex">
        <a
          href="#"
          className="brand text-white text-decoration-none d-flex align-items-center gap-2 mb-auto"
        >
          <div className="brand-icon bg-white text-primary">JP</div>
          <span className="fs-4 fw-bold">JobPortal</span>
        </a>
        <div className="my-auto position-relative z-1">
          <h1 className="display-4 fw-bold text-white mb-4">
            Discover Your Perfect Career Match
          </h1>
          <p className="fs-5 text-white-50 mb-5">
            Join thousands of professionals finding their dream jobs at top
            companies worldwide.
          </p>
          <div className="row g-4 mt-4">
            <div className="col-6">
              <div className="p-3 bg-white bg-opacity-10 rounded-4 glass-panel border-0">
                <h3 className="fw-bold text-white mb-1">10k+</h3>
                <p className="text-white-50 mb-0">Active Jobs</p>
              </div>
            </div>
            <div className="col-6">
              <div className="p-3 bg-white bg-opacity-10 rounded-4 glass-panel border-0">
                <h3 className="fw-bold text-white mb-1">500+</h3>
                <p className="text-white-50 mb-0">Top Companies</p>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-auto position-relative z-1">
          <p className="text-white-50 small">
            &copy; 2026 JobPortal Inc. All rights reserved.
          </p>
        </div>
      </div>

      <div className="split-right">
        <div className="auth-form-container">
          <div className="text-center mb-5 d-lg-none">
            <div className="brand-icon mx-auto mb-3">JP</div>
            <h2 className="fw-bold">JobPortal</h2>
          </div>

          <div className="text-center mb-5">
            <h3 className="fw-bold">
              {isLogin ? "Welcome Back" : "Create Account"}
            </h3>
            <p className="text-muted">
              {isLogin
                ? "Login to your account to continue"
                : "Fill the form to start your career search"}
            </p>
          </div>

          <form onSubmit={handleAuthSubmit}>
            {!isLogin && (
              <div className="mb-3">
                <label className="form-label">Full Name / Company Name</label>
                <input
                  type="text"
                  className="form-control form-control-modern"
                  placeholder="e.g. John Doe"
                  value={authForm.name}
                  onChange={(e) =>
                    setAuthForm({ ...authForm, name: e.target.value })
                  }
                  required
                />
              </div>
            )}

            <div className="mb-3">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                className="form-control form-control-modern"
                placeholder="name@company.com"
                value={authForm.email}
                onChange={(e) =>
                  setAuthForm({ ...authForm, email: e.target.value })
                }
                required
              />
            </div>

            <div className="mb-4">
              <div className="d-flex justify-content-between">
                <label className="form-label">Password</label>
                {isLogin && (
                  <a
                    href="#"
                    className="text-primary text-decoration-none small"
                    onClick={() => setShowForgotModal(true)}
                  >
                    Forgot password?
                  </a>
                )}
              </div>
              <input
                type="password"
                className="form-control form-control-modern"
                placeholder="••••••••"
                value={authForm.password}
                onChange={(e) =>
                  setAuthForm({ ...authForm, password: e.target.value })
                }
                required
              />
            </div>

            {!isLogin && (
              <>
                <div className="mb-3">
                  <label className="form-label d-block">Register As</label>
                  <div className="btn-group w-100 mb-3" role="group">
                    <button
                      type="button"
                      className={`btn btn-modern w-50 py-2.5 ${regRole === "SEEKER" ? "btn-primary-custom" : "btn-light border"}`}
                      onClick={() => setRegRole("SEEKER")}
                    >
                      <i className="fas fa-user me-2"></i> Job Seeker
                    </button>
                    <button
                      type="button"
                      className={`btn btn-modern w-50 py-2.5 ${regRole === "COMPANY" ? "btn-primary-custom" : "btn-light border"}`}
                      onClick={() => setRegRole("COMPANY")}
                    >
                      <i className="fas fa-building me-2"></i> Company
                    </button>
                  </div>
                </div>

                {regRole === "SEEKER" && (
                  <div className="mb-4">
                    <label className="form-label">Key Professional Skills</label>
                    <input
                      type="text"
                      className="form-control form-control-modern"
                      placeholder="e.g. Java, React, SQL (comma-separated)"
                      value={authForm.skills}
                      onChange={(e) =>
                        setAuthForm({ ...authForm, skills: e.target.value })
                      }
                    />
                  </div>
                )}
              </>
            )}

            <button
              type="submit"
              className="btn btn-modern btn-primary-custom w-100 py-3 fs-5"
            >
              {isLogin ? "Sign In to Dashboard" : "Register Now"}
            </button>
          </form>

          <div className="text-center mt-5">
            <p className="text-muted">
              {isLogin ? "Don't have an account?" : "Already have an account?"}
              <a
                href="#"
                className="text-primary fw-bold text-decoration-none ms-1"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setAuthForm({
                    name: "",
                    email: "",
                    password: "",
                    skills: "",
                  });
                }}
              >
                {isLogin ? "Create an account" : "Sign In instead"}
              </a>
            </p>
          </div>
        </div>
      </div>

      {showForgotModal && (
        <div
          className="modal show d-block bg-dark bg-opacity-50"
          tabIndex="-1"
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 rounded-4 shadow-lg">
              <div className="modal-header bg-primary text-white p-4 rounded-top-4">
                <h5 className="modal-title fw-bold">
                  <i className="fas fa-key me-2"></i> Reset Password
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowForgotModal(false)}
                ></button>
              </div>
              <form onSubmit={handleForgotSubmit}>
                <div className="modal-body p-4 bg-light">
                  <p className="text-muted mb-4">
                    Enter your email address and we'll send you a link to reset
                    your password.
                  </p>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Email Address</label>
                    <input
                      type="email"
                      className="form-control form-control-modern"
                      placeholder="name@company.com"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="modal-footer p-3 bg-white d-flex justify-content-end gap-2">
                  <button
                    type="button"
                    className="btn btn-modern btn-light border px-4"
                    onClick={() => setShowForgotModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-modern btn-primary-custom px-4"
                  >
                    Send Reset Link
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
