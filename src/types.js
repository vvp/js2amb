function ValueType (name) {
  this.name = name
  this.desc = `${name}`
  this.matches = (other) => (other instanceof ValueType && other.name === this.name) || other instanceof AnyType
}

function IntersectionType (first, second) {
  this.name = `${first.name} && ${second.name}`
  this.desc = `(${first.desc} lub ${second.desc})` // least upper bound in type lattice
}

function AnyType (variableName) {
  this.name = variableName
  this.desc = `(typeof ${this.name})`
  this.matches = (other) => other instanceof AnyType ? other.name === this.name : true
}

const toValueType = (value, expected) => {
  if (typeof value === expected)
    return new ValueType(typeof value)

  throw new Error(`Type of '${value}' is not '${expected}'`)
}

const toUnknownType = (name) => {
  return new AnyType(name)
}

const toFunctionType = (name) => {
  return new AnyType(name + "()")
}

const isConcreteType = (type) => {
  return !(type instanceof AnyType || type instanceof IntersectionType) && type !== undefined
}

const intersection = (first, second) => {
  if (isConcreteType(first) && first.matches(second)) {
    return first
  }
  if (isConcreteType(second) && second.matches(first)) {
    return second
  }
  return new IntersectionType(first, second)
}

module.exports = {
  toValueType, intersection, toUnknownType, toFunctionType

}