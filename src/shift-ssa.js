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
    return node
  }
  this.FormalParameters = (node, scope) => {
    node.items.forEach(x => scope.addParameter(x))
    return node
  }

  const literalExpression = (node, scope) => {
    scope.addLiteralExpression(node)
    return node
  }
  this.LiteralStringExpression = literalExpression
  this.LiteralNumericExpression = literalExpression
  this.LiteralBooleanExpression = literalExpression

  this.BinaryExpression = (node, scope) => {
    this.transform(node.left, scope)
    this.transform(node.right, scope)
    scope.addBinaryExpression(node)
    return node
  }

  this.CallExpression = (node, scope) => {
    this.transform(node.callee, scope)
    this.transform(node.arguments, scope)
    scope.addCallExpression(node)
    return node
  }
}

function SSABody () {
  this.statements = []
  this.variableMap = new Map()


  const forNode = (node) => {
    switch (node.type) {
      case 'IdentifierExpression':
        return forVariable(node.name)
      case 'LiteralStringExpression':
      case 'LiteralNumberExpression':
      case 'LiteralBooleanExpression':
        return forLiteral(node.value)
      case 'BinaryExpression':
        return forBinaryExpr(node.operator, forNode(node.left), forNode(node.right))
      case 'CallExpression':
        return forCallExpr(forNode(node.callee), node.arguments.map(forNode).filter(x => x !== undefined))
    }
  }
  const forVariable = (varName) => ({
    identifier: `v${varName}`,
    original: varName
  })
  const forLiteral = (value) => ({
    identifier: `l${value}`,
    original: value
  })
  const forBinaryExpr = (operator, left, right) => ({
    identifier: `${left.identifier} ${operator} ${right.identifier}`,
    original: undefined
  })

  const forCallExpr = (callee, args) => ({
    identifier: `${callee.identifier}(${args.map(arg => arg.identifier).join(',')})`,
    original: undefined
  })

  this.getRef = (handle) => {
    let refs = this.variableMap.get(handle.identifier)
    return refs !== undefined && refs.length > 0 ? refs[refs.length - 1] : undefined
  }
  this.newRef = (handle) => {
    if (!this.variableMap.has(handle.identifier)) {
      this.variableMap.set(handle.identifier, [this.nextName()])
      return [this.nextName(), handle.original]
    }

    let newRef = this.nextName()
    let refs = this.variableMap.get(handle.identifier)
    let prevRef = refs[refs.length - 1]
    refs.push(newRef)
    return [newRef, prevRef]
  }
  this.addIdentifierExpression = (expr) => {
    let [newRef, prevRef] = this.newRef(forNode(expr))

    this.statements.push(new AST.VariableDeclaration({
      kind: 'const',
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
    return `c${this.statements.length - 1}`
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
    let [newRef, prevRef] = this.newRef(forVariable(item.name))
    this.statements.push(new AST.VariableDeclaration({
      kind: 'const',
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

  this.addLiteralExpression = (literal) => {
    let [newRef, prevRef] = this.newRef(forLiteral(literal.value))
    this.statements.push(new AST.VariableDeclaration({
      kind: 'const',
      declarators: [
        new AST.VariableDeclarator({
          binding: new AST.BindingIdentifier({
            name: newRef
          }),
          init: prevRef === literal.value ?
            literal :
            new AST.IdentifierExpression({
              name: prevRef
            })
        })
      ]
    }))
  }

  this.addBinaryExpression = (binaryExpr) => {
    let [newRef, _] = this.newRef(forNode(binaryExpr))
    let leftRef = this.getRef(forNode(binaryExpr.left))
    let rightRef = this.getRef(forNode(binaryExpr.right))

    this.statements.push(new AST.VariableDeclaration({
      kind: 'const',
      declarators: [
        new AST.VariableDeclarator({
          binding: new AST.BindingIdentifier({
            name: newRef
          }),
          init: new AST.BinaryExpression({
            operator: binaryExpr.operator,
            left: new AST.IdentifierExpression({
              name: leftRef
            }),
            right: new AST.IdentifierExpression({
              name: rightRef
            })
          })
        })
      ]
    }))
  }

  this.addCallExpression = (callExpr) => {
    let [newRef, _] = this.newRef(forNode(callExpr))

    let calleeRef = this.getRef(forNode(callExpr.callee))
    let argRefs = callExpr.arguments.map(forNode).filter(x => x !== undefined).map(this.getRef)

    this.statements.push(new AST.VariableDeclaration({
      kind: 'const',
      declarators: [
        new AST.VariableDeclarator({
          binding: new AST.BindingIdentifier({
            name: newRef
          }),
          init: new AST.CallExpression({
            callee: new AST.IdentifierExpression({
              name: calleeRef
            }),
            arguments: argRefs.map(ref => new AST.IdentifierExpression({
                name: ref
            }))
          })
        })
      ]
    }))
  }

}

module.exports = { transformer }