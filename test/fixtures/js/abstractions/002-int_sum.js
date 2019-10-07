/* int sum monoid */
const int_sum = () => (left, right) => left + right
const program = () => int_sum()(1, 1)
program()