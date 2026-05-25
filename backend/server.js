const express = require('express');
const cors = require('cors');
const multer = require('multer');
const db = require('./db');

const app = express();
const PORT = 8085;

// Middleware
app.use(cors());
app.use(express.json());

// Configure Multer for in-memory resume file storage
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Helper to calculate skill match score (mirroring Java backend logic)
function calculateMatchScore(userSkills, jobSkills) {
    if (!userSkills || !jobSkills) return 0.0;
    
    const required = jobSkills.toLowerCase().split(',');
    const userSkillsLower = userSkills.toLowerCase();
    
    let matchCount = 0;
    required.forEach(req => {
        if (userSkillsLower.includes(req.trim())) {
            matchCount++;
        }
    });
    
    return (matchCount / required.length) * 100.0;
}

// ==========================================
// AUTH ENDPOINTS
// ==========================================

// Register
app.post('/api/auth/register', async (req, res) => {
    const { name, email, password, role, skills } = req.body;
    try {
        const queryText = `
            INSERT INTO users (name, email, password, role, skills) 
            VALUES ($1, $2, $3, $4, $5) 
            RETURNING id, name, email, role, skills
        `;
        const result = await db.query(queryText, [name, email, password, role, skills]);
        res.status(200).json(result.rows[0]);
    } catch (err) {
        console.error("Register Error:", err);
        if (err.code === '23505') { // unique violation
            res.status(400).send("Email already registered");
        } else {
            res.status(500).send("Server Error");
        }
    }
});

// Login
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const queryText = 'SELECT id, name, email, password, role, skills, resume_filename FROM users WHERE email = $1';
        const result = await db.query(queryText, [email]);
        if (result.rows.length === 0) {
            return res.status(401).send("Invalid credentials");
        }
        const user = result.rows[0];
        if (user.password !== password) {
            return res.status(401).send("Invalid credentials");
        }
        // Exclude password from response
        delete user.password;
        res.status(200).json(user);
    } catch (err) {
        console.error("Login Error:", err);
        res.status(500).send("Server Error");
    }
});

// ==========================================
// JOB ENDPOINTS
// ==========================================

// Get all open jobs
app.get('/api/jobs', async (req, res) => {
    try {
        const queryText = `
            SELECT j.*, 
                   json_build_object('id', u.id, 'name', u.name, 'email', u.email) as company
            FROM jobs j
            JOIN users u ON j.company_id = u.id
            WHERE j.status = 'OPEN'
        `;
        const result = await db.query(queryText);
        res.status(200).json(result.rows);
    } catch (err) {
        console.error("Get Jobs Error:", err);
        res.status(500).send("Server Error");
    }
});

// Post a new job
app.post('/api/jobs', async (req, res) => {
    const { companyId } = req.query;
    const { title, location, description, requiredSkills } = req.body;
    
    try {
        // Verify company exists
        const userCheck = await db.query('SELECT id, role, name, email FROM users WHERE id = $1', [companyId]);
        if (userCheck.rows.length === 0 || userCheck.rows[0].role !== 'COMPANY') {
            return res.status(400).send("Invalid Company");
        }
        
        const queryText = `
            INSERT INTO jobs (title, location, description, required_skills, company_id, status)
            VALUES ($1, $2, $3, $4, $5, 'OPEN')
            RETURNING *
        `;
        const result = await db.query(queryText, [title, location, description, requiredSkills, companyId]);
        const newJob = result.rows[0];
        newJob.company = userCheck.rows[0];
        
        res.status(200).json(newJob);
    } catch (err) {
        console.error("Post Job Error:", err);
        res.status(500).send("Server Error");
    }
});

// Search jobs
app.get('/api/jobs/search', async (req, res) => {
    const { query } = req.query;
    try {
        const searchQuery = `%${query}%`;
        const queryText = `
            SELECT j.*, 
                   json_build_object('id', u.id, 'name', u.name, 'email', u.email) as company
            FROM jobs j
            JOIN users u ON j.company_id = u.id
            WHERE j.status = 'OPEN' 
              AND (LOWER(j.title) LIKE LOWER($1) 
               OR LOWER(j.description) LIKE LOWER($1)
               OR LOWER(j.required_skills) LIKE LOWER($1)
               OR LOWER(u.name) LIKE LOWER($1))
        `;
        const result = await db.query(queryText, [searchQuery]);
        res.status(200).json(result.rows);
    } catch (err) {
        console.error("Search Jobs Error:", err);
        res.status(500).send("Server Error");
    }
});

