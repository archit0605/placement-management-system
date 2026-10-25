# Placement Desk

Placement management for Sardar Patel Institute of Technology: students, recruiters and the placement cell on one MySQL database, replacing Excel sheets and WhatsApp notes. DBMS course project.

All students, companies and figures in `db/04_data.sql` are fictional.

## Run it

1. Create `.env` in this folder (it is git-ignored):
   ```
   DB_USER=root
   DB_PASSWORD=your_mysql_password
   ```
2. Install and build the database:
   ```bash
   npm install
   npm run db:build      # runs db/01 to db/04 in order; run it again any time to reset the data
   ```
3. Start the API and the website together:
   ```bash
   npm run dev           # site on http://localhost:5173, API on http://localhost:3001
   ```
   The site opens on an entry screen: choose Student, Recruiter or Placement cell, then your name or company. "Switch user" in the top bar returns to it.

`npm run db:build` needs the `mysql` command on your PATH.

## How the pieces fit

```
React (src/)  ->  Express (server/index.js)  ->  MySQL (db/)
 screens only      one SQL statement per route    tables, views, triggers
```

The browser holds no business rules. Eligibility, statuses and every dashboard number come out of SQL views, and the integrity rules are triggers.

| Folder | Contents |
|---|---|
| `db/` | `01_schema.sql` tables (DDL), `02_views.sql`, `03_triggers.sql`, `04_data.sql` (DML), `05_queries.sql` one section per syllabus topic with relational algebra |
| `server/` | `index.js` the API, `db.js` connection pool and transactions, `build-db.js` |
| `src/` | the React app: `views/` per role, `components/`, `lib/format.js` (wording only) |
| `docs/` | report material: Excel problems, normalization to BCNF, ER and EER diagrams, ER-to-relational mapping, theory topics |

## Where each action ends up in SQL

| In the app | SQL |
|---|---|
| Student applies | `INSERT INTO application`; trigger `before_application_insert` refuses unverified, late or ineligible students |
| Recruiter logs a round | `UPDATE candidate_round`; trigger `after_round_update` advances or rejects |
| Recruiter issues an offer | transaction: `INSERT INTO offer`; triggers check the rounds and close the student's other applications |
| Recruiter publishes a job | one transaction inserting into `job`, `job_skill`, `job_branch`, `job_round` |
| Cell verifies a student | one transaction updating `student`, deleting unproven certificates and closing the request |

## Design

A flat, light ledger: cool grey paper, ink text, hairline rules and one cobalt accent. Green, red and amber only ever mean pass, fail and pending. IBM Plex Sans for text and Plex Mono for figures. Colours are CSS variables at the top of `src/index.css`.
