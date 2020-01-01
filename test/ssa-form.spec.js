const assert = require('assert').strict

const { parseScript } = require('shift-parser')
const {transformer} = require('../src/shift-ssa.js')

const parse = (program) => parseScript(program)
const normalize = (program, expected) => new transformer(program).transform()
const ensureEqual = (actual, expected) => {
  // for some reason assert.deepEqual fails, TODO make it work
  assert.equal(JSON.stringify(actual), JSON.stringify(expected))
}
const ensureNotEqual = (actual, expected) => {
  assert.notEqual(JSON.stringify(actual), JSON.stringify(expected))
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


})