// Get jobs by company ID
app.get('/api/jobs/company/:companyId', async (req, res) => {
    const { companyId } = req.params;
    try {
        const queryText = `
            SELECT j.*, 
                   json_build_object('id', u.id, 'name', u.name, 'email', u.email) as company
            FROM jobs j
            JOIN users u ON j.company_id = u.id
            WHERE j.company_id = $1
        `;
        const result = await db.query(queryText, [companyId]);
        res.status(200).json(result.rows);
    } catch (err) {
        console.error("Get Company Jobs Error:", err);
        res.status(500).send("Server Error");
    }
});

// Delete a job
app.delete('/api/jobs/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query('DELETE FROM jobs WHERE id = $1 RETURNING id', [id]);
        if (result.rows.length === 0) {
            return res.status(404).send("Job not found");
        }
        res.status(200).send("Deleted successfully");
    } catch (err) {
        console.error("Delete Job Error:", err);
        res.status(500).send("Server Error");
    }
});

// ==========================================
// APPLICATION ENDPOINTS
// ==========================================

// Apply for a job
app.post('/api/applications', async (req, res) => {
    const { userId, jobId } = req.query;
    try {
        // Get user skills
        const seekerResult = await db.query('SELECT skills FROM users WHERE id = $1', [userId]);
        if (seekerResult.rows.length === 0) {
            return res.status(400).send("Invalid User");
        }
        const seeker = seekerResult.rows[0];
        
        // Get job skills
        const jobResult = await db.query('SELECT required_skills FROM jobs WHERE id = $1', [jobId]);
        if (jobResult.rows.length === 0) {
            return res.status(400).send("Invalid Job");
        }
        const job = jobResult.rows[0];
        
        // Calculate match score
        const score = calculateMatchScore(seeker.skills, job.required_skills);
        
        const insertQuery = `
            INSERT INTO applications (job_id, user_id, status, resume_match_score)
            VALUES ($1, $2, 'APPLIED', $3)
            RETURNING *
        `;
        const result = await db.query(insertQuery, [jobId, userId, score]);
        res.status(200).json(result.rows[0]);
    } catch (err) {
        console.error("Apply Job Error:", err);
        res.status(500).send("Server Error");
    }
});

