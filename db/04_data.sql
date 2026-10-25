-- ============================================================================
-- Data (DML): Sardar Patel Institute of Technology, class of 2027.
-- Students, companies and figures are FICTIONAL. Replace this file with your
-- real postings later. Only the INSERT values need to change.
--
-- Run after 01_schema.sql, 02_views.sql and 03_triggers.sql, because the
-- triggers create each application's round rows and enforce eligibility.
-- ============================================================================
USE spit_placement;

-- ---------------------------------------------------------------------------
-- Branches, skills, companies
-- ---------------------------------------------------------------------------
INSERT INTO branch (branch_id, branch_name) VALUES
    ('CSE',  'Computer Science and Engineering'),
    ('CE',   'Computer Engineering'),
    ('EXTC', 'Electronics and Telecommunication Engineering');

INSERT INTO skill (skill_name) VALUES
    ('DSA'), ('Java'), ('Python'), ('SQL'), ('C++'), ('React'), ('Node.js'),
    ('Machine Learning'), ('Statistics'), ('Tableau'), ('Embedded C'), ('Verilog'),
    ('MATLAB'), ('DBMS'), ('System Design'), ('Git');

INSERT INTO company (company_id, company_name, hr_email) VALUES
    (1, 'JPMorgan Chase',       'campus@jpmc-example.com'),
    (2, 'MSCI',                 'campus@msci-example.com'),
    (3, 'PhonePe',              'jobs@phonepe-example.com'),
    (4, 'Barclays',             'hire@barclays-example.com'),
    (5, 'Deutsche Bank',        'hire@db-example.com'),
    (6, 'BlackRock',            'campus@blackrock-example.com'),
    (7, 'Russell Investments',  'campus@russell-example.com'),
    (8, 'IBM',                  'campus@ibm-example.com');

-- ---------------------------------------------------------------------------
-- Students (is_verified = 0 for the five whose documents are still with the cell)
-- ---------------------------------------------------------------------------
INSERT INTO student (student_id, name, email, branch_id, cgpa, kt_count, is_verified) VALUES
    (101, 'Aarav Shah',        'aarav.shah@spit.ac.in',        'CSE',  8.40, 0, 1),
    (102, 'Diya Kulkarni',     'diya.kulkarni@spit.ac.in',     'CSE',  9.10, 0, 1),
    (103, 'Rohan Pawar',       'rohan.pawar@spit.ac.in',       'CE',   7.60, 1, 1),
    (104, 'Sneha Iyer',        'sneha.iyer@spit.ac.in',        'EXTC', 8.20, 0, 1),
    (105, 'Karan Mehta',       'karan.mehta@spit.ac.in',       'CE',   8.00, 0, 1),
    (106, 'Zoya Khan',         'zoya.khan@spit.ac.in',         'EXTC', 7.80, 1, 1),
    (107, 'Ishaan Naik',       'ishaan.naik@spit.ac.in',       'CSE',  8.75, 0, 1),
    (108, 'Priya Deshmukh',    'priya.deshmukh@spit.ac.in',    'CE',   8.95, 0, 1),
    (109, 'Aditya Joshi',      'aditya.joshi@spit.ac.in',      'CSE',  7.25, 2, 1),
    (110, 'Meghna Rao',        'meghna.rao@spit.ac.in',        'EXTC', 8.55, 0, 1),
    (111, 'Tushar Gokhale',    'tushar.gokhale@spit.ac.in',    'CE',   7.10, 0, 1),
    (112, 'Anika Sawant',      'anika.sawant@spit.ac.in',      'CSE',  9.30, 0, 1),
    (113, 'Yash Bhatia',       'yash.bhatia@spit.ac.in',       'CE',   8.30, 1, 1),
    (114, 'Riya Menon',        'riya.menon@spit.ac.in',        'EXTC', 7.95, 0, 1),
    (115, 'Siddharth Patil',   'siddharth.patil@spit.ac.in',   'CSE',  8.05, 0, 1),
    (116, 'Naina Chopra',      'naina.chopra@spit.ac.in',      'CE',   8.62, 0, 1),
    (117, 'Varun Reddy',       'varun.reddy@spit.ac.in',       'EXTC', 7.40, 2, 1),
    (118, 'Kavya Nair',        'kavya.nair@spit.ac.in',        'CSE',  8.88, 0, 1),
    (119, 'Omkar Jadhav',      'omkar.jadhav@spit.ac.in',      'CE',   6.90, 3, 1),
    (120, 'Tanya Agarwal',     'tanya.agarwal@spit.ac.in',     'CSE',  8.15, 0, 0),
    (121, 'Harsh Vora',        'harsh.vora@spit.ac.in',        'CE',   7.70, 0, 0),
    (122, 'Pallavi Shetty',    'pallavi.shetty@spit.ac.in',    'EXTC', 8.40, 0, 0),
    (123, 'Neel Parekh',       'neel.parekh@spit.ac.in',       'CSE',  7.85, 0, 0),
    (124, 'Ritika Banerjee',   'ritika.banerjee@spit.ac.in',   'CE',   8.10, 0, 0),
    (125, 'Manav Singhania',   'manav.singhania@spit.ac.in',   'CSE',  8.50, 0, 1);

