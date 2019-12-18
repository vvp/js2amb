const types = require('./types.js')

let primitives = {}

primitives.string = {
  literal: (value) => ({
    type: types.toValueType(value,'string'),
    toAmbient: () => `string[${value}[]]`
  }),
  plus: (left, right) => ({
    type: types.intersection(left.type, right.type),
    toAmbient: () => `string[plus[l[${left.toAmbient()}]|r[${right.toAmbient()}]]]`
  })
}
primitives.number = {
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
  if (supportedPrimitive === undefined)
    throw new Error(`Binary operations of type '${type.desc} -> ${left.type.desc}' not supported yet`)

  Object.assign(type, supportedPrimitive)
  return type
}

module.exports = {literal, verifyPrimitive}