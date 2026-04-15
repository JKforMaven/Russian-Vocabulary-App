/* ── Storage helpers ─────────────────────────────────── */

function loadJSON(key, fallback) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch {
    return fallback;
  }
}

function saveJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

/* ── App State ──────────────────────────────────────── */

const state = {
  currentTab: 'learn',    // 'learn' | 'quiz' | 'progress'
  selectedTier: 1,        // 1-5 or 0 for "All"

  // Learn
  learnCards: [],
  learnIndex: 0,
  flipped: false,

  // Quiz
  quizQuestions: [],
  quizIndex: 0,
  quizScore: 0,
  quizAnswered: false,
  quizMistakes: [],
  quizFinished: false,

  // Persisted
  knownWords: loadJSON('russian_known_words', []),
  quizHistory: loadJSON('russian_quiz_history', { total: 0, correct: 0 }),
  learnPositions: loadJSON('russian_learn_positions', {}),
};

/* ── Helpers ─────────────────────────────────────────── */

function getWordsByTier(tier) {
  if (tier === 0) return [...WORDS];
  return WORDS.filter(w => w.tier === tier);
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function isKnown(wordId) {
  return state.knownWords.includes(wordId);
}

function toggleKnown(wordId) {
  if (isKnown(wordId)) {
    state.knownWords = state.knownWords.filter(id => id !== wordId);
  } else {
    state.knownWords.push(wordId);
  }
  saveJSON('russian_known_words', state.knownWords);
}

function saveLearnPosition() {
  const key = state.selectedTier === 0 ? 'all' : String(state.selectedTier);
  state.learnPositions[key] = state.learnIndex;
  saveJSON('russian_learn_positions', state.learnPositions);
}

function getLearnPosition() {
  const key = state.selectedTier === 0 ? 'all' : String(state.selectedTier);
  return state.learnPositions[key] || 0;
}

function el(tag, attrs, ...children) {
  const element = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'className') element.className = v;
      else if (k.startsWith('on')) element.addEventListener(k.slice(2).toLowerCase(), v);
      else element.setAttribute(k, v);
    }
  }
  for (const child of children) {
    if (typeof child === 'string') element.appendChild(document.createTextNode(child));
    else if (child) element.appendChild(child);
  }
  return element;
}

/* ── Rendering ──────────────────────────────────────── */

function render() {
  const app = document.getElementById('app');
  app.innerHTML = '';
  app.appendChild(renderHeader());
  app.appendChild(renderNav());

  if (state.currentTab !== 'progress') {
    app.appendChild(renderTierSelector());
  }

  const content = el('div', { className: 'main-content fade-in' });

  switch (state.currentTab) {
    case 'learn':   content.appendChild(renderLearn()); break;
    case 'quiz':    content.appendChild(renderQuiz()); break;
    case 'progress': content.appendChild(renderProgress()); break;
  }

  app.appendChild(content);
}

function renderHeader() {
  return el('header', { className: 'app-header' },
    el('h1', null, 'Учи\u0301м ру\u0301сский!'),
    el('div', { className: 'subtitle' }, 'Learn Russian words step by step'),
  );
}

function renderNav() {
  const tabs = [
    { id: 'learn',    label: 'Learn' },
    { id: 'quiz',     label: 'Quiz' },
    { id: 'progress', label: 'Progress' },
  ];

  return el('nav', { className: 'nav-tabs' },
    ...tabs.map(t =>
      el('button', {
        className: 'nav-tab' + (state.currentTab === t.id ? ' active' : ''),
        onClick: () => {
          state.currentTab = t.id;
          if (t.id === 'learn') initLearn();
          if (t.id === 'quiz') initQuiz();
          render();
        },
      }, t.label)
    ),
  );
}

function renderTierSelector() {
  const select = el('select', { id: 'tier-select' });

  for (let i = 1; i <= 5; i++) {
    const opt = el('option', { value: String(i) }, `Tier ${i}`);
    if (state.selectedTier === i) opt.selected = true;
    select.appendChild(opt);
  }
  const allOpt = el('option', { value: '0' }, 'All Tiers');
  if (state.selectedTier === 0) allOpt.selected = true;
  select.appendChild(allOpt);

  select.addEventListener('change', () => {
    state.selectedTier = Number(select.value);
    if (state.currentTab === 'learn') initLearn();
    if (state.currentTab === 'quiz') initQuiz();
    render();
  });

  return el('div', { className: 'tier-selector' },
    el('label', { for: 'tier-select' }, 'Tier:'),
    select,
  );
}

/* ── Learn Mode ─────────────────────────────────────── */

function initLearn() {
  state.learnCards = getWordsByTier(state.selectedTier);
  state.learnIndex = Math.min(getLearnPosition(), Math.max(state.learnCards.length - 1, 0));
  state.flipped = false;
}

