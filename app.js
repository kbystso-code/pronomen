const DATA_URL = 'data/level1.json?v=20260430-1';
const SET_SIZE = 20;
const KIDS_APP_PROGRESS_KEY = 'kids-app-study-progress-v1';
const KIDS_APP_APP_ID = 'pronomen';
const LEVEL_BALANCE = {
  maskulin: 7,
  feminin: 7,
  neutrum: 6
};

const state = {
  data: null,
  questions: [],
  currentIndex: 0,
  correct: 0,
  wrong: 0,
  mistakes: [],
  answered: false
};

const elements = {
  startScreen: document.querySelector('#startScreen'),
  quizScreen: document.querySelector('#quizScreen'),
  resultScreen: document.querySelector('#resultScreen'),
  startButton: document.querySelector('#startButton'),
  restartButton: document.querySelector('#restartButton'),
  nextButton: document.querySelector('#nextButton'),
  questionCounter: document.querySelector('#questionCounter'),
  correctCounter: document.querySelector('#correctCounter'),
  wrongCounter: document.querySelector('#wrongCounter'),
  questionText: document.querySelector('#questionText'),
  answerButtons: document.querySelectorAll('.answer-button'),
  feedback: document.querySelector('#feedback'),
  errorMessage: document.querySelector('#errorMessage'),
  resultCorrect: document.querySelector('#resultCorrect'),
  resultWrong: document.querySelector('#resultWrong'),
  resultQuote: document.querySelector('#resultQuote'),
  reviewBlock: document.querySelector('#reviewBlock'),
  reviewList: document.querySelector('#reviewList')
};

document.addEventListener('DOMContentLoaded', init);

async function init() {
  elements.startButton.addEventListener('click', () => startLevel());
  elements.restartButton.addEventListener('click', () => startLevel());
  elements.nextButton.addEventListener('click', goToNextQuestion);

  elements.answerButtons.forEach((button) => {
    button.addEventListener('click', () => checkAnswer(button.dataset.pronoun));
  });

  updateCounters();
  await loadData();
}

async function loadData() {
  try {
    const response = await fetch(DATA_URL, { cache: 'no-store' });

    if (!response.ok) {
      throw new Error('Datenfehler');
    }

    state.data = await response.json();
    elements.startButton.disabled = false;
    elements.errorMessage.textContent = '';
  } catch (error) {
    state.data = null;
    elements.startButton.disabled = true;
    elements.errorMessage.textContent = 'Die Daten konnten nicht geladen werden.';
  }
}

function startLevel() {
  if (!state.data) {
    elements.errorMessage.textContent = 'Die Daten konnten nicht geladen werden.';
    return;
  }

  state.questions = buildQuestionSet(state.data.items);
  state.currentIndex = 0;
  state.correct = 0;
  state.wrong = 0;
  state.mistakes = [];
  state.answered = false;

  showScreen(elements.quizScreen);
  updateCounters();
  showQuestion();
}

function buildQuestionSet(items) {
  const selectedItems = Object.entries(LEVEL_BALANCE).flatMap(([gender, count]) => {
    const genderItems = items.filter((item) => item.gender === gender);
    return shuffleArray(genderItems).slice(0, count);
  });

  return shuffleArray(selectedItems);
}

function showQuestion() {
  const question = state.questions[state.currentIndex];

  state.answered = false;
  elements.questionText.textContent = `${question.article} ${question.noun}`;
  elements.feedback.textContent = '';
  elements.feedback.className = 'feedback';
  elements.nextButton.classList.remove('is-visible');

  elements.answerButtons.forEach((button) => {
    button.disabled = false;
    button.classList.remove('is-correct', 'is-wrong');
  });

  updateCounters();
}

function checkAnswer(selectedPronoun) {
  if (state.answered) {
    return;
  }

  const question = state.questions[state.currentIndex];
  const isCorrect = selectedPronoun === question.pronoun;

  state.answered = true;

  if (isCorrect) {
    state.correct += 1;
  } else {
    state.wrong += 1;
    state.mistakes.push(question);
  }

  elements.answerButtons.forEach((button) => {
    button.disabled = true;

    if (button.dataset.pronoun === question.pronoun) {
      button.classList.add('is-correct');
    }

    if (!isCorrect && button.dataset.pronoun === selectedPronoun) {
      button.classList.add('is-wrong');
    }
  });

  showFeedback(question, isCorrect);
  elements.nextButton.classList.add('is-visible');
  updateCounters();
}

function showFeedback(question, isCorrect) {
  const nounText = `${question.article} ${question.noun}`;

  elements.feedback.classList.add(isCorrect ? 'is-correct' : 'is-wrong');
  elements.feedback.innerHTML = isCorrect
    ? `<p>Richtig!</p><p>${nounText} ist ${question.gender}.</p><p>Deshalb: ${question.pronoun}.</p>`
    : `<p>Nicht ganz.</p><p>${nounText} ist ${question.gender}.</p><p>Richtig ist: ${question.pronoun}.</p>`;
}

function goToNextQuestion() {
  if (!state.answered) {
    return;
  }

  state.currentIndex += 1;

  if (state.currentIndex >= SET_SIZE) {
    showResult();
    return;
  }

  showQuestion();
}

function showResult() {
  const quote = Math.round((state.correct / SET_SIZE) * 100);

  reportKidsAppProgress(state.correct);

  elements.resultCorrect.textContent = state.correct;
  elements.resultWrong.textContent = state.wrong;
  elements.resultQuote.textContent = `${quote}%`;

  elements.reviewList.innerHTML = '';
  elements.reviewBlock.classList.toggle('is-visible', state.mistakes.length > 0);

  state.mistakes.forEach((item) => {
    const listItem = document.createElement('li');
    listItem.textContent = `${item.article} ${item.noun} → ${item.pronoun}`;
    elements.reviewList.appendChild(listItem);
  });

  showScreen(elements.resultScreen);
  updateCounters();
}

function updateCounters() {
  const visibleQuestion = state.questions.length === 0
    ? 0
    : Math.min(state.currentIndex + 1, SET_SIZE);

  elements.questionCounter.textContent = `${visibleQuestion} / ${SET_SIZE}`;
  elements.correctCounter.textContent = state.correct;
  elements.wrongCounter.textContent = state.wrong;
}

function showScreen(activeScreen) {
  [elements.startScreen, elements.quizScreen, elements.resultScreen].forEach((screen) => {
    screen.classList.toggle('is-visible', screen === activeScreen);
  });
}

function shuffleArray(array) {
  const shuffled = [...array];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }

  return shuffled;
}

function getKidsAppTodayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function reportKidsAppProgress(correctCount) {
  try {
    const today = getKidsAppTodayKey();
    const raw = JSON.parse(localStorage.getItem(KIDS_APP_PROGRESS_KEY) || '{}');
    raw[today] ??= {};

    const prev = Number(raw[today][KIDS_APP_APP_ID]?.correct) || 0;
    raw[today][KIDS_APP_APP_ID] = {
      correct: Math.max(prev, Math.max(0, Math.floor(Number(correctCount) || 0))),
      updatedAt: new Date().toISOString()
    };

    localStorage.setItem(KIDS_APP_PROGRESS_KEY, JSON.stringify(raw));
  } catch {}
}
