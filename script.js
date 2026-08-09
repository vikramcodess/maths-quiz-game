/* script.js - Maths Concept Quiz Game
   - Modular vanilla JS
   - Uses localStorage for history & admin flag
   - Text-to-speech feedback and simple animations
*/

/* ---------------------------
   Utilities
   --------------------------- */
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));
const nowISO = () => new Date().toISOString();
const speak = (text, voiceRate = 1) => {
  if (!window.speechSynthesis || !appState.ttsEnabled) return;
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = voiceRate;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utter);
};
const shuffle = (arr) => arr.slice().sort(() => Math.random() - 0.5);

/* ---------------------------
   Local storage helpers
   --------------------------- */
const STORAGE_KEYS = {
  history: 'quizHistory',
  playerName: 'playerName',
  isAdmin: 'isAdmin'
};

function loadHistory() {
  const raw = localStorage.getItem(STORAGE_KEYS.history);
  try { return raw ? JSON.parse(raw) : []; } catch { return []; }
}
function saveHistory(entries) {
  localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(entries));
}

/* ---------------------------
   App State
   --------------------------- */
const appState = {
  playerName: '',
  isAdmin: localStorage.getItem(STORAGE_KEYS.isAdmin) === 'true',
  category: null,
  difficulty: null,
  questions: [],
  currentIndex: 0,
  score: 0,
  correct: 0,
  wrong: 0,
  skipped: 0,
  totalQuestions: 0,
  timerInterval: null,
  timeLeft: 15,
  ttsEnabled: true,
  questionTimes: [], // per question response time in seconds
};

/* ---------------------------
   Question Bank (sample)
   Add more later - kept modular
   --------------------------- */

const QUESTION_BANK = {
  "Sets": [
    { q: "If A = {1,2,3} and B = {2,3,4}, A ∩ B = ?", options:["{1}","{2,3}","{4}","{1,4}"], answer:1 },
    { q: "Which is a subset of {1,2,3}?", options:["{1,4}","{1,2}","{4}","{0}"], answer:1 },
    { q: "Cardinality of set {x | x is even and 1≤x≤8} is?", options:["3","4","5","2"], answer:1 },
    { q: "Union of {a,b} and {b,c} is ?", options:["{a,b}","{b,c}","{a,b,c}","∅"], answer:2 },
    { q: "If A∪B = A then B is?", options:["Subset of A","Superset of A","Equal to A","Disjoint"], answer:0 },
    { q: "Complement of universal set with respect to U is?", options:["U","∅","Undefined","All elements"], answer:1 },
    { q: "Power set P({1,2}) has how many elements?", options:["2","3","4","1"], answer:2 },
    { q: "Intersection with empty set gives?", options:["Original set","Empty set","Universal set","Undefined"], answer:1 },
    { q: "Symmetric difference A Δ A equals?", options:["A","∅","U","Depends"], answer:1 },
    { q: "If A={1,2} and B={2,3}, A\\B = ?", options:["{1}","{2}","{3}","{1,2,3}"], answer:0 },
    { q: "Which statement true: A ⊆ A ?", options:["Always","Never","Sometimes","Only if A≠∅"], answer:0 }
  ],

  "Relations & Functions": [
    { q: "A function f from A to B assigns:", options:["A to multiple B","Each element of A to exactly one in B","B to A","No mapping"], answer:1 },
    { q: "If f(x)=2x+3, f(2) equals?", options:["7","4","1","-1"], answer:0 },
    { q: "One-to-one means:", options:["Each codomain hit","Each domain maps to same value","Distinct domain map to distinct codomain","None"], answer:2 },
    { q: "Onto (surjective) means:", options:["Every codomain element has preimage","No codomain image","Function unbounded","One-element codomain"], answer:0 },
    { q: "Composite f∘g means:", options:["f then g","g then f","Perform both simultaneously","Multiply"], answer:1 },
    { q: "Inverse exists if function is:", options:["One-to-one and Onto","Only onto","Only one-to-one","None"], answer:0 },
    { q: "If f(x)=x^2 on R, is it one-to-one?", options:["Yes","No (because ±x)","Only for x≥0","Only for integers"], answer:1 },
    { q: "Image of set under f is:", options:["Set of outputs","Set of inputs","Inverse","Empty"], answer:0 },
    { q: "If (a,b) in relation R then a is related to b. This is:", options:["Ordered pair","Function value","Subset","Union"], answer:0 },
    { q: "Domain of sqrt(x) is:", options:["x≥0","All real","x>0","x≤0"], answer:0 }
  ],

  "Limits": [
    { q: "Limit of (2x+1) as x→3 equals?", options:["7","6","Infinity","Does not exist"], answer:0 },
    { q: "Limit lim_{x→0} sin x / x is ?", options:["1","0","Undefined","Infinity"], answer:0 },
    { q: "lim_{x→∞} 1/x = ?", options:["0","1","∞","-∞"], answer:0 },
    { q: "If left and right limits differ, limit is:", options:["Does not exist","Average","Left value","Right value"], answer:0 },
    { q: "lim_{x→0} (1+ x)^{1/x} equals?", options:["e","1","0","Infinity"], answer:0 },
    { q: "lim_{x→2} (x^2 -4)/(x-2) equals?", options:["4","2","0","Doesn't exist"], answer:0 },
    { q: "If f(x)=3 constant, limit at any point is:", options:["3","0","undefined","depends"], answer:0 },
    { q: "Limit of x*sin(1/x) as x→0 is?", options:["0","1","Undefined","Does not exist"], answer:0 },
    { q: "Continuity at a means:", options:["Left limit = right limit = f(a)","Only left limit exist","Derivative exist","None"], answer:0 },
    { q: "lim_{x→0} (e^x -1)/x equals?", options:["1","0","e","∞"], answer:0 }
  ]
};

