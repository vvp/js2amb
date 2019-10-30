const esprima = require('esprima')

const literal = (value) => {
  let primitive = primitives[typeof value]
  if (primitive === undefined || primitive.literal === undefined) {
    throw new Error(`primitive '${typeof value}' is not supported as literal`)
  }
  return primitive.literal(value)
}
const plus = (left, right) => {
  let primitive = primitives[left.type]
  if (primitive === undefined || primitive.literal === undefined) {
    throw new Error(`primitive '${left.type}' is not supported for plus-operator`)
  }
  if (left.type !== right.type) {
    throw new Error(`Compiler does not support implicit type conversions for binary ops`)
  }
  return primitive.plus(left, right)
}

const binaryExpression = (operator) => {
  switch (operator) {
    case '+': return plus
  }
}

let primitives = {}
primitives.string = {
  literal: (value) => ({
    type: 'string',
    toAlgebra: () => `string[${value}[]]`
  }),
  plus: (left, right) => ({
    type: 'string',
    toAlgebra: () => `string[concat[left[${left.toAlgebra()}]|right[${right.toAlgebra()}]]]`
  })
}
primitives.number = {
  literal: (value) => ({
    type: 'int',
    toAlgebra: () => `int[i${value}[]]`
  })
}

const functionBody = (args, expression) => ({
  toAlgebra: () => {
    const algebra = `in_ call.open call.(
      ${[expression.toAlgebra(), 'open return.open_'].join('|')})`
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
      .join('|')
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
        .reduce((acc, x) => acc.concat(x), [])
    }
    return this.lookupMap.get(node)
  },
  parseAndMap: function (js) {
    let counter = 0
    let latestNode
    let esprimaMapper = (node, meta) => {
      console.log(`${++counter}: ${node.type} (${js.substring(meta.start.offset, meta.end.offset)}) - (${Object.keys(node)})`)
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
  mapper.register('BinaryExpression', (node) => binaryExpression(node.operator)(mapper.lookup(node.left), mapper.lookup(node.right)))
  mapper.register('ArrowFunctionExpression', (node) => functionBody([], mapper.lookup(node.body)))
  mapper.register('VariableDeclarator', (node) => functionDefinition(node.id.name, mapper.lookup(node.init)))
  mapper.register('VariableDeclaration', (node) => mapper.lookup(node.declarations))
  mapper.register('Program', (node) => programFile(mapper.lookup(node.body)))
  let program = mapper.parseAndMap(js)
  return program.toAlgebra()

}
