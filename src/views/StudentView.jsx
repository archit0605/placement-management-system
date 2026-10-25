import { useMemo, useState } from 'react';
import { Award, FileClock, FileX2, Inbox, SearchX, ShieldCheck } from 'lucide-react';
import { api } from '../api.js';
import { useData, useQuery } from '../store/DataContext.jsx';
import { EmptyState, ErrorNote, Figure, PageSkeleton, Segmented, Sheet, SkillChip } from '../components/ui.jsx';
import ApplicationTimeline from '../components/ApplicationTimeline.jsx';
import { JobRow } from '../components/JobLedger.jsx';
import { describeChecks, formatDateLong } from '../lib/format.js';


function VerificationSeal({ student, request }) {
  if (student.is_verified === 1) {
    return (
      <p className="inline-flex items-center gap-2 rounded-full bg-ok px-3 py-1 text-[13px] font-medium text-white shadow-[0_0_0_4px_rgb(var(--ok)/0.14),0_0_24px_rgb(var(--ok)/0.35)]">
        <ShieldCheck className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
        Verified by Placement Cell
      </p>
    );
  }
  if (request?.status === 'Rejected') {
    return (
      <div className="max-w-xl">
        <p className="inline-flex items-center gap-2 rounded-full bg-bad-soft px-3 py-1 text-[13px] font-medium text-bad">
          <FileX2 className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
          Verification rejected
        </p>
        {request.reviewer_note && <p className="mt-2 text-[13px] leading-5 text-ink-2">{request.reviewer_note}</p>}
      </div>
    );
  }
  return (
    <div>
      <p className="inline-flex items-center gap-2 rounded-full bg-warn-soft px-3 py-1 text-[13px] font-medium text-warn">
        <FileClock className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
        Verification pending
      </p>
      <p className="mt-2 text-[13px] text-ink-2">
        {request ? `Submitted ${formatDateLong(request.submitted_on)}. ` : ''}You can apply once the placement cell approves it.
      </p>
    </div>
  );
}

