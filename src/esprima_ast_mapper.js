const esprima = require('esprima')

const astMapper = () => ({
  mappers: {},
  match: function (nodetype, func) {
    this.mappers[nodetype] = func
  },
  parse: function (node, context) {
    if (Array.isArray(node)) {
      return node
        .map((n) => this.parse(n, context))
        .filter(x => x)
        .reduce((acc, x) => acc.concat(x), [])
    }
    let mappingFunc = this.mappers[node.type]
    if (mappingFunc === undefined)
      return undefined

    return mappingFunc(node, context)
  },
  parseAndMap: function (js) {
    let counter = 0
    let esprimaMapper = (node, meta) => {
      console.log(`${++counter}: ${node.type} (${js.substring(meta.start.offset, meta.end.offset)}) - (${Object.keys(node)})`)
    }
    return this.parse(esprima.parseScript(js, {}, esprimaMapper))
  }
})


module.exports = astMapper