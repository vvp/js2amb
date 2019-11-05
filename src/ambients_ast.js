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
  toAlgebra: (scope) => {
    return scope.functionCall(functionName)

    /* let scopesToPass = scope.allow('call', functionName)
    let outCalls = scopesToPass.map(x => `out ${x}.`)
    let inReturns = scopesToPass.reverse().map(x => `in ${x}.`)
    const algebra = `
      call[${outCalls}in ${functionName}.open_.return[open_.${inReturns}in func]]|
      func[in_ ${functionName}.open ${functionName}.open_]|
      open func`
    return algebra */
  }
})

const functionBody = (args, expression) => ({
  toAlgebra: (scope) => {
    scope.registerArgs(args)
    return scope.seq('in_ call.open call', scope.parallel(
      expression.toAlgebra(scope),
      'open return.open_'))
    /*const algebra = `in_ call.open call.(
      ${[expression.toAlgebra(scope), 'open return.open_'].join('|')})`
    return algebra*/
  }
})

const functionDefinition = (name, body) => ({
  toAlgebra: (scope) => {
    let newScope = scope.newScope(name)
    return newScope.ambient(name,
      newScope.capabilities(),
      newScope.parallel(body.toAlgebra(newScope))
    )

    /*const algebra = `${name}[
    ${[body.toAlgebra(newScope), newScope.toAlgebra()].filter(s => s.length > 0).join('|')}]`
    return algebra*/
  }
})

const programFile = (declarations, resultStatement) => ({
  toAlgebra: (scope) => {
    const algebra = declarations
      .map(declaration => declaration.toAlgebra(scope).toAlgebra())
      .map(code => code.replace(/\r?\n\s*|\r\s*/g, '').replace(/\s+/g, ' '))
      .join('|')
    return algebra
  }
})

class Sequential {
  constructor (scope, args) {
    this._scope = scope
    this._args = args
  }

  toAlgebra () {
    return this._args.map(optimizeStep).map(toAlgebra).filter(nonEmptyExpressions).join('.')
  }
}

class Parallel {
  constructor (scope, args) {
    this._scope = scope
    this._args = args
  }

  optimize () {
    const parallelArgs = this._args.filter(arg => arg instanceof Parallel)
    if (parallelArgs.length === this._args.length) {
      this._args = parallelArgs.map(arg => arg._args).reduce((arr, a) => arr.concat(a), [])
    }
    return this
  }

  toAlgebra () {
    let parallelPrograms = this._args.map(optimizeStep).map(toAlgebra).filter(nonEmptyExpressions)
    if (parallelPrograms.length > 1) {
      return `(${parallelPrograms.join('|')})`
    }

    return parallelPrograms.join('|')
  }

}

const optimizeStep = (node) => {
  if (node.optimize === undefined)
    return node

  return node.optimize()
}

const toAlgebra = (node) => {
  if (node.toAlgebra === undefined)
    return node.toString()

  return node.toAlgebra()
}

const nonEmptyExpressions = string => string.length > 0

class Ambient {
  constructor (scope, name, args) {
    this._scope = scope
    this._args = args
    this._name = name
  }

  toAlgebra () {
    return `${this._name}[${this._args.map(optimizeStep).map(toAlgebra).filter(nonEmptyExpressions).join('|')}]`
  }
}

class Scope {
  constructor (name, parentScope) {
    this._name = name
    this._parentScope = parentScope
    this._auths = []
  }

  ambient (name, ...args) {
    return new Ambient(this, name, args)
  }

  registerArgs () {

  }

  functionCall (functionName) {
    let scopesToPass = this.allow('call', functionName)
    let outCalls = scopesToPass.map(x => `out ${x}.`)
    let inReturns = scopesToPass.reverse().map(x => `in ${x}.`)

    return this.parallel(
      this.ambient('call',
        this.seq(`${outCalls}in ${functionName}.open_`,
          this.ambient('return', `open_.${inReturns}in func`))),
      this.ambient('func',
        this.seq(`in_ ${functionName}.open ${functionName}.open_`)),
      'open func')
  }

  seq (...args) {
    return new Sequential(this, args)
  }

  parallel (...args) {
    return new Parallel(this, args)
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