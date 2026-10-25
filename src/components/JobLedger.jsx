import { useId } from 'react';
import { Check, ChevronDown, Lock, X } from 'lucide-react';
import { Button, CompanyMark, SkillChip, Tag, cn } from './ui.jsx';
import { deadlineLabel, formatLpa } from '../lib/format.js';

const CHECK_SHORT = { cgpa: 'CGPA', kt: 'KT', branch: 'Branch', skills: 'Skills' };

/** Four boxes, one per rule, always in the same order so a column can be scanned down the list. */
export function FitBoxes({ checks }) {
  return (
    <span className="inline-flex gap-1" aria-hidden="true">
      {checks.map((check) => (
        <span
          key={check.key}
          title={`${CHECK_SHORT[check.key]}: ${check.passed ? 'met' : 'not met'}`}
          className={cn(
            'flex h-5 w-5 items-center justify-center rounded-[4px] border transition-colors duration-200',
            check.passed ? 'border-ink bg-ink text-white' : 'border-bad/60 bg-bad-soft text-bad',
          )}
        >
          {check.passed ? <Check className="h-3 w-3" strokeWidth={3} /> : <X className="h-3 w-3" strokeWidth={3} />}
        </span>
      ))}
    </span>
  );
}

function comparisonRows(student, opening, evaluation) {
  const byKey = Object.fromEntries(evaluation.checks.map((c) => [c.key, c]));
  return [
    { check: byKey.cgpa, required: `${opening.min_cgpa.toFixed(1)} or higher`, yours: student.cgpa.toFixed(2) },
    { check: byKey.kt, required: `${opening.max_kt} or fewer`, yours: String(student.kt_count) },
    { check: byKey.branch, required: opening.eligible_branches.join(', '), yours: student.branch_id },
    {
      check: byKey.skills,
      required: `${opening.required_skills.length} skills`,
      yours: `${evaluation.matchedCount} of ${opening.required_skills.length}`,
    },
  ];
}

function ActionCell({ student, opening, evaluation, onApply }) {
  if (opening.applied) {
    return (
      <Tag tone="ok" icon={Check}>
        Applied
      </Tag>
    );
  }
  if (opening.days_left < 0) return <span className="text-[13px] text-ink-3">Closed</span>;

  const locked = (text) => (
    <span className="inline-flex items-center gap-1.5 text-[13px] text-ink-2">
      <Lock className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
      {text}
    </span>
  );
  if (!student.is_verified) return locked('Awaiting verification');
  if (!evaluation.eligible) return locked('Locked');

  return (
    <Button variant="primary" size="sm" onClick={() => onApply(opening)}>
      Apply
    </Button>
  );
}

