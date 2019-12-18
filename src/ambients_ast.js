const { literal, verifyPrimitive } = require('./primitives.js')
const { ambient, seq, parallel } = require('./algebra_ast.js')

function parameterDeclaration(names) {
  this.names = names
  this.toAmbient = () => `write_ (${this.names.join(', ')})`
}

function returnExpression(name) {
  this.name = name
  this.toAmbient = () => `read_ (${this.name})`

}
function binaryExpression (left, right, operator) {
  this.left = left
  this.right = right
  this.operator = operator
  this.toAmbient = () => {
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

}

function callExpression (functionName) {
  this.functionName = functionName
  this.toAmbient =  () => {
    return "scope.functionCall(this.functionName)"
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
  funcEnvelope

}