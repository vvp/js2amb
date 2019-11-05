let primitives = {}
primitives.string = {
  literal: (value) => ({
    type: 'string',
    toAmbient: (scope) => `string[${value}[]]`
  }),
  plus: (left, right) => ({
    type: 'string',
    toAmbient: (scope) => `string[concat[left[${left.toAmbient(scope)}]|right[${right.toAmbient(scope)}]]]`
  })
}
primitives.number = {
  literal: (value) => ({
    type: 'number',
    toAmbient: (scope) => `int[i${value}[]]`
  }),
  plus: (left, right) => ({
    type: 'number',
    toAmbient: (scope) => `int[plus[left[${left.toAmbient(scope)}]|right[${right.toAmbient(scope)}]]]`
  }),
  multiply: (left, right) => ({
    type: 'number',
    toAmbient: (scope) => `int[multiply[left[${left.toAmbient(scope)}]|right[${right.toAmbient(scope)}]]]`
  })
}

module.exports = primitives