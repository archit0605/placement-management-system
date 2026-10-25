import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ChevronRight, Search } from 'lucide-react';
import { useQuery } from '../store/DataContext.jsx';
import { Avatar, CompanyMark, ErrorNote, Segmented, Tag, cn } from '../components/ui.jsx';

/*
 * The entry screen. Three steps: choose a role, choose who you are, open your record.
 *
 * The left panel lists the companies that are visiting. Hover a student and the companies
 * they qualify for light up (the same v_eligibility_summary view their own page uses).
 * Hover a company and it lights up alone. Nothing here is decoration: every highlight is a
 * database answer.
 */

const firstName = (name) => name.split(' ')[0];

export default function Gate({ onPick, onDone }) {
  const { data, error } = useQuery('/api/gate');
  const [step, setStep] = useState('role'); // 'role' | 'person'
  const [role, setRole] = useState(null); // 'student' | 'recruiter'
  const [hover, setHover] = useState(null); // { kind: 'student' | 'company' | 'role', id }
  const [phase, setPhase] = useState('choose'); // 'choose' | 'opening' | 'wipe'
  const [picked, setPicked] = useState(null);
  const [query, setQuery] = useState('');
  const [branch, setBranch] = useState('all');
  const searchRef = useRef(null);

  const goBack = () => {
    setStep('role');
    setRole(null);
    setHover(null);
    setQuery('');
    setBranch('all');
  };

  // Escape steps back; the search box takes focus whenever the person list opens.
  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape' && step === 'person' && phase === 'choose') goBack();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [step, phase]);

  useEffect(() => {
    if (step === 'person') searchRef.current?.focus();
  }, [step]);

  // Opening the record: a short beat, then the panel wipes away to reveal the app underneath.
  useEffect(() => {
    if (phase === 'opening') {
      const timer = window.setTimeout(() => setPhase('wipe'), 750);
      return () => window.clearTimeout(timer);
    }
    if (phase === 'wipe') {
      const timer = window.setTimeout(onDone, 650);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [phase, onDone]);

  const enter = (selection) => {
    setPicked(selection);
    setPhase('opening');
    onPick(selection);
  };

  const students = data?.students ?? [];
  const companies = data?.companies ?? [];

  const visibleStudents = useMemo(() => {
    const q = query.trim().toLowerCase();
    return students.filter(
      (s) => (branch === 'all' || s.branch_id === branch) && (!q || s.name.toLowerCase().includes(q) || s.branch_id.toLowerCase().includes(q)),
    );
  }, [students, query, branch]);

  const visibleCompanies = useMemo(() => {
    const q = query.trim().toLowerCase();
    return companies.filter((c) => !q || c.company_name.toLowerCase().includes(q));
  }, [companies, query]);

  /* ---------------------------------------------------------- left panel */

  const hovered = useMemo(() => {
    if (!data || !hover) return null;
    if (hover.kind === 'student') return students.find((s) => s.student_id === hover.id) ?? null;
    return null;
  }, [data, hover, students]);

  const litCompanies = useMemo(() => {
    if (!hover || !data) return null;
    if (hover.kind === 'student' && hovered) return new Map(hovered.eligible.map((e) => [e.company_id, e.roles]));
    if (hover.kind === 'company') {
      const company = companies.find((c) => c.company_id === hover.id);
      return new Map([[hover.id, company?.open_roles ?? 0]]);
    }
    if (hover.kind === 'role' && hover.id === 'recruiter') return new Map(companies.map((c) => [c.company_id, c.open_roles]));
    return null;
  }, [hover, hovered, companies, data]);

  const caption = (() => {
    if (!data) return 'Loading the visiting companies from the database.';
    const { cell } = data;
    if (hover?.kind === 'student' && hovered) {
      const roles = hovered.eligible.reduce((sum, e) => sum + e.roles, 0);
      return `${firstName(hovered.name)} qualifies for ${roles} of ${cell.open_roles} open roles at ${hovered.eligible.length} ${
        hovered.eligible.length === 1 ? 'company' : 'companies'
      }${hovered.is_verified ? '.' : ', once verified.'}`;
    }
    if (hover?.kind === 'company') {
      const company = companies.find((c) => c.company_id === hover.id);
      return `${company.company_name} has ${company.open_roles} open ${company.open_roles === 1 ? 'role' : 'roles'} and ${company.applicants} applications so far.`;
    }
    if (hover?.kind === 'role' && hover.id === 'cell') return `${cell.pending} verification ${cell.pending === 1 ? 'request is' : 'requests are'} waiting for review.`;
    if (hover?.kind === 'role' && hover.id === 'student') return `${students.length} students are on the desk. Pick one to see only their eligible roles.`;
    return `${cell.open_roles} open roles from ${companies.length} companies, for ${cell.verified} verified students.`;
  })();

  /* --------------------------------------------------------- right panel */

  const roleRows = data && [
    { id: 'student', name: 'Student', note: 'Check what you qualify for and follow your applications.', figure: `${students.length} students` },
    { id: 'recruiter', name: 'Recruiter', note: 'Review candidates, log rounds and issue offers.', figure: `${companies.length} companies` },
    { id: 'cell', name: 'Placement cell', note: 'Verify student records and watch the numbers.', figure: `${data.cell.pending} to verify` },
  ];

  const chooseRole = (id) => {
    if (id === 'cell') {
      enter({ role: 'cell', id: null, name: 'Placement cell', subtitle: 'Training and placement' });
      return;
    }
    setRole(id);
    setStep('person');
    setHover(null);
  };

  const rowBase =
    'group flex w-full items-center gap-4 border-b border-rule px-3 py-3 text-left transition-colors duration-150 hover:bg-white focus-visible:bg-white focus-visible:ring-inset focus-visible:ring-offset-0';

  return (
    <div
      className={cn('fixed inset-0 z-40 overflow-y-auto bg-paper', phase === 'wipe' && 'gate-wipe')}
      role="dialog"
      aria-modal="true"
      aria-label="Choose who you are"
    >
      <div className="grid min-h-[100dvh] lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        {/* ---------------------------------------------------------- left */}
        <section className="flex flex-col justify-between gap-10 bg-ink px-6 py-8 text-white sm:px-10 lg:px-14 lg:py-12">
          <header>
            <p className="text-sm text-white/60">Sardar Patel Institute of Technology</p>
            <p className="mt-1 text-lg font-semibold">Placement Desk</p>
          </header>

          <ul className="grid grid-cols-2 gap-x-6 gap-y-1 lg:grid-cols-1" aria-hidden="true">
            {companies.map((company) => {
              const roles = litCompanies?.get(company.company_id);
              const lit = !litCompanies || roles !== undefined;
              return (
                <li key={company.company_id} className="flex items-baseline justify-between gap-3">
                  <span
                    className={cn(
                      'text-[1.375rem] font-medium leading-[1.25] tracking-tight transition-colors duration-300 sm:text-[1.75rem] lg:text-[clamp(1.75rem,3.1vw,2.75rem)]',
                      lit ? (litCompanies ? 'text-white' : 'text-white/60') : 'text-white/[0.16]',
                    )}
                  >
                    {company.company_name}
                  </span>
                  <span
                    className={cn(
                      'figure hidden shrink-0 text-xs text-white/70 transition-opacity duration-300 lg:inline',
                      litCompanies && roles !== undefined ? 'opacity-100' : 'opacity-0',
                    )}
                  >
                    {roles} {roles === 1 ? 'role' : 'roles'}
                  </span>
                </li>
              );
            })}
          </ul>

          <p aria-live="polite" className="min-h-[3.25rem] max-w-[44ch] text-[15px] leading-6 text-white/70">
            {caption}
          </p>
        </section>

        {/* --------------------------------------------------------- right */}
        <section className="flex items-center px-6 py-10 sm:px-10 lg:px-14">
          <div className="mx-auto w-full max-w-xl">
            {error && !data ? (
              <ErrorNote error={error} />
            ) : phase !== 'choose' ? (
              <div className="step-in">
                <p className="text-[13px] text-ink-2">Opening</p>
                <h1 className="mt-1 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">{picked?.name}</h1>
                <p className="mt-2 text-[15px] text-ink-2">{picked?.subtitle}</p>
                <div className="mt-8 h-[3px] w-full overflow-hidden rounded-full bg-rule">
                  <div className="h-full origin-left animate-grow-x bg-accent" />
                </div>
              </div>
            ) : !data ? (
              <div role="status" aria-label="Loading" className="space-y-4">
                <div className="h-10 w-3/4 animate-pulse rounded-md bg-ink/[0.07]" />
                <div className="h-48 animate-pulse rounded-md bg-ink/[0.07]" />
              </div>
            ) : step === 'role' ? (
              <div key="role" className="step-in">
                <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">Who is using the desk?</h1>
                <p className="mt-2 text-[15px] text-ink-2">Choose a role. You will open your own page, not everyone's.</p>
                <ul className="mt-8 border-t border-rule">
                  {roleRows.map((row) => (
                    <li key={row.id}>
                      <button
                        type="button"
                        className={cn(rowBase, 'py-5')}
                        onClick={() => chooseRole(row.id)}
                        onMouseEnter={() => setHover({ kind: 'role', id: row.id })}
                        onMouseLeave={() => setHover(null)}
                        onFocus={() => setHover({ kind: 'role', id: row.id })}
                        onBlur={() => setHover(null)}
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block text-2xl font-medium tracking-tight text-ink transition-colors duration-150 group-hover:text-accent sm:text-[1.75rem]">
                            {row.name}
                          </span>
                          <span className="mt-1 block text-[13px] leading-5 text-ink-2">{row.note}</span>
                        </span>
                        <span className="figure hidden shrink-0 text-xs text-ink-2 sm:block">{row.figure}</span>
                        <ChevronRight
                          className="h-5 w-5 shrink-0 text-ink-3 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-accent"
                          strokeWidth={1.75}
                          aria-hidden="true"
                        />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div key={role} className="step-in">
                <button
                  type="button"
                  onClick={goBack}
                  className="inline-flex items-center gap-1.5 rounded text-[13px] text-ink-2 transition-colors hover:text-ink"
                >
                  <ArrowLeft className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                  Change role
                </button>
                <h1 className="mt-4 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
                  {role === 'student' ? 'Which student are you?' : 'Which company are you recruiting for?'}
                </h1>

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <div className="relative min-w-[12rem] flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" strokeWidth={1.75} aria-hidden="true" />
                    <input
                      ref={searchRef}
                      type="search"
                      name="gate-search"
                      className="field py-2 pl-9"
                      placeholder={role === 'student' ? 'Search your name…' : 'Search a company…'}
                      aria-label={role === 'student' ? 'Search students' : 'Search companies'}
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key !== 'Enter') return;
                        if (role === 'student' && visibleStudents[0]) {
                          const s = visibleStudents[0];
                          enter({ role: 'student', id: s.student_id, name: s.name, subtitle: `${s.branch_id}, CGPA ${s.cgpa.toFixed(2)}` });
                        }
                        if (role === 'recruiter' && visibleCompanies[0]) {
                          const c = visibleCompanies[0];
                          enter({ role: 'recruiter', id: c.company_id, name: c.company_name, subtitle: 'Recruiter workspace' });
                        }
                      }}
                      autoComplete="off"
                      spellCheck={false}
                    />
                  </div>
                  {role === 'student' && (
                    <Segmented
                      label="Branch"
                      value={branch}
                      onChange={setBranch}
                      options={[
                        { value: 'all', label: 'All' },
                        { value: 'CSE', label: 'CSE' },
                        { value: 'CE', label: 'CE' },
                        { value: 'EXTC', label: 'EXTC' },
                      ]}
                    />
                  )}
                </div>

                <ul
                  className="scroll-thin mt-4 max-h-[52dvh] overflow-y-auto border-t border-rule"
                  aria-label={role === 'student' ? 'Students' : 'Companies'}
                >
                  {role === 'student' &&
                    visibleStudents.map((s) => (
                      <li key={s.student_id}>
                        <button
                          type="button"
                          className={rowBase}
                          onClick={() => enter({ role: 'student', id: s.student_id, name: s.name, subtitle: `${s.branch_id}, CGPA ${s.cgpa.toFixed(2)}` })}
                          onMouseEnter={() => setHover({ kind: 'student', id: s.student_id })}
                          onMouseLeave={() => setHover(null)}
                          onFocus={() => setHover({ kind: 'student', id: s.student_id })}
                          onBlur={() => setHover(null)}
                        >
                          <Avatar name={s.name} size="sm" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-ink">{s.name}</span>
                            <span className="block text-xs text-ink-2">
                              {s.branch_id}, CGPA <span className="figure">{s.cgpa.toFixed(2)}</span>
                            </span>
                          </span>
                          {s.is_verified === 0 && <Tag tone="warn">Verification pending</Tag>}
                          <ChevronRight className="h-4 w-4 shrink-0 text-ink-3 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-accent" strokeWidth={1.75} aria-hidden="true" />
                        </button>
                      </li>
                    ))}
                  {role === 'recruiter' &&
                    visibleCompanies.map((c) => (
                      <li key={c.company_id}>
                        <button
                          type="button"
                          className={rowBase}
                          onClick={() => enter({ role: 'recruiter', id: c.company_id, name: c.company_name, subtitle: 'Recruiter workspace' })}
                          onMouseEnter={() => setHover({ kind: 'company', id: c.company_id })}
                          onMouseLeave={() => setHover(null)}
                          onFocus={() => setHover({ kind: 'company', id: c.company_id })}
                          onBlur={() => setHover(null)}
                        >
                          <CompanyMark name={c.company_name} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-ink">{c.company_name}</span>
                            <span className="block text-xs text-ink-2">
                              {c.open_roles} open {c.open_roles === 1 ? 'role' : 'roles'}, {c.applicants} applications
                            </span>
                          </span>
                          <ChevronRight className="h-4 w-4 shrink-0 text-ink-3 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-accent" strokeWidth={1.75} aria-hidden="true" />
                        </button>
                      </li>
                    ))}
                  {((role === 'student' && visibleStudents.length === 0) || (role === 'recruiter' && visibleCompanies.length === 0)) && (
                    <li className="px-3 py-8 text-[13px] text-ink-2">No match. Check the spelling, or clear the branch filter.</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
