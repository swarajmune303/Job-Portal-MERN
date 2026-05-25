-- Database schema for OLPReact

-- Drop tables if they exist to allow clean re-init
DROP TABLE IF EXISTS assessment_results CASCADE;
DROP TABLE IF EXISTS assessments CASCADE;
DROP TABLE IF EXISTS applications CASCADE;
DROP TABLE IF EXISTS jobs CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Users Table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL, -- 'SEEKER', 'COMPANY'
    skills TEXT,
    resume_url VARCHAR(500),
    resume_data BYTEA,
    resume_content_type VARCHAR(255),
    resume_filename VARCHAR(255)
);

-- Jobs Table
CREATE TABLE jobs (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    required_skills TEXT NOT NULL,
    company_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'OPEN' -- 'OPEN', 'CLOSED'
);

-- Applications Table
CREATE TABLE applications (
    id SERIAL PRIMARY KEY,
    job_id INTEGER REFERENCES jobs(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'APPLIED', -- 'APPLIED', 'SCREENING', 'ASSESSMENT', 'INTERVIEW', 'OFFER', 'REJECTED'
    resume_match_score DOUBLE PRECISION DEFAULT 0.0
);

-- Assessments Table
CREATE TABLE assessments (
    id SERIAL PRIMARY KEY,
    job_id INTEGER REFERENCES jobs(id) ON DELETE CASCADE,
    questions_json TEXT
);

-- Assessment Results Table
CREATE TABLE assessment_results (
    id SERIAL PRIMARY KEY,
    application_id INTEGER REFERENCES applications(id) ON DELETE CASCADE,
    score DOUBLE PRECISION DEFAULT 0.0,
    passed BOOLEAN DEFAULT FALSE
);
