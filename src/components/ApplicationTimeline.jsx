import { Award, Check, Clock3, X } from 'lucide-react';
import { CompanyMark, Tag, cn } from './ui.jsx';
import { STATUS_TONE, formatDate, formatLpa, roundInfo } from '../lib/format.js';

const NODE = {
  done: 'border-ink bg-ink text-white',
  offer: 'border-ok bg-ok text-white',
  current: 'border-accent bg-white text-accent ring-4 ring-accent/15',
  failed: 'border-bad bg-bad text-white',
  upcoming: 'border-rule-strong bg-white text-ink-3',
  skipped: 'border-dashed border-rule-strong bg-transparent text-ink-3',
};

const STATE_WORD = {
  done: 'Completed',
  offer: 'Offer issued',
  current: 'In review',
  failed: 'Not cleared',
  upcoming: 'Upcoming',
  skipped: 'Skipped',
};

function buildSteps(application) {
  const { rounds, offer, status_label: status } = application;
  const { failedRound } = roundInfo(application);

  const steps = [{ key: 'applied', label: 'Applied', meta: formatDate(application.applied_on), state: 'done', icon: Check }];

  rounds.forEach((round) => {
    let state = 'upcoming';
    if (round.outcome === 'Passed') state = 'done';
    else if (round.outcome === 'Failed') state = 'failed';
    else if (failedRound && round.round_order > failedRound.round_order) state = 'skipped';
    else if (round.round_order === application.current_round_order && status === 'In progress') state = 'current';

    steps.push({
      key: `round-${round.round_order}`,
      label: round.round_name,
      meta: round.score !== null ? `Scored ${round.score}` : STATE_WORD[state],
      state,
      icon: { failed: X, current: Clock3, done: Check }[state] ?? null,
    });
  });

  steps.push({
    key: 'offer',
    label: 'Offer',
    meta: offer ? formatLpa(offer.package_lpa) : failedRound ? 'Not reached' : 'Pending',
    state: offer ? 'offer' : failedRound ? 'skipped' : 'upcoming',
    icon: offer ? Award : null,
  });

  return steps;
}

function footnoteFor(application) {
  const { status_label: status, offer } = application;
  const { failedRound, currentRound, latestScored } = roundInfo(application);
  if (status === 'Offer issued') return `You hold an offer of ${formatLpa(offer.package_lpa)}. Your other applications are now closed.`;
  if (status === 'Closed') return 'Closed because you already hold an offer from another company.';
  if (status === 'Not selected') return `Not cleared in ${failedRound.round_name}.${failedRound.remark ? ` Feedback: ${failedRound.remark}` : ''}`;
  if (status === 'Ready for offer') return 'Every round cleared. The recruiter is preparing your offer.';
  if (currentRound) return `Next: ${currentRound.round_name}.${latestScored?.remark ? ` Last feedback: ${latestScored.remark}` : ''}`;
  return null;
}

export default function ApplicationTimeline({ application }) {
  const steps = buildSteps(application);
  const footnote = footnoteFor(application);

  return (
    <article className="grid gap-5 px-5 py-5 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-8">
      <header className="flex min-w-0 items-start gap-3">
        <CompanyMark name={application.company_name} />
        <div className="min-w-0">
          <h3 className="text-sm font-semibold leading-5 text-ink">{application.title}</h3>
          <p className="truncate text-[13px] text-ink-2">
            {application.company_name}, applied {formatDate(application.applied_on)}
          </p>
          <Tag tone={STATUS_TONE[application.status_label]} className="mt-2">
            {application.status_label}
          </Tag>
        </div>
      </header>

      <div className="min-w-0">
        <div className="scroll-thin -mx-1 overflow-x-auto px-1 pb-1">
          <ol
            className={cn('flex min-w-[520px]', application.status_label === 'Closed' && 'opacity-55')}
            aria-label={`Progress for ${application.title}`}
          >
            {steps.map((step, index) => {
              const Icon = step.icon;
              const next = steps[index + 1];
              const live = (step.state === 'done' || step.state === 'offer') && next && next.state !== 'skipped' && next.state !== 'upcoming';
              return (
                <li key={step.key} className="relative flex flex-1 flex-col items-start pr-2">
                  {next && (
                    <span
                      aria-hidden="true"
                      className={cn(
                        'absolute left-6 right-0 top-3 h-0.5 -translate-y-1/2 transition-colors duration-500',
                        live ? 'bg-ink' : 'bg-rule',
                      )}
                    />
                  )}
                  <span
                    className={cn(
                      'relative z-10 flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors duration-300',
                      NODE[step.state],
                    )}
                  >
                    {Icon && <Icon className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />}
                  </span>
                  <span className="mt-2 text-[13px] font-medium leading-4 text-ink">{step.label}</span>
                  <span
                    className={cn(
                      'mt-0.5 text-xs',
                      step.state === 'failed' && 'text-bad',
                      step.state === 'current' && 'text-accent',
                      step.state === 'offer' && 'font-medium text-ok',
                      !['failed', 'current', 'offer'].includes(step.state) && 'text-ink-2',
                    )}
                  >
                    <span className="sr-only">{STATE_WORD[step.state]}. </span>
                    {step.meta}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
        {footnote && <p className="mt-4 max-w-[70ch] text-[13px] leading-5 text-ink-2">{footnote}</p>}
      </div>
    </article>
  );
}
