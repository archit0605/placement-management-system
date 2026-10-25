-- ============================================================================
-- SPIT Placement Management System : schema (DDL)
-- Normalised to BCNF. Every non-key attribute depends on the key, the whole
-- key, and nothing but the key.
--
-- Run:  mysql -u root -p < 01_schema.sql
-- ============================================================================

DROP DATABASE IF EXISTS spit_placement;
CREATE DATABASE spit_placement;
USE spit_placement;

-- ---------------------------------------------------------------------------
-- Reference entities
-- ---------------------------------------------------------------------------

CREATE TABLE branch (
    branch_id    VARCHAR(10)  PRIMARY KEY,           -- CSE, CE, EXTC
    branch_name  VARCHAR(80)  NOT NULL UNIQUE
);

CREATE TABLE skill (
    skill_name   VARCHAR(40)  PRIMARY KEY            -- natural key: 'Java', 'SQL'
);

CREATE TABLE company (
    company_id   INT          PRIMARY KEY AUTO_INCREMENT,
    company_name VARCHAR(60)  NOT NULL UNIQUE,
    hr_email     VARCHAR(80)  NOT NULL
);

-- ---------------------------------------------------------------------------
-- Student side
-- ---------------------------------------------------------------------------

CREATE TABLE student (
    student_id   INT          PRIMARY KEY AUTO_INCREMENT,
    name         VARCHAR(60)  NOT NULL,
    email        VARCHAR(80)  NOT NULL UNIQUE,
    branch_id    VARCHAR(10)  NOT NULL,
    cgpa         DECIMAL(4,2) NOT NULL CHECK (cgpa BETWEEN 0 AND 10),
    kt_count     INT          NOT NULL DEFAULT 0 CHECK (kt_count >= 0),   -- KT = backlog
    is_verified  BOOLEAN      NOT NULL DEFAULT FALSE,
    FOREIGN KEY (branch_id) REFERENCES branch (branch_id)
);

-- M:N student <-> skill
CREATE TABLE student_skill (
    student_id   INT          NOT NULL,
    skill_name   VARCHAR(40)  NOT NULL,
    PRIMARY KEY (student_id, skill_name),
    FOREIGN KEY (student_id) REFERENCES student (student_id) ON DELETE CASCADE,
    FOREIGN KEY (skill_name) REFERENCES skill (skill_name)
);

-- Multivalued attribute of student. proof_file is NULL when no document was uploaded.
CREATE TABLE student_certification (
    student_id   INT          NOT NULL,
    cert_name    VARCHAR(80)  NOT NULL,
    proof_file   VARCHAR(80)  NULL,
    PRIMARY KEY (student_id, cert_name),
    FOREIGN KEY (student_id) REFERENCES student (student_id) ON DELETE CASCADE
);

-- What the cell checks the student's claims against.
CREATE TABLE verification_request (
    request_id     INT          PRIMARY KEY AUTO_INCREMENT,
    student_id     INT          NOT NULL,
    submitted_on   DATE         NOT NULL,
    status         ENUM('Pending','Verified','Rejected') NOT NULL DEFAULT 'Pending',
    doc_cgpa       DECIMAL(4,2) NOT NULL CHECK (doc_cgpa BETWEEN 0 AND 10),
    doc_kt_count   INT          NOT NULL CHECK (doc_kt_count >= 0),
    marksheet_file VARCHAR(80)  NOT NULL,
    reviewer_note  VARCHAR(255) NULL,                 -- NULL until reviewed
    reviewed_on    DATE         NULL,
    FOREIGN KEY (student_id) REFERENCES student (student_id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------------
-- Job side
-- ---------------------------------------------------------------------------

CREATE TABLE job (
    job_id       INT          PRIMARY KEY AUTO_INCREMENT,
    company_id   INT          NOT NULL,
    title        VARCHAR(80)  NOT NULL,
    package_lpa  DECIMAL(5,2) NOT NULL CHECK (package_lpa > 0),
    min_cgpa     DECIMAL(4,2) NOT NULL CHECK (min_cgpa BETWEEN 0 AND 10),
    max_kt       INT          NOT NULL DEFAULT 0 CHECK (max_kt >= 0),
    deadline     DATE         NOT NULL,
    FOREIGN KEY (company_id) REFERENCES company (company_id)
);

CREATE TABLE job_skill (                              -- required skills
    job_id       INT          NOT NULL,
    skill_name   VARCHAR(40)  NOT NULL,
    PRIMARY KEY (job_id, skill_name),
    FOREIGN KEY (job_id)     REFERENCES job (job_id) ON DELETE CASCADE,
    FOREIGN KEY (skill_name) REFERENCES skill (skill_name)
);

CREATE TABLE job_branch (                             -- eligible branches
    job_id       INT          NOT NULL,
    branch_id    VARCHAR(10)  NOT NULL,
    PRIMARY KEY (job_id, branch_id),
    FOREIGN KEY (job_id)    REFERENCES job (job_id) ON DELETE CASCADE,
    FOREIGN KEY (branch_id) REFERENCES branch (branch_id)
);

-- Weak entity: a round exists only inside a job. Partial key = round_order.
CREATE TABLE job_round (
    job_id       INT          NOT NULL,
    round_order  INT          NOT NULL CHECK (round_order >= 1),
    round_name   VARCHAR(40)  NOT NULL,
    PRIMARY KEY (job_id, round_order),
    FOREIGN KEY (job_id) REFERENCES job (job_id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------------
-- Application side
-- ---------------------------------------------------------------------------

CREATE TABLE application (
    application_id      INT  PRIMARY KEY AUTO_INCREMENT,
    student_id          INT  NOT NULL,
    job_id              INT  NOT NULL,
    applied_on          DATE NOT NULL,
    current_round_order INT  NOT NULL DEFAULT 1,
    -- Maintained by triggers (see 05_triggers.sql). It is the one deliberate
    -- piece of controlled redundancy: it lets one UPDATE close a student's
    -- other applications the moment an offer is issued.
    status ENUM('In progress','Rejected','Offered','Closed') NOT NULL DEFAULT 'In progress',
    UNIQUE (student_id, job_id),                      -- cannot apply to the same job twice
    FOREIGN KEY (student_id) REFERENCES student (student_id),
    FOREIGN KEY (job_id)     REFERENCES job (job_id)
);

-- Weak entity: one row per application per round. Created by a trigger.
CREATE TABLE candidate_round (
    application_id INT          NOT NULL,
    round_order    INT          NOT NULL,
    round_name     VARCHAR(40)  NOT NULL,
    score          INT          NULL CHECK (score BETWEEN 0 AND 100),    -- NULL = not scored yet
    outcome        ENUM('Passed','Failed','Pending') NOT NULL DEFAULT 'Pending',
    remark         VARCHAR(255) NULL,
    PRIMARY KEY (application_id, round_order),
    FOREIGN KEY (application_id) REFERENCES application (application_id) ON DELETE CASCADE
);

CREATE TABLE offer (
    offer_id       INT          PRIMARY KEY AUTO_INCREMENT,
    application_id INT          NOT NULL UNIQUE,      -- at most one offer per application
    issued_on      DATE         NOT NULL,
    package_lpa    DECIMAL(5,2) NOT NULL CHECK (package_lpa > 0),
    status         ENUM('Issued','Accepted','Declined') NOT NULL DEFAULT 'Issued',
    FOREIGN KEY (application_id) REFERENCES application (application_id)
);

-- Example of ALTER TABLE: indexes for the lookups the app does most.
ALTER TABLE application ADD INDEX idx_application_student (student_id);
ALTER TABLE application ADD INDEX idx_application_job (job_id);
