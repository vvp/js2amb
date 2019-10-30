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
    let scopesToPass = scope.allow('call', functionName)
    let outCalls = scopesToPass.map(x => `out ${x}.`)
    let inReturns = scopesToPass.reverse().map(x => `in ${x}.`)
    const algebra = `
      call[${outCalls}in ${functionName}.open_.return[open_.${inReturns}in func]]|
      func[in_ ${functionName}.open ${functionName}.open_]|
      open func`
    return algebra
  }
})

const functionBody = (args, expression) => ({
  toAlgebra: (scope) => {
    const algebra = `in_ call.open call.(
      ${[expression.toAlgebra(scope), 'open return.open_'].join('|')})`
    return algebra
  }
})

const functionDefinition = (name, body) => ({
  toAlgebra: (scope) => {
    let newScope = scope.newScope(name)
    const algebra = `${name}[
    ${[body.toAlgebra(newScope), newScope.toAlgebra()].filter(s => s.length > 0).join('|')}]`
    return algebra
  }
})

const programFile = (declarations, resultStatement) => ({
  toAlgebra: (scope) => {
    const algebra = declarations
      .map(declaration => declaration.toAlgebra(scope))
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

  newScope (name) {
    return new Scope(name, this)
  }

  toAlgebra () {
    return this._auths.map((auth) => `out_ ${auth.exit}.in_ ${auth.enter}`).join('|')
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