const { literal, verifyPrimitive } = require('./primitives.js')
const { ambient, seq, parallel } = require('./algebra_ast.js')
const types = require('./types.js')

function parameterDeclaration(names) {
  this.names = names
  this.toAmbient = () => `write_ (${this.names.join(', ')})`
}

function variableExpression(name) {
  this.name = name
  this.type = types.toUnknownType(name)
  this.toAmbient = () => `${this.name}[]`
}

function returnExpression(expr) {
  this.expr = expr
  this.toAmbient = () => {
    if (this.expr instanceof variableExpression)
      return `read_ (${this.expr.name})`
    if (this.expr instanceof callExpression) {
      return seq(this.expr.toAmbient(), parallel(
        ambient(this.expr.callId),
        `read_ (${this.expr.callId})`
      ))
    }
    return parallel(
      this.expr.toAmbient(),
      `read_ (${this.expr.name})`
    )
  }

}
function binaryExpression (left, right, operator) {
  this.left = left
  this.right = right
  this.operator = operator
  this.type = verifyPrimitive(left, right)
  this.name = this.type.name
  this.toAmbient = () => {
    switch (operator) {
      case '+':
        return this.type.plus(left, right).toAmbient()
      case '*':
        return this.type.multiply(left, right).toAmbient()
      default:
        throw new Error(`Operator '${operator}' is not supported`)
    }
  }

}

let callCounter = 0

function callExpression (functionName, args) {
  this.functionName = functionName
  this.args = args
  this.callId = `${this.functionName}_r${callCounter++}`
  this.type = types.toFunctionType(functionName)
  this.toAmbient =  () => {
    return seq(
      `write (${this.functionName}, ${args.join(', ')})`,
      `read_ (${this.functionName}, ${this.callId})`
    )
  }
}

function funcEnvelope (expression) {
  this.expr = expression
  this.toAmbient = () => {
    return ambient('func',
      expression.toAmbient(),
      'open_')
  }
}

function functionExpression (args, expression) {
  this.args = args
  this.expression = expression
  this.toAmbient = () => {
    return seq(
      args.toAmbient(),
      expression.toAmbient())
  }
}

function functionDefinition (name, body) {
  this.name = name
  this.body = body

  this.toAmbient = () => {
    return ambient(name,
      seq('write_ (init)', parallel(
        ':init',
        body.toAmbient()
      ))
    )
  }
}

function programFile (declarations, resultStatement) {
  this.declarations = declarations
  this.toAmbient = () => {
    const algebra = declarations
      .map(declaration => declaration.toAmbient().toAlgebra())
      .map(code => code.replace(/\r?\n\s*|\r\s*/g, '').replace(/\s+/g, ' '))
      .join('|')
    return algebra
  }
}


module.exports = {
  literal,
  binaryExpression,
  functionExpression,
  functionDefinition,
  programFile,
  callExpression,
  parameterDeclaration,
  returnExpression,
  funcEnvelope,
  variableExpression

}