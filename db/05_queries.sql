-- ============================================================================
-- Queries, one section per syllabus topic.
-- Each query has its relational algebra above it.
--   sigma = select (rows)        pi = project (columns)       |x| = join
--   U = union    n = intersection    gamma = group/aggregate   rho = rename
-- ============================================================================
USE spit_placement;

-- ---------------------------------------------------------------------------
-- 1. Selection and projection
-- Students with CGPA at least 8 and no KT.
--   pi name, cgpa ( sigma cgpa >= 8 AND kt_count = 0 (student) )
-- ---------------------------------------------------------------------------
SELECT name, cgpa
FROM student
WHERE cgpa >= 8 AND kt_count = 0;

-- ---------------------------------------------------------------------------
-- 2. Joins (inner)
-- Who applied where.
--   pi name, company_name, title ( student |x| application |x| job |x| company )
-- ---------------------------------------------------------------------------
SELECT s.name, c.company_name, j.title
FROM student s
INNER JOIN application a ON a.student_id = s.student_id
INNER JOIN job j         ON j.job_id = a.job_id
INNER JOIN company c     ON c.company_id = j.company_id
ORDER BY s.name;

-- ---------------------------------------------------------------------------
-- 3. Outer joins
-- Every student, with applications if any (students who never applied show NULL).
--   student  left-outer-join  application
-- ---------------------------------------------------------------------------
SELECT s.name, a.application_id, a.job_id
FROM student s
LEFT JOIN application a ON a.student_id = s.student_id
ORDER BY a.application_id;

-- Companies with no application at all (outer join, then keep the NULLs).
SELECT c.company_name
FROM company c
LEFT JOIN job j          ON j.company_id = c.company_id
LEFT JOIN application a  ON a.job_id = j.job_id
WHERE a.application_id IS NULL;

-- ---------------------------------------------------------------------------
-- 4. NULL values
-- Rounds that have not been scored yet.  (score = NULL does NOT work, use IS NULL.)
--   sigma score IS NULL (candidate_round)
-- ---------------------------------------------------------------------------
SELECT application_id, round_name
FROM candidate_round
WHERE score IS NULL;

-- Certificates uploaded without a proof document.
SELECT student_id, cert_name
FROM student_certification
WHERE proof_file IS NULL;

-- ---------------------------------------------------------------------------
-- 5. Aggregate functions, GROUP BY, HAVING
-- Average, highest and count of offered packages per company.
--   gamma company_name; AVG(package), MAX(package), COUNT(*) ( offer |x| ... )
-- ---------------------------------------------------------------------------
SELECT c.company_name,
       COUNT(*)           AS offers,
       AVG(o.package_lpa) AS avg_lpa,
       MAX(o.package_lpa) AS max_lpa
FROM offer o
INNER JOIN application a ON a.application_id = o.application_id
INNER JOIN job j         ON j.job_id = a.job_id
INNER JOIN company c     ON c.company_id = j.company_id
GROUP BY c.company_name;

-- Branches whose average CGPA is above 8 (HAVING filters groups).
SELECT branch_id, COUNT(*) AS students, AVG(cgpa) AS avg_cgpa
FROM student
WHERE is_verified = TRUE
GROUP BY branch_id
HAVING AVG(cgpa) > 8;

-- ---------------------------------------------------------------------------
-- 6. Set operations
-- 6a. UNION: students who either hold a verified Python skill or applied to JPMorgan.
--   pi student_id (sigma skill = 'Python' (student_skill))  U  pi student_id (application on job 1)
-- ---------------------------------------------------------------------------
SELECT student_id FROM student_skill WHERE skill_name = 'Python'
UNION
SELECT student_id FROM application WHERE job_id = 1;

-- 6b. INTERSECT: students who know BOTH Java and SQL.
--   pi student_id (sigma skill='Java') n pi student_id (sigma skill='SQL')
-- ---------------------------------------------------------------------------
SELECT student_id FROM student_skill WHERE skill_name = 'Java'
INTERSECT
SELECT student_id FROM student_skill WHERE skill_name = 'SQL';

-- 6c. Difference (A - B) using NOT IN: students who applied but hold no offer.
--   pi student_id (application)  -  pi student_id (application |x| offer)
-- ---------------------------------------------------------------------------
SELECT DISTINCT student_id
FROM application
WHERE student_id NOT IN (SELECT a.student_id
                         FROM application a
                         INNER JOIN offer o ON o.application_id = a.application_id);

