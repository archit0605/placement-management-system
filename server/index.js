/*
 * API between the React app and MySQL.
 *
 * Rule of thumb: the SQL decides, this file only fetches and reshapes.
 * Eligibility, status labels and statistics all come from the views in db/02_views.sql,
 * and the integrity rules are enforced by the triggers in db/03_triggers.sql.
 */
import express from 'express';
import { pool, query, transaction } from './db.js';

const app = express();
app.use(express.json());

/** Wrap an async handler so a thrown database error becomes a clean JSON response. */
const route = (handler) => async (req, res) => {
  try {
    res.json(await handler(req, res));
  } catch (error) {
    const known = {
      1644: error.sqlMessage, // SIGNAL from one of our triggers
      3819: 'A value is outside the range the database allows.', // CHECK constraint
      1062: 'That record already exists.', // UNIQUE / PRIMARY KEY
      1452: 'That record points at something that does not exist.', // FOREIGN KEY
    }[error.errno];
    if (known || error.status) {
      res.status(error.status || 400).json({ error: known || error.message });
    } else {
      console.error(error);
      res.status(500).json({ error: 'The database could not complete that request.' });
    }
  }
};

const fail = (message, status = 400) => Object.assign(new Error(message), { status });
const groupBy = (rows, key) =>
  rows.reduce((acc, row) => {
    (acc[row[key]] ||= []).push(row);
    return acc;
  }, {});

/* ------------------------------------------------------------------ shared */

app.get('/api/meta', route(async () => ({
  branches: await query('SELECT branch_id, branch_name FROM branch ORDER BY branch_id'),
  skills: (await query('SELECT skill_name FROM skill ORDER BY skill_name')).map((r) => r.skill_name),
})));

const roundsFor = async (applicationIds) =>
  applicationIds.length
    ? groupBy(
        await query(
          `SELECT application_id, round_order, round_name, score, outcome, remark
           FROM candidate_round WHERE application_id IN (?) ORDER BY application_id, round_order`,
          [applicationIds],
        ),
        'application_id',
      )
    : {};

const offersFor = async (applicationIds) =>
  applicationIds.length
    ? Object.fromEntries(
        (await query(
          'SELECT application_id, issued_on, package_lpa, status FROM offer WHERE application_id IN (?)',
          [applicationIds],
        )).map((o) => [o.application_id, o]),
      )
    : {};

/* ------------------------------------------------------------- entry screen */

// Everything the "who are you" screen shows. Eligible companies come from the same
// v_eligibility_summary view the student's own page uses.
app.get('/api/gate', route(async () => {
  const students = await query(
    'SELECT student_id, name, branch_id, cgpa, is_verified FROM student ORDER BY name',
  );
  const eligible = groupBy(
    await query(
      `SELECT e.student_id, j.company_id, COUNT(*) AS roles
       FROM v_eligibility_summary e
       INNER JOIN job j ON j.job_id = e.job_id
       WHERE e.is_eligible = 1 AND j.deadline >= CURDATE()
       GROUP BY e.student_id, j.company_id`,
    ),
    'student_id',
  );
  const companies = await query(
    `SELECT c.company_id, c.company_name,
            (SELECT COUNT(*) FROM job j WHERE j.company_id = c.company_id AND j.deadline >= CURDATE()) AS open_roles,
            (SELECT COUNT(*) FROM application a INNER JOIN job j ON j.job_id = a.job_id
              WHERE j.company_id = c.company_id) AS applicants
     FROM company c ORDER BY c.company_name`,
  );
  const [cell] = await query(
    `SELECT (SELECT COUNT(*) FROM verification_request WHERE status = 'Pending') AS pending,
            (SELECT COUNT(*) FROM student WHERE is_verified = TRUE)               AS verified,
            (SELECT COUNT(*) FROM job WHERE deadline >= CURDATE())                AS open_roles`,
  );
  return {
    students: students.map((s) => ({ ...s, eligible: eligible[s.student_id] || [] })),
    companies,
    cell,
  };
}));

/* ----------------------------------------------------------------- student */

app.get('/api/students', route(() =>
  query('SELECT student_id, name, branch_id, is_verified FROM student ORDER BY name'),
));