function renderLearn() {
  const words = state.learnCards;
  if (words.length === 0) {
    return el('p', { className: 'card-counter' }, 'No words in this tier yet.');
  }

  const word = words[state.learnIndex];
  const container = el('div', null);

  // Counter
  container.appendChild(
    el('div', { className: 'card-counter' }, `${state.learnIndex + 1} / ${words.length}`)
  );

  // Flashcard
  const card = el('div', {
    className: 'flashcard-container',
    onClick: () => {
      state.flipped = !state.flipped;
      render();
    },
  },
    el('div', { className: 'flashcard' + (state.flipped ? ' flipped' : '') },
      el('div', { className: 'flashcard-face flashcard-front' },
        el('div', { className: 'word-ru' }, word.ru),
        el('div', { className: 'hint' }, 'tap to flip'),
      ),
      el('div', { className: 'flashcard-face flashcard-back' },
        el('div', { className: 'word-cs' }, word.cs),
        el('div', { className: 'word-en' }, word.en),
        el('div', { className: 'word-ru-small' }, word.ru),
      ),
    ),
  );
  container.appendChild(card);

  // Nav buttons
  const prevBtn = el('button', {
    className: 'btn-prev',
    onClick: (e) => { e.stopPropagation(); goCard(-1); },
    ...(state.learnIndex === 0 ? { disabled: 'true' } : {}),
  }, '\u25C0 Prev');

  const shuffleBtn = el('button', {
    className: 'btn-shuffle',
    onClick: (e) => {
      e.stopPropagation();
      state.learnCards = shuffle(state.learnCards);
      state.learnIndex = 0;
      state.flipped = false;
      saveLearnPosition();
      render();
    },
  }, 'Shuffle');

  const nextBtn = el('button', {
    className: 'btn-next',
    onClick: (e) => { e.stopPropagation(); goCard(1); },
    ...(state.learnIndex >= words.length - 1 ? { disabled: 'true' } : {}),
  }, 'Next \u25B6');

  container.appendChild(el('div', { className: 'card-nav' }, prevBtn, shuffleBtn, nextBtn));

  // Known / Learning buttons
  const knownBtn = el('button', {
    className: 'btn-known' + (isKnown(word.id) ? ' active' : ''),
    onClick: (e) => {
      e.stopPropagation();
      if (!isKnown(word.id)) toggleKnown(word.id);
      render();
    },
  }, isKnown(word.id) ? '\u2713 Known' : 'Mark as Known');

  const learningBtn = el('button', {
    className: 'btn-learning',
    onClick: (e) => {
      e.stopPropagation();
      if (isKnown(word.id)) toggleKnown(word.id);
      render();
    },
  }, 'Still Learning');

  container.appendChild(el('div', { className: 'know-buttons' }, knownBtn, learningBtn));

  return container;
}

function goCard(dir) {
  const max = state.learnCards.length - 1;
  state.learnIndex = Math.max(0, Math.min(max, state.learnIndex + dir));
  state.flipped = false;
  saveLearnPosition();
  render();
}

/* ── Quiz Mode ──────────────────────────────────────── */

function initQuiz() {
  const pool = getWordsByTier(state.selectedTier);
  if (pool.length < 4) {
    state.quizQuestions = [];
    state.quizFinished = false;
    return;
  }

  const count = Math.min(20, pool.length);
  const selected = shuffle(pool).slice(0, count);

  state.quizQuestions = selected.map(word => {
    const wrongPool = pool.filter(w => w.id !== word.id);
    const wrongOptions = shuffle(wrongPool).slice(0, 3);
    const options = shuffle([word, ...wrongOptions]);
    return { word, options };
  });

  state.quizIndex = 0;
  state.quizScore = 0;
  state.quizAnswered = false;
  state.quizMistakes = [];
  state.quizFinished = false;
}

function renderQuiz() {
  if (state.quizQuestions.length === 0) {
    return el('p', { className: 'card-counter' }, 'Not enough words for a quiz. Need at least 4.');
  }

  if (state.quizFinished) return renderQuizResults();

  const q = state.quizQuestions[state.quizIndex];
  const container = el('div', { className: 'slide-up' });

  container.appendChild(
    el('div', { className: 'quiz-score' },
      `Question ${state.quizIndex + 1} / ${state.quizQuestions.length}  \u2022  Score: ${state.quizScore}`)
  );

  container.appendChild(el('div', { className: 'quiz-word' }, q.word.ru));

  const optionsContainer = el('div', { className: 'quiz-options' });

  q.options.forEach(opt => {
    const btn = el('button', { className: 'quiz-option' }, opt.cs);

    btn.addEventListener('click', () => {
      if (state.quizAnswered) return;
      state.quizAnswered = true;

      const isCorrect = opt.id === q.word.id;
      if (isCorrect) {
        state.quizScore++;
        btn.classList.add('correct');
      } else {
        btn.classList.add('wrong');
        state.quizMistakes.push({ ru: q.word.ru, cs: q.word.cs });
      }

      // Highlight correct answer and disable all buttons
      optionsContainer.querySelectorAll('.quiz-option').forEach((b, idx) => {
        b.classList.add('disabled');
        if (q.options[idx].id === q.word.id) b.classList.add('correct');
      });

      // Auto-advance
      setTimeout(() => {
        state.quizAnswered = false;
        state.quizIndex++;

        if (state.quizIndex >= state.quizQuestions.length) {
          state.quizFinished = true;
          // Save quiz history
          state.quizHistory.total += state.quizQuestions.length;
          state.quizHistory.correct += state.quizScore;
          saveJSON('russian_quiz_history', state.quizHistory);
        }
        render();
      }, 1500);
    });

    optionsContainer.appendChild(btn);
  });

  container.appendChild(optionsContainer);
  return container;
}