/* ---------------------------
   DOM references
   --------------------------- */
const el = {
  welcome: $('#welcome'),
  adminBtn: $('#admin-btn'),
  adminLogin: $('#admin-login'),
  adminPass: $('#admin-pass'),
  adminSubmit: $('#admin-submit'),
  adminCancel: $('#admin-cancel'),
  adminMsg: $('#admin-msg'),
  adminDashboard: $('#admin-dashboard'),
  clearHistoryBtn: $('#clear-history'),
  adminBackBtn: $('#admin-back'),
  historyList: $('#history-list'),
  playerNameInput: $('#player-name'),
  startBtn: $('#start-btn'),
  viewHistoryBtn: $('#view-history-btn'),
  setup: $('#setup'),
  playerDisplay: $('#player-display'),
  beginBtn: $('#begin-btn'),
  setupBack: $('#setup-back'),
  quiz: $('#quiz'),
  qCategory: $('#q-category'),
  qDifficulty: $('#q-difficulty'),
  timer: $('#timer'),
  progressBar: $('#progress-bar'),
  questionText: $('#question-text'),
  optionsWrap: $('#options'),
  hintBtn: $('#hint-btn'),
  skipBtn: $('#skip-btn'),
  nextBtn: $('#next-btn'),
  motivation: $('#motivation'),
  result: $('#result'),
  resultSummary: $('#result-summary'),
  playAgain: $('#play-again'),
  goHome: $('#go-home'),
  floatingFeedback: $('#floating-feedback'),
  musicToggle: $('#music-toggle'),
  bgMusic: $('#bg-music'),
  ttsToggle: $('#tts-toggle')
};

/* ---------------------------
   Event wiring (initial)
   --------------------------- */
