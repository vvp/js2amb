const esprima = require('esprima')

const astMapper = () => ({
  mappers: {},
  register: function (nodetype, func) {
    this.mappers[nodetype] = func
  },
  directMap: function(node, astNode) {
    this.lookupMap.set(node, astNode)
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

module.exports = astMapper