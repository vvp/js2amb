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

const convertDeclaration = (astNode) => {
  switch (astNode.type) {
    case 'VariableDeclaration':
      return astNode.declarations.map(convertDeclaration)
    case 'VariableDeclarator':
      switch (astNode.init.type) {
        case 'ArrowFunctionExpression':
          return functionDefinition(astNode.id.name,functionBody(astNode.init, literal(astNode.init.body.value)))
      }
  }
}

const programFile = (declarations, resultStatement) => ({
  toAlgebra: () => {
    const algebra = declarations
      .reduce((acc,x) => acc.concat(x), [])
      .filter(x => x !== undefined)
      .map(declaration => declaration.toAlgebra())
      .map(code => code.replace(/\r?\n\s*|\r\s*/g, '').replace(/\s+/g, ' '))
      .join("|")
    return algebra
  }
})

module.exports = function (js) {

  let counter = 0
  let log = (js) => (node, meta) => {
    console.log(`${++counter}: ${node.type} (${js.substring(meta.start.offset, meta.end.offset)}) - (${Object.keys(node)})` )
    if (node.type === 'ArrowFunctionExpression') {
      console.log(`    - body: ${node.body.type}`)
    }
  }

  const node = esprima.parseScript(js, {}, log(js))
  return programFile(node.body.map(convertDeclaration), null).toAlgebra()

}