-- ---------------------------------------------------------------------------
-- 7. Subqueries
-- 7a. Nested: jobs paying above the average package.
-- ---------------------------------------------------------------------------
SELECT title, package_lpa
FROM job
WHERE package_lpa > (SELECT AVG(package_lpa) FROM job);

-- 7b. Correlated (EXISTS): verified students eligible for at least one open job.
-- ---------------------------------------------------------------------------
SELECT s.name
FROM student s
WHERE s.is_verified = TRUE
  AND EXISTS (SELECT * FROM v_eligibility_summary e
              INNER JOIN job j ON j.job_id = e.job_id
              WHERE e.student_id = s.student_id
                AND e.is_eligible = 1
                AND j.deadline >= CURDATE());

-- 7c. Verified students who are eligible for NO job at all.
-- ---------------------------------------------------------------------------
SELECT s.name, s.branch_id, s.cgpa
FROM student s
WHERE s.is_verified = TRUE
  AND s.student_id NOT IN (SELECT student_id FROM v_eligibility_summary WHERE is_eligible = 1);

-- 7d. Students scoring above the average in Aptitude (subquery with aggregate).
-- ---------------------------------------------------------------------------
SELECT a.student_id, cr.score
FROM candidate_round cr
INNER JOIN application a ON a.application_id = cr.application_id
WHERE cr.round_name = 'Aptitude'
  AND cr.score > (SELECT AVG(score) FROM candidate_round WHERE round_name = 'Aptitude');

-- ---------------------------------------------------------------------------
-- 8. CASE
-- Label each job by package band.
-- ---------------------------------------------------------------------------
SELECT title, package_lpa,
       CASE WHEN package_lpa >= 24 THEN 'Super dream'
            WHEN package_lpa >= 15 THEN 'Dream'
            ELSE 'Regular'
       END AS band
FROM job
ORDER BY package_lpa DESC;

-- ---------------------------------------------------------------------------
-- 9. Views (defined in 02_views.sql). Querying them looks like querying tables.
-- ---------------------------------------------------------------------------
-- How close is Rohan (student 103) to every job? The "Meets 3 of 4" explainer.
SELECT j.title, e.cgpa_ok, e.kt_ok, e.branch_ok, e.skills_ok, e.rules_met
FROM v_eligibility_summary e
INNER JOIN job j ON j.job_id = e.job_id
WHERE e.student_id = 103
ORDER BY e.rules_met DESC;

SELECT * FROM v_application_status;
SELECT * FROM v_job_stats;
SELECT * FROM v_skill_demand ORDER BY open_roles DESC;
SELECT * FROM v_branch_placement;

-- ---------------------------------------------------------------------------
-- 10. Transactions: COMMIT and ROLLBACK
-- Application 15 (Kavya, Software Engineer Program) has cleared every round.
-- ---------------------------------------------------------------------------

-- Issue the offer, look at the result, then change our mind. ROLLBACK undoes the
-- offer AND everything the trigger did (Kavya's other applications reopen).
START TRANSACTION;
INSERT INTO offer (application_id, issued_on, package_lpa) VALUES (15, CURDATE(), 22.00);
SELECT application_id, job_id, status FROM application WHERE student_id = 118;   -- shows 'Offered'
ROLLBACK;
SELECT application_id, job_id, status FROM application WHERE student_id = 118;   -- back to 'In progress'

-- Now issue it for real and keep it.
START TRANSACTION;
INSERT INTO offer (application_id, issued_on, package_lpa) VALUES (15, CURDATE(), 22.00);
COMMIT;
SELECT application_id, job_id, status FROM application WHERE student_id = 118;   -- stays 'Offered'

-- ---------------------------------------------------------------------------
-- 11. Triggers rejecting bad data. Each of these is EXPECTED to fail.
-- ---------------------------------------------------------------------------
-- Unverified student (Tanya, 120):
--   INSERT INTO application (student_id, job_id, applied_on) VALUES (120, 1, CURDATE());
-- Past the deadline (job 11 closed on 2026-10-10):
--   INSERT INTO application (student_id, job_id, applied_on) VALUES (113, 11, CURDATE());
-- Not eligible (Rohan misses DSA for job 1):
--   INSERT INTO application (student_id, job_id, applied_on) VALUES (103, 1, CURDATE());
-- Offer before all rounds are cleared (application 1 still has rounds pending):
--   INSERT INTO offer (application_id, issued_on, package_lpa) VALUES (1, CURDATE(), 22);
-- CHECK constraint (CGPA out of range):
--   UPDATE student SET cgpa = 15 WHERE student_id = 101;
