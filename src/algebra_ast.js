const seq = (...args) => ({
  toAlgebra: () => args.map(optimizeStep).map(toAlgebra).filter(nonEmptyExpressions).join('.')
})

const parallel = (...args) => ({
  type: 'parallel',
  optimize: () => {
    const parallelArgs = args.filter(arg => arg.type === 'parallel')
    if (parallelArgs.length === args.length) {
      return parallel(...parallelArgs.map(arg => arg.args).reduce((arr, a) => arr.concat(a), []))
    }
    return parallel(...args)
  },
  toAlgebra: () => {
    let parallelPrograms = args.map(optimizeStep).map(toAlgebra).filter(nonEmptyExpressions)
    if (parallelPrograms.length > 1) {
      return `(${parallelPrograms.join('|')})`
    }

    return parallelPrograms.join('|')
  }

})

const ambient = (name, ...args) => ({
  toAlgebra: () => {
    return `${name}[${args.map(optimizeStep).map(toAlgebra).filter(nonEmptyExpressions).join('|')}]`
  }
})

const optimizeStep = node => node.optimize === undefined ? node : node.optimize()
const toAlgebra = node => node.toAlgebra === undefined ? node.toString() : node.toAlgebra()
const nonEmptyExpressions = string => string.length > 0

module.exports = {ambient, seq, parallel}