function renderQuizResults() {
  const total = state.quizQuestions.length;
  const pct = Math.round((state.quizScore / total) * 100);

  const container = el('div', { className: 'quiz-results slide-up' });

  container.appendChild(el('div', { className: 'score-big' }, `${pct}%`));
  container.appendChild(
    el('div', { className: 'score-label' }, `${state.quizScore} out of ${total} correct`)
  );

  container.appendChild(
    el('button', {
      className: 'btn-restart',
      onClick: () => { initQuiz(); render(); },
    }, 'Try Again')
  );

  if (state.quizMistakes.length > 0) {
    container.appendChild(el('div', { className: 'mistakes-title' }, 'Words to review:'));
    state.quizMistakes.forEach(m => {
      container.appendChild(
        el('div', { className: 'mistake-item' },
          el('span', { className: 'ru' }, m.ru),
          el('span', { className: 'cs' }, m.cs),
        )
      );
    });
  }

  return container;
}

/* ── Progress Tab ───────────────────────────────────── */

function renderProgress() {
  const container = el('div', null);

  // Overall stats
  const totalWords = WORDS.length;
  const knownCount = state.knownWords.length;
  const pct = totalWords > 0 ? Math.round((knownCount / totalWords) * 100) : 0;
  const quizAcc = state.quizHistory.total > 0
    ? Math.round((state.quizHistory.correct / state.quizHistory.total) * 100)
    : 0;

  const overview = el('div', { className: 'progress-overview' });
  overview.appendChild(el('h3', null, 'Overall Progress'));

  overview.appendChild(progressBar('Words known', knownCount, totalWords));

  overview.appendChild(el('div', { className: 'stat-row' },
    el('span', null, 'Total words learned'),
    el('span', { className: 'value' }, String(knownCount)),
  ));
  overview.appendChild(el('div', { className: 'stat-row' },
    el('span', null, 'Quiz questions answered'),
    el('span', { className: 'value' }, String(state.quizHistory.total)),
  ));
  overview.appendChild(el('div', { className: 'stat-row' },
    el('span', null, 'Quiz accuracy'),
    el('span', { className: 'value' }, `${quizAcc}%`),
  ));

  container.appendChild(overview);

  // Per-tier progress
  for (let tier = 1; tier <= 5; tier++) {
    const tierWords = WORDS.filter(w => w.tier === tier);
    const tierKnown = tierWords.filter(w => state.knownWords.includes(w.id)).length;

    const card = el('div', { className: 'tier-progress-card' });
    card.appendChild(el('h4', null, `Tier ${tier}`));
    card.appendChild(progressBar('Known', tierKnown, tierWords.length));
    container.appendChild(card);
  }

  // Reset button
  container.appendChild(
    el('button', {
      className: 'btn-reset',
      onClick: () => {
        if (confirm('Reset all progress? This cannot be undone.')) {
          state.knownWords = [];
          state.quizHistory = { total: 0, correct: 0 };
          state.learnPositions = {};
          saveJSON('russian_known_words', []);
          saveJSON('russian_quiz_history', state.quizHistory);
          saveJSON('russian_learn_positions', {});
          render();
        }
      },
    }, 'Reset All Progress')
  );

  return container;
}

function progressBar(label, current, total) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;
  return el('div', { className: 'progress-bar-container' },
    el('div', { className: 'progress-bar-label' },
      el('span', null, label),
      el('span', null, `${current} / ${total} (${pct}%)`),
    ),
    el('div', { className: 'progress-bar' },
      el('div', { className: 'progress-bar-fill', style: `width:${pct}%` }),
    ),
  );
}

/* ── Keyboard Shortcuts ─────────────────────────────── */

document.addEventListener('keydown', (e) => {
  if (state.currentTab !== 'learn') return;
  if (state.learnCards.length === 0) return;

  switch (e.code) {
    case 'Space':
      e.preventDefault();
      state.flipped = !state.flipped;
      render();
      break;
    case 'ArrowRight':
      e.preventDefault();
      goCard(1);
      break;
    case 'ArrowLeft':
      e.preventDefault();
      goCard(-1);
      break;
  }
});

/* ── Init ────────────────────────────────────────────── */

initLearn();
render();
