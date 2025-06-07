// typingtest.js — recoded to avoid auto-scroll on load, only scrolls/focuses on manual restart

const wordBank = [
  "the",
  "and",
  "is",
  "it",
  "to",
  "in",
  "you",
  "that",
  "of",
  "on",
  "for",
  "with",
  "this",
  "was",
  "but",
  "not",
  "are",
  "have",
  "be",
  "at",
  "or",
  "from",
  "by",
  "as",
  "an",
  "if",
  "they",
  "all",
  "we",
  "your",
  "one",
  "can",
  "there",
  "so",
  "what",
  "about",
  "more",
  "when",
  "just",
  "like",
  "up",
  "how",
  "out",
  "now",
  "will",
  "then",
  "them",
  "who",
  "time",
  "into",
  "also",
  "good",
  "people",
  "see",
  "know",
  "some",
  "could",
  "very",
  "think",
  "want",
  "say",
  "make",
  "new",
  "way",
  "look",
  "day",
  "use",
  "back",
  "work",
  "first",
  "life",
  "man",
  "woman",
  "child",
  "world",
  "over",
  "after",
  "again",
  "still",
  "right",
  "find",
  "help",
  "long",
  "place",
  "too",
  "never",
  "under",
  "same",
  "high",
  "small",
  "while",
  "few",
  "last",
  "leave",
  "feel",
  "ask",
  "keep",
  "love",
  "give",
  "try",
  "call",
  "tell",
  "best",
  "next",
  "sure",
];

let words = [],
  currentWord = 0;
let totalCharsTyped = 0,
  correctChars = 0,
  correctWords = 0,
  attemptedWords = 0;
let startTime = null,
  timerInterval = null,
  timeLeft = 15;

const input = document.getElementById("input");
const wordsDiv = document.getElementById("words");
const timeLeftSpan = document.getElementById("time-left");
const finalWpmSpan = document.getElementById("final-wpm");
const finalAccuracySpan = document.getElementById("final-accuracy");
const percentileText = document.getElementById("percentile-text");
const realityCheck = document.getElementById("reality-check");
const resultsArea = document.getElementById("results-area");
const restartBtn1 = document.getElementById("restart");
const restartBtn2 = document.getElementById("restart-2");

function getRandomWords(n) {
  return Array.from(
    { length: n },
    () => wordBank[Math.floor(Math.random() * wordBank.length)]
  );
}

function renderWords() {
  wordsDiv.innerHTML = "";
  words.forEach((word, i) => {
    const span = document.createElement("span");
    span.textContent = word + (i < words.length - 1 ? " " : "");
    if (i < currentWord) span.classList.add("done");
    else if (i === currentWord) span.classList.add("current");
    wordsDiv.appendChild(span);
  });
}

function initTest() {
  words = getRandomWords(50);
  currentWord =
    totalCharsTyped =
    correctChars =
    correctWords =
    attemptedWords =
      0;
  timeLeft = 15;
  startTime = null;
  input.value = "";
  input.disabled = false;
  timeLeftSpan.textContent = `Time: ${timeLeft}s`;
  renderWords();
  resultsArea.classList.add("hidden");
}

function resetTest() {
  initTest();
  resultsArea.classList.remove("hidden");
  resultsArea.classList.remove("show-results");

  setTimeout(() => {
    document
      .querySelector('[data-step="10"]')
      .scrollIntoView({ behavior: "smooth", block: "center" });
  }, 100);

  input.focus();
  window.dispatchEvent(new Event("testRestarted"));
}

function startTimer() {
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    timeLeft--;
    timeLeftSpan.textContent = `Time: ${timeLeft}s`;
    if (timeLeft <= 0) endTest();
  }, 1000);
}

function endTest() {
  clearInterval(timerInterval);
  input.disabled = true;
  const duration = (Date.now() - startTime) / 60000; // ms to min
  const wpm = duration > 0 ? Math.round(totalCharsTyped / 5 / duration) : 0;
  displayResults(wpm);

  window.dispatchEvent(new CustomEvent("testCompleted", { detail: { wpm } }));
  resultsArea.classList.remove("hidden");
  resultsArea.classList.add("show-results");

  setTimeout(() => {
    document
      .querySelector('[data-step="11"]')
      .scrollIntoView({ behavior: "smooth" });
  }, 150);
}

function displayResults(wpm) {
  finalWpmSpan.innerHTML = `<strong>WPM:</strong> ${wpm}`;
  finalAccuracySpan.innerHTML = `<strong>Accuracy:</strong> ${
    attemptedWords > 0 ? Math.round((correctWords / attemptedWords) * 100) : 100
  }%`;
  localStorage.setItem("latestWPM", wpm);

  fetch("combined_data_with_keystroke_averages.csv")
    .then((r) => r.text())
    .then((text) => {
      const wpmVal = Math.max(
        0,
        parseFloat(localStorage.getItem("latestWPM")) || 0
      );
      const rows = text.trim().split("\n").slice(1);
      const speeds = rows
        .map((r) => parseFloat(r.split(",")[3]))
        .filter((v) => !isNaN(v))
        .sort((a, b) => a - b);
      const percentile = Math.round(
        (speeds.filter((v) => v <= wpmVal).length / speeds.length) * 100
      );

      const slope = window.slope || 0;
      const intercept = window.intercept || 0;
      const estimate =
        slope !== 0 ? ((wpmVal - intercept) / slope).toFixed(2) : "N/A";

      percentileText.innerHTML = `
        Your typing speed is higher than approximately <strong>${percentile}%</strong> of test participants. <br><br>
        According to our regression model, a score of <strong>${wpmVal} WPM</strong> corresponds to a UPDRS estimate of <strong>${estimate}</strong>.`;

      realityCheck.innerHTML = 
      `<span style="display: block; text-align: center; margin-top: 0;">
        &#10082 Reality Check &#10082
      </span>
      You may have been assigned a high UPDRS and not have PD! This is proof that you cannot determine Parkinson's severity from just 
      WPM alone.`;
    });
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
  if (val[val.length - 1] === current?.[val.length - 1]) correctChars++;

  if (val.endsWith(" ") && val.trim().length > 0) {
    attemptedWords++;
    if (val.trim() === current) correctWords++;
    currentWord++;
    input.value = "";
    renderWords();
  }
});

input.addEventListener("keydown", (e) => {
  if (e.key === "Backspace" && totalCharsTyped > 0) {
    totalCharsTyped--;
    if (correctChars > 0) correctChars--;
  }
});

restartBtn1.addEventListener("click", resetTest);
if (restartBtn2) restartBtn2.addEventListener("click", resetTest);

// On first page load — no scroll
initTest();
