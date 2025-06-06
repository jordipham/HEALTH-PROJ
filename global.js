import scrollama from "https://cdn.jsdelivr.net/npm/scrollama@3.2.0/+esm";

let testIsDone = false;

// Listen for when the typing test ends
window.addEventListener("testCompleted", () => {
  testIsDone = true;
});

// Optional: reset flag when test is restarted
window.addEventListener("testRestarted", () => {
  testIsDone = false;
});

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

      // Hide visuals not in current step
      if (stepNum !== "4") {
        document.getElementById("densitytype").style.display = "none";
      } else {
        document.getElementById("densitytype").style.display = "block";
      }

      if (stepNum !== "5") {
        document.getElementById("scatterplot").style.display = "none";
      } else {
        document.getElementById("scatterplot").style.display = "block";
      }

      

    });

  window.addEventListener("resize", scroller.resize);
});
