import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

const margin = { top: 20, right: 30, bottom: 50, left: 60 },
  width = 800 - margin.left - margin.right,
  height = 500 - margin.top - margin.bottom;

const svg = d3
  .select("#resultsgraph")
  .attr("width", width + margin.left + margin.right)
  .attr("height", height + margin.top + margin.bottom)
  .append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

let x, y;

d3.csv("combined_data_with_keystroke_averages.csv", (d) => ({
  typingSpeed: +d.typingSpeed,
  gt: String(d.gt).toLowerCase() === "true",
})).then((data) => {
  const validData = data.filter((d) => !isNaN(d.typingSpeed));

  x = d3.scaleLinear()
  .domain([0, d3.max(validData, (d) => d.typingSpeed)]) // 👈 Start at 0
  .range([0, width]);
  y = d3.scaleLinear().range([height, 0]);

  svg.append("text")
    .attr("x", width / 2)
    .attr("y", height + 40)
    .attr("text-anchor", "middle")
    .text("Typing Speed");

  svg.append("text")
    .attr("x", -height / 2)
    .attr("y", -40)
    .attr("transform", "rotate(-90)")
    .attr("text-anchor", "middle")
    .text("Density");

  const line = d3.line().curve(d3.curveBasis).x((d) => x(d[0])).y((d) => y(d[1]));
  const bandwidth = 15;
  const xTicks = x.ticks(100);

  const densities = [true, false].map((gtVal) => {
    const groupData = validData.filter((d) => d.gt === gtVal).map((d) => d.typingSpeed);
    const density = kernelDensityEstimator(kernelEpanechnikov(bandwidth), xTicks)(groupData);
    return { gt: gtVal, density, color: gtVal ? "#00bcd4" : "#F4A261" };
  });

  y.domain([
    0,
    d3.max(densities, (d) => d3.max(d.density, (dd) => dd[1]))
  ]).nice();

  svg.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x).ticks(10).tickFormat(d3.format(".1f")));

  svg.append("g")
    .call(d3.axisLeft(y).ticks(5).tickFormat(d3.format(".3f")));

  svg.selectAll(".density")
    .data(densities)
    .enter()
    .append("path")
    .attr("class", "density")
    .attr("fill", "none")
    .attr("stroke", (d) => d.color)
    .attr("stroke-width", 2)
    .attr("d", (d) => line(d.density));
});

// 🎯 Listen for test result WPM and draw the vertical line:
function updateGraph(userWPM) {
  if (!x || !y) return; // Ensure scales exist

  svg.append("line")
    .attr("x1", x(userWPM))
    .attr("x2", x(userWPM))
    .attr("y1", height)
    .attr("y2", 0)
    .attr("stroke", "red")
    .attr("stroke-width", 2)
    .attr("stroke-dasharray", "4");

  svg.append("text")
    .attr("x", x(userWPM))
    .attr("y", -10)
    .attr("text-anchor", "middle")
    .attr("font-size", "12px")
    .attr("fill", "red")
    .text(`Your WPM: ${userWPM}`);
}

function kernelDensityEstimator(kernel, X) {
  return function (V) {
    return X.map((x) => [x, d3.mean(V, (v) => kernel(x - v))]);
  };
}

function kernelEpanechnikov(k) {
  return function (v) {
    return Math.abs((v /= k)) <= 1 ? (0.75 * (1 - v * v)) / k : 0;
  };
}

// 🎯 Listen for test completion event:
window.addEventListener("testCompleted", (e) => {
  const userWPM = e.detail.wpm;
  updateGraph(userWPM);
});