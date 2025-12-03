"use strict";
const primes = new Set([2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71,
  73, 79, 83, 89, 97, 101, 103, 107, 109, 113, 127, 131, 137, 139, 149, 151, 157, 163, 167, 173,
  179, 181, 191, 193, 197, 199, 211, 223, 227, 229, 233, 239, 241, 251, 257, 263, 269, 271]);

const params = {
  a: 2,
  b: 3,
  p: 7
};

const cache = {
  sqrt: [],
  inv: [],
  points: [],
  groups: new Map(),
  best: undefined
};

const a = () => params.a;
const b = () => params.b;
const p = () => params.p;

const reduce = (x) => ((x % params.p) + params.p) % params.p;
const inverse = (x) => cache.inv[reduce(x)];
const negate = (x) => reduce(params.p - x);

const isPrime = () => primes.has(params.p);
const isSingular = () => reduce((4 * params.a * params.a * params.a) + (27 * params.b * params.b)) !== 0;
const points = () => cache.points;
const find = (x, y) => cache.points.find(p => p.x === x && p.y === y)
const bestPrimitive = () => {
  if (cache.best) return cache.best;

  let best = {len: -1, pt: null};
  for (const pt of cache.points) {
    const group = pt.group();
    if (group.length > best.len) best = {len: group.length, pt};
  }
  cache.best = best.pt;
  return best.pt;
}

function slope(P, Q) {
  if (P.equals(Q)) return reduce(reduce(3 * P.x * P.x + params.a) * inverse(2 * P.y));
  if (P.x === Q.x) return +Infinity;
  return reduce((Q.y - P.y) * inverse(Q.x - P.x));
}

function init(a = 2, b = 3, p = 7) {
  params.a = a;
  params.b = b;
  params.p = p;

  cache.sqrt = Array(p).fill(-1);
  cache.inv = Array(p);
  cache.points = [];
  cache.groups = new Map();
  cache.best = undefined;

  for (let i = 0; i < p; i++) {
    if (i <= p / 2) cache.sqrt[i * i % p] = i;
    for (let j = i; j < p; j++) {
      if (i * j % p === 1) {
        cache.inv[i] = j;
        cache.inv[j] = i;
        break;
      }
    }
  }

  cache.points.push(new pt());

  for (let i = 0; i < p; i++) {
    for (let j = 0; j <= p / 2; j++) {
      if (j * j % p === reduce(i * i * i + a * i + b)) {
        cache.points.push(new pt(i, j));
        if (j % p !== (p - j) % p) {
          cache.points.push(new pt(i, p - j));
        }
      }
    }
  }
}

class pt {
  x;
  y;

  constructor(x = -1, y = -1) {
    this.x = x;
    this.y = y;
  }

  static fromString(str) {
    if (str === '\\mathcal{O}') return new pt();
    let [x, y] = str.split(',');
    return new pt(Number(x.slice(1)), Number(y.slice(0, -1)))
  }

  copy() {
    return new pt(this.x, this.y);
  }

  asObj() {
    return { x: this.x, y: this.y };
  }

  isInfinity() {
    return (this.x === -1) && (this.y === -1);
  }

  isNaN() {
    return isNaN(this.x) || isNaN(this.y);
  }

  toString() {
    return this.isInfinity() ? '\\mathcal{O}' : `(${this.x}, ${this.y})`;
  }

  equals(other) {
    return this.x === other.x && this.y === other.y;
  }

  plus(other) {
    if (this.isInfinity()) return other;
    if (other.isInfinity()) return this;

    let s = slope(this, other)
    if (!isFinite(s)) return new pt();

    const nx = reduce(s * s - this.x - other.x);
    const ny = reduce(s * (this.x - nx) - this.y);
    return new pt(nx, ny);
  }

  times(n) {
    if (n === 0) return new pt();
    if (n === 1) return this;
    if (n % 2 == 1) return this.plus(this.times(n - 1));
    return this.plus(this).times(n / 2);
  }

  negate() {
    return new pt(this.x, negate(this.y));
  }

  group() {
    const cached = cache.groups.get(this.toString());
    if (cached) return cached;

    const group = [];
    let next = this;
    do {
      group.push(next);
      next = next.plus(this);
    } while (!next.isNaN() && !next.equals(this));
    cache.groups.set(this.toString(), group);
    return group;
  }
}

export { a, b, p, params, reduce, negate, isPrime, isSingular, points, find, slope, init, pt, bestPrimitive };