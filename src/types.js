
function ValueType(name) {
  this.name = name
  this.desc = `ValueType (${name})`
  this.matches = (other) => (other instanceof ValueType && other.name === this.name) || other === undefined
}

function IntersectionType(first, second) {
  this.name = `${first.name} | ${second.name}`
  this.desc = `Intersection (${first.name} | ${second.name})`
}

const verifyCommonType = (first, second, expected) => {
  if (first.name === second.name) {
    if (first.name === expected) {
      return first
    }
  }
  throw new Error(`Types '${first.desc}' and '${second.desc}' have no common type that matches '${expected}' `)
}


const toValueType = (value, expected) => {
  if (typeof value === expected)
    return new ValueType(typeof value)

  throw new Error(`Type of '${value}' is not '${expected}'`)
}



const intersection = (first, second) => {
  if (first !== undefined && first.matches(second)) {
    return first
  }
  if (second !== undefined && second.matches(first)) {
    return second
  }
  return new IntersectionType(first, second)
}

module.exports = { toValueType, verifyCommonType, intersection

}