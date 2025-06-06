import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

// Set up dimensions
const margin = { top: 20, right: 30, bottom: 50, left: 60 };
const container = document.getElementById("grid-item-2").parentElement;
const boundingBox = container.getBoundingClientRect();
const width = boundingBox.width * 0.55 - margin.left - margin.right;
const height = boundingBox.width * 0.32 - margin.top - margin.bottom;

// Create SVG and group
const svg = d3
  .select("#scatterplot")
  .attr("width", width + margin.left + margin.right)
  .attr("height", height + margin.top + margin.bottom)
  .append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

// Tooltip
const tooltip = d3
  .select("body")
  .append("div")
  .attr("class", "tooltip")
  .style("opacity", 0)
  .style("position", "absolute");

// Load and process data
d3.csv("combined_data_with_keystroke_averages.csv", (d) => ({
  typingSpeed: +d.typingSpeed,
  updrs108: +d.updrs108,
  gt: String(d.gt).toLowerCase() === "true",
})).then((data) => {
  const validData = data.filter(
    (d) => !isNaN(d.typingSpeed) && !isNaN(d.updrs108)
  );

  // Scales
  const x = d3.scaleLinear().range([0, width]);
  const y = d3.scaleLinear().range([height, 0]);

  const colorMap = { true: "#00bcd4", false: "#F4A261" };

  // Axes
  svg.append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0,${height})`);

  svg.append("g")
    .attr("class", "y-axis");

  // Labels
  svg.append("text")
    .attr("x", width / 2)
    .attr("y", height + 40)
    .attr("text-anchor", "middle")
    .text("UPDRS (0–108)");

  svg.append("text")
    .attr("x", -height / 2)
    .attr("y", -40)
    .attr("transform", "rotate(-90)")
    .attr("text-anchor", "middle")
    .text("Typing Speed");

  // Legend
  const legend = svg.append("g").attr("transform", `translate(${width - 150}, 20)`);
  const legendData = [
    { label: "Has Parkinson's", color: colorMap.true },
    { label: "No Parkinson's", color: colorMap.false },
  ];

  legend.selectAll("rect")
    .data(legendData)
    .enter()
    .append("rect")
    .attr("x", 0)
    .attr("y", (d, i) => i * 20)
    .attr("width", 12)
    .attr("height", 12)
    .attr("fill", (d) => d.color);

  legend.selectAll("text")
    .data(legendData)
    .enter()
    .append("text")
    .attr("x", 20)
    .attr("y", (d, i) => i * 20 + 10)
    .text((d) => d.label)
    .attr("font-size", "12px")
    .attr("alignment-baseline", "middle");

  const regressionLabel = svg.append("text")
    .attr("x", width - 150)
    .attr("y", 70)
    .attr("font-size", "12px")
    .attr("class", "regression-equation");

  function updatePlot(group) {
    let filteredData =
      group === "both"
        ? validData
        : validData.filter((d) => String(d.gt) === group);

    // Update domains
    x.domain(d3.extent(filteredData, (d) => d.updrs108)).nice();
    y.domain([0, d3.max(filteredData, (d) => d.typingSpeed)]).nice();

    // Update axes
    svg.select(".x-axis")
      .transition().duration(500)
      .call(d3.axisBottom(x));
    svg.select(".y-axis")
      .transition().duration(500)
      .call(d3.axisLeft(y));

    // Regression
    const xMean = d3.mean(filteredData, (d) => d.updrs108);
    const yMean = d3.mean(filteredData, (d) => d.typingSpeed);
    const slope = d3.sum(filteredData, (d) => (d.updrs108 - xMean) * (d.typingSpeed - yMean)) /
                  d3.sum(filteredData, (d) => Math.pow(d.updrs108 - xMean, 2));
    const intercept = yMean - slope * xMean;

    window.slope = slope;
    window.intercept = intercept;

    const xVals = x.domain();
const linePoints = xVals.map(xVal => ({
  x: xVal,
  y: slope * xVal + intercept
}));

    svg.selectAll(".regression-line").remove();

    svg.append("line")
      .attr("class", "regression-line")
      .attr("x1", x(linePoints[0].x))
      .attr("y1", y(linePoints[0].y))
      .attr("x2", x(linePoints[1].x))
      .attr("y2", y(linePoints[1].y))
      .attr("stroke", "black")
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "4,2");

    regressionLabel.text(`y = ${slope.toFixed(2)}x + ${intercept.toFixed(2)}`);

    // Plot points
    const circles = svg.selectAll("circle").data(filteredData, (d) => d.updrs108 + "-" + d.typingSpeed);

    circles.exit().remove();

    circles.enter()
      .append("circle")
      .merge(circles)
      .transition().duration(500)
      .attr("cx", (d) => x(d.updrs108))
      .attr("cy", (d) => y(d.typingSpeed))
      .attr("r", 7)
      .attr("fill", (d) => colorMap[d.gt]);

    svg.selectAll("circle")
      .on("mouseover", function (e, d) {
        d3.select(this).transition().duration(100).attr("r", 12);
        tooltip
          .style("opacity", 0.9)
          .html(
            `<strong>Typing Speed:</strong> ${d.typingSpeed}<br>
             <strong>UPDRS:</strong> ${d.updrs108}<br>
             <span style="color:${colorMap[d.gt]}">${d.gt ? "Has Parkinson's" : "No Parkinson's"}</span>`
          )
          .style("left", e.pageX + 10 + "px")
          .style("top", e.pageY - 28 + "px");
      })
      .on("mouseout", function () {
        d3.select(this).transition().duration(100).attr("r", 7);
        tooltip.style("opacity", 0);
      });
  }

  // Initial render
  updatePlot("both");

  // Attach event listeners
  d3.selectAll('input[name="group"]').on("change", function () {
    updatePlot(this.value);
  });
});