function init() {
  // Restore player name if stored
  const storedName = localStorage.getItem(STORAGE_KEYS.playerName);
  if (storedName) {
    el.playerNameInput.value = storedName;
  }

  // Background sample music (simple sine sound created via data URI not used here to keep small).
  // We'll use a small built-in beep via generated audio (but browsers may not allow auto-play).
  // For demo, we leave src empty; user can toggle to attempt play (or you can set a valid file path).
  // You can optionally set el.bgMusic.src = 'path/to/music.mp3';

  // Buttons
  el.startBtn.addEventListener('click', handleStart);
  el.adminBtn.addEventListener('click', () => showPanel('admin-login'));
  el.adminCancel.addEventListener('click', () => showPanel('welcome'));
  el.adminSubmit.addEventListener('click', handleAdminLogin);
  el.clearHistoryBtn.addEventListener('click', handleClearHistory);
  el.adminBackBtn.addEventListener('click', () => {
    localStorage.setItem(STORAGE_KEYS.isAdmin, 'false');
    appState.isAdmin = false;
    showPanel('welcome');
  });

  el.viewHistoryBtn.addEventListener('click', showMyHistory);
  el.beginBtn.addEventListener('click', handleBegin);
  el.setupBack.addEventListener('click', () => showPanel('welcome'));

  el.hintBtn.addEventListener('click', useHint);
  el.skipBtn.addEventListener('click', handleSkip);
  el.nextBtn.addEventListener('click', nextQuestion);

  el.playAgain.addEventListener('click', () => {
    resetToSetup();
    showPanel('setup');
  });
  el.goHome.addEventListener('click', () => {
    showPanel('welcome');
  });

  el.musicToggle.addEventListener('click', toggleMusic);
  el.ttsToggle.addEventListener('click', toggleTTS);

  // beforeunload: clear playerName if not admin
  window.addEventListener('beforeunload', () => {
    if (localStorage.getItem(STORAGE_KEYS.isAdmin) !== 'true') {
      localStorage.removeItem(STORAGE_KEYS.playerName);
    }
  });

  // If admin flag present show dashboard immediately
  if (localStorage.getItem(STORAGE_KEYS.isAdmin) === 'true') {
    appState.isAdmin = true;
    showAdminDashboard();
  }
}
init();

/* ---------------------------
   Panel management
   --------------------------- */
function showPanel(panelName) {
  // hide all
  el.welcome.classList.add('hidden');
  el.adminLogin.classList.add('hidden');
  el.adminDashboard.classList.add('hidden');
  el.setup.classList.add('hidden');
  el.quiz.classList.add('hidden');
  el.result.classList.add('hidden');

  switch (panelName) {
    case 'welcome': el.welcome.classList.remove('hidden'); break;
    case 'admin-login': el.adminLogin.classList.remove('hidden'); break;
    case 'admin-dashboard': el.adminDashboard.classList.remove('hidden'); break;
    case 'setup': el.setup.classList.remove('hidden'); break;
    case 'quiz': el.quiz.classList.remove('hidden'); break;
    case 'result': el.result.classList.remove('hidden'); break;
    default: el.welcome.classList.remove('hidden');
  }
}

/* ---------------------------
   Admin login & dashboard
   --------------------------- */
function handleAdminLogin() {
  const pass = el.adminPass.value.trim();
  if (pass === 'BCA2025') {
    localStorage.setItem(STORAGE_KEYS.isAdmin, 'true');
    appState.isAdmin = true;
    el.adminMsg.textContent = "✅ Welcome, Admin";
    el.adminPass.value = '';
    showAdminDashboard();
  } else {
    el.adminMsg.textContent = "❌ Wrong Password";
    speak("Wrong Password", 0.9);
  }
}

function showAdminDashboard() {
  refreshHistoryList(true);
  showPanel('admin-dashboard');
}

function handleClearHistory() {
  if (!confirm("Clear all quiz history? This cannot be undone.")) return;
  localStorage.removeItem(STORAGE_KEYS.history);
  refreshHistoryList(true);
  speak("All history cleared", 0.9);
}

/* ---------------------------
   History & Leaderboard
   --------------------------- */
function refreshHistoryList(isAdminView = false) {
  const all = loadHistory();
  el.historyList.innerHTML = '';

  const rows = isAdminView ? all : all.filter(h => h.name === appState.playerName);
  if (rows.length === 0) {
    el.historyList.innerHTML = `<div class="centered muted small">No history found.</div>`;
    return;
  }

  // Render rows newest first
  rows.slice().reverse().forEach(item => {
    const div = document.createElement('div');
    div.className = 'history-item';
    div.innerHTML = `
      <div>
        <div><strong>${escapeHtml(item.name)}</strong> <span class="muted small">(${item.difficulty} - ${item.category})</span></div>
        <div class="muted small">${new Date(item.date).toLocaleString()}</div>
      </div>
      <div class="small" style="text-align:right">
        <div><strong>${item.score}/${item.total}</strong></div>
        <div class="muted small">${item.achievements ? item.achievements.join(', ') : ''}</div>
      </div>
    `;
    el.historyList.appendChild(div);
  });
}

