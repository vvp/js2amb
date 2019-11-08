
const ast = require('./ambients_ast.js')
const astMapper = require('./esprima_ast_mapper.js')

module.exports = function (js) {

  const rootScope = new ast.Scope()
  let jsAst = astMapper()

  jsAst.match('Literal', (node) => ast.literal(node.value))
  jsAst.match('BinaryExpression', (node) => ast.binaryExpression(jsAst.lookup(node.left), jsAst.lookup(node.right), node.operator))
  jsAst.match('ArrowFunctionExpression', (node) => {
    jsAst.directMap(node.params, (param) => ast.parameterDeclaration(param.name))
    if (node.body.type === 'Identifier') {
      jsAst.directMap(node.body, (body) => ast.variableExpression(body.name))
    }
    return ast.functionBody(jsAst.lookup(node.params), jsAst.lookup(node.body))
  })
  jsAst.match('VariableDeclarator', (node) => ast.functionDefinition(node.id.name, jsAst.lookup(node.init)))
  jsAst.match('VariableDeclaration', (node) => jsAst.lookup(node.declarations))

  jsAst.match('CallExpression', (node) => ast.callExpression(node.callee.name))
  jsAst.match('ExpressionStatement', (node) => jsAst.lookup((node.expression)))
  jsAst.match('Program', (node) => ast.programFile(jsAst.lookup(node.body)))
  let program = jsAst.parseAndMap(js)
  return program.toAmbient(rootScope)
}
