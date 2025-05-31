import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

// Set dimensions and margins
const margin = { top: 20, right: 30, bottom: 50, left: 60 },
  width = 800 - margin.left - margin.right,
  height = 500 - margin.top - margin.bottom;

const svg = d3.select("#densitytype")
  .attr("width", width + margin.left + margin.right)
  .attr("height", height + margin.top + margin.bottom)
  .append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

// Tooltip
const tooltip = d3.select("body").append("div")
  .attr("class", "tooltip");

// Load CSV
d3.csv("combined_data_with_keystroke_averages.csv", d => ({
  typingSpeed: +d.typingSpeed,
  gt: String(d.gt).toLowerCase() === "true"
})).then(data => {
  const validData = data.filter(d => !isNaN(d.typingSpeed));

  // Scales
  const x = d3.scaleLinear()
    .domain(d3.extent(validData, d => d.typingSpeed)).nice()
    .range([0, width]);

  const y = d3.scaleLinear()
    .range([height, 0]);

  const colorMap = { true: "steelblue", false: "orange" };

  // Axes
  const xAxis = svg.append("g")
    .attr("transform", `translate(0,${height})`);

  const yAxis = svg.append("g");

  // Line generator
  const line = d3.line()
    .curve(d3.curveBasis)
    .x(d => x(d[0]))
    .y(d => y(d[1]));

  // Histogram generator
  const histogram = d3.histogram()
    .value(d => d.typingSpeed)
    .domain(x.domain())
    .thresholds(x.ticks(40));

  // Kernel density estimator
  function kernelDensityEstimator(kernel, X) {
    return function (V) {
      return X.map(x => [x, d3.mean(V, v => kernel(x - v))]);
    };
  }

  function kernelEpanechnikov(k) {
    return function (v) {
      return Math.abs(v /= k) <= 1 ? 0.75 * (1 - v * v) / k : 0;
    };
  }

  // Initial render
  updateChart();

  // Event listeners
  d3.select("#toggle-true").on("change", updateChart);
  d3.select("#toggle-false").on("change", updateChart);

  function updateChart() {
    const showTrue = d3.select("#toggle-true").property("checked");
    const showFalse = d3.select("#toggle-false").property("checked");

    svg.selectAll(".density").remove();
    svg.selectAll(".bar").remove();
    svg.selectAll(".overlay").remove();
    svg.selectAll(".vertical-line").remove();

    const groups = [];
    if (showTrue) groups.push(true);
    if (showFalse) groups.push(false);

    const xTicks = x.ticks(100);
    const bandwidth = 15;

    if (groups.length === 2) {
      // Density plot
      const densities = groups.map(gtVal => {
        const groupData = validData.filter(d => d.gt === gtVal).map(d => d.typingSpeed);
        const density = kernelDensityEstimator(kernelEpanechnikov(bandwidth), xTicks)(groupData);
        return { gt: gtVal, density };
      });

      y.domain([0, d3.max(densities, d => d3.max(d.density, dd => dd[1]))]).nice();

      xAxis.call(d3.axisBottom(x));
      yAxis.call(d3.axisLeft(y));

      svg.selectAll(".density")
        .data(densities)
        .enter()
        .append("path")
        .attr("class", "density")
        .attr("fill", "none")
        .attr("stroke", d => colorMap[d.gt])
        .attr("stroke-width", 2)
        .attr("d", d => line(d.density));

      // Tooltip overlay
      const overlay = svg.append("rect")
        .attr("class", "overlay")
        .attr("width", width)
        .attr("height", height)
        .style("fill", "none")
        .style("pointer-events", "all")
        .on("mousemove", mousemove)
        .on("mouseout", () => {
          tooltip.style("opacity", 0);
          svg.selectAll(".vertical-line").remove();
        });

      function mousemove(event) {
        const [mouseX] = d3.pointer(event);
        const x0 = x.invert(mouseX);

        svg.selectAll(".vertical-line").remove();

        svg.append("line")
          .attr("class", "vertical-line")
          .attr("x1", x(x0))
          .attr("x2", x(x0))
          .attr("y1", 0)
          .attr("y2", height)
          .attr("stroke", "black")
          .attr("stroke-dasharray", "3,3");

        const tooltipData = densities.map(d => {
          const i = d3.bisector(d => d[0]).left(d.density, x0);
          const density = d.density[i] ? d.density[i][1] : 0;
          return { gt: d.gt, density };
        });

tooltip
  .style("opacity", 0.9)
  .html(`
    <strong>Typing Speed:</strong> ${x0.toFixed(2)}<br>
    <span style="color:${colorMap[true]}">Parkinson's Density:</span> ${tooltipData.find(d => d.gt === true)?.density.toFixed(3) || "0.000"}<br>
    <span style="color:${colorMap[false]}">No Parkinson's Density:</span> ${tooltipData.find(d => d.gt === false)?.density.toFixed(3) || "0.000"}
  `)
  .style("left", (event.pageX + 10) + "px")
  .style("top", (event.pageY - 28) + "px");
      }

    } else if (groups.length === 1) {
      // Histogram
      const gtVal = groups[0];
      const groupData = validData.filter(d => d.gt === gtVal);
      const bins = histogram(groupData);

      y.domain([0, d3.max(bins, d => d.length)]).nice();

      xAxis.call(d3.axisBottom(x));
      yAxis.call(d3.axisLeft(y));

      svg.selectAll(".bar")
        .data(bins)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", d => x(d.x0))
        .attr("y", d => y(d.length))
        .attr("width", d => x(d.x1) - x(d.x0) - 1)
        .attr("height", d => height - y(d.length))
        .attr("fill", colorMap[gtVal])
        .on("mousemove", (event, d) => {
          tooltip
            .style("opacity", 0.9)
            .html(`Range: ${d.x0.toFixed(2)} - ${d.x1.toFixed(2)}<br>Count: ${d.length}`)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", () => tooltip.style("opacity", 0));
    }
  }



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
    // .attr("opacity", 0.5);

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