INSERT INTO student_skill (student_id, skill_name) VALUES
    (101,'Java'),(101,'DSA'),(101,'SQL'),(101,'DBMS'),(101,'Git'),
    (102,'Python'),(102,'SQL'),(102,'Machine Learning'),(102,'Statistics'),(102,'DSA'),
    (103,'Java'),(103,'SQL'),(103,'DBMS'),
    (104,'Python'),(104,'MATLAB'),(104,'Statistics'),(104,'Embedded C'),
    (105,'Java'),(105,'DSA'),(105,'Python'),(105,'SQL'),
    (106,'Embedded C'),(106,'Verilog'),(106,'C++'),
    (107,'DSA'),(107,'Java'),(107,'SQL'),(107,'System Design'),(107,'Git'),
    (108,'Python'),(108,'SQL'),(108,'DSA'),(108,'Machine Learning'),(108,'Statistics'),
    (109,'Java'),(109,'SQL'),(109,'React'),
    (110,'Python'),(110,'Statistics'),(110,'MATLAB'),(110,'SQL'),
    (111,'Java'),(111,'DBMS'),(111,'Git'),
    (112,'DSA'),(112,'Java'),(112,'Python'),(112,'SQL'),(112,'System Design'),(112,'Machine Learning'),(112,'Statistics'),
    (113,'Java'),(113,'SQL'),(113,'DSA'),(113,'DBMS'),
    (114,'Embedded C'),(114,'Verilog'),(114,'Python'),
    (115,'Java'),(115,'DSA'),(115,'SQL'),
    (116,'Python'),(116,'SQL'),(116,'Tableau'),(116,'Statistics'),(116,'DSA'),
    (117,'Embedded C'),(117,'C++'),(117,'MATLAB'),
    (118,'DSA'),(118,'Python'),(118,'SQL'),(118,'Machine Learning'),(118,'Statistics'),
    (119,'Java'),(119,'Git'),
    (120,'Java'),(120,'SQL'),(120,'DSA'),
    (121,'Python'),(121,'SQL'),
    (122,'Python'),(122,'Statistics'),(122,'SQL'),
    (123,'React'),(123,'Node.js'),(123,'SQL'),
    (124,'Java'),(124,'SQL'),
    (125,'DSA'),(125,'SQL'),(125,'Java'),(125,'Python'),(125,'Statistics');

-- proof_file is NULL where the student never uploaded a document
INSERT INTO student_certification (student_id, cert_name, proof_file) VALUES
    (101, 'AWS Cloud Practitioner',                    'aarav_aws_cp.pdf'),
    (102, 'NPTEL Machine Learning, Elite',             'diya_nptel_ml.pdf'),
    (104, 'MATLAB Onramp',                             'sneha_matlab_onramp.pdf'),
    (107, 'Oracle Certified Associate, Java SE 11',    'ishaan_oca_java.pdf'),
    (108, 'Google Data Analytics Certificate',         'priya_google_da.pdf'),
    (112, 'NPTEL Data Structures and Algorithms, Elite','anika_nptel_dsa.pdf'),
    (118, 'Microsoft Azure Data Fundamentals',         'kavya_az900.pdf'),
    (120, 'NPTEL Java Programming, Elite',             'tanya_nptel_java.pdf'),
    (122, 'MATLAB Onramp',                             NULL),
    (123, 'Meta Front-End Developer Certificate',      'neel_meta_fe.pdf'),
    (123, 'freeCodeCamp Responsive Web Design',        NULL),
    (124, 'Lean Six Sigma Yellow Belt',                NULL);

