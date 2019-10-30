const esprima = require('esprima')

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
    case '+': return primitive.plus(left, right)
    case '*': return primitive.multiply(left, right)
    default: throw new Error(`Operator '${operator}' is not supported`)
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

let primitives = {}
primitives.string = {
  literal: (value) => ({
    type: 'string',
    toAlgebra: (scope) => `string[${value}[]]`
  }),
  plus: (left, right) => ({
    type: 'string',
    toAlgebra: (scope) => `string[concat[left[${left.toAlgebra(scope)}]|right[${right.toAlgebra(scope)}]]]`
  })
}
primitives.number = {
  literal: (value) => ({
    type: 'number',
    toAlgebra: (scope) => `int[i${value}[]]`
  }),
  plus: (left, right) => ({
    type: 'number',
    toAlgebra: (scope) => `int[plus[left[${left.toAlgebra(scope)}]|right[${right.toAlgebra(scope)}]]]`
  }),
  multiply: (left, right) => ({
    type: 'number',
    toAlgebra: (scope) => `int[multiply[left[${left.toAlgebra(scope)}]|right[${right.toAlgebra(scope)}]]]`
  })
}

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

class Scope {
  constructor (name, parentScope) {
    this._name = name
    this._parentScope = parentScope
    this._auths = []
  }

  newScope(name) {
    return new Scope(name, this)
  }

  toAlgebra() {
    return this._auths.map((auth) => `out_ ${auth.exit}.in_ ${auth.enter}`).join('|')
  }

  allow(exit, enter) {
    if (this._parentScope === undefined) {
      return []
    }
    this._auths.push({exit: exit, enter: enter})
    return [this._name].concat(this._parentScope.allow(exit, enter))
  }
}

const rootScope = new Scope()

module.exports = function (js) {
  let mapper = astMapper()
  mapper.register('Literal', (node) => literal(node.value))
  mapper.register('BinaryExpression', (node) => binaryExpression(mapper.lookup(node.left), mapper.lookup(node.right), node.operator))
  mapper.register('ArrowFunctionExpression', (node) => functionBody([], mapper.lookup(node.body)))
  mapper.register('VariableDeclarator', (node) => functionDefinition(node.id.name, mapper.lookup(node.init)))
  mapper.register('VariableDeclaration', (node) => mapper.lookup(node.declarations))

  mapper.register('CallExpression', (node) => callExpression(node.callee.name))
  mapper.register('ExpressionStatement', (node) => mapper.lookup((node.expression)))
  mapper.register('Program', (node) => programFile(mapper.lookup(node.body)))
  let program = mapper.parseAndMap(js)
  return program.toAlgebra(rootScope)
}
