import * as field from "./fields.js";

export function xAtY(p, m, y) {
  let c = p.y - m * p.x;
  return (y - c) / m;
}

export function slope(P, Q) {
  if (P.equals(Q)) return field.slope(P, P);
  else if (P.x === Q.x) return +Infinity;
  else return (Q.y - P.y) / (Q.x - P.x);
}

function dist(P, Q) {
  return Math.sqrt((P.x - Q.x) ** 2 + (P.y - Q.y) ** 2);
}

export function inline(A, B, C) {
  return dist(A, C) + dist(B, C) - dist(A, B) <= 1e-9;
}
