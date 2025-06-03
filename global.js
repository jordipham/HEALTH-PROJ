import scrollama from "https://cdn.jsdelivr.net/npm/scrollama@3.2.0/+esm";

// Wait until DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  // Initialize scrollama instance
  const scroller = scrollama();

  // Setup Scrollama
  scroller
    .setup({
      step: ".step",
      offset: 0.5,
      debug: false,
    })
    .onStepEnter((response) => {
      // Make current step active, others inactive
      document
        .querySelectorAll(".step")
        .forEach((step) => step.classList.remove("is-active"));
      response.element.classList.add("is-active");

      // Get step number from data attribute
      const stepNum = response.element.dataset.step;

      // Hide all visuals by default
      document.getElementById("densitytype").style.display = "none";
      document.getElementById("scatterplot").style.display = "none";
      document.querySelector(".typing-test").style.display = "none";
      document.getElementById("results-area").classList.add("hidden");

      // Show relevant visual
      if (stepNum === "4") {
        document.getElementById("densitytype").style.display = "block";
      } else if (stepNum === "5") {
        document.getElementById("scatterplot").style.display = "block";
      } else if (stepNum === "6") {
        document.querySelector(".typing-test").style.display = "block";
        document.getElementById("results-area").classList.remove("hidden");
      }
    });

  window.addEventListener("resize", scroller.resize);
});
