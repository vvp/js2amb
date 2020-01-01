const assert = require('assert').strict

const { parseScript } = require('shift-parser')
const codegen = require('shift-codegen')
const generateSource = ast => codegen.default(ast, new codegen.FormattedCodeGen)
const { transformer } = require('../src/shift-ssa.js')

const parse = (program) => parseScript(program)
const normalize = (program, expected) => new transformer(program).transform()
const assertionFailure = (actual, expected) => new assert.AssertionError({
  actual: generateSource(actual),
  expected: generateSource(expected),
  message: "Normalization failed"
})
const ensureEqual = (actual, expected) => {
  // for some reason assert.deepEqual fails, TODO make it work
  assert.equal(JSON.stringify(actual), JSON.stringify(expected), assertionFailure(actual, expected))
}
const ensureNotEqual = (actual, expected) => {
  assert.notEqual(generateSource(actual), generateSource(expected))
}

describe('JS SSA-fier', () => {
  it('Normalizes the JS function parameters', () => {
    ensureEqual(normalize(parse('const a = (x,y) => x')), parse(`const a = (x,y) => { 
      const c0 = x;
      const c1 = y;
      const c2 = c0; 
      return c2; 
    }`))
    ensureEqual(normalize(parse('(x,y) => y')), parse(`(x,y) => { 
      const c0 = x;
      const c1 = y;
      const c2 = c1; 
      return c2; 
    }`))
    ensureEqual(normalize(parse('(x) => x')), parse(`(x) => { 
      const c0 = x;
      const c1 = c0; 
      return c1; 
    }`))
    ensureNotEqual(normalize(parse('(x) => x')), parse(`(x) => x`))
  })

  it('Normalizes the literal expressions', () => {
    ensureEqual(normalize(parse('() => "hello"')), parse(`() => { 
      const c0 = "hello";
      return c0; 
    }`))

    ensureEqual(normalize(parse('() => 123')), parse(`() => { 
      const c0 = 123;
      return c0; 
    }`))

    ensureEqual(normalize(parse('() => true')), parse(`() => { 
      const c0 = true;
      return c0; 
    }`))

    ensureEqual(normalize(parse('() => 12.34')), parse(`() => { 
      const c0 = 12.34;
      return c0; 
    }`))
  })

  it('Normalizes binary expressions', () => {
    ensureEqual(normalize(parse('() => "hello" + "world"')), parse(`() => { 
      const c0 = "hello";
      const c1 = "world";
      const c2 = c0 + c1;
      return c2; 
    }`))

    ensureEqual(normalize(parse('(x) => x + "world"')), parse(`(x) => { 
      const c0 = x;
      const c1 = c0
      const c2 = "world";
      const c3 = c1 + c2;
      return c3; 
    }`))

    ensureEqual(normalize(parse('(x, y) => x + y')), parse(`(x, y) => { 
      const c0 = x;
      const c1 = y;
      const c2 = c0;
      const c3 = c1;
      const c4 = c2 + c3;
      return c4; 
    }`))

    ensureEqual(normalize(parse('() => "hello" + "hello"')), parse(`() => { 
      const c0 = "hello";
      const c1 = c0;
      const c2 = c1 + c1;
      return c2; 
    }`))

    ensureEqual(normalize(parse('(x) => x + x')), parse(`(x) => { 
      const c0 = x;
      const c1 = c0;
      const c2 = c1;
      const c3 = c2 + c2;
      return c3; 
    }`))

    ensureEqual(normalize(parse('() => "hello" + " " + "world"')), parse(`() => { 
      const c0 = "hello";
      const c1 = " ";
      const c2 = c0 + c1;
      const c3 = "world";
      const c4 = c2 + c3;
      return c4;
    }`))

    ensureEqual(normalize(parse('() => "hello" + (" " + "world")')), parse(`() => { 
      const c0 = "hello";
      const c1 = " ";
      const c2 = "world";
      const c3 = c1 + c2;
      const c4 = c0 + c3;
      return c4;
    }`))

    ensureEqual(normalize(parse('(x, y, z) => "hello" + (" " + "world" + (x - y)) + "again" + (z / x / y)')), parse(`(x, y, z) => { 
      const c0 = x;
      const c1 = y;
      const c2 = z; 
      const c3 = "hello";
      const c4 = " ";
      const c5 = "world";
      const c6 = c4 + c5; 
      const c7 = c0;
      const c8 = c1;
      const c9 = c7 - c8;
      const c10 = c6 + c9;
      const c11 = c3 + c10;
      const c12 = "again";
      const c13 = c11 + c12;
      const c14 = c2;
      const c15 = c7;
      const c16 = c14 / c15;
      const c17 = c8;
      const c18 = c16 / c17;
      const c19 = c13 + c18;
      return c19;
    }`))
  })
})