let primitives = {}
primitives.string = {
  name: 'string',
  literal: (value) => ({
    type: 'string',
    toAmbient: () => `string[${value}[]]`
  }),
  plus: (left, right) => ({
    type: 'string',
    toAmbient: () => `string[plus[l[${left.toAmbient()}]|r[${right.toAmbient()}]]]`
  })
}
primitives.number = {
  name: 'int',
  literal: (value) => ({
    type: 'number',
    toAmbient: (scope) => `int[i${value}[]]`
  }),
  plus: (left, right) => ({
    type: 'number',
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
  let primitive = primitives[left.type]
  if (primitive === undefined || primitive.literal === undefined) {
    throw new Error(`primitive '${left.type}' is not supported for plus-operator`)
  }
  if (left.type !== right.type) {
    throw new Error(`Compiler does not support implicit type conversions for binary ops`)
  }
  return primitive
}

module.exports = {literal, verifyPrimitive}