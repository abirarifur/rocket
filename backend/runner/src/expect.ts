/** Minimal chai-like assertion surface for the pm.* sandbox. */

function fmt(v: unknown): string {
  if (typeof v === 'string') return JSON.stringify(v);
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

function deepEqual(a: unknown, b: unknown): boolean {
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return a === b;
  }
}

function typeOf(v: unknown): string {
  if (Array.isArray(v)) return 'array';
  if (v === null) return 'null';
  return typeof v;
}

export class Assertion {
  constructor(
    private readonly actual: unknown,
    private negate = false,
  ) {}

  // chainable no-op language getters
  get to(): this { return this; }
  get be(): this { return this; }
  get been(): this { return this; }
  get is(): this { return this; }
  get that(): this { return this; }
  get which(): this { return this; }
  get and(): this { return this; }
  get has(): this { return this; }
  get have(): this { return this; }
  get with(): this { return this; }

  get not(): this {
    this.negate = !this.negate;
    return this;
  }

  private check(pass: boolean, message: string): void {
    const ok = this.negate ? !pass : pass;
    if (!ok) throw new Error(`expected ${this.negate ? 'NOT ' : ''}${message}`);
  }

  equal(expected: unknown): this {
    this.check(this.actual === expected, `${fmt(this.actual)} to equal ${fmt(expected)}`);
    return this;
  }
  eql(expected: unknown): this {
    this.check(deepEqual(this.actual, expected), `${fmt(this.actual)} to deeply equal ${fmt(expected)}`);
    return this;
  }
  get true(): this {
    this.check(this.actual === true, `${fmt(this.actual)} to be true`);
    return this;
  }
  get false(): this {
    this.check(this.actual === false, `${fmt(this.actual)} to be false`);
    return this;
  }
  get ok(): this {
    this.check(!!this.actual, `${fmt(this.actual)} to be ok`);
    return this;
  }
  get null(): this {
    this.check(this.actual === null, `${fmt(this.actual)} to be null`);
    return this;
  }
  get undefined(): this {
    this.check(this.actual === undefined, `${fmt(this.actual)} to be undefined`);
    return this;
  }
  /** type check: expect(x).to.be.a('string') */
  a(type: string): this {
    this.check(typeOf(this.actual) === type, `${fmt(this.actual)} to be a ${type}`);
    return this;
  }
  an(type: string): this {
    return this.a(type);
  }
  include(sub: unknown): this {
    let pass = false;
    if (typeof this.actual === 'string') pass = this.actual.includes(String(sub));
    else if (Array.isArray(this.actual)) pass = this.actual.includes(sub);
    else if (this.actual && typeof this.actual === 'object')
      pass = Object.prototype.hasOwnProperty.call(this.actual, String(sub));
    this.check(pass, `${fmt(this.actual)} to include ${fmt(sub)}`);
    return this;
  }
  property(key: string, value?: unknown): this {
    const has = !!this.actual && Object.prototype.hasOwnProperty.call(this.actual, key);
    if (value === undefined) {
      this.check(has, `object to have property ${fmt(key)}`);
    } else {
      this.check(
        has && (this.actual as Record<string, unknown>)[key] === value,
        `object to have property ${fmt(key)} = ${fmt(value)}`,
      );
    }
    return this;
  }
  lengthOf(n: number): this {
    const len = (this.actual as { length?: number })?.length;
    this.check(len === n, `${fmt(this.actual)} to have length ${n}`);
    return this;
  }
  above(n: number): this {
    this.check(Number(this.actual) > n, `${fmt(this.actual)} to be above ${n}`);
    return this;
  }
  below(n: number): this {
    this.check(Number(this.actual) < n, `${fmt(this.actual)} to be below ${n}`);
    return this;
  }
}

export function makeExpect() {
  return (actual: unknown) => new Assertion(actual);
}
