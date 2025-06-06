// global.js — full recode to ensure Back To Top button works and scrollama is active

import scrollama from "https://cdn.jsdelivr.net/npm/scrollama@3.2.0/+esm";

let testIsDone = false;

window.addEventListener("testCompleted", () => {
  testIsDone = true;
});

window.addEventListener("testRestarted", () => {
  testIsDone = false;
});

document.addEventListener("DOMContentLoaded", () => {
  // ✅ Scrollama setup
  const scroller = scrollama();
  scroller
    .setup({
      step: ".step",
      offset: 0.5,
      debug: false,
    })
    .onStepEnter((response) => {
      document
        .querySelectorAll(".step")
        .forEach((step) => step.classList.remove("is-active"));
      response.element.classList.add("is-active");

      const stepNum = response.element.dataset.step;

      document.getElementById("densitytype").style.display =
        stepNum === "7" ? "block" : "none";
      document.getElementById("scatterplot").style.display =
        stepNum === "5" ? "block" : "none";
    });

  window.addEventListener("resize", scroller.resize);

  // ✅ Back to Top button logic
  const backBtn = document.getElementById("backtotop");
  if (backBtn) {
    backBtn.addEventListener("click", () => {
      console.log("Back to Top button clicked");

      // Attempt both root scroll targets
      document.documentElement.scrollTo({ top: 0, behavior: "smooth" });
      document.body.scrollTo({ top: 0, behavior: "smooth" });
    });
  }
});