function showMyHistory() {
  // need a player name
  const name = el.playerNameInput.value.trim();
  if (!name) {
    alert('Please enter your name to view your history.');
    return;
  }
  appState.playerName = name;
  localStorage.setItem(STORAGE_KEYS.playerName, name);
  localStorage.removeItem(STORAGE_KEYS.isAdmin);
  appState.isAdmin = false;
  refreshHistoryList(false);
  showPanel('admin-dashboard'); // reuse panel but not admin
}

/* ---------------------------
   Start & Setup flow
   --------------------------- */
function handleStart() {
  const name = el.playerNameInput.value.trim();
  if (!name) {
    alert('Please enter your name!');
    return;
  }
  // Remove admin flag when player starts (requirement)
  localStorage.removeItem(STORAGE_KEYS.isAdmin);
  appState.isAdmin = false;

  appState.playerName = name;
  localStorage.setItem(STORAGE_KEYS.playerName, name);

  el.playerDisplay.textContent = name;
  showPanel('setup');
}

/* When Begin Quiz clicked */
function handleBegin() {
  const category = $$('input[name="category"]:checked').map(i=>i.value)[0];
  const difficulty = $$('input[name="difficulty"]:checked').map(i=>i.value)[0];

  if (!category || !difficulty) {
    alert('Please choose a category and difficulty.');
    return;
  }

  appState.category = category;
  appState.difficulty = difficulty;

  // prepare question set
  const pool = QUESTION_BANK[category] || [];
  const count = difficulty === 'Easy' ? 10 : (difficulty === 'Medium' ? 7 : 5);
  const shuffledPool = shuffle(pool);
  // If question bank smaller, reuse shuffled.
  appState.questions = shuffledPool.slice(0, Math.min(count, shuffledPool.length)).map(q => ({
    text: q.q,
    options: shuffle(q.options.map((opt, idx) => ({ text: opt, key: idx }))),
    answerKey: q.options[q.answer], // store text for checking (since we shuffle)
    raw: q
  }));
  appState.totalQuestions = appState.questions.length;
  appState.currentIndex = 0;
  appState.score = 0;
  appState.correct = 0;
  appState.wrong = 0;
  appState.skipped = 0;
  appState.questionTimes = [];

  el.qCategory.textContent = `${category}`;
  el.qDifficulty.textContent = `${difficulty} • ${appState.totalQuestions} Qs`;

  showPanel('quiz');
  loadQuestion();
}

/* ---------------------------
   Quiz flow
   --------------------------- */
function loadQuestion() {
  clearTimer();
  const i = appState.currentIndex;
  const q = appState.questions[i];
  if (!q) {
    finishQuiz();
    return;
  }

  // reset UI
  el.optionsWrap.innerHTML = '';
  el.nextBtn.classList.add('hidden');
  el.hintBtn.disabled = false;
  el.skipBtn.disabled = false;

  el.questionText.textContent = q.text;
  q.options.forEach((opt, idx) => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.dataset.text = opt.text;
    btn.innerHTML = `<strong>${String.fromCharCode(65+idx)}.</strong> <span>${opt.text}</span>`;
    btn.addEventListener('click', () => chooseOption(btn, opt.text));
    el.optionsWrap.appendChild(btn);
  });

  // progress bar
  const pct = Math.round((i / appState.totalQuestions) * 100);
  el.progressBar.style.width = `${pct}%`;

  // timer
  appState.timeLeft = 15;
  el.timer.textContent = appState.timeLeft;
  el.timer.style.color = 'var(--accent)';
  appState.timerInterval = setInterval(() => {
    appState.timeLeft -= 1;
    el.timer.textContent = appState.timeLeft;
    if (appState.timeLeft <= 5) el.timer.style.color = '#ffb86b';
    if (appState.timeLeft <= 0) {
      clearTimer();
      markSkipped();
    }
  }, 1000);

  // motivational
  setMotivation();
}

