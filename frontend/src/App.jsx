import React, { useState, useEffect } from "react";

// Components Modular Structure Imports
import AuthScreen from "./components/auth/AuthScreen";
import Sidebar from "./components/layout/Sidebar";
import Topbar from "./components/layout/Topbar";
import SeekerPortal from "./components/seeker/SeekerPortal";
import CompanyPortal from "./components/company/CompanyPortal";
import SharedModals from "./components/shared/SharedModals";

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
  }, [currentUser?.id]);

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

        // Update localUsers cache to stay in sync with synced backend data
        const localUsers = JSON.parse(localStorage.getItem("localUsers")) || [];
        const updatedList = localUsers.map((u) =>
          u.id === backendUser.id ? { ...u, name: backendUser.name, email: backendUser.email, skills: backendUser.skills } : u
        );
        localStorage.setItem("localUsers", JSON.stringify(updatedList));
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
    // Find the application object to retrieve user details & job title
    let updatedApp = companyApplications.find((a) => a.id === appId) || 
                     atsApplicants.find((a) => a.id === appId);

    // If not found in memory (could happen if it's local only), check localStorage
    if (!updatedApp) {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith("localApps_")) {
          const list = JSON.parse(localStorage.getItem(key)) || [];
          const match = list.find((la) => la.id === appId);
          if (match) {
            updatedApp = match;
            break;
          }
        }
      }
    }

    const userId = updatedApp?.userId || updatedApp?.user_id;
    const jobTitle = updatedApp?.job?.title || "Job Post";
    
    // Prepare premium notification text and type based on newStatus
    let notifText = `Your application status for "${jobTitle}" has been updated to "${newStatus}".`;
    let notifType = "INFO";

    if (newStatus === "INTERVIEW") {
      notifText = `Congratulations! You have been scheduled for an interview for the "${jobTitle}" position.`;
      notifType = "INFO";
    } else if (newStatus === "REJECTED") {
      notifText = `Thank you for your interest. Unfortunately, your application for "${jobTitle}" was not selected to proceed.`;
      notifType = "WARNING";
    } else if (newStatus === "OFFER") {
      notifText = `Exciting news! You have received a job offer for the "${jobTitle}" position!`;
      notifType = "SUCCESS";
    } else if (newStatus === "SCREENING") {
      notifText = `Your application for "${jobTitle}" is currently in the screening stage.`;
      notifType = "INFO";
    } else if (newStatus === "ASSESSMENT") {
      notifText = `Your application for "${jobTitle}" has proceeded to the assessment stage.`;
      notifType = "INFO";
    } else if (newStatus === "APPLIED") {
      notifText = `Your application for "${jobTitle}" is currently pending review.`;
      notifType = "INFO";
    }

    try {
      const res = await fetch(`${API_BASE}/applications/${appId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        if (atsJob) selectAtsJob(atsJob);
        loadCompanyJobs(currentUser.id);

        if (userId) {
          addNotification(userId, notifText, notifType);
        }
      } else {
        throw new Error();
      }
    } catch {
      // Offline fallback status update
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith("localApps_")) {
          let list = JSON.parse(localStorage.getItem(key)) || [];
          if (list.some((la) => la.id === appId)) {
            list = list.map((la) =>
              la.id === appId ? { ...la, status: newStatus } : la,
            );
            localStorage.setItem(key, JSON.stringify(list));
          }
        }
      }
      if (atsJob) selectAtsJob(atsJob);
      loadCompanyJobs(currentUser.id);
      
      // Also generate notification for the local offline fallback!
      if (userId) {
        addNotification(userId, `${notifText} (offline fallback)`, notifType);
      }
      
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
        setProfileForm({
          name: result.name || "",
          email: result.email || "",
          skills: result.skills || "",
        });

        // Update localUsers cache so that the offline login registry stays in sync!
        const localUsers = JSON.parse(localStorage.getItem("localUsers")) || [];
        const updatedList = localUsers.map((u) =>
          u.id === result.id ? { ...u, name: result.name, email: result.email, skills: result.skills } : u
        );
        localStorage.setItem("localUsers", JSON.stringify(updatedList));
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
          // If the server explicitly rejected the login (e.g., 401 Unauthorized), do NOT fall back to local cache!
          if (res.status === 401 || res.status === 400) {
            const errText = await res.text();
            alert(errText || "Invalid credentials. Please check your email and password.");
            return;
          }
          throw new Error("Server Error");
        }
      } catch (err) {
        // Local Fallback (only triggered on network connection failures or generic server error)
        console.warn("Server unreachable, attempting local fallback login:", err);
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
    if (!currentUser) return { totalCandidates: 0, newCandidates: 0, interviews: 0, hired: 0 };
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

  // ==========================================
  // RENDERING COMPONENTS
  // ==========================================

  // Render Auth UI if not logged in
  if (!currentUser) {
    return (
      <AuthScreen
        isLogin={isLogin}
        setIsLogin={setIsLogin}
        regRole={regRole}
        setRegRole={setRegRole}
        authForm={authForm}
        setAuthForm={setAuthForm}
        resetEmail={resetEmail}
        setResetEmail={setResetEmail}
        showForgotModal={showForgotModal}
        setShowForgotModal={setShowForgotModal}
        handleAuthSubmit={handleAuthSubmit}
        handleForgotSubmit={handleForgotSubmit}
      />
    );
  }

  const seekerMetrics = getSeekerMetrics();
  const companyMetrics = getCompanyMetrics();
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="app-layout">
      {/* Sidebar Navigation */}
      <Sidebar
        currentUser={currentUser}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        logout={logout}
      />

      {/* Main Content Pane */}
      <main className="main-content">
        {/* Topbar Panel */}
        <Topbar
          currentUser={currentUser}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          jobSearch={jobSearch}
          setJobSearch={setJobSearch}
          globalSearchQuery={globalSearchQuery}
          setGlobalSearchQuery={setGlobalSearchQuery}
          handleGlobalCandidateSearch={handleGlobalCandidateSearch}
          unreadCount={unreadCount}
          notifications={notifications}
          setNotifications={setNotifications}
          setShowPostJobModal={setShowPostJobModal}
        />

        {/* Portals */}
        {currentUser.role === "SEEKER" ? (
          <SeekerPortal
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            currentUser={currentUser}
            seekerMetrics={seekerMetrics}
            isPro={isPro}
            setShowProModal={setShowProModal}
            allJobs={allJobs}
            savedJobs={savedJobs}
            toggleSaveJob={toggleSaveJob}
            applyJob={applyJob}
            viewResume={viewResume}
            myApplications={myApplications}
            handleResumeUpload={handleResumeUpload}
            profileForm={profileForm}
            setProfileForm={setProfileForm}
            handleProfileSave={handleProfileSave}
            jobSearch={jobSearch}
          />
        ) : (
          <CompanyPortal
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            currentUser={currentUser}
            companyMetrics={companyMetrics}
            allJobs={allJobs}
            atsJob={atsJob}
            selectAtsJob={selectAtsJob}
            handleDeleteJob={handleDeleteJob}
            displayApplicants={displayApplicants}
            companyApplications={companyApplications}
            handleStatusChange={handleStatusChange}
            viewResume={viewResume}
            candidateDisplayList={candidateDisplayList}
            globalSearchQuery={globalSearchQuery}
            setGlobalSearchQuery={setGlobalSearchQuery}
            handleGlobalCandidateSearch={handleGlobalCandidateSearch}
            profileForm={profileForm}
            setProfileForm={setProfileForm}
            handleProfileSave={handleProfileSave}
            setShowPostJobModal={setShowPostJobModal}
            setShowFindCandidatesModal={setShowFindCandidatesModal}
          />
        )}
      </main>

      {/* Shared Modals */}
      <SharedModals
        showPostJobModal={showPostJobModal}
        setShowPostJobModal={setShowPostJobModal}
        jobForm={jobForm}
        setJobForm={setJobForm}
        handlePostJob={handlePostJob}
        showFindCandidatesModal={showFindCandidatesModal}
        setShowFindCandidatesModal={setShowFindCandidatesModal}
        globalCandidateResults={globalCandidateResults}
        viewResume={viewResume}
        showProModal={showProModal}
        setShowProModal={setShowProModal}
        setIsPro={setIsPro}
        currentUser={currentUser}
      />
    </div>
  );
}
