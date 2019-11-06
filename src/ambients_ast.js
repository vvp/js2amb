const primitives = require('./primitives.js')

const literal = (value) => {
  let primitive = primitives[typeof value]
  if (primitive === undefined || primitive.literal === undefined) {
    throw new Error(`primitive '${typeof value}' is not supported as literal`)
  }
  return primitive.literal(value)
}

const verifyPrimitive = (left, right) => {
  let primitive = primitives[left.type]
  if (primitive === undefined || primitive.literal === undefined) {
    throw new Error(`primitive '${left.type}' is not supported for plus-operator`)
  }
  if (left.type !== right.type) {
    throw new Error(`Compiler does not support implicit type conversions for binary ops`)
  }
  return primitive
}

const binaryExpression = (left, right, operator) => {
  let primitive = verifyPrimitive(left, right)
  switch (operator) {
    case '+':
      return primitive.plus(left, right)
    case '*':
      return primitive.multiply(left, right)
    default:
      throw new Error(`Operator '${operator}' is not supported`)
  }

}

const callExpression = (functionName) => ({
  toAmbient: (scope) => {
    return scope.functionCall(functionName)
  }
})

const functionBody = (args, expression) => ({
  toAmbient: (scope) => {
    scope.registerArgs(args)
    return seq('in_ call.open call', parallel(
      expression.toAmbient(scope),
      'open return.open_'))
  }
})

const functionDefinition = (name, body) => ({
  toAmbient: (scope) => {
    let newScope = scope.newScope(name)
    return ambient(name,
      newScope.capabilities(),
      parallel(body.toAmbient(newScope))
    )
  }
})

const programFile = (declarations, resultStatement) => ({
  toAmbient: (scope) => {
    const algebra = declarations
      .map(declaration => declaration.toAmbient(scope).toAlgebra())
      .map(code => code.replace(/\r?\n\s*|\r\s*/g, '').replace(/\s+/g, ' '))
      .join('|')
    return algebra
  }
})


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




class Scope {
  constructor (name, parentScope) {
    this._name = name
    this._parentScope = parentScope
    this._auths = []
  }

  registerArgs () {

  }

  functionCall (functionName) {
    let scopesToPass = this.allow('call', functionName)
    let outCalls = scopesToPass.map(x => `out ${x}.`)
    let inReturns = scopesToPass.reverse().map(x => `in ${x}.`)

    return parallel(
      ambient('call',
        seq(`${outCalls}in ${functionName}.open_`,
          ambient('return', `open_.${inReturns}in func`))),
      ambient('func',
        seq(`in_ ${functionName}.open ${functionName}.open_`)),
      'open func')
  }

  newScope (name) {
    return new Scope(name, this)
  }

  capabilities () {
    return {
      toAlgebra: () => {
        return this._auths.map((auth) => `out_ ${auth.exit}.in_ ${auth.enter}`).join('|')
      }
    }
  }

  allow (exit, enter) {
    if (this._parentScope === undefined) {
      return []
    }
    this._auths.push({ exit: exit, enter: enter })
    return [this._name].concat(this._parentScope.allow(exit, enter))
  }
}

module.exports = { Scope, literal, binaryExpression, functionBody, functionDefinition, programFile, callExpression }