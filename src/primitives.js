let primitives = {}
primitives.string = {
  literal: (value) => ({
    type: 'string',
    toAlgebra: (scope) => `string[${value}[]]`
  }),
  plus: (left, right) => ({
    type: 'string',
    toAlgebra: (scope) => `string[concat[left[${left.toAlgebra(scope)}]|right[${right.toAlgebra(scope)}]]]`
  })
}
primitives.number = {
  literal: (value) => ({
    type: 'number',
    toAlgebra: (scope) => `int[i${value}[]]`
  }),
  plus: (left, right) => ({
    type: 'number',
    toAlgebra: (scope) => `int[plus[left[${left.toAlgebra(scope)}]|right[${right.toAlgebra(scope)}]]]`
  }),
  multiply: (left, right) => ({
    type: 'number',
    toAlgebra: (scope) => `int[multiply[left[${left.toAlgebra(scope)}]|right[${right.toAlgebra(scope)}]]]`
  })
}

module.exports = primitives