function chooseOption(btn, selectedText) {
  // Prevent multiple selections
  if (btn.classList.contains('disabled')) return;
  clearTimer();
  const i = appState.currentIndex;
  const q = appState.questions[i];

  // disable all options
  $$('.option-btn').forEach(b => b.classList.add('disabled'));

  const correctText = q.answerKey;
  const isCorrect = selectedText === correctText;

  // record time for question
  const answeredTime = 15 - appState.timeLeft;
  appState.questionTimes.push(answeredTime);

  // show feedback
  if (isCorrect) {
    btn.classList.add('correct');
    appState.score += 1;
    appState.correct += 1;
    showFloating('Correct!', true);
    speak('Correct');
  } else {
    btn.classList.add('wrong');
    appState.wrong += 1;
    // highlight correct
    $$('.option-btn').find(b => b.dataset.text === correctText)?.classList.add('correct');
    showFloating('Wrong!', false);
    speak('Wrong', 0.95);
  }

  // show next button after small delay
  el.nextBtn.classList.remove('hidden');
  el.skipBtn.disabled = true;
}

function nextQuestion() {
  appState.currentIndex += 1;
  if (appState.currentIndex >= appState.totalQuestions) {
    finishQuiz();
    return;
  }
  loadQuestion();
}

function handleSkip() {
  clearTimer();
  appState.skipped += 1;
  appState.questionTimes.push(15); // full time used as skipped
  showFloating('Skipped', false);
  appState.currentIndex += 1;
  if (appState.currentIndex >= appState.totalQuestions) {
    finishQuiz();
  } else {
    loadQuestion();
  }
}

function markSkipped() {
  // called when timer runs out
  appState.skipped += 1;
  appState.questionTimes.push(15);
  // reveal correct
  const q = appState.questions[appState.currentIndex];
  $$('.option-btn').forEach(b => {
    if (b.dataset.text === q.answerKey) b.classList.add('correct');
    else b.classList.add('disabled');
  });
  showFloating('Time up!', false);
  speak('Time up', 0.9);
  el.nextBtn.classList.remove('hidden');
  el.skipBtn.disabled = true;
}

function clearTimer() {
  if (appState.timerInterval) {
    clearInterval(appState.timerInterval);
    appState.timerInterval = null;
  }
}

/* Hint: remove two wrong answers */
function useHint() {
  // Disable after one use per question
  el.hintBtn.disabled = true;
  const q = appState.questions[appState.currentIndex];
  const buttons = $$('.option-btn').filter(b => !b.classList.contains('disabled') && !b.classList.contains('correct'));
  // find wrongs (not correct) and remove two
  const wrongButtons = buttons.filter(b => b.dataset.text !== q.answerKey);
  const toRemove = shuffle(wrongButtons).slice(0, 2);
  toRemove.forEach(b => {
    b.classList.add('disabled');
    b.style.opacity = '0.5';
  });
}

/* Floating feedback UI */
function showFloating(text, positive = true) {
  const elF = document.createElement('div');
  elF.className = 'float-msg ' + (positive ? 'float-correct' : 'float-wrong');
  elF.textContent = text;
  el.floatingFeedback.appendChild(elF);
  setTimeout(() => {
    elF.remove();
  }, 1200);
}

/* Motivation messages */
function setMotivation() {
  const msgs = [
    "You got this!",
    "Stay focused!",
    "Think calmly.",
    "Nice pace, keep going!",
    "Small steps, big wins!"
  ];
  const i = Math.floor(Math.random()*msgs.length);
  el.motivation.textContent = msgs[i];
}

/* ---------------------------
   Finish and results
   --------------------------- */
