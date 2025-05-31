import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

// Set dimensions and margins
const margin = { top: 20, right: 30, bottom: 50, left: 70 },
      width = 800 - margin.left - margin.right,
      height = 500 - margin.top - margin.bottom;

const svg = d3.select("#resultsgraph")
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
  typing_speed: d.typingSpeed ? +d.typingSpeed : NaN,
  gt: String(d.gt).toLowerCase() === "true"
})).then(data => {
  const validData = data.filter(d => !isNaN(d.typing_speed));

  if (validData.length === 0) {
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", height / 2)
      .attr("text-anchor", "middle")
      .text("No valid data found.");
    return;
  }

  // X Scale
  const x = d3.scaleLinear()
    .domain(d3.extent(validData, d => d.typing_speed))
    .nice()
    .range([0, width]);

  // Histogram bins
  const histogram = d3.bin()
    .value(d => d.typing_speed)
    .domain(x.domain())
    .thresholds(20);

  const binsTrue = histogram(validData.filter(d => d.gt));
  const binsFalse = histogram(validData.filter(d => !d.gt));

  // Density adjustment
  const totalTrue = d3.sum(binsTrue, d => d.length);
  const totalFalse = d3.sum(binsFalse, d => d.length);

  binsTrue.forEach(d => d.density = d.length / totalTrue);
  binsFalse.forEach(d => d.density = d.length / totalFalse);

  // Y Scale (density)
  const y = d3.scaleLinear()
    .domain([0, d3.max([...binsTrue, ...binsFalse], d => d.density)])
    .nice()
    .range([height, 0]);

  // Colors
  const colorMap = { true: "steelblue", false: "orange" };

  // Bars for True
  svg.selectAll(".bar-true")
    .data(binsTrue)
    .join("rect")
    .attr("x", d => x(d.x0))
    .attr("y", d => y(d.density))
    .attr("width", d => Math.max(0, x(d.x1) - x(d.x0) - 1))
    .attr("height", d => height - y(d.density))
    .attr("fill", colorMap.true)
    .attr("opacity", 0.5)
    .on("mousemove", (e, d) => {
      tooltip.style("opacity", 0.9)
        .html(`gt = True<br>Range: ${d.x0.toFixed(1)} - ${d.x1.toFixed(1)}<br>Density: ${d.density.toFixed(3)}`)
        .style("left", (e.pageX + 10) + "px")
        .style("top", (e.pageY - 28) + "px");
    })
    .on("mouseout", () => tooltip.style("opacity", 0));

  // Bars for False
  svg.selectAll(".bar-false")
    .data(binsFalse)
    .join("rect")
    .attr("x", d => x(d.x0))
    .attr("y", d => y(d.density))
    .attr("width", d => Math.max(0, x(d.x1) - x(d.x0) - 1))
    .attr("height", d => height - y(d.density))
    .attr("fill", colorMap.false)
    .attr("opacity", 0.5)
    .on("mousemove", (e, d) => {
      tooltip.style("opacity", 0.9)
        .html(`gt = False<br>Range: ${d.x0.toFixed(1)} - ${d.x1.toFixed(1)}<br>Density: ${d.density.toFixed(3)}`)
        .style("left", (e.pageX + 10) + "px")
        .style("top", (e.pageY - 28) + "px");
    })
    .on("mouseout", () => tooltip.style("opacity", 0));

  // Axes
  svg.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x));

  svg.append("g")
    .call(d3.axisLeft(y));

  // Labels
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
    .attr("opacity", 0.5);

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