export default function StudentView({ studentId }) {
  const { act } = useData();
  const [filter, setFilter] = useState('all');
  const [openJob, setOpenJob] = useState(undefined); // undefined = open the first near miss

  const dashboard = useQuery(`/api/students/${studentId}/dashboard`);

  const data = dashboard.data;
  const student = data?.student;

  // The SQL view already decided eligibility; here we only attach readable wording.
  const evaluated = useMemo(
    () => (data ? data.openings.map((opening) => ({ opening, evaluation: describeChecks(data.student, opening) })) : []),
    [data],
  );
  const sorted = useMemo(() => {
    const rank = (x) => (x.opening.days_left >= 0 ? (x.evaluation.eligible ? 0 : 1) : 2);
    return [...evaluated].sort(
      (a, b) =>
        rank(a) - rank(b) ||
        b.evaluation.metCount - a.evaluation.metCount ||
        a.opening.deadline.localeCompare(b.opening.deadline),
    );
  }, [evaluated]);

  if (dashboard.error && !data) return <ErrorNote error={dashboard.error} />;
  if (!data) return <PageSkeleton />;

  const myApplications = data.applications;
  const eligibleOpen = evaluated.filter((e) => e.opening.days_left >= 0 && e.evaluation.eligible).length;
  const nearMiss = evaluated.filter((e) => e.opening.days_left >= 0 && e.evaluation.metCount === 3).length;
  const visible = sorted.filter((e) => (filter === 'eligible' ? e.evaluation.eligible : filter === 'gaps' ? !e.evaluation.eligible : true));
  const request = data.verification;
  const shownOpen =
    openJob === undefined
      ? sorted.find((e) => e.opening.days_left >= 0 && e.evaluation.metCount === 3)?.opening.job_id ?? null
      : openJob;

  const onApply = (opening) =>
    act(
      () => api.post('/api/applications', { student_id: student.student_id, job_id: opening.job_id }),
      `Applied to ${opening.title} at ${opening.company_name}.`,
    );

  return (
    <div className="space-y-14">
      {/* Record header: the student's standing, read at a glance. */}
      <section aria-labelledby="student-name">
        <p className="text-[13px] text-ink-2">Student record</p>

        <div className="mt-4 grid items-end gap-8 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div className="min-w-0">
            <h1 id="student-name" className="text-4xl font-semibold leading-[1.05] tracking-tight text-ink sm:text-6xl">
              {student.name}
            </h1>
            <p className="mt-3 text-[15px] text-ink-2">
              {student.branch_name}
              <span className="mx-2 text-rule-strong" aria-hidden="true">
                /
              </span>
              {student.email}
            </p>
            <div className="mt-5">
              <VerificationSeal student={student} request={request} />
            </div>
          </div>

          <dl className="grid grid-cols-3 divide-x divide-rule border-y border-rule py-4 lg:min-w-[420px]">
            <Figure size="lg" label="CGPA" value={student.cgpa.toFixed(2)} className="pr-6" />
            <Figure
              size="lg"
              label="KT"
              value={student.kt_count}
              tone={student.kt_count > 0 ? 'warn' : undefined}
              className="px-6"
            />
            <Figure size="lg" label="Roles open to you" value={eligibleOpen} tone="accent" className="pl-6" />
          </dl>
        </div>

        <div className="mt-8 grid gap-6 border-t border-rule pt-6 md:grid-cols-2">
          <div>
            <h2 className="text-[13px] font-medium text-ink">Skills on record</h2>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {student.skills.map((skill) => (
                <SkillChip key={skill}>{skill}</SkillChip>
              ))}
            </div>
          </div>
          <div>
            <h2 className="text-[13px] font-medium text-ink">Active certifications</h2>
            {student.certifications.length === 0 ? (
              <p className="mt-2 text-[13px] text-ink-2">None on file. Upload one to back up a skill.</p>
            ) : (
              <ul className="mt-2.5 space-y-1.5">
                {student.certifications.map((cert) => (
                  <li key={cert} className="flex items-start gap-2 text-[13px] leading-5 text-ink">
                    <Award className="mt-0.5 h-4 w-4 shrink-0 text-ink-2" strokeWidth={1.75} aria-hidden="true" />
                    {cert}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      <section aria-labelledby="apps-heading">
        <h2 id="apps-heading" className="text-xl font-semibold tracking-tight text-ink">
          Applications
        </h2>
        <p className="mt-1 text-[13px] text-ink-2">Each round updates here the moment a recruiter logs it.</p>
        <Sheet className="mt-4 divide-y divide-rule">
          {myApplications.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="No applications yet"
              body={
                student.is_verified
                  ? 'Open a role below that shows four filled boxes and apply.'
                  : 'Applications open as soon as the placement cell verifies your profile.'
              }
            />
          ) : (
            myApplications.map((application) => <ApplicationTimeline key={application.application_id} application={application} />)
          )}
        </Sheet>
      </section>

      <section aria-labelledby="feed-heading">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 id="feed-heading" className="text-xl font-semibold tracking-tight text-ink">
              Openings
            </h2>
            <p className="mt-1 max-w-[60ch] text-[13px] text-ink-2">
              {nearMiss > 0
                ? `${nearMiss} ${nearMiss === 1 ? 'role is' : 'roles are'} one requirement away. Open a row to see exactly what is missing.`
                : 'Open a row to compare the role with your record.'}{' '}
              The four fit boxes read CGPA, KT, branch and skills.
            </p>
          </div>
          <Segmented
            label="Filter openings"
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: 'All', count: evaluated.length },
              { value: 'eligible', label: 'Eligible', count: evaluated.filter((e) => e.evaluation.eligible).length },
              { value: 'gaps', label: 'With gaps', count: evaluated.filter((e) => !e.evaluation.eligible).length },
            ]}
          />
        </div>

        <Sheet className="mt-4 overflow-hidden">
          <div
            className="hidden grid-cols-[minmax(0,1fr)_auto] gap-x-4 border-b border-rule bg-paper/60 text-xs text-ink-2 md:grid"
            aria-hidden="true"
          >
            <div className="grid grid-cols-[minmax(0,1fr)_92px_112px_120px] gap-x-4 py-2.5 pl-5">
              <span className="pl-11">Role</span>
              <span>Package</span>
              <span>Deadline</span>
              <span>Fit</span>
            </div>
            <span className="w-[9.5rem] py-2.5 pr-5 text-right">Action</span>
          </div>

          {visible.length === 0 ? (
            <EmptyState icon={SearchX} title="Nothing under this filter" body="Switch to All to see every opening and how close you are to each." />
          ) : (
            <ul className="divide-y divide-rule">
              {visible.map(({ opening, evaluation }) => (
                <JobRow
                  key={opening.job_id}
                  student={student}
                  opening={opening}
                  evaluation={evaluation}
                  open={shownOpen === opening.job_id}
                  onToggle={() => setOpenJob(shownOpen === opening.job_id ? null : opening.job_id)}
                  onApply={onApply}
                />
              ))}
            </ul>
          )}
        </Sheet>
      </section>
    </div>
  );
}