-- doc_cgpa / doc_kt_count are what the marksheet says; the student's own claim is in student.
INSERT INTO verification_request
    (request_id, student_id, submitted_on, status, doc_cgpa, doc_kt_count, marksheet_file, reviewer_note, reviewed_on) VALUES
    (1, 120, '2026-10-14', 'Pending',  8.15, 0, 'tanya_sem6_marksheet.pdf',  NULL, NULL),
    (2, 121, '2026-10-13', 'Pending',  7.54, 0, 'harsh_consolidated.pdf',    NULL, NULL),
    (3, 122, '2026-10-12', 'Pending',  8.40, 0, 'pallavi_sem6_marksheet.pdf',NULL, NULL),
    (4, 123, '2026-10-12', 'Pending',  7.85, 1, 'neel_transcript.pdf',       NULL, NULL),
    (5, 124, '2026-10-09', 'Rejected', 7.41, 1, 'ritika_marksheet_scan.pdf',
        'Marksheet shows CGPA 7.41 and one KT. Resubmit with the corrected profile.', '2026-10-11');

-- ---------------------------------------------------------------------------
-- Jobs and their rules
-- ---------------------------------------------------------------------------
INSERT INTO job (job_id, company_id, title, package_lpa, min_cgpa, max_kt, deadline) VALUES
    (1,  1, 'Software Engineer Program',          22.00, 8.00, 0, '2026-11-18'),
    (2,  2, 'Data Engineer',                      18.00, 8.50, 0, '2026-11-15'),
    (3,  3, 'Backend Engineer',                   24.00, 8.00, 0, '2026-11-14'),
    (4,  4, 'Technology Analyst',                 14.00, 7.50, 1, '2026-11-12'),
    (5,  8, 'Associate System Engineer',           9.00, 7.00, 1, '2026-11-16'),
    (6,  5, 'Analyst, Risk Technology',           16.00, 8.00, 0, '2026-11-20'),
    (7,  6, 'Associate Engineer, Aladdin',        26.00, 8.50, 0, '2026-11-22'),
    (8,  7, 'Software Engineer',                  19.00, 8.00, 0, '2026-11-25'),
    (9,  8, 'Embedded Software Engineer',         11.00, 7.50, 1, '2026-11-27'),
    (10, 2, 'Quantitative Analyst',               20.00, 8.50, 0, '2026-11-24'),
    (11, 4, 'Graduate Analyst',                   12.00, 7.00, 3, '2026-10-10');   -- already closed

INSERT INTO job_skill (job_id, skill_name) VALUES
    (1,'DSA'),(1,'SQL'),
    (2,'Python'),(2,'SQL'),
    (3,'DSA'),(3,'Java'),
    (4,'Java'),(4,'SQL'),
    (5,'SQL'),
    (6,'Python'),(6,'Statistics'),
    (7,'DSA'),(7,'SQL'),
    (8,'Java'),(8,'SQL'),
    (9,'Embedded C'),
    (10,'Python'),(10,'Statistics'),
    (11,'Java'),(11,'SQL');

INSERT INTO job_branch (job_id, branch_id) VALUES
    (1,'CSE'),(1,'CE'),
    (2,'CSE'),(2,'CE'),
    (3,'CSE'),(3,'CE'),
    (4,'CSE'),(4,'CE'),(4,'EXTC'),
    (5,'CSE'),(5,'CE'),(5,'EXTC'),
    (6,'CSE'),(6,'CE'),(6,'EXTC'),
    (7,'CSE'),(7,'CE'),
    (8,'CSE'),(8,'CE'),
    (9,'EXTC'),
    (10,'CSE'),(10,'CE'),(10,'EXTC'),
    (11,'CSE'),(11,'CE');