// Get user applications
app.get('/api/applications/user/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const queryText = `
            SELECT a.*,
                   json_build_object(
                       'id', j.id, 
                       'title', j.title, 
                       'location', j.location, 
                       'description', j.description,
                       'requiredSkills', j.required_skills,
                       'company', json_build_object('id', comp.id, 'name', comp.name, 'email', comp.email)
                   ) as job
            FROM applications a
            JOIN jobs j ON a.job_id = j.id
            JOIN users comp ON j.company_id = comp.id
            WHERE a.user_id = $1
        `;
        const result = await db.query(queryText, [userId]);
        res.status(200).json(result.rows);
    } catch (err) {
        console.error("Get Seeker Applications Error:", err);
        res.status(500).send("Server Error");
    }
});

// Get job applications
app.get('/api/applications/job/:jobId', async (req, res) => {
    const { jobId } = req.params;
    try {
        const queryText = `
            SELECT a.*,
                   json_build_object(
                       'id', u.id, 
                       'name', u.name, 
                       'email', u.email,
                       'skills', u.skills
                   ) as applicant
            FROM applications a
            JOIN users u ON a.user_id = u.id
            WHERE a.job_id = $1
        `;
        const result = await db.query(queryText, [jobId]);
        res.status(200).json(result.rows);
    } catch (err) {
        console.error("Get Job Applications Error:", err);
        res.status(500).send("Server Error");
    }
});

// Get all applications for a company's jobs
app.get('/api/applications/company/:companyId', async (req, res) => {
    const { companyId } = req.params;
    try {
        const queryText = `
            SELECT a.*,
                   json_build_object(
                       'id', j.id, 
                       'title', j.title, 
                       'location', j.location, 
                       'description', j.description,
                       'requiredSkills', j.required_skills,
                       'company_id', j.company_id
                   ) as job,
                   json_build_object(
                       'id', u.id, 
                       'name', u.name, 
                       'email', u.email,
                       'skills', u.skills
                   ) as applicant
            FROM applications a
            JOIN jobs j ON a.job_id = j.id
            JOIN users u ON a.user_id = u.id
            WHERE j.company_id = $1
        `;
        const result = await db.query(queryText, [companyId]);
        res.status(200).json(result.rows);
    } catch (err) {
        console.error("Get Company Applications Error:", err);
        res.status(500).send("Server Error");
    }
});


// Update application status
app.put('/api/applications/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
        const queryText = `
            UPDATE applications 
            SET status = $1 
            WHERE id = $2 
            RETURNING *
        `;
        const result = await db.query(queryText, [status, id]);
        if (result.rows.length === 0) {
            return res.status(404).send("Application not found");
        }
        res.status(200).json(result.rows[0]);
    } catch (err) {
        console.error("Update Status Error:", err);
        res.status(500).send("Server Error");
    }
});

// ==========================================
// USER ENDPOINTS
// ==========================================

// Search seekers
app.get('/api/users/seekers/search', async (req, res) => {
    const { query } = req.query;
    try {
        const searchQuery = `%${query}%`;
        const queryText = `
            SELECT id, name, email, role, skills 
            FROM users 
            WHERE role = 'SEEKER' 
              AND (LOWER(name) LIKE LOWER($1) OR LOWER(skills) LIKE LOWER($1))
        `;
        const result = await db.query(queryText, [searchQuery]);
        res.status(200).json(result.rows);
    } catch (err) {
        console.error("Search Seekers Error:", err);
        res.status(500).send("Server Error");
    }
});

// Get user profile
app.get('/api/users/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const queryText = 'SELECT id, name, email, role, skills, resume_filename FROM users WHERE id = $1';
        const result = await db.query(queryText, [id]);
        if (result.rows.length === 0) {
            return res.status(404).send("User not found");
        }
        res.status(200).json(result.rows[0]);
    } catch (err) {
        console.error("Get User Error:", err);
        res.status(500).send("Server Error");
    }
});

// Update user profile
app.put('/api/users/:id', async (req, res) => {
    const { id } = req.params;
    const { name, email, skills, password } = req.body;
    try {
        let result;
        if (password && password.trim()) {
            const queryText = `
                UPDATE users 
                SET name = $1, email = $2, skills = $3, password = $4 
                WHERE id = $5 
                RETURNING id, name, email, role, skills, resume_filename
            `;
            result = await db.query(queryText, [name, email, skills, password, id]);
        } else {
            const queryText = `
                UPDATE users 
                SET name = $1, email = $2, skills = $3 
                WHERE id = $4 
                RETURNING id, name, email, role, skills, resume_filename
            `;
            result = await db.query(queryText, [name, email, skills, id]);
        }
        
        if (result.rows.length === 0) {
            return res.status(404).send("User not found");
        }
        res.status(200).json(result.rows[0]);
    } catch (err) {
        console.error("Update User Error:", err);
        res.status(500).send("Server Error");
    }
});

// ==========================================
// RESUME ENDPOINTS
// ==========================================

// Upload resume PDF/binary
app.post('/api/users/:id/resume', upload.single('file'), async (req, res) => {
    const { id } = req.params;
    if (!req.file) {
        return res.status(400).send("No file uploaded");
    }
    
    try {
        const queryText = `
            UPDATE users 
            SET resume_data = $1, 
                resume_content_type = $2, 
                resume_filename = $3
            WHERE id = $4
            RETURNING id
        `;
        const result = await db.query(queryText, [
            req.file.buffer,
            req.file.mimetype,
            req.file.originalname,
            id
        ]);
        
        if (result.rows.length === 0) {
            return res.status(404).send("User not found");
        }
        
        res.status(200).send("Resume uploaded successfully");
    } catch (err) {
        console.error("Upload Resume Error:", err);
        res.status(500).send("Server Error");
    }
});

// Serve resume PDF/binary
app.get('/api/users/:id/resume', async (req, res) => {
    const { id } = req.params;
    try {
        const queryText = 'SELECT resume_data, resume_content_type, resume_filename FROM users WHERE id = $1';
        const result = await db.query(queryText, [id]);
        if (result.rows.length === 0 || !result.rows[0].resume_data) {
            return res.status(404).send("Resume not found");
        }
        
        const user = result.rows[0];
        
        res.setHeader('Content-Type', user.resume_content_type);
        res.setHeader('Content-Disposition', `inline; filename="${user.resume_filename}"`);
        res.send(user.resume_data);
    } catch (err) {
        console.error("Get Resume Error:", err);
        res.status(500).send("Server Error");
    }
});

// Head request for resume existence checking
app.head('/api/users/:id/resume', async (req, res) => {
    const { id } = req.params;
    try {
        const queryText = 'SELECT id FROM users WHERE id = $1 AND resume_data IS NOT NULL';
        const result = await db.query(queryText, [id]);
        if (result.rows.length === 0) {
            return res.status(404).end();
        }
        res.status(200).end();
    } catch (err) {
        res.status(500).end();
    }
});

// Start Express Server
app.listen(PORT, () => {
    console.log(`Express Backend running on http://localhost:${PORT}`);
});
