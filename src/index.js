
const ast = require('./ambients_ast.js')
const astMapper = require('./esprima_ast_mapper.js')

module.exports = function (js) {

  const rootScope = new ast.Scope()
  let jsAst = astMapper()

  jsAst.match('Identifier', (id, context) => {
    switch (context) {
      case 'AFE.Params': return ast.parameterDeclaration(id.name)
      case 'AFE.Body': return ast.variableExpression(id.name)
    }
  })
  jsAst.match('Literal', (node) => ast.literal(node.value))
  jsAst.match('BinaryExpression', (node) => ast.binaryExpression(jsAst.parse(node.left), jsAst.parse(node.right), node.operator))
  jsAst.match('ArrowFunctionExpression', (node) =>
    ast.functionExpression(
      jsAst.parse(node.params, 'AFE.Params'),
      jsAst.parse(node.body, 'AFE.Body')))
  jsAst.match('VariableDeclarator', (node) => ast.functionDefinition(node.id.name, jsAst.parse(node.init)))
  jsAst.match('VariableDeclaration', (node) => jsAst.parse(node.declarations))

  jsAst.match('CallExpression', (node) => ast.callExpression(node.callee.name))
  jsAst.match('ExpressionStatement', (node) => jsAst.parse(node.expression))
  jsAst.match('Program', (node) => ast.programFile(jsAst.parse(node.body)))


  let program = jsAst.parseAndMap(js)
  return program.toAmbient(rootScope)
}
