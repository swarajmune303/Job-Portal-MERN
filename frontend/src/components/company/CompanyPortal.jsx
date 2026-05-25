import React from "react";
import CompanyDashboard from "./CompanyDashboard";
import CandidatesSearch from "./CandidatesSearch";
import JobsManagement from "./JobsManagement";
import InterviewSchedule from "./InterviewSchedule";
import CompanyProfile from "./CompanyProfile";

export default function CompanyPortal({
  activeTab,
  setActiveTab,
  currentUser,
  companyMetrics,
  allJobs,
  atsJob,
  selectAtsJob,
  handleDeleteJob,
  displayApplicants,
  handleStatusChange,
  viewResume,
  candidateDisplayList,
  globalSearchQuery,
  setGlobalSearchQuery,
  handleGlobalCandidateSearch,
  profileForm,
  setProfileForm,
  handleProfileSave,
  setShowPostJobModal,
  setShowFindCandidatesModal,
}) {
  return (
    <>
      {activeTab === "dashboard" && (
        <CompanyDashboard
          companyMetrics={companyMetrics}
          allJobs={allJobs}
          atsJob={atsJob}
          selectAtsJob={selectAtsJob}
          handleDeleteJob={handleDeleteJob}
          displayApplicants={displayApplicants}
          handleStatusChange={handleStatusChange}
          viewResume={viewResume}
          setShowFindCandidatesModal={setShowFindCandidatesModal}
          handleGlobalCandidateSearch={handleGlobalCandidateSearch}
        />
      )}

      {activeTab === "candidates" && (
        <CandidatesSearch
          globalSearchQuery={globalSearchQuery}
          setGlobalSearchQuery={setGlobalSearchQuery}
          handleGlobalCandidateSearch={handleGlobalCandidateSearch}
          candidateDisplayList={candidateDisplayList}
          viewResume={viewResume}
        />
      )}

      {activeTab === "jobs" && (
        <JobsManagement
          currentUser={currentUser}
          allJobs={allJobs}
          handleDeleteJob={handleDeleteJob}
          setActiveTab={setActiveTab}
          selectAtsJob={selectAtsJob}
          setShowPostJobModal={setShowPostJobModal}
        />
      )}

      {activeTab === "schedule" && (
        <InterviewSchedule
          displayApplicants={displayApplicants}
          viewResume={viewResume}
        />
      )}

      {activeTab === "profile" && (
        <CompanyProfile
          currentUser={currentUser}
          profileForm={profileForm}
          setProfileForm={setProfileForm}
          handleProfileSave={handleProfileSave}
        />
      )}
    </>
  );
}
