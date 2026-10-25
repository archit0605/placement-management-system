-- ============================================================================
-- Views. The business rules live here, not in application code.
-- ============================================================================
USE spit_placement;

-- ---------------------------------------------------------------------------
-- v_eligibility : every student against every job, one flag per rule.
-- The four rules: CGPA, KT (backlogs), branch, required skills.
-- ---------------------------------------------------------------------------
CREATE VIEW v_eligibility AS
SELECT
    s.student_id,
    j.job_id,
    s.is_verified,
    CASE WHEN s.cgpa >= j.min_cgpa THEN 1 ELSE 0 END AS cgpa_ok,
    CASE WHEN s.kt_count <= j.max_kt THEN 1 ELSE 0 END AS kt_ok,
    CASE WHEN EXISTS (SELECT * FROM job_branch jb
                      WHERE jb.job_id = j.job_id AND jb.branch_id = s.branch_id)
         THEN 1 ELSE 0 END AS branch_ok,
    -- skills_ok = 1 when there is NO required skill the student lacks
    CASE WHEN NOT EXISTS (SELECT * FROM job_skill js
                          WHERE js.job_id = j.job_id
                            AND js.skill_name NOT IN (SELECT ss.skill_name
                                                      FROM student_skill ss
                                                      WHERE ss.student_id = s.student_id))
         THEN 1 ELSE 0 END AS skills_ok
FROM student s
CROSS JOIN job j;

-- Adds the count of rules met (out of 4) and the final yes/no.
CREATE VIEW v_eligibility_summary AS
SELECT
    e.*,
    (e.cgpa_ok + e.kt_ok + e.branch_ok + e.skills_ok) AS rules_met,
    CASE WHEN e.cgpa_ok + e.kt_ok + e.branch_ok + e.skills_ok = 4 THEN 1 ELSE 0 END AS is_eligible
FROM v_eligibility e;

-- ---------------------------------------------------------------------------
-- v_application_status : readable status for each application.
-- ---------------------------------------------------------------------------
CREATE VIEW v_application_status AS
SELECT
    a.application_id,
    a.student_id,
    s.name        AS student_name,
    a.job_id,
    c.company_name,
    j.title,
    a.applied_on,
    a.current_round_order,
    cr.round_name AS current_round,
    CASE
        WHEN a.status = 'Offered'  THEN 'Offer issued'
        WHEN a.status = 'Closed'   THEN 'Closed'
        WHEN a.status = 'Rejected' THEN 'Not selected'
        WHEN NOT EXISTS (SELECT * FROM candidate_round x
                         WHERE x.application_id = a.application_id AND x.outcome <> 'Passed')
             THEN 'Ready for offer'
        ELSE 'In progress'
    END AS status_label
FROM application a
INNER JOIN student s ON s.student_id = a.student_id
INNER JOIN job j     ON j.job_id = a.job_id
INNER JOIN company c ON c.company_id = j.company_id
INNER JOIN candidate_round cr
        ON cr.application_id = a.application_id AND cr.round_order = a.current_round_order;

-- ---------------------------------------------------------------------------
-- v_job_stats : applicants, offers and selection rate per job.
-- LEFT JOIN keeps jobs that nobody has applied to yet.
-- ---------------------------------------------------------------------------
CREATE VIEW v_job_stats AS
SELECT
    j.job_id,
    c.company_name,
    j.title,
    j.package_lpa,
    j.deadline,
    COUNT(a.application_id)                                    AS applicants,
    SUM(CASE WHEN a.status = 'Offered' THEN 1 ELSE 0 END)      AS offers,
    CASE WHEN COUNT(a.application_id) = 0 THEN NULL
         ELSE ROUND(100 * SUM(CASE WHEN a.status = 'Offered' THEN 1 ELSE 0 END)
                        / COUNT(a.application_id), 1)
    END                                                        AS selection_rate_pct
FROM job j
INNER JOIN company c ON c.company_id = j.company_id
LEFT JOIN application a ON a.job_id = j.job_id
GROUP BY j.job_id, c.company_name, j.title, j.package_lpa, j.deadline;

-- ---------------------------------------------------------------------------
-- v_skill_demand : roles asking for each skill versus verified students who have it.
-- ---------------------------------------------------------------------------
CREATE VIEW v_skill_demand AS
SELECT
    k.skill_name,
    (SELECT COUNT(*) FROM job_skill js
       INNER JOIN job j ON j.job_id = js.job_id
      WHERE js.skill_name = k.skill_name AND j.deadline >= CURDATE()) AS open_roles,
    (SELECT COUNT(*) FROM student_skill ss
       INNER JOIN student s ON s.student_id = ss.student_id
      WHERE ss.skill_name = k.skill_name AND s.is_verified = TRUE)    AS verified_students
FROM skill k;

-- ---------------------------------------------------------------------------
-- v_branch_placement : placed students per branch.
-- ---------------------------------------------------------------------------
CREATE VIEW v_branch_placement AS
SELECT
    b.branch_id,
    b.branch_name,
    COUNT(DISTINCT CASE WHEN s.is_verified = TRUE THEN s.student_id END) AS verified_students,
    COUNT(DISTINCT CASE WHEN a.status = 'Offered' THEN s.student_id END) AS placed_students
FROM branch b
LEFT JOIN student s     ON s.branch_id = b.branch_id
LEFT JOIN application a ON a.student_id = s.student_id
GROUP BY b.branch_id, b.branch_name;
