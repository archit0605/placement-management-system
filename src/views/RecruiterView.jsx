import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDownUp, Briefcase, Handshake, History, MoreHorizontal, PenLine, Plus, Search, UserSearch } from 'lucide-react';
import { api } from '../api.js';
import { useData, useQuery } from '../store/DataContext.jsx';
import { Avatar, Button, EmptyState, ErrorNote, Figure, Menu, PageSkeleton, Segmented, Sheet, SkillChip, Tabs, Tag, cn } from '../components/ui.jsx';
import JobPostingPanel from '../components/JobPostingPanel.jsx';
import { HistoryModal, LogRoundModal, OfferModal } from '../components/RecruiterModals.jsx';
import { STATUS_TONE, deadlineLabel, formatLpa, roundInfo } from '../lib/format.js';

function StageTrack({ row }) {
  const { failedRound, currentRound } = roundInfo(row);
  const label = row.status_label;
  const caption =
    label === 'Offer issued'
      ? 'Offer issued'
      : label === 'Ready for offer'
        ? 'All rounds cleared'
        : label === 'Not selected'
          ? `Out at ${failedRound?.round_name}`
          : label === 'Closed'
            ? 'Placed elsewhere'
            : currentRound?.round_name ?? 'Applied';

  return (
    <div>
      <div className="flex gap-0.5" aria-hidden="true">
        {row.rounds.map((round) => {
          const current = round.round_order === row.current_round_order && label === 'In progress';
          return (
            <span
              key={round.round_order}
              title={`${round.round_name}: ${round.outcome}`}
              className={cn(
                'h-1.5 w-7 first:rounded-l-full last:rounded-r-full',
                round.outcome === 'Passed' && 'bg-ink',
                round.outcome === 'Failed' && 'bg-bad',
                round.outcome === 'Pending' && (current ? 'bg-accent' : 'bg-rule'),
              )}
            />
          );
        })}
      </div>
      <p className="mt-1.5 text-xs text-ink-2">{caption}</p>
    </div>
  );
}

function SortHeader({ label, sortKey, sort, onSort }) {
  const active = sort.key === sortKey;
  return (
    <th scope="col" aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'} className="px-4 py-2.5 font-normal">
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn('inline-flex items-center gap-1 rounded transition-colors hover:text-ink', active ? 'font-medium text-ink' : 'text-ink-2')}
      >
        {label}
        <ArrowDownUp className={cn('h-3 w-3', active ? 'text-accent' : 'text-ink-3')} strokeWidth={2} aria-hidden="true" />
      </button>
    </th>
  );
}