app.get('/api/students/:id/dashboard', route(async (req) => {
  const id = Number(req.params.id);

  const [student] = await query(
    `SELECT s.student_id, s.name, s.email, s.branch_id, b.branch_name, s.cgpa, s.kt_count, s.is_verified
     FROM student s INNER JOIN branch b ON b.branch_id = s.branch_id
     WHERE s.student_id = ?`,
    [id],
  );
  if (!student) throw fail('Student not found', 404);

  const skills = (await query('SELECT skill_name FROM student_skill WHERE student_id = ? ORDER BY skill_name', [id]))
    .map((r) => r.skill_name);
  const certifications = (await query('SELECT cert_name FROM student_certification WHERE student_id = ?', [id]))
    .map((r) => r.cert_name);
  const [verification] = await query(
    `SELECT status, submitted_on, reviewer_note FROM verification_request
     WHERE student_id = ? ORDER BY submitted_on DESC LIMIT 1`,
    [id],
  );

  // The four rule flags come straight from the v_eligibility_summary view.
  const openings = await query(
    `SELECT j.job_id, j.title, j.package_lpa, j.min_cgpa, j.max_kt, j.deadline,
            c.company_name, DATEDIFF(j.deadline, CURDATE()) AS days_left,
            e.cgpa_ok, e.kt_ok, e.branch_ok, e.skills_ok, e.rules_met, e.is_eligible,
            (SELECT COUNT(*) FROM application a
              WHERE a.student_id = e.student_id AND a.job_id = e.job_id) AS applied
     FROM v_eligibility_summary e
     INNER JOIN job j     ON j.job_id = e.job_id
     INNER JOIN company c ON c.company_id = j.company_id
     WHERE e.student_id = ?`,
    [id],
  );
  const jobSkills = groupBy(
    await query(
      `SELECT js.job_id, js.skill_name,
              CASE WHEN js.skill_name IN (SELECT skill_name FROM student_skill WHERE student_id = ?)
                   THEN 1 ELSE 0 END AS has_it
       FROM job_skill js ORDER BY js.skill_name`,
      [id],
    ),
    'job_id',
  );
  const jobBranches = groupBy(await query('SELECT job_id, branch_id FROM job_branch ORDER BY branch_id'), 'job_id');

  const applicationRows = await query(
    `SELECT application_id, job_id, company_name, title, applied_on, current_round_order, current_round, status_label
     FROM v_application_status WHERE student_id = ? ORDER BY applied_on DESC`,
    [id],
  );
  const ids = applicationRows.map((a) => a.application_id);
  const rounds = await roundsFor(ids);
  const offers = await offersFor(ids);

  return {
    student: { ...student, skills, certifications },
    verification: verification || null,
    openings: openings.map((o) => ({
      ...o,
      applied: o.applied > 0,
      required_skills: (jobSkills[o.job_id] || []).map((s) => ({ skill_name: s.skill_name, has_it: s.has_it === 1 })),
      eligible_branches: (jobBranches[o.job_id] || []).map((b) => b.branch_id),
    })),
    applications: applicationRows.map((a) => ({
      ...a,
      rounds: rounds[a.application_id] || [],
      offer: offers[a.application_id] || null,
    })),
  };
}));

// The trigger before_application_insert refuses unverified, late or ineligible applications.
app.post('/api/applications', route(async (req) => {
  const { student_id, job_id } = req.body;
  const result = await query('INSERT INTO application (student_id, job_id, applied_on) VALUES (?, ?, CURDATE())', [
    student_id,
    job_id,
  ]);
  return { application_id: result.insertId };
}));

/* --------------------------------------------------------------- recruiter */

app.get('/api/companies', route(() => query('SELECT company_id, company_name FROM company ORDER BY company_name')));

app.get('/api/companies/:id/jobs', route(async (req) =>
  query(
    `SELECT job_id, title, applicants, offers, deadline, (deadline >= CURDATE()) AS is_open
     FROM v_job_stats
     WHERE company_name = (SELECT company_name FROM company WHERE company_id = ?)
     ORDER BY deadline`,
    [req.params.id],
  ),
));

