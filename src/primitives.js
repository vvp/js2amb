const types = require('./types.js')

const { ambient, seq, parallel } = require('./algebra_ast.js')

let primitives = {}

primitives.string = {
  name: 'string',
  literal: (value) => ({
    type: types.toValueType(value,'string'),
    toAmbient: () => ambient('string', ambient(value))
  }),
  plus: (left, right) => ({
    type: types.intersection(left.type, right.type),
    toAmbient: () => ambient('string',
        ambient('plus',
          ambient('l', left.toAmbient()),
          ambient('r', right.toAmbient())))
  })
}
primitives.number = {
  name: 'int',
  literal: (value) => ({
    type: 'number',
    toAmbient: (scope) => `int[i${value}[]]`
  }),
  plus: (left, right) => ({
    type: () => 'number',
    toAmbient: (scope) => `int[plus[l[${left.toAmbient(scope)}]|r[${right.toAmbient(scope)}]]]`
  }),
  multiply: (left, right) => ({
    type: 'number',
    toAmbient: (scope) => `int[multiply[l[${left.toAmbient(scope)}]|r[${right.toAmbient(scope)}]]]`
  })
}

function literal (value) {
  let primitive = primitives[typeof value]
  if (primitive === undefined || primitive.literal === undefined) {
    throw new Error(`primitive '${typeof value}' is not supported as literal`)
  }
  return primitive.literal(value)
}

const verifyPrimitive = (left, right) => {
  let type = types.intersection(left.type, right.type)
  let supportedPrimitive = primitives[type.name]
  if (supportedPrimitive === undefined) {
    console.log(`! Binary operations of type '${type.desc} -> ${left.type.desc}' not supported properly, so assuming type is a string for now`)
    supportedPrimitive = primitives.string
  }

  Object.assign(type, supportedPrimitive)

  return type
}

module.exports = {literal, verifyPrimitive}