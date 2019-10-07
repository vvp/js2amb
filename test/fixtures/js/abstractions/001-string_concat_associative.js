/* String monoid */
const string_concat = () => (left, right) => left + right
const program = () => string_concat()(string_concat()("hello", "world"), "again")
program()
