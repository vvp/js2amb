const esprima = require('esprima')

const literal = (value) => ({
  toAlgebra: () => {
    const algebra = `${typeof value}[${value}[]]`
    return algebra
  }
})

const functionBody = (args, expression) => ({
  toAlgebra: () => {
    const algebra = `in_ call.open call.(
      ${expression.toAlgebra()}|
      open return.open_)`
    return algebra
  }
})

const functionDefinition = (name, body) => ({
  toAlgebra: () => {
    const algebra = `${name}[${body.toAlgebra()}]`
    return algebra
  }
})

const programFile = (declarations, resultStatement) => ({
  toAlgebra: () => {
    const algebra = declarations
      .map(declaration => declaration.toAlgebra())
      .map(code => code.replace(/\r?\n\s*|\r\s*/g, '').replace(/\s+/g, ' '))
      .join("|")
    return algebra
  }
})

const astMapper = () => ({
  mappers: {},
  register: function (nodetype, func) {
    this.mappers[nodetype] = func
  },
  lookupMap: new WeakMap(),
  lookup: function (node) {
    if (Array.isArray(node)) {
      return node
        .map((n) => this.lookupMap.get(n))
        .reduce((acc,x) => acc.concat(x), [])
    }
    return this.lookupMap.get(node)
  },
  parseAndMap: function (js) {
    let counter = 0
    let latestNode
    let esprimaMapper = (node, meta) => {
      console.log(`${++counter}: ${node.type} (${js.substring(meta.start.offset, meta.end.offset)}) - (${Object.keys(node)})` )
      const mapFunc = this.mappers[node.type]
      if (mapFunc === undefined)
        return
      latestNode = mapFunc(node)
      this.lookupMap.set(node, latestNode)
    }
    esprima.parseScript(js, {}, esprimaMapper)
    return latestNode
  }
})

module.exports = function (js) {
  let mapper = astMapper()
  mapper.register('Literal', (node) => literal(node.value))
  mapper.register('ArrowFunctionExpression', (node) => functionBody([], mapper.lookup(node.body)))
  mapper.register('VariableDeclarator', (node) => functionDefinition(node.id.name, mapper.lookup(node.init)))
  mapper.register('VariableDeclaration', (node) => mapper.lookup(node.declarations))
  mapper.register('Program', (node) => programFile(mapper.lookup(node.body)))
  return mapper.parseAndMap(js).toAlgebra()
  
}
