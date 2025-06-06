import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

// Set dimensions
// const margin = { top: 20, right: 30, bottom: 50, left: 60 },
//       width = window.innerWidth * 0.45 - margin.left - margin.right,
//       height = window.innerWidth * 0.27 - margin.top - margin.bottom;

const margin = { top: 20, right: 30, bottom: 50, left: 60 };

const container = document.getElementById("grid-item-2").parentElement; // or 'densitytype'
const boundingBox = container.getBoundingClientRect();
const width = boundingBox.width * 0.63 - margin.left - margin.right;
const height = boundingBox.width * 0.32 - margin.top - margin.bottom; // Adjust ratio as needed

const svg = d3
  .select("#densitytype")
  .attr("width", width + margin.left + margin.right)
  .attr("height", height + margin.top + margin.bottom)
  .append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

const tooltip = d3.select("body").append("div").attr("class", "tooltip");

// Load data
d3.csv("combined_data_with_keystroke_averages.csv", (d) => ({
  typingSpeed: +d.typingSpeed,
  gt: String(d.gt).toLowerCase() === "true",
})).then((data) => {
  const validData = data.filter((d) => !isNaN(d.typingSpeed));

  const x = d3
    .scaleLinear()
    .domain([0, d3.max(validData, (d) => d.typingSpeed)])
    .nice()
    .range([0, width]);

  const y = d3.scaleLinear().range([height, 0]);
  const colorMap = { true: " #00bcd4", false: "#F4A261" };

  const xAxis = svg.append("g").attr("transform", `translate(0,${height})`);
  const yAxis = svg.append("g");

  svg
    .append("text")
    .attr("x", width / 2)
    .attr("y", height + 40)
    .attr("text-anchor", "middle")
    .text("Typing Speed");

  svg
    .append("text")
    .attr("x", -height / 2)
    .attr("y", -40)
    .attr("transform", "rotate(-90)")
    .attr("text-anchor", "middle")
    .text("Density");

  const line = d3
    .line()
    .curve(d3.curveBasis)
    .x((d) => x(d[0]))
    .y((d) => y(d[1]));

  const histogram = d3
    .histogram()
    .value((d) => d.typingSpeed)
    .domain(x.domain())
    .thresholds(x.ticks(40));

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

  const bandwidth = 15;
  const xTicks = x.ticks(100);

  d3.selectAll("input[name='groupToggle']").on("change", updateChart);

  updateChart();

  function updateChart() {
    svg
      .selectAll(".density, .bar, .overlay, .vertical-line, .empty-message")
      .remove();

    const both = d3.select("#show-both").property("checked");
    const showTrue = d3.select("#show-true").property("checked");
    const showFalse = d3.select("#show-false").property("checked");

    let groups = [];
    if (both) {
      groups = [true, false];
    } else if (showTrue) {
      groups = [true];
    } else if (showFalse) {
      groups = [false];
    }

    if (groups.length === 2) {
      const densities = groups.map((gtVal) => {
        const groupData = validData
          .filter((d) => d.gt === gtVal)
          .map((d) => d.typingSpeed);
        const density = kernelDensityEstimator(
          kernelEpanechnikov(bandwidth),
          xTicks
        )(groupData);
        return { gt: gtVal, density };
      });

      const globalMaxDensity = d3.max(densities, (d) =>
        d3.max(d.density, (dd) => dd[1])
      );

      y.domain([0, globalMaxDensity]).nice();
      xAxis.call(d3.axisBottom(x).ticks(10).tickFormat(d3.format(".1f")));
      yAxis.call(d3.axisLeft(y).ticks(5).tickFormat(d3.format(".3f")));

      svg
        .selectAll(".density")
        .data(densities)
        .enter()
        .append("path")
        .attr("class", "density")
        .attr("fill", "none")
        .attr("stroke", (d) => colorMap[d.gt])
        .attr("stroke-width", 2)
        .attr("d", (d) => line(d.density));

      const overlay = svg
        .append("rect")
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

        svg
          .append("line")
          .attr("class", "vertical-line")
          .attr("x1", x(x0))
          .attr("x2", x(x0))
          .attr("y1", 0)
          .attr("y2", height)
          .attr("stroke", "black")
          .attr("stroke-dasharray", "3,3");

        const tooltipData = densities.map((d) => {
          const i = d3.bisector((d) => d[0]).left(d.density, x0);
          const density = d.density[i] ? d.density[i][1] : 0;
          return { gt: d.gt, density };
        });

        tooltip
          .style("opacity", 0.9)
          .html(
            `<strong>Typing Speed:</strong> ${x0.toFixed(2)}<br>
            <span style="color:${colorMap[true]}">Has Parkinson's</span>: ${
              tooltipData.find((d) => d.gt === true)?.density.toFixed(3) ||
              "0.000"
            }<br>
            <span style="color:${colorMap[false]}">No Parkinson's</span>: ${
              tooltipData.find((d) => d.gt === false)?.density.toFixed(3) ||
              "0.000"
            }`
          )
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY - 28 + "px");
      }
    } else if (groups.length === 1) {
      const gtVal = groups[0];
      const groupData = validData.filter((d) => d.gt === gtVal);
      const bins = histogram(groupData);
      const total = groupData.length;
      const binWidth = bins[0].x1 - bins[0].x0;
      bins.forEach((d) => (d.density = d.length / (total * binWidth)));

      y.domain([0, d3.max(bins, (d) => d.density)]).nice();
      xAxis.call(d3.axisBottom(x).ticks(10).tickFormat(d3.format(".1f")));
      yAxis.call(d3.axisLeft(y).ticks(5).tickFormat(d3.format(".3f")));

      svg
        .selectAll(".bar")
        .data(bins)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", (d) => x(d.x0))
        .attr("y", (d) => y(d.density))
        .attr("width", (d) => x(d.x1) - x(d.x0) - 1)
        .attr("height", (d) => height - y(d.density))
        .attr("fill", colorMap[gtVal])
        .on("mousemove", (event, d) => {
          tooltip
            .style("opacity", 0.9)
            .html(
              `<strong>Range:</strong> ${d.x0.toFixed(2)} - ${d.x1.toFixed(
                2
              )}<br><strong>Density:</strong> ${d.density.toFixed(3)}`
            )
            .style("left", event.pageX + 10 + "px")
            .style("top", event.pageY - 28 + "px");
        })
        .on("mouseout", () => tooltip.style("opacity", 0));
    }
  }

  const legend = svg
    .append("g")
    .attr("transform", `translate(${width - 150}, 20)`);

  const legendData = [
    { label: "Has Parkinson's", color: colorMap.true },
    { label: "No Parkinson's", color: colorMap.false },
  ];

  legend
    .selectAll("rect")
    .data(legendData)
    .enter()
    .append("rect")
    .attr("x", 0)
    .attr("y", (d, i) => i * 20)
    .attr("width", 12)
    .attr("height", 12)
    .attr("fill", (d) => d.color);
  // .attr("opacity", 0.7);

  legend
    .selectAll("text")
    .data(legendData)
    .enter()
    .append("text")
    .attr("x", 20)
    .attr("y", (d, i) => i * 20 + 10)
    .text((d) => d.label)
    .attr("font-size", "12px")
    .attr("alignment-baseline", "middle");
});
