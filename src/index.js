const esprima = require('esprima')


class AmbientsValueExpression {
  constructor (astNode) {
    this._literal = astNode
  }

  toAlgebra() {
    const algebra = `${typeof this._literal.value}[${this._literal.value}[]]`
    return algebra
  }
}

class AmbientsFunctionBody {
  constructor (astNode) {
    this._expression = new AmbientsValueExpression(astNode.body)
  }

  toAlgebra() {
    const algebra = `in_ call.open call.(
      ${this._expression.toAlgebra()}|
      open return.open_)`
    return algebra
  }
}
class AmbientsFunction {
  constructor (name, body) {
    this._name = name
    this._body = body
  }

  toAlgebra() {
    const algebra = `${this._name}[${this._body.toAlgebra()}]`
    return algebra
  }
}

const convertDeclaration = (astNode) => {
  switch (astNode.type) {
    case 'VariableDeclaration':
      return astNode.declarations.map(convertDeclaration)
    case 'VariableDeclarator':
      switch (astNode.init.type) {
        case 'ArrowFunctionExpression':
          return new AmbientsFunction(astNode.id.name, new AmbientsFunctionBody(astNode.init))
      }
  }
}

class Program {
  constructor (astNode) {
    this.declarations = astNode.body.map(convertDeclaration)
  }

  toAlgebra() {
    return this.declarations
      .reduce((acc,x) => acc.concat(x), [])
      .filter(x => x !== undefined)
      .map(declaration => declaration.toAlgebra())
      .map(code => code.replace(/\r?\n\s*|\r\s*/g, '').replace(/\s+/g, ' '))
      .join("|")
  }
}

module.exports = function (js) {

  let counter = 0
  let log = (js) => (node, meta) => {
    console.log(`${++counter}: ${node.type} (${js.substring(meta.start.offset, meta.end.offset)}) - (${Object.keys(node)})` )
    if (node.type === 'ArrowFunctionExpression') {
      console.log(`    - body: ${node.body.type}`)
    }
  }

  const node = esprima.parseScript(js, {}, log(js))
  return new Program(node).toAlgebra()

}
