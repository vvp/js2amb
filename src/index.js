const { Scope, parameterDeclaration, returnExpression, literal, binaryExpression, funcEnvelope, functionExpression,
  functionDefinition, callExpression, programFile } = require('./ambients_ast.js')
const astMapper = require('./esprima_ast_mapper.js')

module.exports = function (js) {

  let jsAst = astMapper()

  jsAst.match('Identifier', (id, context) => {
    switch (context) {
      case 'AFE.Params':
        return new parameterDeclaration(id.name)
      case 'AFE.Body':
        return new returnExpression(id.name)
    }
  })
  jsAst.match('Literal', (node) => new literal(node.value))
  jsAst.match('BinaryExpression', (node) => new binaryExpression(
    jsAst.parse(node.left, 'AFE.Body'),
    jsAst.parse(node.right, 'AFE.Body'),
    node.operator))
  jsAst.match('ArrowFunctionExpression', (node, context) => {
    switch (context) {
      case 'AFE.Body':
        return new funcEnvelope(
          new functionExpression(
            jsAst.parse(node.params, 'AFE.Params'),
            jsAst.parse(node.body, 'AFE.Body')))
      default:
        return new functionExpression(
          new parameterDeclaration(node.params.map(id => id.name)),
          new returnExpression(jsAst.parse(node.body, 'AFE.Body'))
        )
    }
  })

  jsAst.match('VariableDeclarator', (node) => new functionDefinition(node.id.name, jsAst.parse(node.init)))
  jsAst.match('VariableDeclaration', (node) => jsAst.parse(node.declarations))

  jsAst.match('CallExpression', (node) => new callExpression(node.callee.name))
  jsAst.match('ExpressionStatement', (node) => jsAst.parse(node.expression))
  jsAst.match('Program', (node) => new programFile(jsAst.parse(node.body)))

  let program = jsAst.parseAndMap(js)
  return program.toAmbient()
}
