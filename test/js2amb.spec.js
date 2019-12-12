const assert = require('assert')

const js2amb = require('../src')
const fs = require('fs')
const FIXTURES_PATH = 'test/fixtures/js/'
const normalizeAmbientsCode = code => code.replace(/\r?\n\s*|\r\s*/g, '').replace(/\s+/g, ' ')
const testFixtures = (path, tests) => {
  const fixtures = fs.readdirSync(path)
  const fixturePairs = fixtures
    .filter(item => item.endsWith('.ambient'))
    .map((filename, index) => {
      return {
        ambient: filename,
        js: fixtures[index * 2 + 1]
      }
    })

  fixturePairs.forEach((filePair) => {
    console.log(`Compiling: ${path + filePair.js}`)
    const javascript = fs.readFileSync(path + filePair.js).toString().trim()
    const expectedAmbient = normalizeAmbientsCode(fs.readFileSync(path + filePair.ambient).toString())
    it(`${tests}: ${filePair.js}`, () => {

      let actual = js2amb(javascript)
      assert.strictEqual(
        actual,
        expectedAmbient,
        `Compiling ${filePair.js} didn't result in ${filePair.ambient}`
      )
      console.log(`JS:       ${normalizeAmbientsCode(javascript)}`)
      console.log(`actual:   ${actual}`)
      console.log(`expected: ${expectedAmbient}`)
    })

  })
}

describe('JS Compiler', function () {
  testFixtures(FIXTURES_PATH + 'new_encoding/', 'new encoding')
  // testFixtures(FIXTURES_PATH + 'lang_features/','language concepts')
  // testFixtures(FIXTURES_PATH + 'abstractions/', 'computation abstractions')
})
