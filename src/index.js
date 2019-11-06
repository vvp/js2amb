
const ast = require('./ambients_ast.js')
const astMapper = require('./esprima_ast_mapper.js')

module.exports = function (js) {

  const rootScope = new ast.Scope()
  let mapper = astMapper()

  mapper.register('Literal', (node) => ast.literal(node.value))
  mapper.register('BinaryExpression', (node) => ast.binaryExpression(mapper.lookup(node.left), mapper.lookup(node.right), node.operator))
  mapper.register('ArrowFunctionExpression', (node) => {
    mapper.directMap(node.params, (param) => ast.parameterDeclaration(param.name))
    if (node.body.type === 'Identifier') {
      mapper.directMap(node.body, (body) => ast.variableExpression(body.name))
    }
    return ast.functionBody(mapper.lookup(node.params), mapper.lookup(node.body))
  })
  mapper.register('VariableDeclarator', (node) => ast.functionDefinition(node.id.name, mapper.lookup(node.init)))
  mapper.register('VariableDeclaration', (node) => mapper.lookup(node.declarations))

  mapper.register('CallExpression', (node) => ast.callExpression(node.callee.name))
  mapper.register('ExpressionStatement', (node) => mapper.lookup((node.expression)))
  mapper.register('Program', (node) => ast.programFile(mapper.lookup(node.body)))
  let program = mapper.parseAndMap(js)
  return program.toAmbient(rootScope)
}
