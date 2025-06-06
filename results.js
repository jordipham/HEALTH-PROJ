import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

const margin = { top: 20, right: 30, bottom: 50, left: 60 };

const container = document.getElementById("results-content").parentElement;
const boundingBox = container.getBoundingClientRect();
const width = boundingBox.width - margin.left - margin.right;
const height = boundingBox.width * 0.5 - margin.top - margin.bottom;

const svg = d3
  .select("#resultsgraph")
  .attr("width", width + margin.left + margin.right)
  .attr("height", height + margin.top + margin.bottom)
  .append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

const wpmGroup = svg.append("g").attr("id", "wpm-group");
const tooltip = d3.select("body").append("div").attr("class", "tooltip");

const colorMap = {
  true: "#4b9cd3",
  false: "#D3824B",
};

let x, y, densities;

d3.csv("combined_data_with_keystroke_averages.csv", (d) => ({
  typingSpeed: +d.typingSpeed,
  gt: String(d.gt).toLowerCase() === "true",
})).then((data) => {
  const validData = data.filter((d) => !isNaN(d.typingSpeed));

  x = d3
    .scaleLinear()
    .domain([0, d3.max(validData, (d) => d.typingSpeed)])
    .range([0, width]);

  y = d3.scaleLinear().range([height, 0]);

  const bandwidth = 15;
  const xTicks = x.ticks(100);

  densities = [true, false].map((gtVal) => {
    const groupData = validData
      .filter((d) => d.gt === gtVal)
      .map((d) => d.typingSpeed);
    const density = kernelDensityEstimator(
      kernelEpanechnikov(bandwidth),
      xTicks
    )(groupData);
    return { gt: gtVal, density, color: colorMap[gtVal] };
  });

  y.domain([
    0,
    d3.max(densities, (d) => d3.max(d.density, (dd) => dd[1])),
  ]).nice();

  svg
    .append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x).ticks(10).tickFormat(d3.format(".1f")));

  svg.append("g").call(d3.axisLeft(y).ticks(5).tickFormat(d3.format(".3f")));

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

  svg
    .selectAll(".density")
    .data(densities)
    .enter()
    .append("path")
    .attr("class", "density")
    .attr("fill", "none")
    .attr("stroke", (d) => d.color)
    .attr("stroke-width", 2)
    .attr("d", (d) =>
      d3
        .line()
        .curve(d3.curveBasis)
        .x((d) => x(d[0]))
        .y((d) => y(d[1]))(d.density)
    );

  svg
    .append("rect")
    .attr("class", "overlay")
    .attr("width", width)
    .attr("height", height)
    .style("fill", "none")
    .style("pointer-events", "all")
    .on("mousemove", mousemove)
    .on("mouseout", () => {
      tooltip.style("opacity", 0);
      svg.selectAll(".vertical-line-hover").remove();
    });

  const legendData = [
    { label: "Has Parkinson's", color: colorMap.true },
    { label: "No Parkinson's", color: colorMap.false },
  ];

  const legend = svg
    .append("g")
    .attr("transform", `translate(${width - 150}, 20)`);

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

function mousemove(event) {
  const [mouseX] = d3.pointer(event);
  const x0 = x.invert(mouseX);

  svg.selectAll(".vertical-line-hover").remove();

  svg
    .append("line")
    .attr("class", "vertical-line-hover")
    .attr("x1", x(x0))
    .attr("x2", x(x0))
    .attr("y1", height)
    .attr("y2", 0)
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
      <span style="color:${colorMap.true}">Has Parkinson's</span>: ${
        tooltipData.find((d) => d.gt === true)?.density.toFixed(3) || "0.000"
      }<br>
      <span style="color:${colorMap.false}">No Parkinson's</span>: ${
        tooltipData.find((d) => d.gt === false)?.density.toFixed(3) || "0.000"
      }`
    )
    .style("left", event.pageX + 10 + "px")
    .style("top", event.pageY - 28 + "px");
}

function updateGraph(userWPM) {
  if (!x || !y) return;

  wpmGroup.selectAll("*").remove();

  wpmGroup
    .append("line")
    .attr("x1", x(userWPM))
    .attr("x2", x(userWPM))
    .attr("y1", height)
    .attr("y2", 0)
    .attr("stroke", "red")
    .attr("stroke-width", 2)
    .attr("stroke-dasharray", "4");

  wpmGroup
    .append("text")
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

window.addEventListener("testCompleted", (e) => {
  const userWPM = e.detail.wpm;
  updateGraph(userWPM);
});
