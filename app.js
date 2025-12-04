import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import * as field from './fields.js'
import * as util from "./util.js";

"use strict";

const width = 800;
const height = 600;
const maxTicks = 33;

const margin = { top: 8, bottom: 30, right: 8, left: 24 };
const innerW = width - margin.left - margin.right;
const innerH = height - margin.top - margin.bottom;


const tooltip = d3.select("#tooltip");

const svg = d3.select("#svg")
  .attr("width", width)
  .attr("height", height);

const graph = svg.append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`)
const gx = graph.append("g")
  .attr("id", 'x-axis')
  .attr("transform", `translate(0,${innerH})`)
const gy = graph.append("g")
  .attr('id', 'y-axis')
  .attr("transform", `translate(0,0)`)

const lines = graph.append("g")
  .attr('id', 'lines');
const ptsGroup = graph.append("g")
  .attr("id", "points")

const eqn = d3.select('#eqn');
const xs = d3.scaleLinear().range([0, innerW]);
const ys = d3.scaleLinear().range([innerH, 0]);

let last = { a: -1, b: -1, p: -1 };

function changed(a, b, p) {
  if (last.a === a && last.b === b && last.p === p) return false;
  last = { a, b, p };
  return true;
}

function init(p) {
  const t = d3.transition().duration(300).ease(d3.easeExp);
  const tr = e => e.transition(t);
  t.on('end', () => button.removeAttribute('disabled'));
  gx.selectAll('*').interrupt();
  gy.selectAll('*').interrupt();
  ptsGroup.selectAll('*').interrupt();

  button.setAttribute("disabled", "");
  selectPoint(null);

  xs.domain([0, p - 1]);
  ys.domain([0, p - 1]);
  const ticks = Math.min(p - 1, maxTicks);
  const xAxis = d3.axisBottom(xs).ticks(ticks);
  const yAxis = d3.axisLeft(ys).ticks(ticks);

  return { tr, ticks, xAxis, yAxis };
}

const typesetNode = (node, text) => {
  MathJax.typesetClear([node.node()]);
  node.text(text);
  MathJax.typesetPromise([node.node()]);
}

function drawAxes(tr, xAxis, yAxis) {
  tr(gx).call(xAxis)
    .selectAll(".tick:not(:first-of-type) line")
    .attr('class', 'grid-line')
    .attr('y1', -1)
    .attr('y2', -1 * innerH);

  tr(gy).call(yAxis)
    .selectAll(".tick:not(:first-of-type) line")
    .attr('class', 'grid-line')
    .attr('x1', 1)
    .attr('x2', innerW);
}

let points;
let scale;

const notes = d3.select('#notes');

function drawField(a, b, p) {
  if (!changed(a, b, p)) return;
  // console.clear();

  const { tr, ticks, xAxis, yAxis } = init(p);
  drawAxes(tr, xAxis, yAxis);

  field.init(a, b, p);
  if (!field.isPrime()) notes.classed('hidden', false).text('p is not prime! Operations may not always be valid in a non-prime field.');
  else if (field.isSingular()) notes.classed('hidden', false).text('This curve is not non-singular!');
  else notes.classed('hidden', true).text('');
  points = field.points().slice(1);
  scale = ticks / (field.p() - 1);

  typesetNode(eqn, `\\(E: y^2 \\equiv x^3 ${coeff(a, 'x')} ${coeff(b, '')}\\pmod{${p}}\\quad \\#E=${points.length + 1}\\)`);

  ptsGroup.selectAll("circle.point")
    .data(points, pt => pt.toString())
    .join(
      enter => enter.append('circle')
        .classed('point', true)
        .attr('r', 0)
        .attr('cx', pt => xs(pt.x))
        .attr('cy', pt => ys(pt.y))
        .call(e => tr(e).attr('r', 5 * scale)),
      u => tr(u).attr('cx', d => xs(d.x)).attr('cy', d => ys(d.y)).attr('r', 5 * scale),
      e => tr(e).attr('r', 0).remove())
    .on('click', e => selectPoint(e.currentTarget))
    .on('contextmenu', (e, pt) => { e.preventDefault(); addPoint(selectedPoint?.datum(), pt) })
    .on("mouseover.ttip", (evt, pt) => tooltip.style("visibility", "visible")
      .style('opacity', '100')
      .call(ttip, d3.pointer(evt, document.body))
      .text(pt))
    .on("mousemove.ttip", evt => tooltip.call(ttip, d3.pointer(evt, document.body)))
    .on("mouseout.ttip", () => tooltip.style("visibility", 'hidden').style('opacity', '0'));

}