app.get('/api/jobs/:id/pipeline', route(async (req) => {
  const jobId = Number(req.params.id);
  const [job] = await query(
    `SELECT j.job_id, j.title, j.package_lpa, j.min_cgpa, j.max_kt, j.deadline, c.company_name,
            DATEDIFF(j.deadline, CURDATE()) AS days_left
     FROM job j INNER JOIN company c ON c.company_id = j.company_id WHERE j.job_id = ?`,
    [jobId],
  );
  if (!job) throw fail('Job not found', 404);
  job.required_skills = (await query('SELECT skill_name FROM job_skill WHERE job_id = ? ORDER BY skill_name', [jobId]))
    .map((r) => r.skill_name);
  job.eligible_branches = (await query('SELECT branch_id FROM job_branch WHERE job_id = ? ORDER BY branch_id', [jobId]))
    .map((r) => r.branch_id);

  const applicants = await query(
    `SELECT v.application_id, v.student_id, v.student_name AS name, s.email, s.branch_id, s.cgpa, s.kt_count,
            v.status_label, v.current_round_order, v.current_round, v.applied_on,
            (SELECT cr.score FROM candidate_round cr
              WHERE cr.application_id = v.application_id AND cr.score IS NOT NULL
              ORDER BY cr.round_order DESC LIMIT 1) AS latest_score
     FROM v_application_status v
     INNER JOIN student s ON s.student_id = v.student_id
     WHERE v.job_id = ?`,
    [jobId],
  );
  const ids = applicants.map((a) => a.application_id);
  const rounds = await roundsFor(ids);
  const offers = await offersFor(ids);

  const eligible = await query(
    `SELECT s.student_id, s.name, s.email, s.branch_id, s.cgpa, s.kt_count
     FROM v_eligibility_summary e
     INNER JOIN student s ON s.student_id = e.student_id
     WHERE e.job_id = ? AND e.is_eligible = 1 AND s.is_verified = TRUE`,
    [jobId],
  );
  const appliedIds = new Set(applicants.map((a) => a.student_id));

  return {
    job,
    eligible_count: eligible.length,
    applicants: applicants.map((a) => ({ ...a, rounds: rounds[a.application_id] || [], offer: offers[a.application_id] || null })),
    not_applied: eligible.filter((s) => !appliedIds.has(s.student_id)),
  };
}));

app.get('/api/applications/:id/history', route(async (req) => {
  const id = Number(req.params.id);
  return { rounds: (await roundsFor([id]))[id] || [], offer: (await offersFor([id]))[id] || null };
}));

// Other applications an offer would close (the trigger after_offer_insert does the closing).
app.get('/api/applications/:id/siblings', route((req) =>
  query(
    `SELECT v.company_name, v.title FROM v_application_status v
     WHERE v.student_id = (SELECT student_id FROM application WHERE application_id = ?)
       AND v.application_id <> ?
       AND v.status_label IN ('In progress', 'Ready for offer')`,
    [req.params.id, req.params.id],
  ),
));

// UPDATE candidate_round. The trigger after_round_update moves the application on, or rejects it.
app.post('/api/applications/:id/rounds', route(async (req) => {
  const { round_order, score, outcome, remark } = req.body;
  if (!['Passed', 'Failed'].includes(outcome)) throw fail('Outcome must be Passed or Failed.');
  if (!Number.isInteger(score) || score < 0 || score > 100) throw fail('Score must be a whole number from 0 to 100.');
  const result = await query(
    `UPDATE candidate_round SET score = ?, outcome = ?, remark = ?
     WHERE application_id = ? AND round_order = ? AND outcome = 'Pending'`,
    [score, outcome, remark || null, req.params.id, round_order],
  );
  if (result.affectedRows === 0) throw fail('That round already has a result.');
  return { ok: true };
}));

// One transaction: the offer row and everything its triggers change commit together, or not at all.
app.post('/api/applications/:id/offer', route(async (req) => {
  const { package_lpa } = req.body;
  if (!(package_lpa > 0)) throw fail('Enter the package in LPA.');
  await transaction((run) =>
    run('INSERT INTO offer (application_id, issued_on, package_lpa) VALUES (?, CURDATE(), ?)', [req.params.id, package_lpa]),
  );
  return { ok: true };
}));