function finishQuiz() {
  clearTimer();
  // progress to 100
  el.progressBar.style.width = '100%';
  // compute stats
  const total = appState.totalQuestions;
  const score = appState.score;
  const correct = appState.correct;
  const wrong = appState.wrong;
  const skipped = appState.skipped;
  const avgTime = appState.questionTimes.length ? (appState.questionTimes.reduce((a,b)=>a+b,0) / appState.questionTimes.length) : 0;
  const percent = Math.round((score/total) * 100);

  // achievements
  const achievements = [];
  if (score === total) achievements.push('Perfect Score');
  if (percent >= 80 && score !== total) achievements.push('Maths Master');
  if (avgTime <= 8) achievements.push('Fast Thinker');

  // Save to history
  const entry = {
    name: appState.playerName || localStorage.getItem(STORAGE_KEYS.playerName) || 'Unknown',
    score: score,
    total: total,
    correct, wrong, skipped,
    category: appState.category,
    difficulty: appState.difficulty,
    date: nowISO(),
    avgTime: Math.round(avgTime * 10)/10,
    achievements
  };

  // push to storage
  const all = loadHistory();
  all.push(entry);
  saveHistory(all);

  // Build result UI
  el.resultSummary.innerHTML = `
    <div class="row"><div>Name</div><div><strong>${escapeHtml(entry.name)}</strong></div></div>
    <div class="row"><div>Score</div><div><strong>${entry.score}/${entry.total}</strong> (${percent}%)</div></div>
    <div class="row"><div>Correct</div><div>${entry.correct}</div></div>
    <div class="row"><div>Wrong</div><div>${entry.wrong}</div></div>
    <div class="row"><div>Skipped</div><div>${entry.skipped}</div></div>
    <div class="row"><div>Category</div><div>${escapeHtml(entry.category)}</div></div>
    <div class="row"><div>Difficulty</div><div>${escapeHtml(entry.difficulty)}</div></div>
    <div class="row"><div>Avg Time / Q</div><div>${entry.avgTime}s</div></div>
    <div class="row"><div>Achievements</div><div>${entry.achievements.length ? entry.achievements.join(', ') : '—'}</div></div>
    <div class="row"><div>Motivation</div><div>${generateMotivationMessage(percent)}</div></div>
  `;

  // Show result panel
  showPanel('result');

  // Announce with voice
  if (percent >= 80) {
    speak(`Great job ${entry.name}, you scored ${percent} percent`);
  } else {
    speak(`You scored ${percent} percent. Keep practicing!`);
  }

  // If admin is viewing, keep admin flag; otherwise ensure playerName saved is removed on leaving (handled by beforeunload).
}

/* Motivation message depending on score */
function generateMotivationMessage(percent) {
  if (percent === 100) return "Flawless! You're a maths superstar ✨";
  if (percent >= 80) return "Excellent work! Keep sharpening those skills!";
  if (percent >= 50) return "Good attempt — revise the weak topics and try again!";
  return "Don't worry — practice makes perfect. Try the Easy mode and improve steadily.";
}

/* Play again resets state to setup */
function resetToSetup() {
  appState.category = null;
  appState.difficulty = null;
  appState.questions = [];
  appState.currentIndex = 0;
  appState.score = 0;
  appState.correct = 0;
  appState.wrong = 0;
  appState.skipped = 0;
  appState.totalQuestions = 0;
}

/* ---------------------------
   Helpers
   --------------------------- */
function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

/* ---------------------------
   Music & TTS toggles
   --------------------------- */
function toggleMusic() {
  const audio = el.bgMusic;
  const elBtn = el.musicToggle;
  // If no src defined, create a tiny beep synth to play once as demo for permission
  if (!audio.src) {
    // Create a tiny melody using WebAudio (one-shot) instead of background loop for demo
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = 220;
      o.connect(g);
      g.connect(ctx.destination);
      o.start();
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
      o.stop(ctx.currentTime + 0.6);
    } catch (e) {
      console.warn('WebAudio not available', e);
    }
    elBtn.textContent = '🔈 Mute';
    return;
  }

  if (audio.paused) {
    audio.play().then(() => {
      elBtn.textContent = '🔊 Unmute';
    }).catch(() => {
      elBtn.textContent = '🔈 Mute';
    });
  } else {
    audio.pause();
    elBtn.textContent = '🔈 Mute';
  }
}

function toggleTTS() {
  appState.ttsEnabled = !appState.ttsEnabled;
  el.ttsToggle.textContent = appState.ttsEnabled ? '🔊' : '🔇';
}

/* ---------------------------
   Small polyfills / helpers
   --------------------------- */

// Helper to get checked radio values easily (extend NodeList)
Object.defineProperty(NodeList.prototype, 'map', {
  value: function(fn){ return Array.prototype.map.call(this, fn); },
  enumerable: false
});

/* ---------------------------
   Start: show welcome
   --------------------------- */
showPanel('welcome');