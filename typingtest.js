// typingtest.js - Accurate WPM + Word Completion Highlight

const wordsList = [
  "the", "and", "is", "it", "to", "in", "you", "that", "of", "on", "for", "with", "this", "was", "but",
  "not", "are", "have", "be", "at", "or", "from", "by", "as", "an", "if", "they", "all", "we", "your",
  "one", "can", "there", "so", "what", "about", "more", "when", "just", "like", "up", "how", "out",
  "now", "will", "then", "them", "who", "time", "into", "also", "good", "people", "see", "know", "some",
  "could", "very", "think", "want", "say", "make", "new", "way", "look", "day", "use", "back", "work",
  "first", "life", "man", "woman", "child", "world", "over", "after", "again", "still", "right", "find",
  "help", "long", "place", "too", "never", "under", "same", "high", "small", "while", "few", "last",
  "leave", "feel", "ask", "keep", "love", "give", "try", "call", "tell", "best", "next", "sure"
];

let words = [];
let currentWord = 0;
let totalCharsTyped = 0;
let correctChars = 0;
let correctWords = 0;
let attemptedWords = 0;
let startTime = null;
let endTime = null;
let timerInterval = null;
let timeLeft = 15;

const wordsDiv = document.getElementById("words");
const input = document.getElementById("input");
const wpmSpan = document.getElementById("wpm");
const accuracySpan = document.getElementById("accuracy");
const restartBtn = document.getElementById("restart");
const timeLeftSpan = document.getElementById("time-left");
const resultsArea = document.getElementById("results-area");
const finalWpmSpan = document.getElementById("final-wpm");
const finalAccuracySpan = document.getElementById("final-accuracy");

function getRandomWords(n) {
  return Array.from({ length: n }, () => wordsList[Math.floor(Math.random() * wordsList.length)]);
}

function renderWords() {
  wordsDiv.innerHTML = "";
  words.forEach((word, i) => {
    const span = document.createElement("span");
    span.textContent = word + (i < words.length - 1 ? " " : "");
    if (i < currentWord) {
      span.classList.add("done");
    } else if (i === currentWord) {
      span.classList.add("current");
    }
    wordsDiv.appendChild(span);
  });
}

function updateStats() {
  const duration = ((endTime || Date.now()) - startTime) / 1000 / 60; // minutes
  const wordsTyped = totalCharsTyped / 5;
  const wpm = duration > 0 ? Math.round(wordsTyped / duration) : 0;

  const accuracy = attemptedWords > 0 ? Math.round((correctWords / attemptedWords) * 100) : 100;

  wpmSpan.textContent = `WPM: ${wpm}`;
  accuracySpan.textContent = `Accuracy: ${accuracy}%`;
}

function displayFinalStats() {
  const duration = (endTime - startTime) / 1000 / 60;
  const wordsTyped = totalCharsTyped / 5;
  const wpm = duration > 0 ? Math.round(wordsTyped / duration) : 0;

  const accuracy = attemptedWords > 0 ? Math.round((correctWords / attemptedWords) * 100) : 100;

  finalWpmSpan.textContent = `WPM: ${wpm}`;
  finalAccuracySpan.textContent = `Accuracy: ${accuracy}%`;
  resultsArea.classList.remove("hidden");
}

function endTest() {
  endTime = Date.now();
  clearInterval(timerInterval);
  input.disabled = true;
  updateStats();
  displayFinalStats();
}

function resetTest() {
  words = getRandomWords(50);
  currentWord = 0;
  totalCharsTyped = 0;
  correctChars = 0;
  correctWords = 0;
  attemptedWords = 0;
  startTime = null;
  endTime = null;
  timeLeft = 15;
  input.value = "";
  timeLeftSpan.textContent = `Time: ${timeLeft}s`;
  renderWords();
  input.disabled = false;
  input.focus();
  resultsArea.classList.add("hidden");
}

function startTimer() {
  clearInterval(timerInterval);
  timeLeftSpan.textContent = `Time: ${timeLeft}s`;
  timerInterval = setInterval(() => {
    timeLeft--;
    timeLeftSpan.textContent = `Time: ${timeLeft}s`;
    if (timeLeft <= 0) endTest();
  }, 1000);
}

input.addEventListener("input", () => {
  if (startTime === null) {
    startTime = Date.now();
    startTimer();
  }

  if (timeLeft <= 0) return;

  const val = input.value;
  const current = words[currentWord];

  if (val.length > 0) totalCharsTyped++;

  let lastIndex = val.length - 1;
  if (current && val[lastIndex] === current[lastIndex]) correctChars++;

  if ((val.endsWith(" ") || val === current) && val.trim().length > 0) {
    attemptedWords++;
    if (val.trim() === current) correctWords++;

    currentWord++;
    input.value = "";
    renderWords();  // Important: Re-render after word completion to mark `.done`
  }

  updateStats();
});

input.addEventListener("keydown", (e) => {
  if (timeLeft <= 0) return;
  if (e.key === "Backspace" && totalCharsTyped > 0) {
    totalCharsTyped--;
    if (correctChars > 0) correctChars--;
  }
});

restartBtn.addEventListener("click", resetTest);
resetTest();