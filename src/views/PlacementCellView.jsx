import { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, ClipboardCheck, FileText, Inbox, Search, ShieldCheck, XCircle } from 'lucide-react';
import { api } from '../api.js';
import { useData, useQuery } from '../store/DataContext.jsx';
import { Avatar, Button, EmptyState, ErrorNote, Field, Figure, PageSkeleton, Sheet, SheetHeader, Skeleton, Tabs, Tag, cn } from '../components/ui.jsx';
import { DemandSupply, DropOffCurve, EligibilityStrip } from '../components/charts.jsx';
import { formatDate, formatDateLong, formatLpa, formatPercent } from '../lib/format.js';

/* ---------------------------------------------------------------- Overview */

/** Turns the funnel counts from SQL into the points of the curve. */
function toStages(funnel) {
  const raw = [
    { label: 'Applied', lines: ['Applied'], count: funnel.applied },
    ...funnel.rounds.map((r) => ({ label: `Cleared ${r.round_name}`, lines: ['Cleared', r.round_name], count: r.cleared })),
    { label: 'Offer issued', lines: ['Offer', 'issued'], count: funnel.offers },
  ];
  return raw.map((stage, i) => ({
    ...stage,
    lost: i === 0 ? 0 : Math.max(raw[i - 1].count - stage.count, 0),
    carryRate: i === 0 || raw[i - 1].count === 0 ? null : stage.count / raw[i - 1].count,
  }));
}

