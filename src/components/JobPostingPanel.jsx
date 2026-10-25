import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Plus, X } from 'lucide-react';
import { api } from '../api.js';
import { useData, useQuery } from '../store/DataContext.jsx';
import { Avatar, Button, Field, IconButton, PillMultiSelect, Segmented, Sheet, cn } from './ui.jsx';
import { formatLpa } from '../lib/format.js';

const ROUND_PRESETS = ['Aptitude', 'Coding Test', 'Group Discussion', 'Case Interview', 'Technical Interview', 'HR'];

const BLOCKER_LABELS = {
  branch: 'Branch not on the list',
  cgpa: 'CGPA below the minimum',
  kt: 'Too many KTs',
  skills: 'Missing a required skill',
};

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const inDays = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

function SliderField({ id, label, value, min, max, step, display, onChange, error }) {
  return (
    <Field label={label} htmlFor={id} error={error} action={<span className="figure text-sm font-medium text-accent">{display}</span>}>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
      <div className="figure flex justify-between text-xs text-ink-3" aria-hidden="true">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </Field>
  );
}

function FormSection({ title, description, children }) {
  return (
    <section className="grid gap-5 border-t border-rule px-5 py-7 first:border-t-0 md:grid-cols-[190px_minmax(0,1fr)] md:gap-8">
      <div>
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
        <p className="mt-1 text-[13px] leading-5 text-ink-2">{description}</p>
      </div>
      <div className="min-w-0 space-y-6">{children}</div>
    </section>
  );
}