// Live "who can apply today" for the posting form. Same four rules as v_eligibility, for a job that does not exist yet.
app.post('/api/preview-pool', route(async (req) => {
  const { min_cgpa, max_kt, branches = [], skills = [] } = req.body;
  const rows = await query(
    `SELECT s.student_id, s.name, s.cgpa,
            CASE WHEN s.cgpa >= ? THEN 1 ELSE 0 END AS cgpa_ok,
            CASE WHEN s.kt_count <= ? THEN 1 ELSE 0 END AS kt_ok,
            CASE WHEN s.branch_id IN (?) THEN 1 ELSE 0 END AS branch_ok,
            CASE WHEN (SELECT COUNT(*) FROM student_skill ss
                        WHERE ss.student_id = s.student_id AND ss.skill_name IN (?)) = ?
                 THEN 1 ELSE 0 END AS skills_ok
     FROM student s
     WHERE s.is_verified = TRUE`,
    [min_cgpa, max_kt, branches.length ? branches : [''], skills.length ? skills : [''], skills.length],
  );
  const [{ unverified }] = await query('SELECT COUNT(*) AS unverified FROM student WHERE is_verified = FALSE');
  const miss = (key) => rows.filter((r) => r[key] === 0).length;
  return {
    verified_count: rows.length,
    unverified_count: unverified,
    eligible: rows.filter((r) => r.cgpa_ok && r.kt_ok && r.branch_ok && r.skills_ok).sort((a, b) => b.cgpa - a.cgpa),
    blocked_by: { cgpa: miss('cgpa_ok'), kt: miss('kt_ok'), branch: miss('branch_ok'), skills: miss('skills_ok') },
  };
}));

app.post('/api/jobs', route(async (req) => {
  const { company_id, title, package_lpa, min_cgpa, max_kt, deadline, skills, branches, rounds } = req.body;
  if (!title || title.trim().length < 3) throw fail('Enter a role title of at least 3 characters.');
  if (!skills?.length || !branches?.length || !rounds?.length) throw fail('Choose skills, branches and rounds.');

  const jobId = await transaction(async (run) => {
    const job = await run(
      'INSERT INTO job (company_id, title, package_lpa, min_cgpa, max_kt, deadline) VALUES (?, ?, ?, ?, ?, ?)',
      [company_id, title.trim(), package_lpa, min_cgpa, max_kt, deadline],
    );
    for (const name of skills) {
      const known = await run('SELECT skill_name FROM skill WHERE skill_name = ?', [name]);
      if (known.length === 0) await run('INSERT INTO skill (skill_name) VALUES (?)', [name]);
    }
    await run('INSERT INTO job_skill (job_id, skill_name) VALUES ?', [skills.map((s) => [job.insertId, s])]);
    await run('INSERT INTO job_branch (job_id, branch_id) VALUES ?', [branches.map((b) => [job.insertId, b])]);
    await run('INSERT INTO job_round (job_id, round_order, round_name) VALUES ?', [
      rounds.map((name, i) => [job.insertId, i + 1, name]),
    ]);
    return job.insertId;
  });
  return { job_id: jobId };
}));

/* ---------------------------------------------------------- placement cell */

app.get('/api/cell/overview', route(async () => {
  const [summary] = await query(
    `SELECT
       (SELECT COUNT(*) FROM student WHERE is_verified = TRUE)                    AS verified_students,
       (SELECT COUNT(DISTINCT student_id) FROM application WHERE status = 'Offered') AS placed_students,
       (SELECT COUNT(*) FROM application)                                         AS applications,
       (SELECT COUNT(*) FROM offer)                                               AS offers,
       (SELECT COUNT(*) FROM job WHERE deadline >= CURDATE())                     AS open_jobs,
       (SELECT COUNT(*) FROM job)                                                 AS total_jobs,
       (SELECT COUNT(*) FROM company)                                             AS companies,
       (SELECT COUNT(*) FROM verification_request WHERE status = 'Pending')       AS pending_verifications,
       (SELECT MAX(package_lpa) FROM offer)                                       AS top_package`,
  );

  const jobs = await query(
    `SELECT job_id, company_name, title, applicants, offers, selection_rate_pct, (deadline >= CURDATE()) AS is_open
     FROM v_job_stats ORDER BY is_open DESC, applicants DESC, job_id`,
  );
  const cells = groupBy(
    await query(
      `SELECT e.job_id, s.student_id, s.name, e.is_eligible
       FROM v_eligibility_summary e
       INNER JOIN student s ON s.student_id = e.student_id
       WHERE s.is_verified = TRUE
       ORDER BY e.job_id, s.student_id`,
    ),
    'job_id',
  );

  return {
    summary,
    jobs: jobs.map((j) => ({
      ...j,
      cells: j.is_open ? (cells[j.job_id] || []).map((c) => ({ ...c, is_eligible: c.is_eligible === 1 })) : null,
      eligible_count: (cells[j.job_id] || []).filter((c) => c.is_eligible === 1).length,
    })),
    skills: await query(
      `SELECT skill_name, open_roles, verified_students FROM v_skill_demand
       WHERE open_roles > 0 ORDER BY open_roles DESC, verified_students ASC, skill_name LIMIT 7`,
    ),
    branches: await query('SELECT branch_id, branch_name, verified_students, placed_students FROM v_branch_placement ORDER BY branch_id'),
  };
}));