INSERT INTO job_round (job_id, round_order, round_name) VALUES
    (1,1,'Aptitude'),(1,2,'Coding Test'),(1,3,'Technical Interview'),(1,4,'HR'),
    (2,1,'Aptitude'),(2,2,'Technical Interview'),(2,3,'HR'),
    (3,1,'Coding Test'),(3,2,'Technical Interview'),(3,3,'HR'),
    (4,1,'Aptitude'),(4,2,'Group Discussion'),(4,3,'Technical Interview'),(4,4,'HR'),
    (5,1,'Aptitude'),(5,2,'Technical Interview'),(5,3,'HR'),
    (6,1,'Aptitude'),(6,2,'Technical Interview'),(6,3,'HR'),
    (7,1,'Coding Test'),(7,2,'Technical Interview'),(7,3,'HR'),
    (8,1,'Aptitude'),(8,2,'Technical Interview'),(8,3,'HR'),
    (9,1,'Aptitude'),(9,2,'Technical Interview'),(9,3,'HR'),
    (10,1,'Aptitude'),(10,2,'Technical Interview'),(10,3,'HR'),
    (11,1,'Aptitude'),(11,2,'Technical Interview'),(11,3,'HR');

-- ---------------------------------------------------------------------------
-- Applications. The triggers check eligibility and create the round rows.
-- ---------------------------------------------------------------------------
INSERT INTO application (application_id, student_id, job_id, applied_on) VALUES
    (1,  101, 1,  '2026-10-05'),
    (2,  101, 4,  '2026-10-08'),
    (3,  102, 2,  '2026-10-04'),
    (4,  102, 6,  '2026-10-06'),
    (5,  102, 10, '2026-10-09'),
    (6,  103, 5,  '2026-10-07'),
    (7,  105, 1,  '2026-10-05'),
    (8,  104, 6,  '2026-10-09'),
    (9,  104, 9,  '2026-10-10'),
    (10, 107, 7,  '2026-10-11'),
    (11, 107, 3,  '2026-10-10'),
    (12, 112, 7,  '2026-10-11'),
    (13, 108, 2,  '2026-10-08'),
    (14, 110, 10, '2026-10-12'),
    (15, 118, 1,  '2026-10-06'),
    (16, 125, 8,  '2026-10-09'),
    (17, 116, 2,  '2026-10-07'),
    (18, 106, 9,  '2026-10-11'),
    (19, 103, 11, '2026-10-02'),
    (20, 109, 11, '2026-10-03'),
    (21, 113, 4,  '2026-10-09'),
    (22, 115, 1,  '2026-10-06');

-- ---------------------------------------------------------------------------
-- Round results. Logged round by round, exactly as a recruiter would, so
-- after_round_update moves each application forward or rejects it.
-- ---------------------------------------------------------------------------

