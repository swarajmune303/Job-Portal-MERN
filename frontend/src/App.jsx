import React, { useState, useEffect } from "react";

const API_BASE = "http://localhost:8085/api";

export default function App() {
  // ==========================================
  // STATE MANAGEMENT
  // ==========================================
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem("user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [activeTab, setActiveTab] = useState("dashboard"); // For Seeker & Company portals

  // Auth Form States
  const [isLogin, setIsLogin] = useState(true);
  const [regRole, setRegRole] = useState("SEEKER");
  const [authForm, setAuthForm] = useState({
    name: "",
    email: "",
    password: "",
    skills: "",
  });
  const [resetEmail, setResetEmail] = useState("");

  // Core Data States
  const [allJobs, setAllJobs] = useState([]);
  const [myApplications, setMyApplications] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [companyApplications, setCompanyApplications] = useState([]);

  // Seeker Specific States
  const [savedJobs, setSavedJobs] = useState([]);
  const [jobSearch, setJobSearch] = useState("");
  const [isPro, setIsPro] = useState(() => {
    try {
      const proState = localStorage.getItem("isProMember");
      return proState === "true";
    } catch {
      return false;
    }
  });

  // Company Specific States
  const [atsJob, setAtsJob] = useState(null); // Selected job for recruiter ATS
  const [atsApplicants, setAtsApplicants] = useState([]); // Selected job applicants
  const [globalSearchQuery, setGlobalSearchQuery] = useState("");
  const [globalCandidateResults, setGlobalCandidateResults] = useState([]);

  // Modals Toggle States
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [showPostJobModal, setShowPostJobModal] = useState(false);
  const [showFindCandidatesModal, setShowFindCandidatesModal] = useState(false);
  const [showProModal, setShowProModal] = useState(false);

  // Profile Form States
  const [profileForm, setProfileForm] = useState({
    name: "",
    email: "",
    skills: "",
  });

  // Post Job Form State
  const [jobForm, setJobForm] = useState({
    title: "",
    location: "",
    description: "",
    requiredSkills: "",
  });

  // Resume Upload State
  const [isUploading, setIsUploading] = useState(false);

  // ==========================================
  // SYNCING & INITIAL LOAD
  // ==========================================
  useEffect(() => {
    if (currentUser) {
      // Sync user details with backend
      syncUser(currentUser);

      // Load components based on Role
      if (currentUser.role === "SEEKER") {
        loadJobs();
        loadSeekerApplications(currentUser.id);
        const saved =
          JSON.parse(localStorage.getItem(`savedJobs_${currentUser.id}`)) || [];
        setSavedJobs(saved);
        initNotifications(currentUser.id);
      } else {
        loadCompanyJobs(currentUser.id);
        initNotifications(currentUser.id);
      }

      // Initialize Profile Form
      setProfileForm({
        name: currentUser.name || "",
        email: currentUser.email || "",
        skills: currentUser.skills || "",
      });
    }
  }, [currentUser]);

  // Periodic metrics auto-refreshes for Recruiter Dashboard
  useEffect(() => {
    let interval = null;
    if (
      currentUser &&
      currentUser.role === "COMPANY" &&
      activeTab === "dashboard"
    ) {
      interval = setInterval(() => {
        loadCompanyJobs(currentUser.id);
        if (atsJob) {
          selectAtsJob(atsJob);
        }
      }, 5000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [currentUser, activeTab, atsJob]);

  // Load all candidates when switching to the Candidates tab
  useEffect(() => {
    if (
      currentUser &&
      currentUser.role === "COMPANY" &&
      activeTab === "candidates"
    ) {
      handleGlobalCandidateSearch();
    }
  }, [currentUser, activeTab]);

  // ==========================================
  // HELPER UTILITIES
  // ==========================================
  const addNotification = (userId, text, type = "INFO") => {
    const key = `notifications_${userId}`;
    const list = JSON.parse(localStorage.getItem(key)) || [];
    const newNotif = {
      id: Date.now(),
      text,
      type,
      timestamp: new Date().toISOString(),
      read: false,
    };
    const updated = [newNotif, ...list];
    localStorage.setItem(key, JSON.stringify(updated));
    setNotifications(updated);
  };

  const initNotifications = (userId) => {
    const key = `notifications_${userId}`;
    let list = JSON.parse(localStorage.getItem(key));
    if (!list) {
      list = [];
      if (currentUser?.role === "SEEKER") {
        list.push({
          id: 1,
          text: "Welcome to JobPortal! Complete your profile to get discovered.",
          type: "INFO",
          timestamp: new Date(Date.now() - 7200000).toISOString(),
          read: false,
        });
        list.push({
          id: 2,
          text: "Explore active jobs matching your profile in 'Find Jobs'.",
          type: "INFO",
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          read: false,
        });
      } else {
        list.push({
          id: 1,
          text: "Welcome to JobPortal Company! Post a new job to start hiring.",
          type: "INFO",
          timestamp: new Date(Date.now() - 7200000).toISOString(),
          read: false,
        });
      }
      localStorage.setItem(key, JSON.stringify(list));
    }
    setNotifications(list);
  };

  const calculateLocalMatchScore = (userSkills, jobSkills) => {
    if (!userSkills || !jobSkills) return 0;
    const required = jobSkills.toLowerCase().split(",");
    const userSkillsLower = userSkills.toLowerCase();
    let matchCount = 0;
    required.forEach((req) => {
      if (userSkillsLower.includes(req.trim())) matchCount++;
    });
    return (matchCount / required.length) * 100;
  };

  // Sync state with backend, fallback to local storage
  const syncUser = async (user) => {
    try {
      const res = await fetch(`${API_BASE}/users/${user.id}`);
      // Race-condition guard: if user clicked logout during fetch, abort setting state
      if (!localStorage.getItem("user")) return;
      
      if (res.ok) {
        const backendUser = await res.json();
        const updated = { ...user, ...backendUser };
        setCurrentUser(updated);
        localStorage.setItem("user", JSON.stringify(updated));
      } else {
        // Try re-registering if user wiped from database
        console.warn(
          "User profile not found on backend, attempting re-sync...",
        );
        const regRes = await fetch(`${API_BASE}/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(user),
        });
        
        // Race-condition guard
        if (!localStorage.getItem("user")) return;
        
        if (regRes.ok) {
          const registered = await regRes.json();
          const updated = { ...user, id: registered.id };
          setCurrentUser(updated);
          localStorage.setItem("user", JSON.stringify(updated));
        }
      }
    } catch (err) {
      console.warn(
        "Backend offline during user sync, using local profile.",
        err,
      );
    }
  };

  // ==========================================
  // DATA OPERATIONS
  // ==========================================
  const loadJobs = async () => {
    try {
      const res = await fetch(`${API_BASE}/jobs`);
      if (res.ok) {
        const jobs = await res.json();
        // Merge with localJobs of all users in local cache
        const allLocal = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key?.startsWith("localJobs_")) {
            allLocal.push(...(JSON.parse(localStorage.getItem(key)) || []));
          }
        }

        const merged = [...jobs];
        allLocal.forEach((lj) => {
          if (!merged.some((j) => j.id === lj.id)) merged.push(lj);
        });

        // Filter out deleted jobs
        const deleted = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key?.startsWith("deletedJobs_")) {
            deleted.push(...(JSON.parse(localStorage.getItem(key)) || []));
          }
        }

        const active = merged.filter((j) => !deleted.includes(Number(j.id)));
        setAllJobs(active);
      }
    } catch (err) {
      console.warn("Failed to load jobs from server, loading cached jobs.");
      const list = JSON.parse(localStorage.getItem("allJobsFallback")) || [];
      setAllJobs(list);
    }
  };

  const loadSeekerApplications = async (userId) => {
    if (!userId) return;
    try {
      const res = await fetch(`${API_BASE}/applications/user/${userId}`);
      if (res.ok) {
        const apps = await res.json();
        const mappedApps = apps.map((app) => ({
          ...app,
          resumeMatchScore: app.resumeMatchScore || app.resume_match_score || 0,
          userId: app.userId || app.user_id,
          jobId: app.jobId || app.job_id,
        }));
        const local =
          JSON.parse(localStorage.getItem(`localApps_${userId}`)) || [];

        const merged = [...mappedApps];
        local.forEach((la) => {
          if (!merged.some((a) => a.job?.id === la.job?.id)) merged.push(la);
        });
        setMyApplications(merged);
      }
    } catch {
      const local =
        JSON.parse(localStorage.getItem(`localApps_${userId}`)) || [];
      setMyApplications(local);
    }
  };

  const loadCompanyApplications = async (companyId) => {
    if (!companyId) return;
    try {
      const res = await fetch(`${API_BASE}/applications/company/${companyId}`);
      if (res.ok) {
        const apps = await res.json();
        const mappedApps = apps.map((app) => ({
          ...app,
          resumeMatchScore: app.resumeMatchScore || app.resume_match_score || 0,
          userId: app.userId || app.user_id,
          jobId: app.jobId || app.job_id,
        }));
        setCompanyApplications(mappedApps);
      }
    } catch (err) {
      console.warn("Failed to load company applications from server.", err);
    }
  };

  const loadCompanyJobs = async (companyId) => {
    if (!companyId) return;
    loadCompanyApplications(companyId);
    try {
      const res = await fetch(`${API_BASE}/jobs/company/${companyId}`);
      if (res.ok) {
        const jobs = await res.json();
        const local =
          JSON.parse(localStorage.getItem(`localJobs_${companyId}`)) || [];

        const merged = [...jobs];
        local.forEach((lj) => {
          if (!merged.some((j) => j.id === lj.id)) merged.push(lj);
        });

        const deleted =
          JSON.parse(localStorage.getItem(`deletedJobs_${companyId}`)) || [];
        const active = merged.filter((j) => !deleted.includes(Number(j.id)));

        setAllJobs(active);

        // Cache this company's jobs to update general metrics safely
        localStorage.setItem(
          `cachedCompanyJobs_${companyId}`,
          JSON.stringify(active),
        );
      }
    } catch {
      const local =
        JSON.parse(localStorage.getItem(`localJobs_${companyId}`)) || [];
      setAllJobs(local);
    }
  };

  // ==========================================
  // SEEKER INTERACTIVE ACTIONS
  // ==========================================
  const toggleSaveJob = (jobId, jobTitle) => {
    if (!currentUser) return;
    const key = `savedJobs_${currentUser.id}`;
    let saved = JSON.parse(localStorage.getItem(key)) || [];

    if (saved.includes(jobId)) {
      saved = saved.filter((id) => id !== jobId);
      addNotification(
        currentUser.id,
        `Job "${jobTitle}" has been removed from Saved Jobs.`,
        "WARNING",
      );
    } else {
      saved.push(jobId);
      addNotification(
        currentUser.id,
        `Job "${jobTitle}" has been added to Saved Jobs!`,
        "SUCCESS",
      );
    }

    localStorage.setItem(key, JSON.stringify(saved));
    setSavedJobs(saved);
  };

  const applyJob = async (job) => {
    if (!currentUser) return;

    // Prevent duplicates
    const alreadyApplied = myApplications.some((a) => a.job?.id === job.id);
    if (alreadyApplied) {
      alert("You have already applied for this job.");
      return;
    }

    try {
      const res = await fetch(
        `${API_BASE}/applications?userId=${currentUser.id}&jobId=${job.id}`,
        {
          method: "POST",
        },
      );
      if (res.ok) {
        alert("Applied successfully!");
        loadSeekerApplications(currentUser.id);
        addNotification(
          currentUser.id,
          `Applied successfully for "${job.title}"!`,
          "SUCCESS",
        );
      } else {
        throw new Error();
      }
    } catch {
      // Local storage fallback apply
      const mockApp = {
        id: Date.now(),
        job,
        applicant: currentUser,
        status: "APPLIED",
        resumeMatchScore: calculateLocalMatchScore(
          currentUser.skills,
          job.requiredSkills || job.required_skills,
        ),
      };

      const localKey = `localApps_${currentUser.id}`;
      const list = JSON.parse(localStorage.getItem(localKey)) || [];
      list.push(mockApp);
      localStorage.setItem(localKey, JSON.stringify(list));

      setMyApplications([...myApplications, mockApp]);
      alert("Applied successfully (offline local cache)!");
      addNotification(
        currentUser.id,
        `Applied successfully (local fallback) for "${job.title}"!`,
        "SUCCESS",
      );
    }
  };

  const handleResumeUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !currentUser) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${API_BASE}/users/${currentUser.id}/resume`, {
        method: "POST",
        body: formData,
      });
      // Race-condition guard: abort state setting if user logged out
      if (!localStorage.getItem("user")) return;

      if (res.ok) {
        alert("Resume uploaded successfully!");
        const updatedUser = { ...currentUser, resumeFilename: file.name };
        setCurrentUser(updatedUser);
        localStorage.setItem("user", JSON.stringify(updatedUser));
        addNotification(
          currentUser.id,
          "Your resume has been uploaded successfully!",
          "SUCCESS",
        );
      } else {
        throw new Error();
      }
    } catch {
      // Race-condition guard: abort state setting if user logged out
      if (!localStorage.getItem("user")) return;

      const updatedUser = { ...currentUser, resumeFilename: file.name };
      setCurrentUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
      alert("Resume uploaded successfully (local fallback)!");
      addNotification(
        currentUser.id,
        "Your resume has been uploaded successfully (local fallback)!",
        "SUCCESS",
      );
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const viewResume = async (userId, seekerName, seekerSkills) => {
    try {
      const checkRes = await fetch(`${API_BASE}/users/${userId}/resume`, {
        method: "HEAD",
      });
      if (checkRes.ok) {
        window.open(`${API_BASE}/users/${userId}/resume`, "_blank");
        return;
      }
    } catch {}

    // Fallback resume generator window
    const resumeWin = window.open("", "_blank");
    if (!resumeWin) {
      alert("Please allow popups to view the resume.");
      return;
    }

    const initials = seekerName ? seekerName.charAt(0).toUpperCase() : "C";
    const skillsList = seekerSkills
      ? seekerSkills
          .split(",")
          .map((s) => `<span class="skill-badge">${s.trim()}</span>`)
          .join("")
      : '<span class="text-muted">None listed</span>';

    resumeWin.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
          <title>Resume - ${seekerName}</title>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@400;500;600;700;800&display=swap" rel="stylesheet">
          <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
          <style>
              body {
                  font-family: 'Inter', sans-serif;
                  background-color: #F3F6F9;
                  color: #374151;
                  margin: 0;
                  padding: 3rem 1rem;
                  display: flex;
                  justify-content: center;
              }
              .resume-container {
                  background: white;
                  width: 100%;
                  max-width: 800px;
                  box-shadow: 0 10px 25px rgba(0,0,0,0.05);
                  border-radius: 16px;
                  overflow: hidden;
                  border: 1px solid #E5E7EB;
              }
              .resume-header {
                  background: linear-gradient(135deg, #4F46E5, #EC4899);
                  padding: 3rem;
                  color: white;
                  display: flex;
                  align-items: center;
                  gap: 2rem;
              }
              .resume-avatar {
                  width: 80px;
                  height: 80px;
                  background: rgba(255, 255, 255, 0.2);
                  border: 2px solid white;
                  border-radius: 50%;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-size: 2.25rem;
                  font-weight: 800;
                  font-family: 'Outfit', sans-serif;
              }
              .header-info h1 {
                  margin: 0;
                  font-size: 2.25rem;
                  font-family: 'Outfit', sans-serif;
                  font-weight: 800;
              }
              .header-info p {
                  margin: 0.5rem 0 0 0;
                  opacity: 0.9;
                  font-size: 1.1rem;
              }
              .resume-body { padding: 3rem; }
              .resume-section { margin-bottom: 2.5rem; }
              .section-title {
                  font-family: 'Outfit', sans-serif;
                  font-size: 1.25rem;
                  font-weight: 700;
                  color: #111827;
                  border-bottom: 2px solid #EEF2FF;
                  padding-bottom: 0.5rem;
                  margin-bottom: 1.25rem;
                  display: flex;
                  align-items: center;
                  gap: 0.75rem;
              }
              .section-title i { color: #4F46E5; }
              .skill-badge {
                  display: inline-block;
                  background: #EEF2FF;
                  color: #4F46E5;
                  font-weight: 600;
                  padding: 0.5rem 1rem;
                  border-radius: 9999px;
                  font-size: 0.875rem;
                  margin-right: 0.5rem;
                  margin-bottom: 0.5rem;
              }
              .timeline {
                  position: relative;
                  border-left: 2px solid #E5E7EB;
                  padding-left: 2rem;
                  margin-left: 0.5rem;
              }
              .timeline-item {
                  position: relative;
                  margin-bottom: 2rem;
              }
              .timeline-marker {
                  position: absolute;
                  left: -2.6rem;
                  background: #4F46E5;
                  border: 4px solid white;
                  width: 16px;
                  height: 16px;
                  border-radius: 50%;
                  top: 0.25rem;
              }
              .timeline-title { font-weight: 700; color: #111827; margin: 0; }
              .timeline-subtitle { color: #6B7280; font-size: 0.9rem; margin: 0.25rem 0 0.75rem 0; }
              .timeline-desc { margin: 0; font-size: 0.95rem; line-height: 1.5; }
              .no-print { display: flex; justify-content: center; gap: 1rem; margin-top: 2rem; }
              .btn-print {
                  background: #4F46E5;
                  color: white;
                  border: none;
                  padding: 0.75rem 2rem;
                  font-weight: 600;
                  border-radius: 9999px;
                  font-family: 'Outfit', sans-serif;
                  cursor: pointer;
                  display: inline-flex;
                  align-items: center;
                  gap: 0.5rem;
                  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.2);
                  transition: all 0.2s;
              }
              .btn-print:hover { background: #3730A3; transform: translateY(-2px); }
              @media print {
                  body { background: white; padding: 0; }
                  .resume-container { box-shadow: none; border: none; }
                  .no-print { display: none; }
              }
          </style>
      </head>
      <body>
          <div>
              <div class="resume-container">
                  <div class="resume-header">
                      <div class="resume-avatar">${initials}</div>
                      <div class="header-info">
                          <h1>${seekerName}</h1>
                          <p><i class="far fa-envelope me-2"></i> User Email &nbsp;&bull;&nbsp; <i class="fas fa-briefcase me-2"></i> Job Seeker</p>
                      </div>
                  </div>
                  <div class="resume-body">
                      <div class="resume-section">
                          <div class="section-title"><i class="fas fa-user"></i> Professional Profile</div>
                          <p style="line-height: 1.6; margin: 0;">Highly motivated and detail-oriented professional with specialized experience in target technologies. Eager to contribute key skills to innovative teams, build high-performance applications, and solve complex problems in software environments.</p>
                      </div>
                      <div class="resume-section">
                          <div class="section-title"><i class="fas fa-tools"></i> Core Technical Skills</div>
                          <div style="display: flex; flex-wrap: wrap;">
                              ${skillsList}
                          </div>
                      </div>
                      <div class="resume-section">
                          <div class="section-title"><i class="fas fa-history"></i> Experience History</div>
                          <div class="timeline">
                              <div class="timeline-item">
                                  <div class="timeline-marker"></div>
                                  <h4 class="timeline-title">Software Developer</h4>
                                  <div class="timeline-subtitle">Tech Solutions Inc. &bull; 2024 - Present</div>
                                  <p class="timeline-desc">Designed and implemented high-volume web systems using core frameworks. Collaborated with cross-functional development groups to deploy modern, secure interfaces.</p>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
              <div class="no-print">
                  <button class="btn-print" onclick="window.print()"><i class="fas fa-print"></i> Print / Download PDF</button>
                  <button class="btn-print" style="background: #374151;" onclick="window.close()"><i class="fas fa-times"></i> Close</button>
              </div>
          </div>
      </body>
      </html>
    `);
    resumeWin.document.close();
  };

  // ==========================================
  // COMPANY INTERACTIVE ACTIONS
  // ==========================================
  const handlePostJob = async (e) => {
    e.preventDefault();
    if (!currentUser) return;

    try {
      const res = await fetch(`${API_BASE}/jobs?companyId=${currentUser.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(jobForm),
      });
      if (res.ok) {
        alert("Job post published!");
        setShowPostJobModal(false);
        setJobForm({
          title: "",
          location: "",
          description: "",
          requiredSkills: "",
        });
        loadCompanyJobs(currentUser.id);
        addNotification(
          currentUser.id,
          `New job posting published: "${jobForm.title}"!`,
          "SUCCESS",
        );
      } else {
        throw new Error();
      }
    } catch {
      const mockJob = {
        id: Date.now(),
        title: jobForm.title,
        location: jobForm.location,
        description: jobForm.description,
        requiredSkills: jobForm.requiredSkills,
        company: currentUser,
        status: "OPEN",
      };

      const key = `localJobs_${currentUser.id}`;
      const list = JSON.parse(localStorage.getItem(key)) || [];
      list.push(mockJob);
      localStorage.setItem(key, JSON.stringify(list));

      alert("Job posted locally (offline fallback)!");
      setShowPostJobModal(false);
      setJobForm({
        title: "",
        location: "",
        description: "",
        requiredSkills: "",
      });
      loadCompanyJobs(currentUser.id);
      addNotification(
        currentUser.id,
        `New job posting published (local fallback): "${jobForm.title}"!`,
        "SUCCESS",
      );
    }
  };

  const selectAtsJob = async (job) => {
    if (!job || !job.id) return;
    setAtsJob(job);
    try {
      const res = await fetch(`${API_BASE}/applications/job/${job.id}`);
      if (res.ok) {
        const apps = await res.json();
        const mappedApps = apps.map((app) => ({
          ...app,
          resumeMatchScore: app.resumeMatchScore || app.resume_match_score || 0,
          userId: app.userId || app.user_id,
          jobId: app.jobId || app.job_id,
        }));

        // Merge with local applications
        const allLocal = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key?.startsWith("localApps_")) {
            allLocal.push(...(JSON.parse(localStorage.getItem(key)) || []));
          }
        }

        const jobLocal = allLocal.filter((la) => la.job?.id === job.id);
        const merged = [...mappedApps];
        jobLocal.forEach((la) => {
          if (!merged.some((a) => a.applicant?.id === la.applicant?.id))
            merged.push(la);
        });

        // Safe sort by match score descending
        merged.sort(
          (a, b) => (b.resumeMatchScore || 0) - (a.resumeMatchScore || 0),
        );
        setAtsApplicants(merged);
      }
    } catch {
      // Local applications retrieval
      const allLocal = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith("localApps_")) {
          allLocal.push(...(JSON.parse(localStorage.getItem(key)) || []));
        }
      }
      const jobLocal = allLocal.filter((la) => la.job?.id === job.id);
      jobLocal.sort(
        (a, b) => (b.resumeMatchScore || 0) - (a.resumeMatchScore || 0),
      );
      setAtsApplicants(jobLocal);
    }
  };

  const handleStatusChange = async (appId, newStatus) => {
    try {
      const res = await fetch(`${API_BASE}/applications/${appId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        // Reload recruiter view
        if (atsJob) selectAtsJob(atsJob);
        loadCompanyJobs(currentUser.id);

        // Push notification to Seeker locally (mimicking original local notifications control)
        const updatedApp = atsApplicants.find((a) => a.id === appId);
        if (updatedApp?.applicant) {
          const seekerNotifKey = `notifications_${updatedApp.applicant.id}`;
          const seekerList =
            JSON.parse(localStorage.getItem(seekerNotifKey)) || [];
          seekerList.unshift({
            id: Date.now(),
            text: `Your application status has been updated to "${newStatus}" for "${atsJob?.title}"!`,
            type: "MATCH",
            timestamp: new Date().toISOString(),
            read: false,
          });
          localStorage.setItem(seekerNotifKey, JSON.stringify(seekerList));
        }
      }
    } catch {
      // Fallback: update status in local cache
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith("localApps_")) {
          let list = JSON.parse(localStorage.getItem(key)) || [];
          let updated = false;
          list = list.map((app) => {
            if (app.id === appId) {
              app.status = newStatus;
              updated = true;
            }
            return app;
          });
          if (updated) {
            localStorage.setItem(key, JSON.stringify(list));
          }
        }
      }
      if (atsJob) selectAtsJob(atsJob);
      loadCompanyJobs(currentUser.id);
      alert("Application status updated locally (offline fallback)!");
    }
  };

  const handleDeleteJob = async (jobId, jobTitle) => {
    if (
      !confirm(
        `Are you sure you want to delete the job post "${jobTitle}"? This will also remove all associated applications.`,
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/jobs/${jobId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        alert("Job post deleted successfully!");
        addNotification(
          currentUser.id,
          `Job post "${jobTitle}" has been deleted.`,
          "WARNING",
        );
      } else {
        throw new Error();
      }
    } catch {
      alert("Job deleted locally!");
      addNotification(
        currentUser.id,
        `Job post "${jobTitle}" has been deleted (local fallback).`,
        "WARNING",
      );
    }

    // Clean up locally
    const deletedKey = `deletedJobs_${currentUser.id}`;
    const deletedList = JSON.parse(localStorage.getItem(deletedKey)) || [];
    if (!deletedList.includes(jobId)) {
      deletedList.push(jobId);
      localStorage.setItem(deletedKey, JSON.stringify(deletedList));
    }

    const localKey = `localJobs_${currentUser.id}`;
    let local = JSON.parse(localStorage.getItem(localKey)) || [];
    local = local.filter((j) => j.id !== jobId);
    localStorage.setItem(localKey, JSON.stringify(local));

    if (atsJob?.id === jobId) {
      setAtsJob(null);
      setAtsApplicants([]);
    }

    loadCompanyJobs(currentUser.id);
  };

  const handleGlobalCandidateSearch = async () => {
    try {
      const url = globalSearchQuery
        ? `${API_BASE}/users/seekers/search?query=${encodeURIComponent(globalSearchQuery)}`
        : `${API_BASE}/users/seekers/search`;
      const res = await fetch(url);
      if (res.ok) {
        const results = await res.json();
        setGlobalCandidateResults(results);
      }
    } catch {
      // Offline fallback: filter localUsers list
      const local = JSON.parse(localStorage.getItem("localUsers")) || [];
      const seekers = local.filter(
        (u) =>
          u.role === "SEEKER" &&
          (!globalSearchQuery ||
            u.name.toLowerCase().includes(globalSearchQuery.toLowerCase()) ||
            u.skills?.toLowerCase().includes(globalSearchQuery.toLowerCase())),
      );
      setGlobalCandidateResults(seekers);
    }
  };

  // ==========================================
  // PROFILE SUBMISSIONS
  // ==========================================
  const handleProfileSave = async (e) => {
    e.preventDefault();
    if (!currentUser) return;

    try {
      const res = await fetch(`${API_BASE}/users/${currentUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profileForm.name,
          email: profileForm.email,
          skills: profileForm.skills,
        }),
      });
      if (res.ok) {
        const result = await res.json();
        alert("Profile updated successfully!");
        setCurrentUser(result);
        localStorage.setItem("user", JSON.stringify(result));
      } else {
        throw new Error();
      }
    } catch {
      // Local fallback profile update
      const localUsers = JSON.parse(localStorage.getItem("localUsers")) || [];
      const updatedList = localUsers.map((u) =>
        u.id === currentUser.id ? { ...u, ...profileForm } : u,
      );
      localStorage.setItem("localUsers", JSON.stringify(updatedList));

      const updated = { ...currentUser, ...profileForm };
      setCurrentUser(updated);
      localStorage.setItem("user", JSON.stringify(updated));
      alert("Profile updated successfully (local fallback)!");
    }
  };

  // ==========================================
  // AUTH SYSTEM (LOGIN / REGISTER / RESETS)
  // ==========================================
  const handleAuthSubmit = async (e) => {
    e.preventDefault();

    if (isLogin) {
      // Sign In
      try {
        const res = await fetch(`${API_BASE}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: authForm.email,
            password: authForm.password,
          }),
        });
        if (res.ok) {
          const user = await res.json();
          user.password = authForm.password;
          setCurrentUser(user);
          localStorage.setItem("user", JSON.stringify(user));
        } else {
          throw new Error();
        }
      } catch {
        // Local Fallback
        const local = JSON.parse(localStorage.getItem("localUsers")) || [];
        const match = local.find(
          (u) => u.email === authForm.email && u.password === authForm.password,
        );
        if (match) {
          setCurrentUser(match);
          localStorage.setItem("user", JSON.stringify(match));
        } else {
          alert("Login failed. Check details or network connectivity.");
        }
      }
    } else {
      // Register
      const newUser = {
        name: authForm.name,
        email: authForm.email,
        password: authForm.password,
        role: regRole,
        skills: regRole === "SEEKER" ? authForm.skills : "",
      };

      // Always save locally first with temporary ID
      const local = JSON.parse(localStorage.getItem("localUsers")) || [];
      if (local.some((u) => u.email === newUser.email)) {
        alert("Email already registered!");
        return;
      }

      const tempId = Date.now();
      newUser.id = tempId;
      local.push(newUser);
      localStorage.setItem("localUsers", JSON.stringify(local));

      try {
        const res = await fetch(`${API_BASE}/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newUser),
        });
        if (res.ok) {
          const registered = await res.json();
          // Update key in local list with backend ID
          newUser.id = registered.id;
          localStorage.setItem("localUsers", JSON.stringify(local));
          alert("Registration successful! Please login.");
          setAuthForm({
            name: "",
            email: "",
            password: "",
            skills: "",
          });
          setIsLogin(true);
        } else {
          throw new Error();
        }
      } catch {
        alert("Registration successful (local fallback saved)! Please login.");
        setAuthForm({
          name: "",
          email: "",
          password: "",
          skills: "",
        });
        setIsLogin(true);
      }
    }
  };

  const handleForgotSubmit = (e) => {
    e.preventDefault();
    alert(
      `A password reset link has been sent to ${resetEmail} (Mock API Reset)`,
    );
    setShowForgotModal(false);
    setResetEmail("");
  };

  const logout = () => {
    console.log("Performing logout, clearing localStorage...");
    localStorage.removeItem("user");
    setCurrentUser(null);
    setActiveTab("dashboard");
    
    // Clear user-specific states to ensure smooth transition
    setSavedJobs([]);
    setMyApplications([]);
    setCompanyApplications([]);
    setNotifications([]);
    setAtsJob(null);
    setAtsApplicants([]);
    setGlobalCandidateResults([]);
    setGlobalSearchQuery("");
    setJobSearch("");
  };

  // ==========================================
  // METRIC COMPUTATIONS
  // ==========================================
  const getSeekerMetrics = () => {
    const applied = myApplications.length;
    const saved = savedJobs.length;
    const offers = myApplications.filter((a) => a.status === "OFFER").length;
    return { applied, saved, offers };
  };

  const getCompanyMetrics = () => {
    // Collect all applications across company jobs
    const cachedCompanyJobs =
      JSON.parse(
        localStorage.getItem(`cachedCompanyJobs_${currentUser?.id}`),
      ) || allJobs;
    const localApps = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith("localApps_")) {
        localApps.push(...(JSON.parse(localStorage.getItem(key)) || []));
      }
    }

    // Combine backend database applications and offline local applications
    const mergedApps = [...companyApplications];
    localApps.forEach((la) => {
      if (!mergedApps.some((a) => a.id === la.id || (a.job?.id === la.job?.id && (a.applicant?.id === la.applicant?.id || a.user_id === la.user_id)))) {
        mergedApps.push(la);
      }
    });

    // Filter apps that belong to this company's jobs
    const companyApps = mergedApps.filter((app) =>
      cachedCompanyJobs.some((j) => j.id === app.job?.id),
    );

    const totalCandidates = new Set(companyApps.map((a) => a.applicant?.id || a.user_id))
      .size;
    const newCandidates = companyApps.filter(
      (a) => a.status === "APPLIED",
    ).length;
    const interviews = companyApps.filter(
      (a) => a.status === "INTERVIEW",
    ).length;
    const hired = companyApps.filter((a) => a.status === "OFFER").length;

    return { totalCandidates, newCandidates, interviews, hired };
  };

  // ==========================================
  // RENDERING COMPONENTS
  // ==========================================

  // Render Auth UI if not logged in
  if (!currentUser) {
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
                    <label className="form-label">I am a...</label>
                    <select
                      className="form-select form-control-modern"
                      value={regRole}
                      onChange={(e) => setRegRole(e.target.value)}
                    >
                      <option value="SEEKER">Job Seeker</option>
                      <option value="COMPANY">Company</option>
                    </select>
                  </div>
                  {regRole === "SEEKER" && (
                    <div className="mb-4">
                      <label className="form-label">
                        Skills (comma separated)
                      </label>
                      <input
                        type="text"
                        className="form-control form-control-modern"
                        placeholder="e.g. React, Java, UI/UX"
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
                {isLogin
                  ? "Don't have an account?"
                  : "Already have an account?"}
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

        {/* Forgot Password Modal */}
        {showForgotModal && (
          <div
            className="modal show d-block bg-dark bg-opacity-50"
            tabIndex="-1"
          >
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content border-0 shadow-lg rounded-5">
                <div className="modal-header border-0 p-4 pb-0">
                  <h4 className="modal-title fw-bold">Reset Password</h4>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setShowForgotModal(false)}
                  ></button>
                </div>
                <div className="modal-body p-4 pt-3">
                  <p className="text-muted mb-4">
                    Enter your email address and we'll send you a link to reset
                    your password.
                  </p>
                  <form onSubmit={handleForgotSubmit}>
                    <div className="mb-4">
                      <label className="form-label">Email address</label>
                      <input
                        type="email"
                        className="form-control form-control-modern"
                        placeholder="name@company.com"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      className="btn btn-modern btn-primary-custom w-100 py-3 mt-2"
                    >
                      Send Reset Link
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Seeker & Company variables
  const seekerMetrics = getSeekerMetrics();
  const companyMetrics = getCompanyMetrics();
  const unreadCount = notifications.filter((n) => !n.read).length;

  const getFilteredApplicants = () => {
    let list = atsJob 
      ? [...atsApplicants] 
      : [...companyApplications];
    
    // Sort by id descending so most recent are first
    list.sort((a, b) => b.id - a.id);
      
    if (globalSearchQuery.trim() !== "") {
      const query = globalSearchQuery.toLowerCase();
      return list.filter(app => 
        (app.applicant?.name || "").toLowerCase().includes(query) ||
        (app.applicant?.email || "").toLowerCase().includes(query) ||
        (app.applicant?.skills || "").toLowerCase().includes(query) ||
        (app.job?.title || "").toLowerCase().includes(query)
      );
    } else {
      return list.slice(0, 8);
    }
  };

  const displayApplicants = getFilteredApplicants();

  const getCandidateDisplayList = () => {
    let list = [];
    if (globalCandidateResults.length > 0) {
      list = [...globalCandidateResults];
    } else {
      // Map companyApplications to applicants and remove duplicates
      list = companyApplications
        .map(app => app.applicant)
        .filter((applicant, index, self) => 
          applicant && self.findIndex(a => a?.id === applicant?.id) === index
        );
    }
    
    // Sort by id descending so most recent are first
    list.sort((a, b) => b.id - a.id);
    
    if (globalSearchQuery.trim() !== "") {
      return list;
    } else {
      return list.slice(0, 8);
    }
  };

  const candidateDisplayList = getCandidateDisplayList();

  return (
    <div className="app-layout">
      {/* Sidebar Navigation */}
      <nav
        className={`sidebar ${currentUser.role === "SEEKER" ? "sidebar-light" : "sidebar-dark"}`}
      >
        <a href="#" className="brand text-decoration-none">
          {currentUser.role === "SEEKER" ? (
            <>
              <div className="brand-icon">JP</div>
              <span>JobPortal</span>
            </>
          ) : (
            <>
              <div className="brand-icon">
                <i className="fas fa-building text-white fs-5"></i>
              </div>
              <span>JobPortal Company</span>
            </>
          )}
        </a>

        <ul className="sidebar-nav mt-2">
          {currentUser.role === "SEEKER" ? (
            <>
              <li>
                <a
                  className={activeTab === "dashboard" ? "active" : ""}
                  onClick={() => setActiveTab("dashboard")}
                >
                  <i className="fas fa-home me-2"></i> Dashboard
                </a>
              </li>
              <li>
                <a
                  className={activeTab === "find" ? "active" : ""}
                  onClick={() => setActiveTab("find")}
                >
                  <i className="fas fa-briefcase me-2"></i> Find Jobs
                </a>
              </li>
              <li>
                <a
                  className={activeTab === "saved" ? "active" : ""}
                  onClick={() => setActiveTab("saved")}
                >
                  <i className="fas fa-heart me-2"></i> Saved Jobs
                </a>
              </li>
              <li>
                <a
                  className={activeTab === "applications" ? "active" : ""}
                  onClick={() => setActiveTab("applications")}
                >
                  <i className="fas fa-file-alt me-2"></i> My Applications
                </a>
              </li>
              <li>
                <a
                  className={activeTab === "profile" ? "active" : ""}
                  onClick={() => setActiveTab("profile")}
                >
                  <i className="fas fa-user me-2"></i> Profile
                </a>
              </li>
            </>
          ) : (
            <>
              <li>
                <a
                  className={activeTab === "dashboard" ? "active" : ""}
                  onClick={() => setActiveTab("dashboard")}
                >
                  <i className="fas fa-th-large me-2"></i> Dashboard
                </a>
              </li>
              <li>
                <a
                  className={activeTab === "candidates" ? "active" : ""}
                  onClick={() => setActiveTab("candidates")}
                >
                  <i className="fas fa-users me-2"></i> Candidates
                </a>
              </li>
              <li>
                <a
                  className={activeTab === "jobs" ? "active" : ""}
                  onClick={() => setActiveTab("jobs")}
                >
                  <i className="fas fa-briefcase me-2"></i> Jobs
                </a>
              </li>
              <li>
                <a
                  className={activeTab === "schedule" ? "active" : ""}
                  onClick={() => setActiveTab("schedule")}
                >
                  <i className="fas fa-calendar-alt me-2"></i> Schedule
                </a>
              </li>
              <li>
                <a
                  className={activeTab === "profile" ? "active" : ""}
                  onClick={() => setActiveTab("profile")}
                >
                  <i className="fas fa-user me-2"></i> Profile
                </a>
              </li>
            </>
          )}
        </ul>

        <div className="sidebar-bottom">
          <ul className="sidebar-nav">
            <li>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  logout();
                }}
                className="text-danger"
                style={{ cursor: "pointer" }}
              >
                <i className="fas fa-sign-out-alt me-2"></i> Logout
              </a>
            </li>
          </ul>
        </div>
      </nav>

      {/* Main Content Pane */}
      <main className="main-content">
        {/* Topbar Panel */}
        <div className="topbar">
          <div className="topbar-search d-none d-md-block">
            <i className="fas fa-search"></i>
            {currentUser.role === "SEEKER" ? (
              <input
                type="text"
                placeholder="Search jobs, skills or companies..."
                value={jobSearch}
                onChange={(e) => {
                  setJobSearch(e.target.value);
                  if (activeTab !== "find") {
                    setActiveTab("find");
                  }
                }}
              />
            ) : (
              <input
                type="text"
                placeholder="Search candidate by name or skill..."
                value={globalSearchQuery}
                onChange={(e) => setGlobalSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setActiveTab("candidates");
                    handleGlobalCandidateSearch();
                  }
                }}
              />
            )}
          </div>

          <div className="d-flex align-items-center gap-3">
            {currentUser.role === "COMPANY" && (
              <button
                className="btn btn-primary-custom btn-modern me-3"
                onClick={() => setShowPostJobModal(true)}
              >
                <i className="fas fa-plus"></i> Create Job
              </button>
            )}

            {/* Notification Bell Dropdown */}
            <div className="dropdown">
              <button
                className="btn btn-light rounded-circle p-2 position-relative dropdown-toggle border-0"
                data-bs-toggle="dropdown"
                style={{ content: "none" }}
              >
                <i className="fas fa-bell text-muted"></i>
                {unreadCount > 0 && (
                  <span className="position-absolute top-0 start-100 translate-middle p-1 bg-danger border border-light rounded-circle"></span>
                )}
              </button>
              <div
                className="dropdown-menu dropdown-menu-end p-0 border-0 shadow-lg"
                style={{
                  width: "320px",
                  borderRadius: "12px",
                  overflow: "hidden",
                }}
              >
                <div className="p-3 bg-primary text-white d-flex justify-content-between align-items-center">
                  <h6 className="m-0 fw-bold">
                    <i className="fas fa-bell me-2"></i> Notifications
                  </h6>
                  <span className="badge bg-white text-primary rounded-pill small">
                    {unreadCount} New
                  </span>
                </div>
                <div
                  className="d-flex flex-column"
                  style={{
                    maxHeight: "300px",
                    overflowY: "auto",
                    background: "white",
                  }}
                >
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-muted small">
                      <i className="fas fa-bell-slash d-block fs-3 mb-2 text-light"></i>
                      No notifications yet
                    </div>
                  ) : (
                    notifications.map((n) => {
                      let icon = "fa-info-circle text-primary";
                      if (n.type === "SUCCESS")
                        icon = "fa-check-circle text-success";
                      if (n.type === "WARNING")
                        icon = "fa-exclamation-circle text-warning";
                      if (n.type === "MATCH") icon = "fa-briefcase text-purple";

                      return (
                        <div
                          key={n.id}
                          className={`p-3 border-bottom d-flex gap-3 align-items-start ${n.read ? "" : "bg-light fw-semibold"}`}
                        >
                          <i className={`fas ${icon} fs-5 mt-1`}></i>
                          <div style={{ flex: "1", minWidth: "0" }}>
                            <p
                              className="m-0 small text-dark"
                              style={{ lineHeight: "1.4" }}
                            >
                              {n.text}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
                <div className="p-2 border-top bg-light text-center">
                  <a
                    href="#"
                    className="text-decoration-none small fw-semibold text-primary"
                    onClick={(e) => {
                      e.preventDefault();
                      const key = `notifications_${currentUser.id}`;
                      const list = JSON.parse(localStorage.getItem(key)) || [];
                      const updated = list.map((n) => ({ ...n, read: true }));
                      localStorage.setItem(key, JSON.stringify(updated));
                      setNotifications(updated);
                    }}
                  >
                    Mark all as read
                  </a>
                </div>
              </div>
            </div>

            <div
              className="user-profile-badge"
              onClick={() => setActiveTab("profile")}
              style={{ cursor: "pointer" }}
            >
              <div className="avatar">
                {currentUser.name
                  ? currentUser.name.charAt(0).toUpperCase()
                  : "U"}
              </div>
              <span className="fw-semibold me-2">
                {currentUser.name || "User"}
              </span>
            </div>
          </div>
        </div>

        {/* ==========================================
            PORTAL: JOB SEEKER VIEWS
            ========================================== */}
        {currentUser.role === "SEEKER" && (
          <>
            {/* Seekers Dashboard View */}
            {activeTab === "dashboard" && (
              <div>
                {/* Metrics Row */}
                <div className="metric-row">
                  <div className="metric-card">
                    <div className="metric-icon blue">
                      <i className="fas fa-check-circle"></i>
                    </div>
                    <div className="metric-info">
                      <h5>Job Applied</h5>
                      <h3>{seekerMetrics.applied}</h3>
                    </div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-icon orange">
                      <i className="fas fa-bookmark"></i>
                    </div>
                    <div className="metric-info">
                      <h5>Saved Jobs</h5>
                      <h3>{seekerMetrics.saved}</h3>
                    </div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-icon green">
                      <i className="fas fa-envelope-open-text"></i>
                    </div>
                    <div className="metric-info">
                      <h5>Job Offers</h5>
                      <h3>{seekerMetrics.offers}</h3>
                    </div>
                  </div>
                </div>

                {/* Upgrade Pro Banner */}
                {!isPro && (
                  <div className="upgrade-banner">
                    <div className="upgrade-text d-flex align-items-center gap-3">
                      <div
                        className="metric-icon"
                        style={{
                          background: "rgba(255,255,255,0.2)",
                          color: "white",
                        }}
                      >
                        <i className="fas fa-star"></i>
                      </div>
                      <div>
                        <h4>See jobs where you'd be a top applicant</h4>
                        <p>
                          Try PRO free for 6 months and boost your visibility.
                        </p>
                      </div>
                    </div>
                    <button
                      className="btn btn-light fw-bold rounded-pill px-4 text-primary"
                      onClick={() => setShowProModal(true)}
                    >
                      GO PRO
                    </button>
                  </div>
                )}

                {/* Job recommendations grid and Resume panel */}
                <div className="row g-4">
                  <div className="col-xl-8 col-lg-7">
                    <div className="d-flex justify-content-between align-items-center mb-4">
                      <h4 className="fw-bold m-0">Recommended For You</h4>
                      <button
                        className="btn btn-outline-primary btn-sm rounded-pill px-3"
                        onClick={() => setActiveTab("find")}
                      >
                        View All
                      </button>
                    </div>

                    <div className="job-grid">
                      {[...allJobs].sort((a, b) => b.id - a.id).slice(0, 6).map((job) => {
                        const isSaved = savedJobs.includes(job.id);
                        const companyName =
                          job.company?.name || "Unknown Company";
                        return (
                          <div
                            key={job.id}
                            className={`job-card ${isPro ? "top-applicant-card" : ""}`}
                          >
                            <div className="d-flex justify-content-between">
                              <div className="job-company-logo">
                                {companyName.charAt(0).toUpperCase()}
                              </div>
                              <button
                                className="btn btn-light rounded-circle p-2 shadow-sm border-0"
                                onClick={() => toggleSaveJob(job.id, job.title)}
                                style={{ width: "40px", height: "40px" }}
                              >
                                <i
                                  className={`fa-heart ${isSaved ? "fas text-danger" : "far text-muted"}`}
                                ></i>
                              </button>
                            </div>
                            <h5 className="job-title">{job.title}</h5>
                            <div className="company-name">
                              <i className="fas fa-building me-1"></i>{" "}
                              {companyName}
                            </div>
                            <div className="job-location text-muted small mb-2">
                              <i className="fas fa-map-marker-alt me-1"></i>{" "}
                              {job.location || "Remote"}
                            </div>
                            <p className="job-desc">
                              {(job.description || "").length > 100
                                ? (job.description || "").substring(0, 100) + "..."
                                : (job.description || "")}
                            </p>
                            <div className="d-flex flex-wrap gap-2 mb-3">
                              {(job.requiredSkills || job.required_skills || "").split(",").map((skill, i) => (
                                <span
                                  key={i}
                                  className="badge-modern badge-gray"
                                >
                                  {skill.trim()}
                                </span>
                              ))}
                            </div>
                            <div className="job-card-footer">
                              <span className="text-muted small">
                                <i className="fas fa-clock me-1"></i> Full Time
                              </span>
                              <button
                                className="btn btn-modern btn-primary-custom btn-sm px-4"
                                onClick={() => applyJob(job)}
                              >
                                Apply
                              </button>
                            </div>
                          </div>
                        );
                      })}
                      {allJobs.length === 0 && (
                        <p className="text-muted">Loading active jobs...</p>
                      )}
                    </div>
                  </div>

                  <div className="col-xl-4 col-lg-5">
                    {/* Resume Card */}
                    <div className="card-modern">
                      <div className="card-header-modern">
                        <h4 className="card-title-modern fw-bold">My Resume</h4>
                      </div>
                      <div id="resumeCardContent">
                        {currentUser.resumeFilename ? (
                          <div className="p-3 border rounded-3 bg-white shadow-sm d-flex flex-column gap-3 text-center border-start border-4 border-success">
                            <div className="d-flex align-items-center gap-3 text-start">
                              <div
                                className="bg-success text-white rounded-circle d-flex align-items-center justify-content-center"
                                style={{
                                  width: "44px",
                                  height: "44px",
                                  fontSize: "1.25rem",
                                }}
                              >
                                <i className="fas fa-file-pdf"></i>
                              </div>
                              <div style={{ flex: "1", minWidth: "0" }}>
                                <h6
                                  className="fw-bold text-dark mb-0 text-truncate"
                                  title={currentUser.resumeFilename}
                                >
                                  {currentUser.resumeFilename}
                                </h6>
                                <p className="text-muted small mb-0">
                                  Resume active
                                </p>
                              </div>
                            </div>
                            <div className="d-flex gap-2">
                              <button
                                className="btn btn-resume btn-sm w-100"
                                onClick={() =>
                                  viewResume(
                                    currentUser.id,
                                    currentUser.name,
                                    currentUser.skills,
                                  )
                                }
                              >
                                <i className="fas fa-eye me-1"></i> View
                              </button>
                              <button
                                className="btn btn-outline-primary-custom btn-sm w-100"
                                onClick={() =>
                                  document
                                    .getElementById("resumeFileInput")
                                    .click()
                                }
                              >
                                <i className="fas fa-sync me-1"></i> Replace
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div
                            className="upload-area"
                            onClick={() =>
                              document.getElementById("resumeFileInput").click()
                            }
                          >
                            <i className="fas fa-cloud-upload-alt upload-icon"></i>
                            <h5 className="fw-bold">Upload Resume</h5>
                            <p className="text-muted small mb-0">
                              PDF, DOCX up to 5MB
                            </p>
                          </div>
                        )}
                        <input
                          type="file"
                          id="resumeFileInput"
                          className="d-none"
                          onChange={handleResumeUpload}
                          accept=".pdf,.doc,.docx"
                        />
                      </div>
                    </div>

                    {/* Recent Applications Card */}
                    <div className="card-modern mt-4">
                      <div className="card-header-modern">
                        <h4 className="card-title-modern fw-bold">
                          Recent Applications
                        </h4>
                      </div>
                      <div className="d-flex flex-column gap-3">
                        {myApplications.slice(0, 4).map((app) => {
                          let badgeClass = "badge-gray";
                          if (app.status === "SCREENING")
                            badgeClass = "badge-blue";
                          if (app.status === "ASSESSMENT")
                            badgeClass = "badge-yellow";
                          if (app.status === "INTERVIEW")
                            badgeClass = "badge-purple";
                          if (app.status === "OFFER")
                            badgeClass = "badge-green";
                          if (app.status === "REJECTED")
                            badgeClass = "badge-red";

                          return (
                            <div
                              key={app.id}
                              className="p-3 border rounded-3 bg-white shadow-sm d-flex flex-column gap-2"
                            >
                              <div className="d-flex justify-content-between align-items-start">
                                <div>
                                  <h6 className="fw-bold mb-1">
                                    {app.job?.title}
                                  </h6>
                                  <p className="text-muted small mb-0">
                                    <i className="fas fa-building me-1"></i>{" "}
                                    {app.job?.company?.name}
                                  </p>
                                </div>
                                <span className={`badge-modern ${badgeClass}`}>
                                  {app.status}
                                </span>
                              </div>
                              <div className="d-flex flex-wrap gap-1 mt-1">
                                {(app.job?.requiredSkills || app.job?.required_skills || "").split(",").slice(0, 3).map((skill, i) => skill.trim() && (
                                  <span key={i} className="badge-modern badge-gray" style={{ fontSize: "0.65rem", padding: "0.15rem 0.4rem" }}>
                                    {skill.trim()}
                                  </span>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                        {myApplications.length === 0 && (
                          <p className="text-muted small">
                            No applications yet.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Find Jobs View */}
            {activeTab === "find" && (
              <div>
                <h4 className="fw-bold mb-4">All Available Jobs</h4>
                <div className="job-grid">
                  {(() => {
                    const sortedJobs = [...allJobs].sort((a, b) => b.id - a.id);
                    if (jobSearch.trim() === "") {
                      return sortedJobs.slice(0, 12);
                    } else {
                      return sortedJobs.filter(
                        (j) =>
                          (j.title || "")
                            .toLowerCase()
                            .includes(jobSearch.toLowerCase()) ||
                          (j.description || "")
                            .toLowerCase()
                            .includes(jobSearch.toLowerCase()) ||
                          (j.requiredSkills || j.required_skills || "")
                            .toLowerCase()
                            .includes(jobSearch.toLowerCase()) ||
                          (j.location || "")
                            .toLowerCase()
                            .includes(jobSearch.toLowerCase())
                      );
                    }
                  })().map((job) => {
                      const isSaved = savedJobs.includes(job.id);
                      const companyName =
                        job.company?.name || "Unknown Company";
                      return (
                        <div key={job.id} className="job-card">
                          <div className="d-flex justify-content-between">
                            <div className="job-company-logo">
                              {companyName.charAt(0).toUpperCase()}
                            </div>
                            <button
                              className="btn btn-light rounded-circle p-2 shadow-sm border-0"
                              onClick={() => toggleSaveJob(job.id, job.title)}
                              style={{ width: "40px", height: "40px" }}
                            >
                              <i
                                className={`fa-heart ${isSaved ? "fas text-danger" : "far text-muted"}`}
                              ></i>
                            </button>
                          </div>
                          <h5 className="job-title">{job.title}</h5>
                          <div className="company-name">
                            <i className="fas fa-building me-1"></i>{" "}
                            {companyName}
                          </div>
                          <div className="job-location text-muted small mb-2">
                            <i className="fas fa-map-marker-alt me-1"></i>{" "}
                            {job.location || "Remote"}
                          </div>
                          <p className="job-desc">{job.description || ""}</p>
                          <div className="d-flex flex-wrap gap-2 mb-3">
                            {(job.requiredSkills || job.required_skills || "").split(",").map((skill, i) => (
                              <span key={i} className="badge-modern badge-gray">
                                {skill.trim()}
                              </span>
                            ))}
                          </div>
                          <div className="job-card-footer">
                            <span className="text-muted small">
                              <i className="fas fa-clock me-1"></i> Full Time
                            </span>
                            <button
                              className="btn btn-modern btn-primary-custom btn-sm px-4"
                              onClick={() => applyJob(job)}
                            >
                              Apply
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Saved Jobs View */}
            {activeTab === "saved" && (
              <div>
                <h4 className="fw-bold mb-4">Your Saved Jobs</h4>
                <div className="job-grid">
                  {allJobs
                    .filter((job) => savedJobs.includes(job.id))
                    .map((job) => {
                      const isSaved = true;
                      const companyName =
                        job.company?.name || "Unknown Company";
                      return (
                        <div key={job.id} className="job-card">
                          <div className="d-flex justify-content-between">
                            <div className="job-company-logo">
                              {companyName.charAt(0).toUpperCase()}
                            </div>
                            <button
                              className="btn btn-light rounded-circle p-2 shadow-sm border-0"
                              onClick={() => toggleSaveJob(job.id, job.title)}
                              style={{ width: "40px", height: "40px" }}
                            >
                              <i
                                className={`fa-heart ${isSaved ? "fas text-danger" : "far text-muted"}`}
                              ></i>
                            </button>
                          </div>
                          <h5 className="job-title">{job.title}</h5>
                          <div className="company-name">
                            <i className="fas fa-building me-1"></i>{" "}
                            {companyName}
                          </div>
                          <div className="job-location text-muted small mb-2">
                            <i className="fas fa-map-marker-alt me-1"></i>{" "}
                            {job.location || "Remote"}
                          </div>
                          <p className="job-desc">{job.description || ""}</p>
                          <div className="d-flex flex-wrap gap-2 mb-3">
                            {(job.requiredSkills || job.required_skills || "").split(",").map((skill, i) => (
                              <span key={i} className="badge-modern badge-gray">
                                {skill.trim()}
                              </span>
                            ))}
                          </div>
                          <div className="job-card-footer">
                            <span className="text-muted small">
                              <i className="fas fa-clock me-1"></i> Full Time
                            </span>
                            <button
                              className="btn btn-modern btn-primary-custom btn-sm px-4"
                              onClick={() => applyJob(job)}
                            >
                              Apply
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  {allJobs.filter((job) => savedJobs.includes(job.id))
                    .length === 0 && (
                    <p className="text-muted">No saved jobs yet.</p>
                  )}
                </div>
              </div>
            )}

            {/* My Applications View */}
            {activeTab === "applications" && (
              <div>
                <h4 className="fw-bold mb-4">My Applications Pipeline</h4>
                <div className="d-flex flex-column gap-3">
                  {myApplications.map((app) => {
                    let badgeClass = "badge-gray";
                    if (app.status === "SCREENING") badgeClass = "badge-blue";
                    if (app.status === "ASSESSMENT")
                      badgeClass = "badge-yellow";
                    if (app.status === "INTERVIEW") badgeClass = "badge-purple";
                    if (app.status === "OFFER") badgeClass = "badge-green";
                    if (app.status === "REJECTED") badgeClass = "badge-red";

                    return (
                      <div
                        key={app.id}
                        className="d-flex justify-content-between align-items-center p-4 border rounded-3 bg-white shadow-sm"
                      >
                        <div>
                          <h5 className="fw-bold mb-1 text-dark">
                            {app.job?.title}
                          </h5>
                          <p className="text-muted mb-0">
                            <i className="fas fa-building me-1"></i>{" "}
                            {app.job?.company?.name} &nbsp;&bull;&nbsp;{" "}
                            <i className="fas fa-map-marker-alt me-1"></i>{" "}
                            {app.job?.location || "Remote"}
                          </p>
                          <div className="mt-2">
                            <span className="small text-muted">
                              Screening Resume Match:
                            </span>
                            <span className="fw-bold text-primary ms-1">
                              {(app.resumeMatchScore || 0).toFixed(0)}%
                            </span>
                          </div>
                          <div className="d-flex flex-wrap gap-2 mt-2">
                            <span className="small text-muted align-self-center">Required Skills:</span>
                            {(app.job?.requiredSkills || app.job?.required_skills || "").split(",").map((skill, i) => skill.trim() && (
                              <span key={i} className="badge-modern badge-gray" style={{ fontSize: "0.75rem" }}>
                                {skill.trim()}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="text-end">
                          <span
                            className={`badge-modern fs-6 px-3 py-2 ${badgeClass}`}
                          >
                            {app.status}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  {myApplications.length === 0 && (
                    <p className="text-muted">
                      You haven't applied to any jobs yet.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Profile Setup Seeker */}
            {activeTab === "profile" && (
              <div
                className="card-modern mx-auto p-4"
                style={{ maxWidth: "600px" }}
              >
                <div className="d-flex align-items-center gap-3 mb-4">
                  <div
                    className="avatar bg-primary text-white fs-3 d-flex align-items-center justify-content-center"
                    style={{ width: "60px", height: "60px" }}
                  >
                    {currentUser.name
                      ? currentUser.name.charAt(0).toUpperCase()
                      : "U"}
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
                    <label className="form-label fw-semibold">
                      Email Address
                    </label>
                    <input
                      type="email"
                      className="form-control form-control-modern"
                      value={profileForm.email}
                      onChange={(e) =>
                        setProfileForm({
                          ...profileForm,
                          email: e.target.value,
                        })
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
                        setProfileForm({
                          ...profileForm,
                          skills: e.target.value,
                        })
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
            )}
          </>
        )}

        {/* ==========================================
            PORTAL: RECRUITER / COMPANY VIEWS
            ========================================== */}
        {currentUser.role === "COMPANY" && (
          <>
            {/* Recruiter Dashboard View */}
            {activeTab === "dashboard" && (
              <div>
                {/* Metrics Cards */}
                <div className="metric-row">
                  <div className="metric-card">
                    <div className="metric-icon blue">
                      <i className="fas fa-users"></i>
                    </div>
                    <div className="metric-info">
                      <h5>Total Candidates</h5>
                      <h3>{companyMetrics.totalCandidates}</h3>
                      <p className="text-muted small m-0 mt-1">
                        Across all jobs
                      </p>
                    </div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-icon pink">
                      <i className="fas fa-user-plus"></i>
                    </div>
                    <div className="metric-info">
                      <h5>New Candidates</h5>
                      <h3>{companyMetrics.newCandidates}</h3>
                      <p className="text-muted small m-0 mt-1">
                        Status: Applied
                      </p>
                    </div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-icon orange">
                      <i className="fas fa-calendar-check"></i>
                    </div>
                    <div className="metric-info">
                      <h5>Upcoming Interviews</h5>
                      <h3>{companyMetrics.interviews}</h3>
                      <p className="text-muted small m-0 mt-1">
                        Status: Interview
                      </p>
                    </div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-icon green">
                      <i className="fas fa-user-check"></i>
                    </div>
                    <div className="metric-info">
                      <h5>Candidate Hired</h5>
                      <h3>{companyMetrics.hired}</h3>
                      <p className="text-muted small m-0 mt-1">Status: Offer</p>
                    </div>
                  </div>
                </div>

                <div className="row g-4">
                  {/* Left Column: Active job postings */}
                  <div className="col-xl-4 col-lg-5">
                    <div className="card-modern">
                      <div className="card-header-modern">
                        <h4 className="card-title-modern fw-bold">
                          Active Jobs
                        </h4>
                      </div>
                      <div className="d-flex flex-column gap-3">
                        {allJobs.map((job) => (
                          <div
                            key={job.id}
                            className={`p-3 border rounded-3 bg-white shadow-sm d-flex flex-column gap-2 cursor-pointer border-start border-4 ${atsJob?.id === job.id ? "border-primary bg-primary bg-opacity-10" : "border-secondary"}`}
                            onClick={() => selectAtsJob(job)}
                          >
                            <div className="d-flex justify-content-between align-items-center">
                              <h6 className="fw-bold mb-0 text-dark">
                                {job.title}
                              </h6>
                              <div className="d-flex align-items-center gap-2">
                                <button
                                  className="btn btn-link text-danger p-0 border-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteJob(job.id, job.title);
                                  }}
                                >
                                  <i className="fas fa-trash-alt"></i>
                                </button>
                              </div>
                            </div>
                            <div className="small text-muted">
                              <i className="fas fa-map-marker-alt me-1"></i>{" "}
                              {job.location || "Remote"}
                            </div>
                            <p className="text-muted small mb-0 text-truncate">
                              Skills: {job.requiredSkills || job.required_skills}
                            </p>
                          </div>
                        ))}
                        {allJobs.length === 0 && (
                          <p className="text-muted text-center p-3">
                            No active jobs. Click 'Create Job' to publish one.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: ATS Applicant Tracking pipeline */}
                  <div className="col-xl-8 col-lg-7">
                    <div className="card-modern h-100">
                      <div className="card-header-modern mb-2">
                        <div>
                          <h4 className="card-title-modern fw-bold">
                            {atsJob
                              ? `ATS: ${atsJob.title}`
                              : "Applicant Tracking System"}
                          </h4>
                          <p className="text-muted small m-0 mt-1">
                            {atsJob
                              ? "Review candidate profile details, matching percentages, and process stages."
                              : "Select an active job from the left sidebar panel to manage applicants."}
                          </p>
                        </div>
                        {atsJob && (
                          <button
                            className="btn btn-outline-primary-custom btn-sm rounded-pill px-3"
                            onClick={() => {
                              setShowFindCandidatesModal(true);
                              handleGlobalCandidateSearch();
                            }}
                          >
                            <i className="fas fa-search me-1"></i> Match Seekers
                          </button>
                        )}
                      </div>

                      <div className="table-responsive-custom">
                        <table className="table table-modern">
                          <thead>
                            <tr>
                              <th>Applicant Name</th>
                              <th>Match Score</th>
                              <th>Skills</th>
                              <th>Status Pipeline</th>
                              <th>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {displayApplicants.map((app) => {
                              const matchScore = app.resumeMatchScore || 0;
                              let scoreClass = "score-high";
                              if (matchScore < 70) scoreClass = "score-med";
                              if (matchScore < 40) scoreClass = "score-low";

                              return (
                                <tr key={app.id}>
                                  <td>
                                    <div className="candidate-name-cell">
                                      <div
                                        className="avatar"
                                        style={{
                                          width: "36px",
                                          height: "36px",
                                          fontSize: "0.9rem",
                                        }}
                                      >
                                        {app.applicant?.name
                                          ? app.applicant.name
                                              .charAt(0)
                                              .toUpperCase()
                                          : "U"}
                                      </div>
                                      <div>
                                        <div className="fw-bold text-dark">
                                          {app.applicant?.name}
                                        </div>
                                        <div className="small text-muted">
                                          {app.applicant?.email}
                                          {!atsJob && app.job?.title && (
                                            <span className="badge-modern badge-blue ms-2" style={{ fontSize: '0.65rem', padding: '0.15rem 0.4rem' }}>
                                              {app.job.title}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                  <td>
                                    <span className="fw-bold">
                                      {matchScore.toFixed(0)}%
                                    </span>{" "}
                                    Match
                                    <div className="score-container">
                                      <div
                                        className={`score-bar ${scoreClass}`}
                                        style={{ width: `${matchScore}%` }}
                                      ></div>
                                    </div>
                                  </td>
                                  <td>
                                    <div className="d-flex flex-wrap gap-1">
                                      {app.applicant?.skills ? (
                                        app.applicant.skills
                                          .split(",")
                                          .slice(0, 3)
                                          .map((s, idx) => (
                                            <span
                                              key={idx}
                                              className="badge-modern badge-gray"
                                              style={{
                                                fontSize: "0.65rem",
                                                padding: "0.2rem 0.5rem",
                                              }}
                                            >
                                              {s.trim()}
                                            </span>
                                          ))
                                      ) : (
                                        <span className="text-muted small">
                                          N/A
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td>
                                    <select
                                      className="form-select form-select-sm border-0 bg-light fw-medium"
                                      value={app.status}
                                      onChange={(e) =>
                                        handleStatusChange(
                                          app.id,
                                          e.target.value,
                                        )
                                      }
                                    >
                                      <option value="APPLIED">Applied</option>
                                      <option value="SCREENING">
                                        Screening
                                      </option>
                                      <option value="ASSESSMENT">
                                        Assessment
                                      </option>
                                      <option value="INTERVIEW">
                                        Interview
                                      </option>
                                      <option value="OFFER">Offer</option>
                                      <option value="REJECTED">Rejected</option>
                                    </select>
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
                                      <i className="fas fa-file-pdf me-1"></i>{" "}
                                      Resume
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                            {displayApplicants.length === 0 && (
                              <tr>
                                <td
                                  colSpan="5"
                                  className="text-center py-5 text-muted"
                                >
                                  <i className="fas fa-folder-open fs-1 mb-3 text-light"></i>
                                  <p>
                                    {atsJob
                                      ? "No applicants have submitted applications for this job post yet."
                                      : "No candidate applications submitted yet."}
                                  </p>
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Candidates Search Tab View */}
            {activeTab === "candidates" && (
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
                              <div className="fw-bold text-dark">
                                {seeker.name}
                              </div>
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
                                <span className="text-muted small">
                                  None listed
                                </span>
                              )}
                            </div>
                          </td>
                          <td>
                            <button
                              className="btn btn-resume"
                              onClick={() =>
                                viewResume(
                                  seeker.id,
                                  seeker.name,
                                  seeker.skills,
                                )
                              }
                            >
                              <i className="fas fa-file-pdf me-1"></i> View
                              Resume
                            </button>
                          </td>
                        </tr>
                      ))}
                      {candidateDisplayList.length === 0 && (
                        <tr>
                          <td
                            colSpan="4"
                            className="text-center py-5 text-muted"
                          >
                            <i className="fas fa-users-slash fs-1 mb-3 text-light"></i>
                            <p>No candidate applications submitted yet.</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Jobs Management Tab */}
            {activeTab === "jobs" && (
              <div className="card-modern">
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <h4 className="fw-bold m-0">Company Job Openings</h4>
                  <button
                    className="btn btn-primary-custom btn-modern"
                    onClick={() => setShowPostJobModal(true)}
                  >
                    <i className="fas fa-plus"></i> Create Job Opening
                  </button>
                </div>
                <div className="job-grid">
                  {allJobs.map((job) => (
                    <div key={job.id} className="job-card">
                      <div className="d-flex justify-content-between">
                        <div className="job-company-logo">
                          {currentUser.name.charAt(0).toUpperCase()}
                        </div>
                        <button
                          className="btn btn-light rounded-circle p-2 shadow-sm border-0 text-danger"
                          onClick={() => handleDeleteJob(job.id, job.title)}
                          style={{ width: "40px", height: "40px" }}
                        >
                          <i className="fas fa-trash-alt"></i>
                        </button>
                      </div>
                      <h5 className="job-title">{job.title}</h5>
                      <div className="company-name">
                        <i className="fas fa-building me-1"></i>{" "}
                        {currentUser.name}
                      </div>
                      <div className="job-location text-muted small mb-2">
                        <i className="fas fa-map-marker-alt me-1"></i>{" "}
                        {job.location || "Remote"}
                      </div>
                      <p className="job-desc">{job.description || ""}</p>
                      <div className="d-flex flex-wrap gap-2 mb-3">
                        {(job.requiredSkills || job.required_skills || "").split(",").map((skill, i) => (
                          <span key={i} className="badge-modern badge-gray">
                            {skill.trim()}
                          </span>
                        ))}
                      </div>
                      <div className="job-card-footer mt-auto">
                        <span className="badge bg-success text-white py-2 px-3 rounded-pill">
                          Active Status
                        </span>
                        <button
                          className="btn btn-outline-primary-custom btn-sm px-3 py-2 rounded-pill"
                          onClick={() => {
                            setActiveTab("dashboard");
                            selectAtsJob(job);
                          }}
                        >
                          View ATS pipeline
                        </button>
                      </div>
                    </div>
                  ))}
                  {allJobs.length === 0 && (
                    <p className="text-muted">
                      No published openings yet. Click Create Job to publish
                      one.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Recruiter Interview Schedule list */}
            {activeTab === "schedule" && (
              <div className="card-modern">
                <h4 className="fw-bold mb-2">Recruiter Interview Schedule</h4>
                <p className="text-muted small mb-4">
                  Candidates who successfully navigated screening/assessment
                  stages and are currently scheduled for interviews.
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
                      {/* Filtering applications that are currently in status INTERVIEW */}
                      {(() => {
                        const localApps = [];
                        for (let i = 0; i < localStorage.length; i++) {
                          const key = localStorage.key(i);
                          if (key?.startsWith("localApps_")) {
                            localApps.push(
                              ...(JSON.parse(localStorage.getItem(key)) || []),
                            );
                          }
                        }

                        // Combine backend database applications and offline local applications
                        const mergedApps = [...companyApplications];
                        localApps.forEach((la) => {
                          if (!mergedApps.some((a) => a.id === la.id || (a.job?.id === la.job?.id && (a.applicant?.id === la.applicant?.id || a.user_id === la.user_id)))) {
                            mergedApps.push(la);
                          }
                        });

                        const scheduledApps = mergedApps.filter(
                          (app) =>
                            allJobs.some((j) => j.id === app.job?.id) &&
                            app.status === "INTERVIEW",
                        );

                        if (scheduledApps.length === 0) {
                          return (
                            <tr>
                              <td
                                colSpan="4"
                                className="text-center py-5 text-muted"
                              >
                                <i className="fas fa-calendar-times fs-1 mb-3 text-light"></i>
                                <p>
                                  No candidates are currently scheduled in the
                                  Interview stage.
                                </p>
                              </td>
                            </tr>
                          );
                        }

                        return scheduledApps.map((app) => (
                          <tr key={app.id}>
                            <td>
                              <div className="candidate-name-cell">
                                <div className="avatar">
                                  {app.applicant?.name?.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div className="fw-bold text-dark">
                                    {app.applicant?.name}
                                  </div>
                                  <div className="small text-muted">
                                    {app.applicant?.email}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td>
                              <span className="fw-bold text-dark">
                                {app.job?.title}
                              </span>
                              <div className="small text-muted">
                                {app.job?.location || "Remote"}
                              </div>
                            </td>
                            <td>
                              <span className="fw-bold text-primary">
                                {(app.resumeMatchScore || 0).toFixed(0)}%
                              </span>{" "}
                              Matching score
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
                                <i className="fas fa-file-pdf me-1"></i> View
                                Resume
                              </button>
                            </td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Profile Setup Recruiter */}
            {activeTab === "profile" && (
              <div
                className="card-modern mx-auto p-4"
                style={{ maxWidth: "600px" }}
              >
                <div className="d-flex align-items-center gap-3 mb-4">
                  <div
                    className="avatar bg-primary text-white fs-3 d-flex align-items-center justify-content-center"
                    style={{ width: "60px", height: "60px" }}
                  >
                    {currentUser.name
                      ? currentUser.name.charAt(0).toUpperCase()
                      : "C"}
                  </div>
                  <div>
                    <h4 className="fw-bold m-0">{currentUser.name}</h4>
                    <p className="text-muted m-0">Company Recruiter Account</p>
                  </div>
                </div>
                <form onSubmit={handleProfileSave}>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">
                      Company Name
                    </label>
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
                    <label className="form-label fw-semibold">
                      Contact Email Address
                    </label>
                    <input
                      type="email"
                      className="form-control form-control-modern"
                      value={profileForm.email}
                      onChange={(e) =>
                        setProfileForm({
                          ...profileForm,
                          email: e.target.value,
                        })
                      }
                      required
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
            )}
          </>
        )}
      </main>

      {/* ==========================================
          MODALS COMPONENT SECTION
          ========================================== */}

      {/* Create Job Posting Modal */}
      {showPostJobModal && (
        <div className="modal show d-block bg-dark bg-opacity-50" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4">
              <div className="modal-header border-0 p-4 pb-0">
                <h4 className="modal-title fw-bold">Post a New Job Opening</h4>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowPostJobModal(false)}
                ></button>
              </div>
              <div className="modal-body p-4 pt-3">
                <form onSubmit={handlePostJob}>
                  <div className="mb-3">
                    <label className="form-label">Job Title</label>
                    <input
                      type="text"
                      className="form-control form-control-modern"
                      placeholder="e.g. Senior Frontend Developer"
                      value={jobForm.title}
                      onChange={(e) =>
                        setJobForm({ ...jobForm, title: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Location</label>
                    <input
                      type="text"
                      className="form-control form-control-modern"
                      placeholder="e.g. New York, NY or Remote"
                      value={jobForm.location}
                      onChange={(e) =>
                        setJobForm({ ...jobForm, location: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Job Description</label>
                    <textarea
                      className="form-control form-control-modern"
                      rows="4"
                      placeholder="Describe the responsibilities and daily workflows..."
                      value={jobForm.description}
                      onChange={(e) =>
                        setJobForm({ ...jobForm, description: e.target.value })
                      }
                      required
                    ></textarea>
                  </div>
                  <div className="mb-4">
                    <label className="form-label">
                      Required Skills (comma separated)
                    </label>
                    <input
                      type="text"
                      className="form-control form-control-modern"
                      placeholder="e.g., Java, React, SQL"
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
                  <button
                    type="submit"
                    className="btn btn-modern btn-primary-custom w-100 py-3"
                  >
                    Publish Job Opening
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recruiter ATS Match Find Candidates Modal */}
      {showFindCandidatesModal && (
        <div className="modal show d-block bg-dark bg-opacity-50" tabIndex="-1">
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4">
              <div className="modal-header border-0 p-4 pb-0">
                <h4 className="modal-title fw-bold">
                  Candidate Skill Match Recommendations
                </h4>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowFindCandidatesModal(false)}
                ></button>
              </div>
              <div className="modal-body p-4 pt-3">
                <div className="topbar-search w-100 mb-4 position-relative">
                  <i className="fas fa-search"></i>
                  <input
                    type="text"
                    placeholder="Search candidates by name or key technical skills..."
                    value={globalSearchQuery}
                    onChange={(e) => setGlobalSearchQuery(e.target.value)}
                    style={{ paddingRight: "100px" }}
                  />
                  <button
                    className="btn btn-primary-custom position-absolute top-50 end-0 translate-middle-y me-1 rounded-pill"
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
                        <th>Candidate Profile</th>
                        <th>Email Contact</th>
                        <th>Registered Skills</th>
                        <th>Action Link</th>
                      </tr>
                    </thead>
                    <tbody>
                      {globalCandidateResults.map((seeker) => (
                        <tr key={seeker.id}>
                          <td>
                            <div className="candidate-name-cell">
                              <div
                                className="avatar"
                                style={{
                                  width: "36px",
                                  height: "36px",
                                  fontSize: "0.9rem",
                                }}
                              >
                                {seeker.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="fw-bold text-dark">
                                {seeker.name}
                              </div>
                            </div>
                          </td>
                          <td className="text-muted">{seeker.email}</td>
                          <td>
                            <div className="d-flex flex-wrap gap-1">
                              {seeker.skills ? (
                                seeker.skills
                                  .split(",")
                                  .slice(0, 3)
                                  .map((s, idx) => (
                                    <span
                                      key={idx}
                                      className="badge-modern badge-gray"
                                      style={{
                                        fontSize: "0.65rem",
                                        padding: "0.2rem 0.5rem",
                                      }}
                                    >
                                      {s.trim()}
                                    </span>
                                  ))
                              ) : (
                                <span className="text-muted small">N/A</span>
                              )}
                            </div>
                          </td>
                          <td>
                            <button
                              className="btn btn-resume"
                              onClick={() =>
                                viewResume(
                                  seeker.id,
                                  seeker.name,
                                  seeker.skills,
                                )
                              }
                            >
                              <i className="fas fa-file-pdf me-1"></i> Resume
                            </button>
                          </td>
                        </tr>
                      ))}
                      {globalCandidateResults.length === 0 && (
                        <tr>
                          <td
                            colSpan="4"
                            className="text-center py-4 text-muted"
                          >
                            No matching candidates found inside platform
                            database.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Seeker Premium PRO Upgrade Modal */}
      {showProModal && (
        <div className="modal show d-block bg-dark bg-opacity-50" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
              <div
                className="modal-header border-0 p-4 pb-0 text-white"
                style={{
                  background: "linear-gradient(135deg, #4F46E5, #EC4899)",
                  position: "relative",
                  height: "160px",
                  display: "flex",
                  alignItems: "flex-end",
                  paddingBottom: "20px",
                }}
              >
                <button
                  type="button"
                  className="btn-close btn-close-white position-absolute top-0 end-0 m-3"
                  onClick={() => setShowProModal(false)}
                ></button>
                <div className="mb-3">
                  <span
                    className="badge bg-warning text-dark fw-bold mb-1"
                    style={{ fontSize: "0.7rem" }}
                  >
                    RECOMMENDED
                  </span>
                  <h3 className="modal-title fw-bold text-white mb-0">
                    JobPortal{" "}
                    <span className="fw-bold" style={{ color: "#F59E0B" }}>
                      PRO
                    </span>
                  </h3>
                  <p className="text-white-50 small mb-0">
                    Boost your hiring opportunities immediately.
                  </p>
                </div>
              </div>
              <div className="modal-body p-4">
                <div className="d-flex flex-column gap-3 mb-4">
                  <div className="d-flex align-items-start gap-3">
                    <div
                      className="bg-primary-subtle text-primary rounded-circle p-2 d-flex align-items-center justify-content-center"
                      style={{
                        width: "36px",
                        height: "36px",
                        minWidth: "36px",
                      }}
                    >
                      <i className="fas fa-star text-warning"></i>
                    </div>
                    <div>
                      <h6 className="fw-bold mb-1 text-dark">
                        Top Applicant Highlighting
                      </h6>
                      <p className="text-muted small mb-0">
                        Get exclusive golden borders and a star badge next to
                        your applications inside recruiter feeds.
                      </p>
                    </div>
                  </div>
                  <div className="d-flex align-items-start gap-3">
                    <div
                      className="bg-success-subtle text-success rounded-circle p-2 d-flex align-items-center justify-content-center"
                      style={{
                        width: "36px",
                        height: "36px",
                        minWidth: "36px",
                      }}
                    >
                      <i className="fas fa-filter text-success"></i>
                    </div>
                    <div>
                      <h6 className="fw-bold mb-1 text-dark">
                        Match Filter Controls
                      </h6>
                      <p className="text-muted small mb-0">
                        Activate top matching toggles to instantly filter jobs
                        with 70%+ match scores.
                      </p>
                    </div>
                  </div>
                  <div className="d-flex align-items-start gap-3">
                    <div
                      className="bg-info-subtle text-info rounded-circle p-2 d-flex align-items-center justify-content-center"
                      style={{
                        width: "36px",
                        height: "36px",
                        minWidth: "36px",
                      }}
                    >
                      <i className="fas fa-bolt text-info"></i>
                    </div>
                    <div>
                      <h6 className="fw-bold mb-1 text-dark">
                        Priority Candidate Matching
                      </h6>
                      <p className="text-muted small mb-0">
                        Elevate your visibility score and be matched before
                        standard applications are reviewed.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-light p-3 rounded-3 mb-4 text-center">
                  <div className="fw-bold text-dark mb-1">
                    JobPortal PRO Membership
                  </div>
                  <div className="text-muted small">
                    6 Months Free Access &bull; Cancel anytime
                  </div>
                  <div className="fs-4 fw-bold text-primary mt-2">
                    $0.00{" "}
                    <span className="fs-6 text-muted fw-normal">/ month</span>
                  </div>
                </div>

                <button
                  className="btn btn-modern btn-primary-custom w-100 py-3 fw-bold border-0"
                  onClick={() => {
                    localStorage.setItem("isProMember", "true");
                    setIsPro(true);
                    setShowProModal(false);
                    alert(
                      "Congratulations! You are now a JobPortal PRO Member! (6 Months Free Access)",
                    );
                    addNotification(
                      currentUser.id,
                      "Successfully upgraded to PRO membership! Golden borders and star badges activated.",
                      "SUCCESS",
                    );
                  }}
                  style={{
                    background: "linear-gradient(135deg, #4F46E5, #EC4899)",
                    border: "none",
                  }}
                >
                  Unlock Free PRO Access
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