export default function RecruiterView({ companyId }) {
  const { act } = useData();

  const companies = useQuery('/api/companies');
  const [tab, setTab] = useState('pipeline');
  const [jobId, setJobId] = useState(null);
  const [scope, setScope] = useState('applicants');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState({ key: 'cgpa', dir: 'desc' });
  const [dialog, setDialog] = useState(null);
  const selectNewest = useRef(false);

  const activeCompany = companies.data?.find((c) => c.company_id === companyId);

  const jobs = useQuery(activeCompany ? `/api/companies/${activeCompany.company_id}/jobs` : null);
  const jobList = jobs.data;
  const activeJobId = jobList?.find((j) => j.job_id === jobId)?.job_id ?? jobList?.[0]?.job_id;
  const pipeline = useQuery(activeJobId ? `/api/jobs/${activeJobId}/pipeline` : null);

  useEffect(() => {
    if (selectNewest.current && jobList?.length) {
      selectNewest.current = false;
      setJobId(Math.max(...jobList.map((j) => j.job_id)));
    }
  }, [jobList]);

  const data = pipeline.data;
  const rows = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    const dir = sort.dir === 'asc' ? 1 : -1;
    const source = scope === 'pool' ? data.not_applied.map((s) => ({ ...s, rounds: [], status_label: null })) : data.applicants;
    const value = (r) => (sort.key === 'name' ? r.name : sort.key === 'score' ? r.latest_score ?? -1 : r.cgpa);
    return source
      .filter((r) => !q || r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q))
      .sort((a, b) => (typeof value(a) === 'string' ? dir * value(a).localeCompare(value(b)) : dir * (value(a) - value(b))));
  }, [data, scope, query, sort]);

  if (companies.error && !companies.data) return <ErrorNote error={companies.error} />;
  if (!activeCompany) return <PageSkeleton />;

  const onSort = (key) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: key === 'name' ? 'asc' : 'desc' }));

  const dialogRow = dialog && data ? data.applicants.find((a) => a.application_id === dialog.applicationId) : null;
  const closeDialog = () => setDialog(null);

  const actionsFor = (row) => {
    const label = row.status_label;
    const canLog = label === 'In progress';
    const canOffer = label === 'Ready for offer';
    const blocked = {
      'Offer issued': 'Offer already issued',
      Closed: 'Student is placed elsewhere',
      'Not selected': 'Application ended after a failed round',
      'Ready for offer': 'Every round is already cleared',
    };
    return [
      {
        label: 'Log round result',
        icon: PenLine,
        disabled: !canLog,
        hint: canLog ? `Current round: ${roundInfo(row).currentRound?.round_name}` : blocked[label],
        onSelect: () => setDialog({ kind: 'log', applicationId: row.application_id }),
      },
      {
        label: 'Issue binding offer',
        icon: Handshake,
        accent: true,
        disabled: !canOffer,
        hint: canOffer ? 'Closes their other open applications' : 'Available once the final round is cleared',
        onSelect: () => setDialog({ kind: 'offer', applicationId: row.application_id }),
      },
      {
        label: 'View round history',
        icon: History,
        hint: 'Scores and remarks so far',
        onSelect: () => setDialog({ kind: 'history', applicationId: row.application_id }),
      },
    ];
  };

  const counts = data && {
    eligible: data.eligible_count,
    applicants: data.applicants.length,
    active: data.applicants.filter((a) => ['In progress', 'Ready for offer'].includes(a.status_label)).length,
    offers: data.applicants.filter((a) => a.offer).length,
  };

  return (
    <div>
      <div>
        <div>
          <p className="text-[13px] text-ink-2">Recruiter workspace</p>
          <h1 className="mt-1 text-4xl font-semibold tracking-tight text-ink sm:text-5xl">{activeCompany.company_name}</h1>
        </div>
      </div>

      <Tabs
        label="Recruiter sections"
        className="mt-6 border-b border-rule"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'pipeline', label: 'Pipeline' },
          { value: 'post', label: 'New opening' },
        ]}
      />

      <div className="mt-8">
        {tab === 'post' ? (
          <JobPostingPanel
            key={activeCompany.company_id}
            company={activeCompany}
            onPosted={() => {
              selectNewest.current = true;
              setScope('applicants');
              setTab('pipeline');
            }}
          />
        ) : jobs.data && jobList.length === 0 ? (
          <Sheet>
            <EmptyState
              icon={Briefcase}
              title="No openings yet"
              body="Publish an opening and every verified student who qualifies can apply right away."
              action={
                <Button variant="primary" icon={Plus} onClick={() => setTab('post')}>
                  New opening
                </Button>
              }
            />
          </Sheet>
        ) : !jobList || !data ? (
          pipeline.error ? <ErrorNote error={pipeline.error} /> : <PageSkeleton />
        ) : (
          <div className="grid items-start gap-8 lg:grid-cols-[240px_minmax(0,1fr)]">
            <nav aria-label={`${activeCompany.company_name} openings`}>
              <p className="text-xs text-ink-2">Openings</p>
              <ul className="mt-2 space-y-1">
                {jobList.map((j) => {
                  const selected = j.job_id === activeJobId;
                  return (
                    <li key={j.job_id}>
                      <button
                        type="button"
                        aria-current={selected ? 'true' : undefined}
                        onClick={() => {
                          setJobId(j.job_id);
                          setScope('applicants');
                        }}
                        className={cn(
                          'w-full rounded-md border px-3 py-2.5 text-left transition-colors duration-150',
                          selected ? 'border-rule bg-sheet' : 'border-transparent hover:bg-ink/[0.04]',
                        )}
                      >
                        <span className={cn('block text-sm leading-5', selected ? 'font-semibold text-ink' : 'text-ink')}>{j.title}</span>
                        <span className="mt-0.5 block text-xs text-ink-2">
                          {j.applicants} applied, {j.is_open ? 'open' : 'closed'}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              <Button className="mt-3" size="sm" icon={Plus} onClick={() => setTab('post')}>
                New opening
              </Button>
            </nav>

            <div className="min-w-0">
              <h2 className="text-2xl font-semibold tracking-tight text-ink">{data.job.title}</h2>
              <p className="mt-1 text-[13px] text-ink-2">
                {formatLpa(data.job.package_lpa)}, CGPA {data.job.min_cgpa.toFixed(1)} or higher, up to {data.job.max_kt} KT, open to{' '}
                {data.job.eligible_branches.join(', ')}. {deadlineLabel(data.job.days_left)}.
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {data.job.required_skills.map((s) => (
                  <SkillChip key={s}>{s}</SkillChip>
                ))}
              </div>

              <dl className="mt-6 grid grid-cols-2 gap-y-4 border-y border-rule py-4 sm:grid-cols-4 sm:divide-x sm:divide-rule">
                <Figure label="Eligible students" value={counts.eligible} className="sm:pr-6" />
                <Figure label="Applied" value={counts.applicants} className="sm:px-6" />
                <Figure label="Still in process" value={counts.active} className="sm:px-6" />
                <Figure label="Offers" value={counts.offers} tone="accent" className="sm:pl-6" />
              </dl>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                <Segmented
                  label="Candidate list"
                  value={scope}
                  onChange={setScope}
                  options={[
                    { value: 'applicants', label: 'Applicants', count: counts.applicants },
                    { value: 'pool', label: 'Eligible, not applied', count: data.not_applied.length },
                  ]}
                />
                <div className="relative w-full sm:w-64">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" strokeWidth={1.75} aria-hidden="true" />
                  <input
                    type="search"
                    name="candidate-search"
                    className="field py-1.5 pl-9"
                    placeholder="Search name or email…"
                    aria-label="Search candidates"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    autoComplete="off"
                    spellCheck={false}
                  />
                </div>
              </div>

              <Sheet className="mt-3 overflow-hidden">
                {rows.length === 0 ? (
                  <EmptyState
                    icon={UserSearch}
                    title={query ? 'No one matches that search' : scope === 'pool' ? 'Everyone eligible has applied' : 'No applications yet'}
                    body={
                      query
                        ? 'Try another name or clear the search.'
                        : scope === 'pool'
                          ? 'New students appear here as they get verified and qualify.'
                          : 'Eligible students show up here as soon as they apply.'
                    }
                  />
                ) : (
                  <div className="scroll-thin overflow-x-auto">
                    <table className="w-full min-w-[820px] border-collapse text-left text-sm">
                      <caption className="sr-only">
                        {scope === 'pool' ? 'Eligible students who have not applied' : 'Applicants'} for {data.job.title}
                      </caption>
                      <thead className="border-b border-rule bg-paper/60 text-xs">
                        <tr>
                          <SortHeader label="Candidate" sortKey="name" sort={sort} onSort={onSort} />
                          <th scope="col" className="px-4 py-2.5 font-normal text-ink-2">Branch</th>
                          <SortHeader label="CGPA" sortKey="cgpa" sort={sort} onSort={onSort} />
                          <th scope="col" className="px-4 py-2.5 font-normal text-ink-2">KT</th>
                          <th scope="col" className="px-4 py-2.5 font-normal text-ink-2">Stage</th>
                          {scope === 'applicants' && <SortHeader label="Last score" sortKey="score" sort={sort} onSort={onSort} />}
                          <th scope="col" className="px-4 py-2.5 font-normal text-ink-2">Status</th>
                          <th scope="col" className="w-12 px-4 py-2.5">
                            <span className="sr-only">Actions</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-rule">
                        {rows.map((row) => (
                          <tr key={row.student_id} className="transition-colors duration-100 hover:bg-white">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <Avatar name={row.name} size="sm" />
                                <div className="min-w-0">
                                  <p className="truncate font-medium text-ink">{row.name}</p>
                                  <p className="truncate text-xs text-ink-2">{row.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-ink-2">{row.branch_id}</td>
                            <td className="figure px-4 py-3 text-ink">{row.cgpa.toFixed(2)}</td>
                            <td className={cn('figure px-4 py-3', row.kt_count ? 'text-warn' : 'text-ink-2')}>{row.kt_count}</td>
                            <td className="px-4 py-3">
                              {row.status_label ? <StageTrack row={row} /> : <span className="text-xs text-ink-2">Has not applied</span>}
                            </td>
                            {scope === 'applicants' && (
                              <td className="figure px-4 py-3 text-ink">
                                {row.latest_score !== null ? row.latest_score : <span className="text-ink-3">None</span>}
                              </td>
                            )}
                            <td className="px-4 py-3">
                              {row.status_label ? <Tag tone={STATUS_TONE[row.status_label]}>{row.status_label}</Tag> : <Tag>Eligible</Tag>}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {row.status_label && <Menu label={`Actions for ${row.name}`} icon={MoreHorizontal} items={actionsFor(row)} />}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Sheet>
            </div>
          </div>
        )}
      </div>

      {dialog?.kind === 'log' && dialogRow && (
        <LogRoundModal
          key={dialog.applicationId}
          row={dialogRow}
          jobTitle={data.job.title}
          onClose={closeDialog}
          onSubmit={async (payload) => {
            const stage = roundInfo(dialogRow).currentRound.round_name;
            const ok = await act(
              () => api.post(`/api/applications/${dialogRow.application_id}/rounds`, payload),
              payload.outcome === 'Passed'
                ? `${dialogRow.name} cleared ${stage} with ${payload.score}.`
                : `${dialogRow.name} did not clear ${stage}. Feedback sent.`,
            );
            if (ok) closeDialog();
          }}
        />
      )}

      {dialog?.kind === 'offer' && dialogRow && (
        <OfferModal
          key={dialog.applicationId}
          row={dialogRow}
          job={data.job}
          onClose={closeDialog}
          onConfirm={async (packageLpa) => {
            const ok = await act(
              () => api.post(`/api/applications/${dialogRow.application_id}/offer`, { package_lpa: packageLpa }),
              `Offer of ${formatLpa(packageLpa)} issued to ${dialogRow.name}.`,
            );
            if (ok) closeDialog();
          }}
        />
      )}

      {dialog?.kind === 'history' && dialogRow && (
        <HistoryModal key={dialog.applicationId} row={dialogRow} jobTitle={data.job.title} onClose={closeDialog} />
      )}
    </div>
  );
}