app.get('/api/cell/funnel/:jobId', route(async (req) => {
  const jobId = Number(req.params.jobId);
  const [{ applied }] = await query('SELECT COUNT(*) AS applied FROM application WHERE job_id = ?', [jobId]);
  const cleared = await query(
    `SELECT jr.round_order, jr.round_name,
            (SELECT COUNT(*) FROM candidate_round cr
              INNER JOIN application a ON a.application_id = cr.application_id
              WHERE a.job_id = jr.job_id AND cr.round_order = jr.round_order AND cr.outcome = 'Passed') AS cleared
     FROM job_round jr WHERE jr.job_id = ? ORDER BY jr.round_order`,
    [jobId],
  );
  const [{ offers }] = await query(
    `SELECT COUNT(*) AS offers FROM offer o
     INNER JOIN application a ON a.application_id = o.application_id WHERE a.job_id = ?`,
    [jobId],
  );
  return { applied, rounds: cleared, offers };
}));

app.get('/api/cell/verification', route(async () => {
  const requests = await query(
    `SELECT r.request_id, r.student_id, r.submitted_on, r.status, r.doc_cgpa, r.doc_kt_count,
            r.marksheet_file, r.reviewer_note, r.reviewed_on,
            s.name, s.email, s.branch_id, s.cgpa, s.kt_count
     FROM verification_request r
     INNER JOIN student s ON s.student_id = r.student_id
     ORDER BY r.submitted_on, r.request_id`,
  );
  const certs = groupBy(
    await query(
      `SELECT student_id, cert_name, proof_file FROM student_certification
       WHERE student_id IN (SELECT student_id FROM verification_request) ORDER BY cert_name`,
    ),
    'student_id',
  );
  return requests.map((r) => ({ ...r, certifications: certs[r.student_id] || [] }));
}));

// One transaction: the verified values, the dropped certificates and the request status commit together.
app.post('/api/cell/verification/:id/verify', route(async (req) => {
  const kept = req.body.kept_certifications || [];
  await transaction(async (run) => {
    const done = await run(
      `UPDATE student s
       INNER JOIN verification_request r ON r.student_id = s.student_id
       SET s.cgpa = r.doc_cgpa, s.kt_count = r.doc_kt_count, s.is_verified = TRUE
       WHERE r.request_id = ? AND r.status = 'Pending'`,
      [req.params.id],
    );
    if (done.affectedRows === 0) throw fail('This request has already been reviewed.');

    await run(
      `DELETE FROM student_certification
       WHERE student_id = (SELECT student_id FROM verification_request WHERE request_id = ?)
         AND cert_name NOT IN (?)`,
      [req.params.id, kept.length ? kept : ['']],
    );
    await run("UPDATE verification_request SET status = 'Verified', reviewed_on = CURDATE() WHERE request_id = ?", [
      req.params.id,
    ]);
  });
  return { ok: true };
}));

app.post('/api/cell/verification/:id/reject', route(async (req) => {
  const note = (req.body.note || '').trim();
  if (note.length < 10) throw fail('Write a note the student can act on.');
  const done = await query(
    `UPDATE verification_request SET status = 'Rejected', reviewer_note = ?, reviewed_on = CURDATE()
     WHERE request_id = ? AND status = 'Pending'`,
    [note, req.params.id],
  );
  if (done.affectedRows === 0) throw fail('This request has already been reviewed.');
  return { ok: true };
}));

/* ------------------------------------------------------------------- start */

const port = Number(process.env.PORT || 3001);
pool
  .query('SELECT 1')
  .then(() => app.listen(port, () => console.log(`API on http://localhost:${port}`)))
  .catch((error) => {
    console.error(`Cannot reach MySQL: ${error.message}`);
    console.error('Check DB_USER and DB_PASSWORD in .env, and run: npm run db:build');
    process.exit(1);
  });
