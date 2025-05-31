import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

// Set dimensions and margins
const margin = { top: 20, right: 30, bottom: 50, left: 70 },
      width = 800 - margin.left - margin.right,
      height = 500 - margin.top - margin.bottom;

const svg = d3.select("#scatterplot")
  .attr("width", width + margin.left + margin.right)
  .attr("height", height + margin.top + margin.bottom)
  .append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

// Tooltip
const tooltip = d3.select("body").append("div")
  .attr("class", "tooltip")
  .style("opacity", 0)
  .style("position", "absolute");

// Load CSV
d3.csv("combined_data_with_keystroke_averages.csv", d => ({
  typingSpeed: +d.typingSpeed,
  updrs108: +d.updrs108,
  gt: String(d.gt).toLowerCase() === "true"
})).then(data => {
  const validData = data.filter(d => !isNaN(d.typingSpeed) && !isNaN(d.updrs108));

  // Scales (swapped axes)
  const x = d3.scaleLinear()
    .domain(d3.extent(validData, d => d.updrs108)).nice()
    .range([0, width]);

const y = d3.scaleLinear()
    .domain([0, d3.max(validData, d => d.typingSpeed)]).nice()
    .range([height, 0]);

  // Colors
  const colorMap = { true: "steelblue", false: "orange" };

  // Single regression line for all data
  const xMean = d3.mean(validData, d => d.updrs108);
  const yMean = d3.mean(validData, d => d.typingSpeed);
  const slope = d3.sum(validData, d => (d.updrs108 - xMean) * (d.typingSpeed - yMean)) /
                d3.sum(validData, d => Math.pow(d.updrs108 - xMean, 2));
  const intercept = yMean - slope * xMean;

  const xVals = d3.extent(validData, d => d.updrs108);
  const linePoints = xVals.map(xVal => ({
    x: xVal,
    y: slope * xVal + intercept
  }));

  svg.append("line")
    .attr("x1", x(linePoints[0].x))
    .attr("y1", y(linePoints[0].y))
    .attr("x2", x(linePoints[1].x))
    .attr("y2", y(linePoints[1].y))
    .attr("stroke", "black")
    .attr("stroke-width", 2)
    .attr("stroke-dasharray", "4,2");

  // Axes
  svg.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x));

  svg.append("g")
    .call(d3.axisLeft(y));

  // Points
  svg.selectAll("circle")
    .data(validData)
    .join("circle")
    .attr("cx", d => x(d.updrs108))
    .attr("cy", d => y(d.typingSpeed))
    .attr("r", 7)
    .attr("fill", d => colorMap[d.gt])
    // .attr("opacity", 0.7)
    .on("mouseover", function (e, d) {
  d3.select(this).transition().duration(100).attr("r", 12);

  tooltip.style("opacity", 0.9)
    .html(`
      <strong>Typing Speed:</strong> ${d.typingSpeed}<br>
      <strong>UPDRS:</strong> ${d.updrs108}<br>
      <span style="color:${colorMap[d.gt]}">${d.gt ? "Has Parkinson's" : "No Parkinson's"}</span>
    `)
    .style("left", (e.pageX + 10) + "px")
    .style("top", (e.pageY - 28) + "px");
})
.on("mouseout", function () {
  d3.select(this).transition().duration(100).attr("r", 7);
  tooltip.style("opacity", 0);
});

  // Axis labels (swapped)
  svg.append("text")
    .attr("x", width / 2)
    .attr("y", height + 40)
    .attr("text-anchor", "middle")
    .text("UPDRS (0–108)");

  svg.append("text")
    .attr("x", -height / 2)
    .attr("y", -50)
    .attr("transform", "rotate(-90)")
    .attr("text-anchor", "middle")
    .text("Typing Speed");

  // Legend
  const legend = svg.append("g")
    .attr("transform", `translate(${width - 150}, 20)`);

  const legendData = [{ label: "Has Parkinson's", color: colorMap.true },
                      { label: "No Parkinson's", color: colorMap.false }];

  legend.selectAll("rect")
    .data(legendData)
    .enter()
    .append("rect")
    .attr("x", 0)
    .attr("y", (d, i) => i * 20)
    .attr("width", 12)
    .attr("height", 12)
    .attr("fill", d => d.color)
    // .attr("opacity", 0.7);

  legend.selectAll("text")
    .data(legendData)
    .enter()
    .append("text")
    .attr("x", 20)
    .attr("y", (d, i) => i * 20 + 10)
    .text(d => d.label)
    .attr("font-size", "12px")
    .attr("alignment-baseline", "middle");
});