function Overview() {
  const overview = useQuery('/api/cell/overview');
  const [funnelJobId, setFunnelJobId] = useState(null);

  const data = overview.data;
  const funnelJobs = useMemo(() => (data ? data.jobs.filter((j) => j.applicants > 0) : []), [data]);
  const activeFunnelId = funnelJobs.find((j) => j.job_id === funnelJobId)?.job_id ?? funnelJobs[0]?.job_id;
  const funnel = useQuery(activeFunnelId ? `/api/cell/funnel/${activeFunnelId}` : null);
  const stages = useMemo(() => (funnel.data ? toStages(funnel.data) : []), [funnel.data]);

  if (overview.error && !data) return <ErrorNote error={overview.error} />;
  if (!data) return <PageSkeleton />;

  const { summary } = data;
  const worstStep = stages.slice(1).reduce((worst, s) => (s.lost > (worst?.lost ?? 0) ? s : worst), null);
  const placementRate = summary.verified_students ? summary.placed_students / summary.verified_students : 0;
  const selectionRate = summary.applications ? summary.offers / summary.applications : 0;

  return (
    <div className="space-y-8">
      <Sheet as="div">
        <dl className="grid gap-y-6 px-5 py-6 sm:grid-cols-2 lg:grid-cols-4 lg:divide-x lg:divide-rule">
          <Figure
            size="lg"
            label="Placement rate"
            value={formatPercent(placementRate, 1)}
            caption={`${summary.placed_students} of ${summary.verified_students} verified students hold an offer. Best offer ${summary.top_package ? formatLpa(summary.top_package) : 'none yet'}.`}
            className="lg:pr-6"
          />
          <Figure
            size="lg"
            label="Selection rate"
            value={formatPercent(selectionRate, 1)}
            caption={`${summary.offers} offers from ${summary.applications} applications.`}
            className="lg:px-6"
          />
          <Figure
            size="lg"
            label="Open roles"
            value={summary.open_jobs}
            caption={`From ${summary.companies} companies. ${summary.total_jobs - summary.open_jobs} closed.`}
            className="lg:px-6"
          />
          <Figure
            size="lg"
            label="Waiting for verification"
            value={summary.pending_verifications}
            tone={summary.pending_verifications ? 'warn' : undefined}
            caption="Unverified students cannot apply and are left out of every count."
            className="lg:pl-6"
          />
        </dl>
      </Sheet>

      <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <Sheet>
          <SheetHeader
            title="Where candidates drop off"
            description={
              worstStep && worstStep.lost > 0
                ? `Most candidates are lost at the ${worstStep.lines[1] ?? worstStep.label} stage: ${worstStep.lost} out.`
                : 'Candidates still in the process after each round.'
            }
            action={
              activeFunnelId && (
                <div>
                  <label htmlFor="funnel-job" className="sr-only">
                    Role
                  </label>
                  <select
                    id="funnel-job"
                    className="field w-auto max-w-[16rem] cursor-pointer py-1.5 text-[13px]"
                    value={activeFunnelId}
                    onChange={(e) => setFunnelJobId(Number(e.target.value))}
                  >
                    {funnelJobs.map((job) => (
                      <option key={job.job_id} value={job.job_id}>
                        {job.company_name}, {job.title} ({job.applicants})
                      </option>
                    ))}
                  </select>
                </div>
              )
            }
          />
          <div className="px-3 pb-3 pt-6">
            {!activeFunnelId ? (
              <EmptyState icon={Inbox} title="No applications yet" body="The curve appears after the first student applies." />
            ) : funnel.data ? (
              <DropOffCurve key={activeFunnelId} stages={stages} />
            ) : (
              <Skeleton className="mx-2 h-56" />
            )}
          </div>
        </Sheet>

        <Sheet>
          <SheetHeader title="Skills employers are asking for" description="Open roles that require each skill, against verified students who hold it." />
          <div className="px-5 pb-5 pt-4">
            <DemandSupply rows={data.skills.map((s) => ({ skill: s.skill_name, demand: s.open_roles, supply: s.verified_students }))} />
          </div>
        </Sheet>
      </div>

      <Sheet className="overflow-hidden">
        <SheetHeader
          title="Every opening at a glance"
          description="Each square is one verified student, in the same position on every row. Filled means they qualify."
          className="pb-4"
        />
        <div className="scroll-thin overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <caption className="sr-only">Eligibility and selection by opening</caption>
            <thead className="border-y border-rule bg-paper/60 text-xs text-ink-2">
              <tr>
                <th scope="col" className="px-5 py-2.5 font-normal">Opening</th>
                <th scope="col" className="px-4 py-2.5 font-normal">Who qualifies</th>
                <th scope="col" className="px-4 py-2.5 text-right font-normal">Eligible</th>
                <th scope="col" className="px-4 py-2.5 text-right font-normal">Applied</th>
                <th scope="col" className="px-4 py-2.5 text-right font-normal">Offers</th>
                <th scope="col" className="px-5 py-2.5 text-right font-normal">Selection rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {data.jobs.map((job) => (
                <tr key={job.job_id} className="transition-colors duration-100 hover:bg-white">
                  <td className="px-5 py-3">
                    <p className={cn('font-medium', job.cells ? 'text-ink' : 'text-ink-2')}>{job.title}</p>
                    <p className="text-xs text-ink-2">
                      {job.company_name}
                      {!job.cells && ', closed'}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    {job.cells ? (
                      <EligibilityStrip
                        cells={job.cells.map((c) => ({ student: { student_id: c.student_id, name: c.name }, eligible: c.is_eligible }))}
                        label={`${job.company_name}, ${job.title}`}
                      />
                    ) : (
                      <span className="text-xs text-ink-3">Applications closed</span>
                    )}
                  </td>
                  <td className="figure px-4 py-3 text-right text-ink">{job.cells ? `${job.eligible_count}/${job.cells.length}` : '-'}</td>
                  <td className="figure px-4 py-3 text-right text-ink">{job.applicants}</td>
                  <td className={cn('figure px-4 py-3 text-right', job.offers ? 'font-medium text-accent' : 'text-ink')}>{job.offers}</td>
                  <td className="figure px-5 py-3 text-right text-ink">
                    {job.selection_rate_pct === null ? '-' : `${job.selection_rate_pct.toFixed(0)}%`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Sheet>

      <Sheet>
        <SheetHeader title="By branch" description="Verified students and how many already hold an offer." />
        <dl className="grid gap-y-5 px-5 pb-5 pt-4 sm:grid-cols-3 sm:divide-x sm:divide-rule">
          {data.branches.map((b, i) => (
            <Figure
              key={b.branch_id}
              label={b.branch_name}
              value={`${b.placed_students} of ${b.verified_students}`}
              caption="placed"
              className={cn(i > 0 && 'sm:pl-6', i < data.branches.length - 1 && 'sm:pr-6')}
            />
          ))}
        </dl>
      </Sheet>
    </div>
  );
}

/* ------------------------------------------------------ Verification queue */

function ReviewPanel({ request, onVerify, onReject }) {
  const readOnly = request.status !== 'Pending';
  const [checks, setChecks] = useState({ cgpa: false, kt: false, certs: {} });
  const [note, setNote] = useState('');
  const [noteError, setNoteError] = useState('');

  const provable = request.certifications.filter((c) => c.proof_file);
  const unprovable = request.certifications.filter((c) => !c.proof_file);
  const allConfirmed = checks.cgpa && checks.kt && provable.every((c) => checks.certs[c.cert_name]);
  const ticked = (key) => readOnly || checks[key];

  const rows = [
    {
      key: 'cgpa',
      label: 'CGPA',
      claimed: request.cgpa.toFixed(2),
      found: request.doc_cgpa.toFixed(2),
      source: request.marksheet_file,
      differs: request.cgpa !== request.doc_cgpa,
    },
    {
      key: 'kt',
      label: 'KT (backlogs)',
      claimed: String(request.kt_count),
      found: String(request.doc_kt_count),
      source: null,
      differs: request.kt_count !== request.doc_kt_count,
    },
  ];

  const reject = () => {
    if (note.trim().length < 10) {
      setNoteError('Write at least a sentence. The student sees this note.');
      document.getElementById('reject-note')?.focus();
      return;
    }
    onReject(request.request_id, note.trim());
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-rule p-5">
        <div className="flex min-w-0 items-center gap-3.5">
          <Avatar name={request.name} size="lg" />
          <div className="min-w-0">
            <h3 className="truncate text-lg font-semibold text-ink">{request.name}</h3>
            <p className="truncate text-[13px] text-ink-2">
              {request.branch_id}, {request.email}
            </p>
          </div>
        </div>
        <div className="text-right">
          <Tag tone={request.status === 'Verified' ? 'ok' : request.status === 'Rejected' ? 'bad' : 'warn'}>
            {request.status === 'Pending' ? 'Awaiting review' : request.status}
          </Tag>
          <p className="mt-1 text-xs text-ink-2">Submitted {formatDateLong(request.submitted_on)}</p>
        </div>
      </div>

      <div className="flex-1 space-y-7 p-5">
        {readOnly && (
          <div className={cn('rounded-md p-4 text-[13px] leading-5 text-ink', request.status === 'Verified' ? 'bg-ok-soft' : 'bg-bad-soft')}>
            <p className="font-medium">
              {request.status} on {formatDateLong(request.reviewed_on)}
            </p>
            {request.reviewer_note && <p className="mt-1 text-ink-2">{request.reviewer_note}</p>}
          </div>
        )}

        <section aria-labelledby="record-heading">
          <h4 id="record-heading" className="text-sm font-semibold text-ink">
            Academic record
          </h4>
          <p className="mt-0.5 text-[13px] text-ink-2">Tick a line once the document confirms it. Document values replace what the student typed.</p>
          <table className="mt-3 w-full text-left text-[13px]">
            <thead className="border-b border-rule text-xs text-ink-2">
              <tr>
                <th scope="col" className="w-8 py-2 font-normal">
                  <span className="sr-only">Checked</span>
                </th>
                <th scope="col" className="py-2 pr-4 font-normal">Field</th>
                <th scope="col" className="py-2 pr-4 font-normal">Student says</th>
                <th scope="col" className="py-2 pr-4 font-normal">Document says</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {rows.map((row) => (
                <tr key={row.key} className={cn(row.differs && 'bg-warn-soft/60')}>
                  <td className="py-3 pl-1 align-top">
                    <input
                      id={`check-${row.key}`}
                      type="checkbox"
                      checked={ticked(row.key)}
                      disabled={readOnly}
                      onChange={(e) => setChecks((c) => ({ ...c, [row.key]: e.target.checked }))}
                      className="h-4 w-4 cursor-pointer accent-[rgb(var(--accent))] disabled:cursor-not-allowed"
                    />
                  </td>
                  <th scope="row" className="py-3 pr-4 align-top font-medium text-ink">
                    <label htmlFor={`check-${row.key}`} className="cursor-pointer">
                      {row.label}
                    </label>
                    {row.source && (
                      <span className="mt-1 flex items-center gap-1.5 text-xs font-normal text-ink-2">
                        <FileText className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                        {row.source}
                      </span>
                    )}
                  </th>
                  <td className="figure py-3 pr-4 align-top text-ink">{row.claimed}</td>
                  <td className="py-3 pr-4 align-top">
                    <span className={cn('figure', row.differs ? 'font-medium text-warn' : 'text-ink')}>{row.found}</span>
                    {row.differs && (
                      <span className="mt-1 flex items-center gap-1.5 text-xs text-warn">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden="true" />
                        Differs. The profile will use {row.found}.
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section aria-labelledby="cert-heading">
          <h4 id="cert-heading" className="text-sm font-semibold text-ink">
            Certifications
          </h4>
          {request.certifications.length === 0 ? (
            <p className="mt-2 text-[13px] text-ink-2">The student listed none.</p>
          ) : (
            <ul className="mt-3 divide-y divide-rule border-y border-rule">
              {provable.map((cert) => (
                <li key={cert.cert_name} className="flex items-start gap-3 py-3">
                  <input
                    id={`check-cert-${cert.cert_name}`}
                    type="checkbox"
                    checked={readOnly || Boolean(checks.certs[cert.cert_name])}
                    disabled={readOnly}
                    onChange={(e) => setChecks((c) => ({ ...c, certs: { ...c.certs, [cert.cert_name]: e.target.checked } }))}
                    className="mt-0.5 h-4 w-4 cursor-pointer accent-[rgb(var(--accent))] disabled:cursor-not-allowed"
                  />
                  <label htmlFor={`check-cert-${cert.cert_name}`} className="min-w-0 flex-1 cursor-pointer">
                    <span className="block text-[13px] font-medium text-ink">{cert.cert_name}</span>
                    <span className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-2">
                      <FileText className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                      {cert.proof_file}
                    </span>
                  </label>
                </li>
              ))}
              {unprovable.map((cert) => (
                <li key={cert.cert_name} className="flex items-start gap-3 py-3">
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-bad" strokeWidth={2} aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-ink">{cert.cert_name}</p>
                    <p className="mt-0.5 text-xs text-bad">
                      No document attached.{!readOnly && ' It will be removed from the profile on verification.'}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {!readOnly && (
          <Field
            label="Reason for rejecting"
            htmlFor="reject-note"
            error={noteError}
            hint="Only needed if you reject. The student sees this note and can resubmit."
          >
            <textarea
              id="reject-note"
              name="reject-note"
              className="field min-h-20 resize-y"
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                setNoteError('');
              }}
              aria-invalid={noteError ? 'true' : undefined}
              aria-describedby={noteError ? 'reject-note-error' : 'reject-note-hint'}
              placeholder="The marksheet scan is unreadable. Upload a clear copy of every semester."
            />
          </Field>
        )}
      </div>

      {!readOnly && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rule bg-paper/50 px-5 py-4">
          <p className="text-[13px] text-ink-2">{allConfirmed ? 'Every line is checked.' : 'Tick each line to enable verification.'}</p>
          <div className="flex gap-2">
            <Button variant="danger" onClick={reject}>
              Reject
            </Button>
            <Button
              variant="primary"
              icon={ShieldCheck}
              disabled={!allConfirmed}
              onClick={() => onVerify(request.request_id, provable.filter((c) => checks.certs[c.cert_name]).map((c) => c.cert_name))}
            >
              Verify student
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function VerificationQueue() {
  const { act } = useData();
  const requests = useQuery('/api/cell/verification');
  const [mode, setMode] = useState('pending');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(null);

  if (requests.error && !requests.data) return <ErrorNote error={requests.error} />;
  if (!requests.data) return <PageSkeleton />;

  const all = requests.data;
  const pendingCount = all.filter((r) => r.status === 'Pending').length;
  const list = all
    .filter((r) => (mode === 'pending' ? r.status === 'Pending' : r.status !== 'Pending'))
    .filter((r) => {
      const q = query.trim().toLowerCase();
      return !q || r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q);
    });
  const selected = list.find((r) => r.request_id === selectedId) ?? list[0];

  return (
    <Sheet className="overflow-hidden">
      <div className="grid min-h-[600px] lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="flex flex-col border-b border-rule bg-paper/40 lg:border-b-0 lg:border-r">
          <div className="space-y-3 p-4">
            <div className="flex gap-1 text-[13px]" role="radiogroup" aria-label="Queue filter">
              {[
                { value: 'pending', label: `To review (${pendingCount})` },
                { value: 'reviewed', label: `Reviewed (${all.length - pendingCount})` },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={mode === option.value}
                  onClick={() => setMode(option.value)}
                  className={cn(
                    'rounded-md px-2.5 py-1 transition-colors duration-150',
                    mode === option.value ? 'bg-ink text-white' : 'text-ink-2 hover:bg-ink/[0.05] hover:text-ink',
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" strokeWidth={1.75} aria-hidden="true" />
              <input
                type="search"
                name="request-search"
                className="field py-1.5 pl-9"
                placeholder="Search students…"
                aria-label="Search verification requests"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoComplete="off"
                spellCheck={false}
              />
            </div>
          </div>

          {list.length === 0 ? (
            <EmptyState
              icon={mode === 'pending' ? ClipboardCheck : Inbox}
              title={query ? 'No match' : mode === 'pending' ? 'Queue is clear' : 'Nothing reviewed yet'}
              body={
                query
                  ? 'No request matches that search.'
                  : mode === 'pending'
                    ? 'New submissions land here as students upload documents.'
                    : 'Approved and rejected requests are kept here.'
              }
            />
          ) : (
            <ul className="divide-y divide-rule border-t border-rule" aria-label="Verification requests">
              {list.map((request) => {
                const active = request.request_id === selected?.request_id;
                const missingProof = request.certifications.some((c) => !c.proof_file);
                const differs = request.cgpa !== request.doc_cgpa || request.kt_count !== request.doc_kt_count;
                return (
                  <li key={request.request_id}>
                    <button
                      type="button"
                      aria-current={active ? 'true' : undefined}
                      onClick={() => setSelectedId(request.request_id)}
                      className={cn(
                        'relative flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors duration-100',
                        'focus-visible:ring-inset focus-visible:ring-offset-0',
                        active ? 'bg-sheet' : 'hover:bg-sheet/70',
                      )}
                    >
                      {active && <span className="absolute inset-y-0 left-0 w-[3px] bg-accent" aria-hidden="true" />}
                      <Avatar name={request.name} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-2">
                          <span className="truncate text-sm font-medium text-ink">{request.name}</span>
                          <span className="shrink-0 text-xs text-ink-2">{formatDate(request.submitted_on)}</span>
                        </span>
                        <span className="mt-0.5 block text-xs text-ink-2">
                          {request.branch_id}, CGPA {request.cgpa.toFixed(2)}
                        </span>
                        <span className="mt-1.5 flex flex-wrap gap-1">
                          {request.status !== 'Pending' && <Tag tone={request.status === 'Verified' ? 'ok' : 'bad'}>{request.status}</Tag>}
                          {request.status === 'Pending' && differs && <Tag tone="warn">Values differ</Tag>}
                          {request.status === 'Pending' && missingProof && <Tag tone="bad">Missing proof</Tag>}
                          {request.status === 'Pending' && !differs && !missingProof && <Tag tone="ok">Documents match</Tag>}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="min-w-0">
          {selected ? (
            <ReviewPanel
              key={selected.request_id}
              request={selected}
              onVerify={(id, kept) =>
                act(
                  () => api.post(`/api/cell/verification/${id}/verify`, { kept_certifications: kept }),
                  `${selected.name} is verified and can apply to roles they qualify for.`,
                )
              }
              onReject={(id, note) =>
                act(() => api.post(`/api/cell/verification/${id}/reject`, { note }), `Rejected ${selected.name}'s request. They can see your note.`)
              }
            />
          ) : (
            <EmptyState icon={CheckCircle2} title="Nothing selected" body="Pick a request to compare the student's claims with their documents." />
          )}
        </div>
      </div>
    </Sheet>
  );
}

/* -------------------------------------------------------------------- View */

export default function PlacementCellView() {
  const [tab, setTab] = useState('overview');
  const overview = useQuery('/api/cell/overview');
  const pending = overview.data?.summary.pending_verifications ?? 0;

  return (
    <div>
      <p className="text-[13px] text-ink-2">Placement cell</p>
      <h1 className="mt-1 text-4xl font-semibold tracking-tight text-ink sm:text-5xl">Class of 2027 placements</h1>
      <p className="mt-2 max-w-[62ch] text-[15px] leading-6 text-ink-2">
        Every number is worked out by the database from the same records students and recruiters use. Nothing is entered twice.
      </p>

      <Tabs
        label="Placement cell sections"
        className="mt-6 border-b border-rule"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'overview', label: 'Overview' },
          { value: 'queue', label: 'Verification queue', count: pending, tone: 'warn' },
        ]}
      />

      <div className="mt-8">{tab === 'overview' ? <Overview /> : <VerificationQueue />}</div>
    </div>
  );
}
