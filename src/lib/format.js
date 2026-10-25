/* Presentation helpers only. Every rule and every number comes from SQL. */

export const parseISODate = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const formatDate = (iso) => parseISODate(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

export const formatDateLong = (iso) =>
  parseISODate(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

export const deadlineLabel = (daysLeft) => {
  if (daysLeft < 0) return `Closed ${Math.abs(daysLeft)}d ago`;
  if (daysLeft === 0) return 'Closes today';
  if (daysLeft === 1) return 'Closes tomorrow';
  return `Closes in ${daysLeft} days`;
};

export const formatLpa = (value) => `${Number.isInteger(value) ? value : value.toFixed(1)} LPA`;

export const formatPercent = (ratio, digits = 0) => `${(ratio * 100).toFixed(digits)}%`;

export const firstName = (name) => name.split(' ')[0];

export const STATUS_TONE = {
  'In progress': 'accent',
  'Ready for offer': 'warn',
  'Offer issued': 'ok',
  'Not selected': 'bad',
  Closed: 'neutral',
};

/**
 * Wraps the four 0/1 flags that v_eligibility_summary returns in readable sentences.
 * Nothing here decides eligibility; it only words the database's answer.
 */
export function describeChecks(student, opening) {
  const missingSkills = opening.required_skills.filter((s) => !s.has_it).map((s) => s.skill_name);
  const ktOver = student.kt_count - opening.max_kt;

  const checks = [
    {
      key: 'cgpa',
      label: 'Minimum CGPA',
      passed: opening.cgpa_ok === 1,
      gap: `Missing minimum CGPA (Requires ${opening.min_cgpa.toFixed(1)}, Current: ${student.cgpa.toFixed(2)})`,
      advice: `You need ${(opening.min_cgpa - student.cgpa).toFixed(2)} more CGPA. This gate is fixed for this drive.`,
    },
    {
      key: 'kt',
      label: 'KT (backlogs)',
      passed: opening.kt_ok === 1,
      gap: `Too many KTs (Allows ${opening.max_kt}, Current: ${student.kt_count})`,
      advice: `Clear ${ktOver} KT${ktOver === 1 ? '' : 's'} and ask the placement cell to refresh your profile.`,
    },
    {
      key: 'branch',
      label: 'Branch',
      passed: opening.branch_ok === 1,
      gap: `Branch not eligible (Open to ${opening.eligible_branches.join(', ')})`,
      advice: `This role is limited to ${opening.eligible_branches.join(', ')}.`,
    },
    {
      key: 'skills',
      label: 'Required skills',
      passed: opening.skills_ok === 1,
      gap: `Missing skill: ${missingSkills.join(', ')}`,
      advice: `Add ${missingSkills.join(', ')} to your profile with a certificate to unlock this role.`,
    },
  ];

  return {
    checks,
    failed: checks.filter((c) => !c.passed),
    metCount: opening.rules_met,
    eligible: opening.is_eligible === 1,
    missingSkills,
    matchedCount: opening.required_skills.length - missingSkills.length,
  };
}

/** Helpers over a list of rounds (as returned by the API) used by several screens. */
export const roundInfo = (application) => {
  const rounds = application.rounds;
  return {
    failedRound: rounds.find((r) => r.outcome === 'Failed') || null,
    currentRound: rounds.find((r) => r.round_order === application.current_round_order) || null,
    latestScored: [...rounds].reverse().find((r) => r.score !== null) || null,
  };
};
