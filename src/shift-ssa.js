const { parseScript } = require('shift-parser')
const AST = require('shift-ast')

const transformer = function (program) {
  this.program = program

  this.transform = (node = program, scope) => {
    if (Array.isArray(node))
      return node.map(x => this.transform(x, scope))

    let transformerElement = this[node.type]
    if (transformerElement !== undefined) {
      return transformerElement(node, scope)
    }

    for (let [key, value] of Object.entries(node)) {
      if (typeof value === 'object') {
        node[key] = this.transform(value, scope)
      }
    }
    return node
  }

  this.ArrowExpression = (node, scope) => {
    let newScope = new SSABody()
    node.params = this.transform(node.params, newScope)
    node.body = this.transform(node.body, newScope)
    node.body = new AST.FunctionBody({
      directives: [],
      statements: newScope.getStatements()
    })
    return node
  }
  this.IdentifierExpression = (node, scope) => {
    scope.addIdentifierExpression(node)
  }
  this.BindingIdentifier = (node, scope) => node
  this.FormalParameters = (node, scope) => {
    node.items.forEach(x => scope.addParameter(x))
    return node
  }
}

function SSABody() {
  this.statements = []
  this.counter = 0
  this.variableMap = new Map()


  this.newIdentifierRef = (varName) => {
    if (!this.variableMap.has(varName)) {
      this.variableMap.set(varName, [this.nextName()])
      return [this.nextName(), varName]
    }

    let newRef = this.nextName()
    let refs = this.variableMap.get(varName)
    let prevRef = refs[refs.length-1]
    refs.push(newRef)
    return [newRef, prevRef]
  }
  this.addIdentifierExpression = (expr) => {
    let [newRef, prevRef] = this.newIdentifierRef(expr.name)

    this.statements.push(new AST.VariableDeclaration({
      kind: "const",
      declarators: [
        new AST.VariableDeclarator({
          binding: new AST.BindingIdentifier({
            name: newRef
          }),
          init: new AST.IdentifierExpression({
            name: prevRef
          })
        })
      ]
    }))
  }

  this.nextName = () => {
    return `c${this.statements.length}`
  }
  this.lastName = () => {
    return `c${this.statements.length-1}`
  }
  this.getStatements = () => {
    let declarations = this.statements.map(stmt => new AST.VariableDeclarationStatement({
      declaration: stmt
    }))
    declarations.push(new AST.ReturnStatement({
      expression: new AST.IdentifierExpression({
        name: this.lastName()
      })
    }))
    return declarations
  }

  this.addParameter = (item) => {
    let [newRef, prevRef] = this.newIdentifierRef(item.name)
    this.statements.push(new AST.VariableDeclaration({
      kind: "const",
      declarators: [
        new AST.VariableDeclarator({
          binding: new AST.BindingIdentifier({
            name: newRef
          }),
          init: new AST.IdentifierExpression({
            name: prevRef
          })
        })
      ]
    }))
  }

}

module.exports = {transformer}