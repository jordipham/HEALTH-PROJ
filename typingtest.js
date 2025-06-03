// typingtest.js - Final Version with WPM & Percentile

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
const restartBtn = document.getElementById("restart");
const timeLeftSpan = document.getElementById("time-left");
const resultsArea = document.getElementById("results-area");
const finalWpmSpan = document.getElementById("final-wpm");
const finalAccuracySpan = document.getElementById("final-accuracy");
const percentileText = document.getElementById("percentile-text");

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

function displayFinalStats(wpm) {
  finalWpmSpan.textContent = `WPM: ${wpm}`;
  finalAccuracySpan.textContent = `Accuracy: ${attemptedWords > 0 ? Math.round((correctWords / attemptedWords) * 100) : 100}%`;

  // Save WPM for graph
  localStorage.setItem("latestWPM", wpm);

  // Fetch CSV and compute percentile
  fetch("combined_data_with_keystroke_averages.csv")
    .then(response => response.text())
    .then(text => {
      const rows = text.trim().split("\n").slice(1);
      const speeds = rows.map(r => parseFloat(r.split(",")[3])).filter(v => !isNaN(v)).sort((a, b) => a - b);
      const count = speeds.length;
      const below = speeds.filter(v => v <= wpm).length;
      const percentile = Math.round((below / count) * 100);


      const wpmValue = parseFloat(localStorage.getItem("latestWPM"));
      let updrsEstimate = "N/A";

      // Ensure slope and intercept exist
      if (!isNaN(wpmValue) && typeof window.slope !== "undefined" && typeof window.intercept !== "undefined" && window.slope !== 0) {
        updrsEstimate = ((wpmValue - window.intercept) / window.slope).toFixed(2);
      }

      percentileText.innerHTML = `Your typing speed is higher than approximately ${percentile}% of test participants. According to the linear 
      regression of our data, a score of ${wpmValue} WPM would approximately correspond to a UPDRS score of ${updrsEstimate}. 
      
      <br><br>

      This calculated UPDRS score is an estimate based on the linear regression 
      model of our data, and it should not be interpreted as a medical diagnosis. While the model shows a general relationship between typing speed and UPDRS score, there is no definitive threshold 
      that can classify an individual’s health status based on typing speed alone. The variability in typing patterns and individual differences means that it is not possible to determine a 
      clear-cut classification or provide a diagnosis from this data. Any predictions made should be considered speculative and used only for exploratory purposes, not for clinical evaluation.`;
    });

  resultsArea.classList.remove("hidden");
}

function endTest() {
  endTime = Date.now();
  clearInterval(timerInterval);
  input.disabled = true;

  const duration = (endTime - startTime) / 1000 / 60;
  const wordsTyped = totalCharsTyped / 5;
  const wpm = duration > 0 ? Math.round(wordsTyped / duration) : 0;

  document.getElementById("grid-container").classList.remove("hidden");
  setTimeout(() => {
    document.getElementById("results-area").scrollIntoView({ behavior: "smooth" });
  }, 50); // 50ms is enough to let the DOM reflow

  displayFinalStats(wpm);

  const event = new CustomEvent("testCompleted", { detail: { wpm: wpm } });
  window.dispatchEvent(event);

}

function resetTest() {
  clearInterval(timerInterval);
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
  //   input.focus();
  resultsArea.classList.add("hidden");

  restartBtn.blur();
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
    renderWords();
  }
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