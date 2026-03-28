const form = document.getElementById('coach-form');
const output = document.getElementById('coach-output');
const quickPrompts = document.getElementById('quick-prompts');

const openChatBtn = document.getElementById('open-chat');
const chatPanel = document.getElementById('coach-chat-panel');
const chatLog = document.getElementById('chat-log');
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');


const rankOrder = [
  'Bronze',
  'Silver',
  'Gold',
  'Platinum',
  'Diamond',
  'Champion',
  'Grand Champion',
  'Supersonic Legend'
];

const weaknessLibrary = {
  'Consistency / Basic Touches': [
    '15 mins: free play catches, powerslide turns, and soft first touches every session.',
    '20 mins: shooting pack with target quality > power. Call your shot corner before touching ball.',
    'Rule: no mindless booming. Touch with intention: pass, clear side, or control.'
  ],
  'Car Control / Recoveries': [
    '10 mins rings/dribble map equivalent + half-flip, wavedash, speed-flip reps in free play.',
    'In matches: land on wheels every play. If awkward, abort challenge and recover first.',
    'Post-game tag every goal against that started from a bad recovery.'
  ],
  'Speed / Fast Aerials': [
    'Warm-up: 50 fast aerial repetitions with clean boost pathing.',
    'In replay: pause at each challenge and ask “could I arrive one second earlier?”',
    'Boost discipline rule: stay above 35 when possible via small pads.'
  ],
  'Mechanics / Advanced Plays': [
    'Choose only one advanced mechanic for 2 weeks (air dribble OR flip reset OR double tap).',
    '60/40 split: 60% fundamental touches, 40% advanced reps to protect ranked consistency.',
    'Graduation check: hit mechanic successfully 7/10 in controlled setup before ranked attempts.'
  ],
  'Positioning / Rotations': [
    'Auto-check each goal against: were you first man, second man, or third man?',
    'Third-man commandment: no commit if both teammates are ahead of ball.',
    'Shadow defend earlier; challenge later to force low-percentage touches.'
  ],
  'Decision-Making Under Pressure': [
    'Use 2-second scan rule: ball, nearest opponent, nearest teammate, boost map.',
    'In pressure moments, choose 1 of 3 safe options: clear side, controlled dribble, soft pass back.',
    'Clip every panic touch and re-label the best alternative after session.'
  ],
  'Mental / Tilt / Confidence': [
    'Queue in blocks of 3 games max, then review before next set.',
    'After every loss: one sentence objective mistake, one sentence immediate fix.',
    'If tilted, switch to training for 20 mins before re-queueing ranked.'
  ]
};

const playlistFocus = {
  '1v1 Duel': [
    'Prioritize shadow defense, kickoff consistency, and boost starving routes.',
    'Track conceded goals from overcommits. Goal: fewer than 2 per series.',
    'Drill bounce dribbles and low 50/50s daily.'
  ],
  '2v2 Doubles': [
    'Master second-man spacing and fake challenges to buy teammate time.',
    'Play diagonal support line; avoid mirroring teammate into same lane.',
    'Train quick infield passes and immediate recovery after first challenge.'
  ],
  '3v3 Standard': [
    'Respect role discipline: first pressure, second support, third insurance.',
    'Use back-post defense and avoid double commits above midfield.',
    'Improve off-ball awareness: check both teammates before every push.'
  ]
};

const quickPromptList = [
  'Break down my replay by rotations (good vs bad).',
  'Design a 30-minute warm-up before ranked.',
  'Give me a 2-week plan to fix my kickoffs.',
  'Tell me what to do when I panic on defense.',
  'How do I convert more shots in Diamond lobbies?',
  'Coach my boost pathing like a pro analyst.'
];

function createQuickPrompts() {
  quickPromptList.forEach((promptText) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'prompt-btn';
    btn.textContent = promptText;
    btn.addEventListener('click', () => {
      output.classList.remove('empty');
      output.innerHTML = `<strong>Prompt ready:</strong> ${promptText}<br><br>Paste this into your preferred AI chat, then add your replay timestamps and what rank lobby you're facing for sharper coaching.`;
    });
    quickPrompts.appendChild(btn);
  });
}

function getWeeksToChamp(rank) {
  const idx = rankOrder.indexOf(rank);
  const champIdx = rankOrder.indexOf('Champion');
  if (idx === -1) return 16;
  if (idx >= champIdx) return 6;

  const gap = champIdx - idx;
  return Math.max(8, gap * 4);
}