const ttip = (t, [mx, my]) => t.style("left", `${mx + 8}px`).style("top", `${my - 4}px`)
function coeff(co, term) {
  if (co === 0) return "";
  if (co === 1) return `+ ${term || co}`;
  if (co === -1) return `- ${term || Math.abs(co)}`;
  if (co > 1) return `+ ${co}${term}`;
  return `- ${Math.abs(co)}${term}`;
}

const topbox = d3.select('#topbox');
const active = d3.select('#activebox');
const subgroup = d3.select('#subgroup');
const addbox = d3.select('#addbox');
let hr = d3.select('hr');
let selectedPoint = undefined;

function selectPoint(target = null) {
  MathJax.typesetClear([addbox.node(), active.node(), subgroup.node()]);
  topbox.classed('hidden', true);
  active.text('');
  subgroup.html('');
  addbox.text('');
  lines.selectAll('*').interrupt().remove();
  hr.classed('hidden', true);
  clearSums();
  selectedPoint?.classed('active', false);

  if (!target) {
    selectedPoint = null;
    return;
  }

  selectedPoint = d3.select(target);
  selectedPoint.classed('active', true);

  const group = selectedPoint.datum().group();
  const groupstr = `\\(${group.join('\\to')}\\)`
  // console.log(groupstr);
  topbox.classed('hidden', false);
  active.text(`Selected \\(P=${selectedPoint.datum().toString()}\\)`);
  subgroup.html(`Cyclic group generated by \\(P\\,(|G|=${group.length})\\): <br>${groupstr}`)
  MathJax.typesetPromise([active.node(), subgroup.node()]);
}

let sumPoint, negSumPoint;
const clearSums = () => {
  sumPoint?.classed('sum', false);
  negSumPoint?.classed('negative', false);
};

