import React from "react";

export default function UpgradeProModal({
  showProModal,
  setShowProModal,
  setIsPro,
  currentUser,
}) {
  if (!showProModal) return null;

  return (
    <div
      className="modal show d-block bg-dark bg-opacity-50"
      tabIndex="-1"
    >
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content border-0 rounded-4 shadow-lg overflow-hidden">
          <div
            className="p-5 text-center text-white"
            style={{
              background: "linear-gradient(135deg, #F59E0B, #EC4899)",
              position: "relative",
            }}
          >
            <div
              className="bg-white bg-opacity-20 rounded-circle mx-auto d-flex align-items-center justify-content-center mb-3"
              style={{ width: "80px", height: "80px" }}
            >
              <i className="fas fa-gem fs-1"></i>
            </div>
            <h3 className="fw-bold mb-1">Upgrade to Premium PRO</h3>
            <p className="opacity-90 mb-0">Elevate your hiring pipeline visibility</p>
          </div>
          <div className="p-4 bg-light">
            <ul className="list-unstyled d-flex flex-column gap-3 mb-4">
              <li className="d-flex align-items-center gap-3">
                <i className="fas fa-check-circle text-success fs-5"></i>
                <span>
                  <strong>Featured Gold Highlighting</strong> on candidate lists
                </span>
              </li>
              <li className="d-flex align-items-center gap-3">
                <i className="fas fa-check-circle text-success fs-5"></i>
                <span>
                  <strong>★ Top Applicant</strong> status tag on job applications
                </span>
              </li>
              <li className="d-flex align-items-center gap-3">
                <i className="fas fa-check-circle text-success fs-5"></i>
                <span>
                  <strong>Priority Resume Rank</strong> in ATS matching engines
                </span>
              </li>
              <li className="d-flex align-items-center gap-3">
                <i className="fas fa-check-circle text-success fs-5"></i>
                <span>Advanced match score insights across companies</span>
              </li>
            </ul>

            <button
              className="btn btn-modern w-100 py-3 text-white fs-5 fw-bold"
              style={{
                background: "linear-gradient(90deg, #F59E0B, #EC4899)",
                border: "none",
              }}
              onClick={() => {
                setIsPro(true);
                localStorage.setItem("isProMember", "true");
                setShowProModal(false);
                alert("Congratulations! You are now a JobPortal PRO Member! (6 Months Trial)");
                if (currentUser) {
                  const key = `notifications_${currentUser.id}`;
                  const list = JSON.parse(localStorage.getItem(key)) || [];
                  const newNotif = {
                    id: Date.now(),
                    text: "Congratulations! You have upgraded to JobPortal PRO Member! Stand out to recruiters.",
                    type: "SUCCESS",
                    timestamp: new Date().toISOString(),
                    read: false,
                  };
                  localStorage.setItem(key, JSON.stringify([newNotif, ...list]));
                }
              }}
            >
              Start 6-Month Free Trial
            </button>
            <button
              className="btn btn-modern w-100 mt-2 py-2.5 btn-light border small text-muted"
              onClick={() => setShowProModal(false)}
            >
              Maybe Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
