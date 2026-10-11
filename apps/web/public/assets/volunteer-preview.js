'use strict';
(() => {
  // Private-site preparation tools. No forms or volunteer identifiers are sent
  // anywhere. The separate real account API remains gated on verified email.
  const root = document.getElementById('preview-workspace');
  if (!root) return;
  const $ = selector => document.querySelector(selector);
  const profiles = {
    '02': ['Personal Network Organizer',
      'Have respectful, permission-based conversations with people you know.',
      'Ordinary personal conversations only; do not create contact lists on behalf of the campaign.',
      ['Read a campaign issue page and verify the claims you intend to discuss.',
       'Choose one point you can explain accurately in your own words.',
       'Practice asking one question and listening to the answer.']],
    '03': ['Digital Ambassador',
      'Share accurate public information in your own voice.',
      'No automated posting, misleading impersonation, spam or scraped contact lists.',
      ['Choose an existing public campaign issue page.',
       'Draft a short, attributed explanation using the correct public link.',
       'Review the text for accuracy, tone and consent before any personal sharing.']],
    '04': ['Issue Ambassador',
      'Learn one proposal and be ready to explain its workings and safeguards.',
      'Do not represent unpublished proposals as law or guarantee results.',
      ['Read one complete published issue page.',
       'Summarize the problem, solution and stated safeguards separately.',
       'Practice responding respectfully to a difficult question.']],
    '05': ['Canvassing & Tabling',
      'Prepare for respectful, organized in-person campaign contact.',
      'PREPARATION ONLY. Organized canvassing and tabling require current permissions, training and approved tools.',
      ['Read the campaign principles and current public issue pages.',
       'Sketch an accessible, respectful table layout without collecting contact details.',
       'Wait for an approved jurisdiction-specific activity module before outreach.']],
    '06': ['Phone & Text',
      'Understand the legal requirements for campaign contact.',
      'PREPARATION ONLY. Calls or texts require approved tools, consent and opt-out handling. No autodialing.',
      ['Study the difference between personal communication and organized outreach.',
       'Draft a respectful, optional conversation opening.',
       'Wait for authorized scripts, tools and applicable training.']],
    '07': ['Event Host',
      'Plan a thoughtful conversation that respects everyone present.',
      'Organized events may need a venue agreement, accessibility planning and campaign authorization.',
      ['Define a small discussion topic using a published issue.',
       'Consider accessibility, clear rules and a voluntary speaking format.',
       'List questions to resolve before inviting or registering guests.']],
    '08': ['Recruiter & Onboarder',
      'Make it easy for someone to learn about the campaign without pressure.',
      'Do not collect personal details in unapproved lists or promise credentials/roles.',
      ['Write an accurate two-sentence introduction to volunteer opportunities.',
       'Identify the public volunteer page you can share.',
       'Practice asking for consent before any follow-up.']],
    '09': ['Local Team Captain',
      'Learn to organize a group around one clearly defined lawful action.',
      'Team authorization, access to others’ data and organized fieldwork are not activated.',
      ['Draft a one-hour agenda for learning about a published issue.',
       'Identify accessibility and consent questions for a future meeting.',
       'Plan how to request approval before organizing a campaign activity.']],
    '10': ['Ballot Access',
      'Learn how petition rules differ by jurisdiction.',
      'PREPARATION ONLY. Do not circulate petitions until current jurisdiction-specific training and authorization are active.',
      ['Find the official election authority for the relevant jurisdiction.',
       'List the questions about petition forms, timing and volunteer eligibility.',
       'Wait for written authorization and current, verified instructions.']],
    '11': ['Registration & GOTV',
      'Prepare to help people find accurate official election information.',
      'PREPARATION ONLY. Do not collect voter data or launch organized registration/GOTV without approved tools and training.',
      ['Identify the appropriate official election website.',
       'Review the importance of accurate location-specific voting instructions.',
       'List the permissions, privacy controls and training a campaign program would require.']],
    '12': ['Small-Dollar Fundraising',
      'Understand the basics of lawful volunteer fundraising.',
      'PREPARATION ONLY. Online donations and official fundraising workflows are disabled until the proper systems are approved.',
      ['Read the posted contribution eligibility disclosures.',
       'Draft a voluntary, non-coercive invitation without asking for payment details.',
       'Wait for the campaign-approved donation processor and treasury review.']],
    '13': ['Skills & Operations',
      'Use writing, research, accessibility, design or technical skills to help.',
      'Do not process confidential files, access private systems or incur costs without authorization.',
      ['Choose one practical skill you would like to contribute.',
       'Draft an accessible outline or example using only public information.',
       'Describe what review and permissions would be needed before sharing it.']]
  };
  const storageKey = 'g28-volunteer-private-preview-v1';
  const taskKeys = ['issues', 'role', 'practice', 'rules'];
  const checkboxes = Array.from(root.querySelectorAll('[data-preview-task]'));
  let saved = {};
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey) || '{}');
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) saved = parsed;
  } catch {
    // Private browsing or blocked storage must not stop the workspace working.
  }
  let selected = Object.hasOwn(profiles, saved.role) ? saved.role : '02';
  const completed = {};
  for (const key of taskKeys) completed[key] = saved.completed?.[key] === true;

  function persist() {
    try {
      localStorage.setItem(storageKey, JSON.stringify({role: selected, completed}));
    } catch {
      // Fully interactive in-memory fallback if storage is unavailable.
    }
  }
  const heading = $('#preview-role-name');
  const description = $('#preview-role-description');
  const caution = $('#preview-role-state');
  const steps = $('#preview-role-steps');
  const select = $('#preview-role-select');
  const progress = $('#preview-progress');

  function selectRole(id, focus = false) {
    if (!Object.hasOwn(profiles, id)) return;
    selected = id;
    const [name, summary, rule, actions] = profiles[id];
    select.value = id;
    heading.textContent = name;
    description.textContent = summary;
    caution.textContent = rule;
    steps.replaceChildren(...actions.map(action => {
      const li = document.createElement('li');
      li.textContent = action;
      return li;
    }));
    persist();
    if (focus) requestAnimationFrame(() => heading.focus({preventScroll:true}));
  }

  function refreshProgress() {
    const count = checkboxes.filter(box => box.checked).length;
    progress.textContent = count + ' of ' + taskKeys.length + ' steps marked complete.';
    persist();
  }
  checkboxes.forEach(box => {
    box.checked = Boolean(completed[box.dataset.previewTask]);
    box.addEventListener('change', () => {
      completed[box.dataset.previewTask] = box.checked;
      refreshProgress();
    });
  });
  select.addEventListener('change', () => selectRole(select.value));

  // Clicking any of the twelve cards opens the corresponding usable workflow.
  root.ownerDocument.querySelectorAll('[data-role-id]').forEach(link => {
    link.addEventListener('click', () => {
      let id = link.dataset.roleId;
      if (link.id === 'role-open') {
        const pref = $('#role-pref')?.value;
        id = {'network':'02','digital':'03','issue':'04','host':'07',
          'skills':'13','ballot':$('#role-training')?.value === 'no' ? '02' : '10'}[pref] || '02';
      }
      selectRole(id, true);
    });
  });
  $('#preview-reset')?.addEventListener('click', () => {
    for (const box of checkboxes) {
      box.checked = false;
      completed[box.dataset.previewTask] = false;
    }
    refreshProgress();
  });
  $('#preview-download')?.addEventListener('click', () => {
    const [name, summary, rule, actions] = profiles[selected];
    const note = $('#preview-plan-text').value.slice(0, 3000);
    const content = [
      '# My Galinsky 2028 volunteer preparation plan',
      '',
      'Private practice document. This is not an official activity authorization.',
      '',
      '## Role: ' + name,
      summary,
      '',
      '## Important limits',
      rule,
      '',
      '## Preparation steps',
      ...actions.map((action, i) => (i + 1) + '. ' + action),
      '',
      '## My personal practice note',
      note || '(No note entered)',
      '',
      '## Checklist (self-reported only)',
      ...checkboxes.map(box => (box.checked ? '[x] ' : '[ ] ') + box.parentElement.textContent.trim()),
      ''
    ].join('\n');
    const url = URL.createObjectURL(new Blob([content], {type:'text/markdown;charset=utf-8'}));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'galinsky-volunteer-practice-plan.md';
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    $('#preview-download-status').textContent = 'Plan downloaded to your device. No information was submitted to the campaign.';
  });
  selectRole(selected);
  refreshProgress();
})();
