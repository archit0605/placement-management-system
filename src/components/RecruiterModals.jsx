import { useState } from 'react';
import { AlertTriangle, Handshake } from 'lucide-react';
import { useQuery } from '../store/DataContext.jsx';
import { Button, Field, Modal, Segmented, Skeleton, Tag, cn } from './ui.jsx';
import { formatDateLong, formatLpa, roundInfo } from '../lib/format.js';

const OUTCOME_TONE = { Passed: 'ok', Failed: 'bad', Pending: 'neutral' };

/* ------------------------------------------------------------- log result */

export function LogRoundModal({ row, jobTitle, onClose, onSubmit }) {
  const round = roundInfo(row).currentRound;
  const [score, setScore] = useState('');
  const [outcome, setOutcome] = useState('Passed');
  const [remark, setRemark] = useState('');
  const [errors, setErrors] = useState({});

  if (!round) return null;
  const isLast = round.round_order === row.rounds[row.rounds.length - 1].round_order;

  const submit = (event) => {
    event.preventDefault();
    const numeric = Number(score);
    const nextErrors = {};
    if (score === '' || !Number.isInteger(numeric) || numeric < 0 || numeric > 100) nextErrors.score = 'Enter a whole score between 0 and 100.';
    if (outcome === 'Failed' && remark.trim().length < 5) nextErrors.remark = 'Add a short reason so the student gets useful feedback.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      document.getElementById(nextErrors.score ? 'log-score' : 'log-remark')?.focus();
      return;
    }
    onSubmit({ round_order: round.round_order, score: numeric, outcome, remark: remark.trim() });
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`Log ${round.round_name} result`}
      description={`${row.name}, ${jobTitle}. The student sees the result as soon as you save.`}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" form="log-round-form" variant="primary">
            Save result
          </Button>
        </>
      }
    >
      <form id="log-round-form" onSubmit={submit} noValidate className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-[140px_minmax(0,1fr)]">
          <Field label="Score out of 100" htmlFor="log-score" error={errors.score}>
            <input
              id="log-score"
              name="score"
              data-autofocus
              className="field figure"
              type="number"
              inputMode="numeric"
              min={0}
              max={100}
              value={score}
              onChange={(e) => setScore(e.target.value)}
              aria-invalid={errors.score ? 'true' : undefined}
              aria-describedby={errors.score ? 'log-score-error' : undefined}
            />
          </Field>
          <Field
            label="Outcome"
            hint={
              outcome === 'Passed'
                ? isLast
                  ? 'Last round. The candidate becomes ready for an offer.'
                  : 'A trigger moves the candidate to the next round.'
                : 'A trigger ends the application here and the student is told why.'
            }
          >
            <Segmented
              label="Outcome"
              value={outcome}
              onChange={setOutcome}
              options={[
                { value: 'Passed', label: 'Passed' },
                { value: 'Failed', label: 'Failed' },
              ]}
            />
          </Field>
        </div>

        <Field label="Remark" htmlFor="log-remark" error={errors.remark} hint="Shown to the student under their timeline.">
          <textarea
            id="log-remark"
            name="remark"
            className="field min-h-24 resize-y"
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            aria-invalid={errors.remark ? 'true' : undefined}
            aria-describedby={errors.remark ? 'log-remark-error' : 'log-remark-hint'}
            placeholder="Clear on trade-offs, needs practice with concurrency."
          />
        </Field>
      </form>
    </Modal>
  );
}

/* ------------------------------------------------------------------ offer */

export function OfferModal({ row, job, onClose, onConfirm }) {
  const [packageLpa, setPackageLpa] = useState(job.package_lpa);
  const [error, setError] = useState('');
  const siblings = useQuery(`/api/applications/${row.application_id}/siblings`);
  const otherOpen = siblings.data || [];

  const confirm = (event) => {
    event.preventDefault();
    if (!(Number(packageLpa) > 0)) {
      setError('Enter the package you are offering in LPA.');
      return;
    }
    onConfirm(Number(packageLpa));
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Issue binding offer"
      description={`${row.name}, ${job.title} at ${job.company_name}`}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" form="offer-form" variant="primary" icon={Handshake}>
            Issue offer
          </Button>
        </>
      }
    >
      <form id="offer-form" onSubmit={confirm} noValidate className="space-y-5">
        <Field label="Package in LPA" htmlFor="offer-package" error={error}>
          <input
            id="offer-package"
            name="package"
            data-autofocus
            className="field figure w-40"
            type="number"
            inputMode="decimal"
            step="0.5"
            min="0"
            value={packageLpa}
            onChange={(e) => {
              setPackageLpa(e.target.value);
              setError('');
            }}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={error ? 'offer-package-error' : undefined}
          />
        </Field>

        <div className="rounded-md bg-warn-soft p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warn" strokeWidth={2} aria-hidden="true" />
            <div className="text-[13px] leading-5 text-ink">
              <p className="font-medium">One transaction. It either all happens or none of it does.</p>
              <ul className="mt-1.5 list-disc space-y-1 pl-4 text-ink-2">
                <li>The offer row is inserted.</li>
                <li>A trigger marks this application as Offered.</li>
                {siblings.loading && !siblings.data ? (
                  <li>
                    <Skeleton className="inline-block h-3 w-40 align-middle" />
                  </li>
                ) : otherOpen.length > 0 ? (
                  <li>
                    The same trigger closes {otherOpen.length} other open {otherOpen.length === 1 ? 'application' : 'applications'}:{' '}
                    {otherOpen.map((v) => v.company_name).join(', ')}.
                  </li>
                ) : (
                  <li>No other open applications are affected.</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
}

/* ---------------------------------------------------------------- history */

export function HistoryModal({ row, jobTitle, onClose }) {
  const history = useQuery(`/api/applications/${row.application_id}/history`);
  const { rounds = [], offer = null } = history.data || {};

  return (
    <Modal
      open
      onClose={onClose}
      title="Round history"
      description={`${row.name}, ${jobTitle}`}
      footer={<Button onClick={onClose}>Close</Button>}
    >
      {!history.data ? (
        <Skeleton className="h-32 w-full" />
      ) : (
        <ol className="divide-y divide-rule">
          {rounds.map((round) => (
            <li key={round.round_order} className="py-3 first:pt-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-ink">
                  <span className="figure mr-2 text-xs text-ink-3">{round.round_order}</span>
                  {round.round_name}
                </p>
                <div className="flex items-center gap-2">
                  {round.score !== null && <span className="figure text-sm text-ink">{round.score}/100</span>}
                  <Tag tone={OUTCOME_TONE[round.outcome]}>{round.outcome}</Tag>
                </div>
              </div>
              <p className={cn('mt-1 text-[13px] leading-5', round.remark ? 'text-ink-2' : 'text-ink-3')}>
                {round.remark || (round.outcome === 'Pending' ? 'No result logged yet.' : 'No remark added.')}
              </p>
            </li>
          ))}
          {offer && (
            <li className="flex flex-wrap items-baseline justify-between gap-2 py-3">
              <p className="text-sm font-medium text-ok">
                Offer {offer.status.toLowerCase()} on {formatDateLong(offer.issued_on)}
              </p>
              <span className="figure text-sm text-ok">{formatLpa(offer.package_lpa)}</span>
            </li>
          )}
        </ol>
      )}
    </Modal>
  );
}