-- first rounds
UPDATE candidate_round SET score = 81, outcome = 'Passed', remark = 'Strong quant section.'                       WHERE application_id = 1  AND round_order = 1;
UPDATE candidate_round SET score = 77, outcome = 'Passed', remark = NULL                                          WHERE application_id = 2  AND round_order = 1;
UPDATE candidate_round SET score = 88, outcome = 'Passed', remark = 'Top of the batch.'                           WHERE application_id = 3  AND round_order = 1;
UPDATE candidate_round SET score = 84, outcome = 'Passed', remark = NULL                                          WHERE application_id = 4  AND round_order = 1;
UPDATE candidate_round SET score = 62, outcome = 'Failed', remark = 'Below the cutoff of 65.'                     WHERE application_id = 6  AND round_order = 1;
UPDATE candidate_round SET score = 70, outcome = 'Passed', remark = NULL                                          WHERE application_id = 7  AND round_order = 1;
UPDATE candidate_round SET score = 79, outcome = 'Passed', remark = NULL                                          WHERE application_id = 8  AND round_order = 1;
UPDATE candidate_round SET score = 86, outcome = 'Passed', remark = 'Good on circuits.'                           WHERE application_id = 9  AND round_order = 1;
UPDATE candidate_round SET score = 91, outcome = 'Passed', remark = 'Solved both problems.'                       WHERE application_id = 10 AND round_order = 1;
UPDATE candidate_round SET score = 87, outcome = 'Passed', remark = NULL                                          WHERE application_id = 11 AND round_order = 1;
UPDATE candidate_round SET score = 95, outcome = 'Passed', remark = 'Optimal solutions, clean code.'              WHERE application_id = 12 AND round_order = 1;
UPDATE candidate_round SET score = 85, outcome = 'Passed', remark = NULL                                          WHERE application_id = 13 AND round_order = 1;
UPDATE candidate_round SET score = 83, outcome = 'Passed', remark = NULL                                          WHERE application_id = 15 AND round_order = 1;
UPDATE candidate_round SET score = 74, outcome = 'Passed', remark = NULL                                          WHERE application_id = 16 AND round_order = 1;
UPDATE candidate_round SET score = 80, outcome = 'Passed', remark = NULL                                          WHERE application_id = 17 AND round_order = 1;
UPDATE candidate_round SET score = 58, outcome = 'Failed', remark = 'Missed the cutoff by two marks.'             WHERE application_id = 18 AND round_order = 1;
UPDATE candidate_round SET score = 66, outcome = 'Passed', remark = NULL                                          WHERE application_id = 19 AND round_order = 1;
UPDATE candidate_round SET score = 52, outcome = 'Failed', remark = 'Quant section below cutoff.'                WHERE application_id = 20 AND round_order = 1;
UPDATE candidate_round SET score = 69, outcome = 'Passed', remark = NULL                                          WHERE application_id = 21 AND round_order = 1;
UPDATE candidate_round SET score = 72, outcome = 'Passed', remark = NULL                                          WHERE application_id = 22 AND round_order = 1;

-- second rounds
UPDATE candidate_round SET score = 90, outcome = 'Passed', remark = 'Dynamic programming handled well.'           WHERE application_id = 1  AND round_order = 2;
UPDATE candidate_round SET score = 92, outcome = 'Passed', remark = 'Explained joins and indexing confidently.'   WHERE application_id = 3  AND round_order = 2;
UPDATE candidate_round SET score = 55, outcome = 'Failed', remark = 'Could not finish the graph problem.'         WHERE application_id = 7  AND round_order = 2;
UPDATE candidate_round SET score = 74, outcome = 'Passed', remark = NULL                                          WHERE application_id = 9  AND round_order = 2;
UPDATE candidate_round SET score = 90, outcome = 'Passed', remark = NULL                                          WHERE application_id = 11 AND round_order = 2;
UPDATE candidate_round SET score = 93, outcome = 'Passed', remark = 'Strong on concurrency.'                      WHERE application_id = 12 AND round_order = 2;
UPDATE candidate_round SET score = 40, outcome = 'Failed', remark = 'Weak on SQL window functions.'              WHERE application_id = 13 AND round_order = 2;
UPDATE candidate_round SET score = 78, outcome = 'Passed', remark = NULL                                          WHERE application_id = 15 AND round_order = 2;

-- third rounds
UPDATE candidate_round SET score = 85, outcome = 'Passed', remark = 'Excellent communication.'                    WHERE application_id = 3  AND round_order = 3;
UPDATE candidate_round SET score = 82, outcome = 'Passed', remark = NULL                                          WHERE application_id = 11 AND round_order = 3;
UPDATE candidate_round SET score = 90, outcome = 'Passed', remark = 'Panel recommends offer.'                     WHERE application_id = 12 AND round_order = 3;
UPDATE candidate_round SET score = 80, outcome = 'Passed', remark = NULL                                          WHERE application_id = 15 AND round_order = 3;

-- fourth round (application 15 only: the Software Engineer Program has four rounds)
UPDATE candidate_round SET score = 76, outcome = 'Passed', remark = 'Cleared every round.'                        WHERE application_id = 15 AND round_order = 4;

-- ---------------------------------------------------------------------------
-- Offers. after_offer_insert closes each student's other open applications.
-- ---------------------------------------------------------------------------
INSERT INTO offer (application_id, issued_on, package_lpa, status) VALUES
    (3,  '2026-10-13', 18.00, 'Issued'),      -- Diya, MSCI
    (11, '2026-10-12', 24.00, 'Accepted'),    -- Ishaan, PhonePe
    (12, '2026-10-12', 26.00, 'Accepted');    -- Anika, BlackRock
