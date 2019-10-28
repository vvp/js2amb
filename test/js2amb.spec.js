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

      assert.strictEqual(
        js2amb(javascript),
        expectedAmbient,
        `Compiling ${filePair.js} didn't result in ${filePair.ambient}`
      )
    })

  })
}

describe('JS Compiler', function () {
  testFixtures(FIXTURES_PATH + 'lang_features/','language concepts')
  testFixtures(FIXTURES_PATH + 'abstractions/', 'computation abstractions')
})
