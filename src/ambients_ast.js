const { literal, verifyPrimitive } = require('./primitives.js')
const { ambient, seq, parallel } = require('./algebra_ast.js')

const parameterDeclaration = (name) => ({
  toAmbient: (scope) => {
    return ambient(name, 'in_ arg.open arg.open_')
  }
})
const variableExpression = (name) => ({
  toAmbient: (scope) => {
    return `open ${name}`
  }
})
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

const functionExpression = (args, expression) => ({
  toAmbient: (scope) => {
    return parallel(
      scope.functionArgs(args),
      expression.toAmbient(scope))
  }
})

const functionDefinition = (name, body) => ({
  toAmbient: (scope) => {
    let newScope = scope.newScope(name)
    return ambient(name,
      newScope.capabilities(),
      seq('in_ call.open call', parallel(
        body.toAmbient(newScope),
        'open return.open_'
      ))
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

class Scope {
  constructor (name, parentScope) {
    this._name = name
    this._parentScope = parentScope
    this._auths = []
  }

  functionArgs (args) {
    return parallel(...args.map(arg => arg.toAmbient(this)))
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

module.exports = {
  Scope,
  literal,
  binaryExpression,
  functionExpression,
  functionDefinition,
  programFile,
  callExpression,
  parameterDeclaration,
  variableExpression
}