import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

// Set dimensions and margins
const margin = { top: 20, right: 30, bottom: 50, left: 50 },
      width = 800 - margin.left - margin.right,
      height = 500 - margin.top - margin.bottom;

const svg = d3.select("#densitytype")
  .attr("width", width + margin.left + margin.right)
  .attr("height", height + margin.top + margin.bottom)
  .append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

// Tooltip
const tooltip = d3.select("body").append("div")
  .attr("class", "tooltip")
  .style("opacity", 0);

d3.csv("combined_data_with_keystroke_averages.csv", d => {
  return {
    typing_speed: d.typingSpeed ? +d.typingSpeed : NaN,
    gt: String(d.gt).toLowerCase() === "true"
  };
}).then(data => {
  // Filter out bad rows
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

  // Histogram
  const histogram = d3.bin()
    .value(d => d.typing_speed)
    .domain(x.domain())
    .thresholds(20);

  const binsTrue = histogram(validData.filter(d => d.gt));
  const binsFalse = histogram(validData.filter(d => !d.gt));

  // Y Scale
  const y = d3.scaleLinear()
    .domain([0, d3.max([...binsTrue, ...binsFalse], d => d.length)])
    .nice()
    .range([height, 0]);

  // Colors
  const colorMap = { true: "steelblue", false: "orange" };

  // Bars for True
  svg.selectAll(".bar-true")
    .data(binsTrue)
    .join("rect")
    .attr("x", d => x(d.x0))
    .attr("y", d => y(d.length))
    .attr("width", d => {
      const w = x(d.x1) - x(d.x0) - 1;
      return isNaN(w) || w < 0 ? 0 : w;
    })
    .attr("height", d => height - y(d.length))
    .attr("fill", colorMap.true)
    .on("mouseover", (e, d) => {
      tooltip.transition().duration(200).style("opacity", 0.9);
      tooltip.html(`gt = True<br>Range: ${d.x0.toFixed(1)} - ${d.x1.toFixed(1)}<br>Count: ${d.length}`)
        .style("left", (e.pageX + 10) + "px")
        .style("top", (e.pageY - 28) + "px");
    })
    .on("mouseout", () => tooltip.transition().duration(300).style("opacity", 0));

  // Bars for False
  svg.selectAll(".bar-false")
    .data(binsFalse)
    .join("rect")
    .attr("x", d => x(d.x0))
    .attr("y", d => y(d.length))
    .attr("width", d => {
      const w = x(d.x1) - x(d.x0) - 1;
      return isNaN(w) || w < 0 ? 0 : w;
    })
    .attr("height", d => height - y(d.length))
    .attr("fill", colorMap.false)
    .on("mouseover", (e, d) => {
      tooltip.transition().duration(200).style("opacity", 0.9);
      tooltip.html(`gt = False<br>Range: ${d.x0.toFixed(1)} - ${d.x1.toFixed(1)}<br>Count: ${d.length}`)
        .style("left", (e.pageX + 10) + "px")
        .style("top", (e.pageY - 28) + "px");
    })
    .on("mouseout", () => tooltip.transition().duration(300).style("opacity", 0));

  // X Axis
  svg.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x));

  // Y Axis
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
    .text("Count");
});