async function addPoint(P, Q, write = true) {
  if (!P || !Q) return;
  clearSums();
  const sum = P.plus(Q);
  if (write) {
    hr.classed('hidden', false);
    typesetNode(addbox, `\\(${P} + ${Q} = ${sum}\\)`);
  }

  lines.selectAll('*').interrupt().remove();

  if (P.isInfinity()) return Q;
  else if (Q.isInfinity()) return P;

  lines.append('line')
    .attr('x1', xs(P.x))
    .attr('y1', ys(P.y))
    .attr('x2', xs(P.x))
    .attr('y2', ys(P.y))
    .attr('stroke', 'orange')
    .attr('stroke-width', Math.min(2, 5 * scale))
    .attr('stroke-dasharray', '8 4')
    .transition()
    .ease(d3.easeLinear)
    .duration(1000)
    .attr('x2', xs(Q.x))
    .attr('y2', ys(Q.y));

  if (sum.isInfinity()) {
    lines.append('line')
      .attr('x1', xs(Q.x))
      .attr('y1', ys(Q.y))
      .attr('x2', xs(Q.x))
      .attr('y2', ys(Q.y))
      .attr('stroke', 'red')
      .attr('stroke-width', Math.min(2, 4 * scale))
      .transition()
      .ease(d3.easeLinear)
      .delay(1000)
      .duration(500)
      .attr('y1', ys(0))
      .attr('y2', ys(field.p() - 1))
    return sum;
  }

  const EPSILON = 1e-6;
  const negSum = sum.negate();
  let curr = Q.asObj();
  const m = util.slope(P, Q);
  const ends = [];
  const rev = P.x > Q.x;
  let end;

  // console.log(P, Q, m);

  sumPoint = ptsGroup.selectAll('circle').filter(d => d.equals(sum));
  negSumPoint = ptsGroup.selectAll('circle').filter(d => d.equals(negSum));

  const max = field.p();
  let flag = Q.equals(negSum);

  for (let i = 0; i < 100; i++) {
    let xP = rev ? -curr.x : max - curr.x;
    let yc = curr.y + (m * xP);
    if (yc < EPSILON) xP = util.xAtY(curr, m, 0) - curr.x;
    else if (yc > max - EPSILON) xP = util.xAtY(curr, m, max) - curr.x;
    end = { x: curr.x + xP, y: curr.y + (m * xP) };

    if (!flag && util.inline(curr, end, negSum)) {
      // console.log(`inline after ${i}`, curr, end)
      end = { x: negSum.x, y: negSum.y };
      ends.push([curr, end]);
      break;
    }
    flag = false;
    ends.push([curr, end]);

    // console.log(curr, end);
    let { x: nx, y: ny } = end;
    if (nx < EPSILON || nx >= max - EPSILON) nx = max - nx;
    if (ny < EPSILON || ny >= max - EPSILON) ny = max - ny;
    curr = { x: nx, y: ny };
  }

  try {
    await lines.selectAll('.addLine')
      .data(ends)
      .join('line')
      .classed('addLine', true)
      .attr('x1', d => xs(d[0].x))
      .attr('y1', d => ys(d[0].y))
      .attr('x2', d => xs(d[0].x))
      .attr('y2', d => ys(d[0].y))
      .transition()
      .ease(d3.easeQuad)
      .delay((d, i) => 1200 + 50 * i - 300 / (i + 1))
      .duration((d, i) => 300 / (i + 1))
      .attr('x2', d => xs(d[1].x))
      .attr('y2', d => ys(d[1].y))
      .end();
  } catch (_) {
    return sum;
  }

  if (!sum.equals(negSum)) {
    negSumPoint.classed('negative', true);

    try {
      await lines.append('line')
        .attr('x1', xs(negSum.x))
        .attr('y1', ys(negSum.y))
        .attr('x2', xs(negSum.x))
        .attr('y2', ys(negSum.y))
        .attr('stroke', 'red')
        .attr('stroke-width', Math.min(2, 4 * scale))
        .attr('stroke-dasharray', '4 2')
        .transition()
        .ease(d3.easeLinear)
        .duration(1000)
        .attr('x2', xs(sum.x))
        .attr('y2', ys(sum.y))
        .end();
    } catch (_) {
      return sum;
    }
  }

  sumPoint.classed('sum', true);
  return sum;
}

async function multiply(P, n) {
  if (!P || n < 0) return;
  hr.classed('hidden', false);
  const nP = P.times(n);
  clearSums();
  const bits = n.toString(2).substring(1);
  let res = P;
  // console.log(bits);
  let str = `${n}P &= ${nP}:`
  const typeset = () => typesetNode(addbox, `\\(\\begin{align*}${str}\\end{align*}\\)`)
  typeset();
  let k = 1;
  for (const bit of bits) {
    str += `\\\\ ${2 * k}P &= ${k === 1 ? '' : k}P + ${k === 1 ? '' : k}P = ${res} + ${res} = ${res.plus(res)}`
    k *= 2;
    typeset();
    res = await addPoint(res, res, false);
    await new Promise(r => setTimeout(r, 2000));
    if (bit === '1') {
      str += `\\\\ ${k + 1}P &= ${k === 1 ? '' : k}P + P = ${res} + ${P} = ${res.plus(P)}`
      k += 1;
      typeset();
      res = await addPoint(res, P, false);
      await new Promise(r => setTimeout(r, 2000));
    }
  }
}

const inputs = ['a', 'b', 'p'].map(id => document.getElementById(id));
const button = document.getElementById("draw")
const getInput = () => inputs.map(input => Number(input.value));
button.addEventListener("click", () => drawField(...getInput()));

inputs.forEach(input =>
  input.addEventListener("keydown", event => {
    if (event.key === "Enter") {
      event.preventDefault();
      button.click();
    }
  })
);

const kInput = document.getElementById('k');
document.getElementById("mult").addEventListener('click', () => multiply(selectedPoint?.datum(), Number(kInput.value)));

button.click();