function buildPlan({ rank, playlist, hours, weakness, replayNotes }) {
  const weeklyHours = Number(hours);
  const weeks = getWeeksToChamp(rank);

  const mechanicShare = Math.max(2, Math.round(weeklyHours * 0.35));
  const reviewShare = Math.max(1, Math.round(weeklyHours * 0.2));
  const rankedShare = Math.max(2, weeklyHours - mechanicShare - reviewShare);

  const weaknessSteps = weaknessLibrary[weakness] ?? weaknessLibrary['Consistency / Basic Touches'];
  const modeSteps = playlistFocus[playlist] ?? playlistFocus['2v2 Doubles'];

  const replayAction = replayNotes.trim().length
    ? `From your notes, start by reviewing: “${replayNotes.slice(0, 180)}${
        replayNotes.length > 180 ? '...' : ''
      }”. Tag each mistake as mechanical, rotational, or decision-based.`
    : 'No replay notes were added. After your next 3 ranked games, clip every conceded goal and annotate your role in the play.';

  return [
    {
      title: '1) Weekly Structure',
      items: [
        `Estimated path to solid Champ-level consistency: about ${weeks} weeks with disciplined sessions.`,
        `${mechanicShare}h mechanics + ${reviewShare}h replay analysis + ${rankedShare}h focused ranked blocks each week.`,
        'Play ranked in 3-game blocks, then do 10-minute review before next block.'
      ]
    },
    {
      title: '2) Priority Fix: Your Weakness',
      items: weaknessSteps
    },
    {
      title: `3) ${playlist} Focus`,
      items: modeSteps
    },
    {
      title: '4) Replay Review SOP (Step-by-Step)',
      items: [
        replayAction,
        'At each conceded goal, pause 5 seconds earlier and ask: What was the first avoidable error?',
        'Write one replacement action for each error and rehearse that action in free play for 5 reps.',
        'End each review with one “non-negotiable” habit for the next queue session.'
      ]
    },
    {
      title: '5) Hard Things Made Simple',
      items: [
        'Air dribbles: first master setup touch and controlled takeoff before adding second touch.',
        'Flip resets: focus on approach angle and first contact quality; do not force reset in ranked until consistent.',
        'Fast decision making: reduce options to 3 defaults (safe clear, controlled touch, immediate challenge) under pressure.'
      ]
    }
  ];
}

function renderPlan(plan) {
  output.classList.remove('empty');
  output.innerHTML = '';

  plan.forEach((section) => {
    const block = document.createElement('section');
    block.className = 'plan-block';

    const title = document.createElement('h3');
    title.textContent = section.title;

    const list = document.createElement('ul');
    section.items.forEach((item) => {
      const li = document.createElement('li');
      li.textContent = item;
      list.appendChild(li);
    });

    block.append(title, list);
    output.appendChild(block);
  });
}


function addChatBubble(role, text) {
  const bubble = document.createElement('div');
  bubble.className = `chat-bubble ${role}`;
  bubble.textContent = text;
  chatLog.appendChild(bubble);
  chatLog.scrollTop = chatLog.scrollHeight;
}

function detectTopic(prompt) {
  const lower = prompt.toLowerCase();
  if (lower.includes('kickoff')) return 'kickoff';
  if (lower.includes('aerial') || lower.includes('air dribble') || lower.includes('flip reset')) return 'aerial';
  if (lower.includes('rotate') || lower.includes('rotation') || lower.includes('double commit')) return 'rotation';
  if (lower.includes('tilt') || lower.includes('mental') || lower.includes('confidence')) return 'mental';
  if (lower.includes('defend') || lower.includes('shadow')) return 'defense';
  if (lower.includes('shoot') || lower.includes('shot')) return 'shooting';
  return 'general';
}

function coachReply(prompt) {
  const topic = detectTopic(prompt);
  const map = {
    kickoff:
      'Kickoff fix: 1) hit center of ball with stable approach, 2) recover instantly with powerslide, 3) grab nearest pad and decide challenge/support in under 1 second. Run 20 reps before queue.',
    aerial:
      'For advanced aerial mechanics: split it into setup touch, takeoff line, and first contact quality. Train each piece for 5 minutes, then combine. In ranked, only attempt when you have boost + last-man safety.',
    rotation:
      'Anti-double-commit rule: if you cannot beat both teammate and opponent to the ball, rotate out immediately. Keep one car-length wider spacing and verbally call your role: first, second, or third.',
    mental:
      'When tilt starts: play one low-risk game plan for the next 3 minutes (safe clears, back-post, no hero plays). After match, write one controllable mistake and one next-match objective.',
    defense:
      'Defense checklist: protect net first, challenge when support exists, and clear to side wall—not middle. Pause replay 3 seconds before each conceded goal and identify the first incorrect position.',
    shooting:
      'To score more: aim before jump, strike through center-to-top half for power, and follow your shot only when teammate cover exists. Do 30 controlled shot reps with called targets.',
    general:
      'Use this live loop: identify one mistake pattern, run a 10-minute drill for it, then test in a 3-game block. Send me the exact situation and I will break it into simple steps.'
  };

  return `${map[topic]}\n\nIf you want, ask with your rank + playlist + one replay timestamp and I will tailor it.`;
}

function seedChat() {
  addChatBubble(
    'coach',
    'Yo! I am your RocketMind live coach. Ask me anything and I will give direct steps to improve fast.'
  );
}

form.addEventListener('submit', (event) => {
  event.preventDefault();

  const payload = {
    rank: document.getElementById('rank').value,
    playlist: document.getElementById('playlist').value,
    hours: document.getElementById('hours').value,
    weakness: document.getElementById('weakness').value,
    replayNotes: document.getElementById('replay-notes').value
  };

  const plan = buildPlan(payload);
  renderPlan(plan);
});


vopenChatBtn.addEventListener('click', () => {
  chatPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  chatInput.focus();
});

chatForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const prompt = chatInput.value.trim();
  if (!prompt) return;

  addChatBubble('user', prompt);

  window.setTimeout(() => {
    addChatBubble('coach', coachReply(prompt));
  }, 200);

  chatInput.value = '';
});

createQuickPrompts();
seedChat();

createQuickPrompts();