export function JobRow({ student, opening, evaluation, open, onToggle, onApply }) {
  const panelId = useId();
  const rows = comparisonRows(student, opening, evaluation);
  const closed = opening.days_left < 0;

  return (
    <li className={cn('transition-colors duration-200', open && 'bg-white')}>
      <div className="grid grid-cols-1 items-center md:grid-cols-[minmax(0,1fr)_auto] md:gap-x-4">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
          className={cn(
            'group grid min-w-0 grid-cols-1 items-center gap-x-4 gap-y-3 py-4 pl-5 pr-5 text-left md:pr-0',
            'md:grid-cols-[minmax(0,1fr)_92px_112px_120px] focus-visible:ring-inset focus-visible:ring-offset-0',
          )}
        >
          <span className="flex min-w-0 items-start gap-3">
            <CompanyMark name={opening.company_name} />
            <span className="min-w-0">
              <span className="block text-sm font-semibold leading-5 text-ink">{opening.title}</span>
              <span className="block truncate text-[13px] text-ink-2">{opening.company_name}</span>
              <span className={cn('mt-1 block text-[13px] leading-5', evaluation.eligible ? 'text-ok' : 'text-bad')}>
                {evaluation.eligible
                  ? 'Meets all 4 requirements'
                  : `Meets ${evaluation.metCount} of 4. ${evaluation.failed.map((c) => c.gap).join('. ')}`}
              </span>
              <span className="mt-1 block text-xs text-ink-2 md:hidden">
                <span className="figure text-ink">{formatLpa(opening.package_lpa)}</span>, {deadlineLabel(opening.days_left).toLowerCase()}
              </span>
            </span>
          </span>

          <span className="figure hidden text-sm text-ink md:block">{formatLpa(opening.package_lpa)}</span>
          <span
            className={cn('hidden text-[13px] md:block', !closed && opening.days_left <= 3 ? 'font-medium text-warn' : 'text-ink-2')}
          >
            {deadlineLabel(opening.days_left)}
          </span>
          <span className="flex items-center gap-2 pl-11 md:pl-0">
            <FitBoxes checks={evaluation.checks} />
            <span className="sr-only">
              {evaluation.metCount} of 4 requirements met. {open ? 'Hide details' : 'Show details'}
            </span>
            <ChevronDown
              className={cn('h-4 w-4 text-ink-3 transition-transform duration-300 group-hover:text-ink', open && 'rotate-180')}
              strokeWidth={1.75}
              aria-hidden="true"
            />
          </span>
        </button>
        <div className="flex justify-start pb-4 pl-16 pr-5 md:w-[9.5rem] md:justify-end md:pb-0 md:pl-0">
          <ActionCell student={student} opening={opening} evaluation={evaluation} onApply={onApply} />
        </div>
      </div>

      <div id={panelId} className="expand" data-open={open}>
        <div>
          <div className="grid gap-6 px-5 pb-6 pt-1 md:pl-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]">
            <table className="w-full text-left text-[13px]">
              <caption className="sr-only">Requirements for {opening.title} compared with your profile</caption>
              <thead>
                <tr className="border-b border-rule text-xs text-ink-2">
                  <th scope="col" className="py-2 pr-4 font-normal">Requirement</th>
                  <th scope="col" className="py-2 pr-4 font-normal">Asked for</th>
                  <th scope="col" className="py-2 pr-4 font-normal">You have</th>
                  <th scope="col" className="py-2 font-normal">
                    <span className="sr-only">Result</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ check, required, yours }) => (
                  <tr key={check.key} className="border-b border-rule/70 last:border-0">
                    <th scope="row" className="py-2.5 pr-4 font-medium text-ink">
                      {check.label}
                    </th>
                    <td className="py-2.5 pr-4 text-ink-2">{required}</td>
                    <td className={cn('figure py-2.5 pr-4', check.passed ? 'text-ink' : 'font-medium text-bad')}>{yours}</td>
                    <td className="py-2.5 text-right">
                      {check.passed ? (
                        <Tag tone="ok" icon={Check}>Met</Tag>
                      ) : (
                        <Tag tone="bad" icon={X}>Gap</Tag>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="space-y-4">
              <div>
                <p className="text-xs text-ink-2">Required skills</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {opening.required_skills.map((skill) => (
                    <SkillChip key={skill.skill_name} state={skill.has_it ? 'matched' : 'missing'}>
                      {skill.skill_name}
                      {!skill.has_it && <span className="sr-only"> (missing)</span>}
                    </SkillChip>
                  ))}
                </div>
              </div>

              {evaluation.eligible ? (
                <p className="text-[13px] leading-5 text-ink-2">
                  Your profile clears every rule for this role.
                  {!closed && !opening.applied && student.is_verified && ' Applying sends your verified record to the recruiter.'}
                </p>
              ) : (
                <div className="border-l-2 border-bad pl-3">
                  <p className="text-[13px] font-medium leading-5 text-ink">How to close the gap</p>
                  <ul className="mt-1 space-y-1 text-[13px] leading-5 text-ink-2">
                    {evaluation.failed.map((check) => (
                      <li key={check.key}>{check.advice}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}