export default function JobPostingPanel({ company, onPosted }) {
  const { act } = useData();
  const meta = useQuery('/api/meta');

  const [form, setForm] = useState({
    title: '',
    package_lpa: 12,
    min_cgpa: 7.0,
    max_kt: 1,
    deadline: inDays(21),
    branches: ['CSE', 'CE'],
    skills: ['SQL'],
    rounds: ['Aptitude', 'Technical Interview', 'HR'],
  });
  const [errors, setErrors] = useState({});
  const [pool, setPool] = useState(null);

  const set = (key) => (value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  // The live count comes from SQL, a moment after the recruiter stops moving a control.
  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      api
        .post('/api/preview-pool', { min_cgpa: form.min_cgpa, max_kt: form.max_kt, branches: form.branches, skills: form.skills })
        .then((result) => !cancelled && setPool(result))
        .catch(() => {});
    }, 160);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [form.min_cgpa, form.max_kt, form.branches, form.skills]);

  const branchIds = meta.data?.branches.map((b) => b.branch_id) ?? [];
  const availablePresets = ROUND_PRESETS.filter((r) => !form.rounds.includes(r));

  const moveRound = (index, delta) => {
    const next = [...form.rounds];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    set('rounds')(next);
  };

  const submit = async (event) => {
    event.preventDefault();
    const nextErrors = {};
    if (form.title.trim().length < 3) nextErrors.title = 'Enter a role title of at least 3 characters.';
    if (!form.deadline || form.deadline < todayISO()) nextErrors.deadline = 'Pick a deadline from today onwards.';
    if (form.branches.length === 0) nextErrors.branches = 'Choose at least one branch.';
    if (form.skills.length === 0) nextErrors.skills = 'Choose at least one required skill.';
    if (form.rounds.length === 0) nextErrors.rounds = 'Add at least one selection round.';

    setErrors(nextErrors);
    const firstKey = Object.keys(nextErrors)[0];
    if (firstKey) {
      document.getElementById(`job-${firstKey}`)?.focus();
      return;
    }

    const ok = await act(
      () => api.post('/api/jobs', { company_id: company.company_id, ...form }),
      `Published ${form.title.trim()}. ${pool?.eligible.length ?? 0} verified students can apply today.`,
    );
    if (ok) onPosted();
  };

  return (
    <form onSubmit={submit} noValidate className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <Sheet>
        <FormSection title="Role" description="What students see first in their openings list.">
          <Field label="Role title" htmlFor="job-title" error={errors.title}>
            <input
              id="job-title"
              name="title"
              className="field"
              value={form.title}
              onChange={(e) => set('title')(e.target.value)}
              aria-invalid={errors.title ? 'true' : undefined}
              aria-describedby={errors.title ? 'job-title-error' : undefined}
              placeholder="Platform Engineer, Ledger Services"
              autoComplete="off"
            />
          </Field>
          <div className="grid gap-6 sm:grid-cols-2">
            <SliderField
              id="job-package_lpa"
              label="Package"
              value={form.package_lpa}
              min={4}
              max={60}
              step={0.5}
              display={formatLpa(form.package_lpa)}
              onChange={set('package_lpa')}
            />
            <Field label="Application deadline" htmlFor="job-deadline" error={errors.deadline}>
              <input
                id="job-deadline"
                name="deadline"
                type="date"
                className="field"
                min={todayISO()}
                value={form.deadline}
                onChange={(e) => set('deadline')(e.target.value)}
                aria-invalid={errors.deadline ? 'true' : undefined}
                aria-describedby={errors.deadline ? 'job-deadline-error' : undefined}
              />
            </Field>
          </div>
        </FormSection>

        <FormSection
          title="Eligibility"
          description="Checked by the database for every student. Anyone outside these limits sees exactly what they miss."
        >
          <div className="grid gap-6 sm:grid-cols-2">
            <SliderField
              id="job-min_cgpa"
              label="Minimum CGPA"
              value={form.min_cgpa}
              min={5}
              max={9.5}
              step={0.1}
              display={form.min_cgpa.toFixed(1)}
              onChange={set('min_cgpa')}
            />
            <Field label="Maximum KTs allowed">
              <Segmented
                label="Maximum KTs allowed"
                stretch
                value={form.max_kt}
                onChange={set('max_kt')}
                options={[0, 1, 2, 3].map((n) => ({ value: n, label: String(n) }))}
              />
            </Field>
          </div>

          <Field
            label="Branches"
            error={errors.branches}
            action={
              <button
                type="button"
                className="rounded text-[13px] font-medium text-accent transition-colors hover:text-accent-strong"
                onClick={() => set('branches')(form.branches.length === branchIds.length ? [] : branchIds)}
              >
                {form.branches.length === branchIds.length ? 'Clear all' : 'Select all'}
              </button>
            }
          >
            <PillMultiSelect id="job-branches" label="Branches" options={branchIds} value={form.branches} onChange={set('branches')} error={errors.branches} />
          </Field>

          <Field label="Required skills" error={errors.skills} hint="Students must hold every skill listed. Keep it to what the role truly needs.">
            <PillMultiSelect
              id="job-skills"
              label="Required skills"
              options={meta.data?.skills ?? []}
              value={form.skills}
              onChange={set('skills')}
              allowCustom
              customLabel="Add a skill not listed"
              error={errors.skills}
            />
          </Field>
        </FormSection>

        <FormSection title="Selection rounds" description="Run in this order. You log a result for each candidate after every round.">
          <Field label="Rounds" error={errors.rounds}>
            <ol id="job-rounds" tabIndex={-1} className="divide-y divide-rule rounded-md border border-rule bg-white">
              {form.rounds.map((round, index) => (
                <li key={round} className="flex items-center gap-3 py-1.5 pl-3 pr-1.5">
                  <span className="figure w-5 text-[13px] text-ink-3">{index + 1}</span>
                  <span className="min-w-0 flex-1 truncate text-sm text-ink">{round}</span>
                  <IconButton label={`Move ${round} up`} icon={ArrowUp} size="sm" disabled={index === 0} onClick={() => moveRound(index, -1)} />
                  <IconButton
                    label={`Move ${round} down`}
                    icon={ArrowDown}
                    size="sm"
                    disabled={index === form.rounds.length - 1}
                    onClick={() => moveRound(index, 1)}
                  />
                  <IconButton label={`Remove ${round}`} icon={X} size="sm" onClick={() => set('rounds')(form.rounds.filter((r) => r !== round))} />
                </li>
              ))}
              {form.rounds.length === 0 && <li className="px-3 py-3 text-[13px] text-ink-2">No rounds yet. Add one below.</li>}
            </ol>
          </Field>
          {availablePresets.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {availablePresets.map((round) => (
                <Button key={round} size="sm" icon={Plus} onClick={() => set('rounds')([...form.rounds, round])}>
                  {round}
                </Button>
              ))}
            </div>
          )}
        </FormSection>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rule px-5 py-4">
          <p className="text-[13px] text-ink-2">
            Publishing as <span className="font-medium text-ink">{company.company_name}</span>
          </p>
          <Button type="submit" variant="primary" size="lg">
            Publish opening
          </Button>
        </div>
      </Sheet>

      <aside className="xl:sticky xl:top-20" aria-live="polite">
        <Sheet className="p-5">
          <h2 className="text-sm font-semibold text-ink">Who can apply today</h2>
          {!pool ? (
            <p className="mt-3 text-[13px] text-ink-2">Counting…</p>
          ) : (
            <>
              <p className="mt-3 flex items-baseline gap-2">
                <span className={cn('figure text-5xl font-medium', pool.eligible.length ? 'text-accent' : 'text-ink-3')}>
                  {pool.eligible.length}
                </span>
                <span className="text-[13px] text-ink-2">of {pool.verified_count} verified students</span>
              </p>

              <dl className="mt-5 divide-y divide-rule border-y border-rule">
                {Object.entries(BLOCKER_LABELS).map(([key, text]) => (
                  <div key={key} className="flex items-center justify-between gap-3 py-2 text-[13px]">
                    <dt className="text-ink-2">{text}</dt>
                    <dd className={cn('figure', pool.blocked_by[key] > 0 ? 'text-ink' : 'text-ink-3')}>{pool.blocked_by[key]}</dd>
                  </div>
                ))}
              </dl>

              <h3 className="mt-5 text-[13px] font-medium text-ink">Strongest matches</h3>
              {pool.eligible.length === 0 ? (
                <p className="mt-2 text-[13px] leading-5 text-ink-2">Nobody clears every rule yet. Lower the CGPA, add branches or trim the skills.</p>
              ) : (
                <ul className="mt-2.5 space-y-2">
                  {pool.eligible.slice(0, 5).map((student) => (
                    <li key={student.student_id} className="flex items-center gap-2.5">
                      <Avatar name={student.name} size="sm" />
                      <span className="min-w-0 flex-1 truncate text-[13px] text-ink">{student.name}</span>
                      <span className="figure text-xs text-ink-2">{student.cgpa.toFixed(2)}</span>
                    </li>
                  ))}
                </ul>
              )}
              {pool.eligible.length > 5 && <p className="mt-2 text-xs text-ink-2">and {pool.eligible.length - 5} more</p>}

              {pool.unverified_count > 0 && (
                <p className="mt-5 border-t border-rule pt-4 text-xs leading-5 text-ink-2">
                  {pool.unverified_count} students are still waiting on verification and are not counted.
                </p>
              )}
            </>
          )}
        </Sheet>
      </aside>
    </form>
  );
}
