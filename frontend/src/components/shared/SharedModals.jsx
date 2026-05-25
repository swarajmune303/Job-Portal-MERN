import React from "react";
import PostJobModal from "./PostJobModal";
import FindCandidatesModal from "./FindCandidatesModal";
import UpgradeProModal from "./UpgradeProModal";

export default function SharedModals({
  showPostJobModal,
  setShowPostJobModal,
  jobForm,
  setJobForm,
  handlePostJob,
  showFindCandidatesModal,
  setShowFindCandidatesModal,
  globalCandidateResults,
  viewResume,
  showProModal,
  setShowProModal,
  setIsPro,
  currentUser,
}) {
  return (
    <>
      <PostJobModal
        showPostJobModal={showPostJobModal}
        setShowPostJobModal={setShowPostJobModal}
        jobForm={jobForm}
        setJobForm={setJobForm}
        handlePostJob={handlePostJob}
      />

      <FindCandidatesModal
        showFindCandidatesModal={showFindCandidatesModal}
        setShowFindCandidatesModal={setShowFindCandidatesModal}
        globalCandidateResults={globalCandidateResults}
        viewResume={viewResume}
      />

      <UpgradeProModal
        showProModal={showProModal}
        setShowProModal={setShowProModal}
        setIsPro={setIsPro}
        currentUser={currentUser}
      />
    </>
  );
}
