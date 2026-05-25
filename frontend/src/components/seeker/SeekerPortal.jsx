import React from "react";
import SeekerDashboard from "./SeekerDashboard";
import FindJobs from "./FindJobs";
import SavedJobs from "./SavedJobs";
import MyApplications from "./MyApplications";
import SeekerProfile from "./SeekerProfile";

export default function SeekerPortal({
  activeTab,
  setActiveTab,
  currentUser,
  seekerMetrics,
  isPro,
  setShowProModal,
  allJobs,
  savedJobs,
  toggleSaveJob,
  applyJob,
  viewResume,
  myApplications,
  handleResumeUpload,
  profileForm,
  setProfileForm,
  handleProfileSave,
  jobSearch,
}) {
  return (
    <>
      {activeTab === "dashboard" && (
        <SeekerDashboard
          currentUser={currentUser}
          seekerMetrics={seekerMetrics}
          isPro={isPro}
          setShowProModal={setShowProModal}
          allJobs={allJobs}
          savedJobs={savedJobs}
          toggleSaveJob={toggleSaveJob}
          applyJob={applyJob}
          viewResume={viewResume}
          handleResumeUpload={handleResumeUpload}
          myApplications={myApplications}
          setActiveTab={setActiveTab}
        />
      )}

      {activeTab === "find" && (
        <FindJobs
          allJobs={allJobs}
          jobSearch={jobSearch}
          savedJobs={savedJobs}
          toggleSaveJob={toggleSaveJob}
          applyJob={applyJob}
        />
      )}

      {activeTab === "saved" && (
        <SavedJobs
          allJobs={allJobs}
          savedJobs={savedJobs}
          toggleSaveJob={toggleSaveJob}
          applyJob={applyJob}
        />
      )}

      {activeTab === "applications" && (
        <MyApplications myApplications={myApplications} />
      )}

      {activeTab === "profile" && (
        <SeekerProfile
          currentUser={currentUser}
          profileForm={profileForm}
          setProfileForm={setProfileForm}
          handleProfileSave={handleProfileSave}
        />
      )}
    </>
  );
}
