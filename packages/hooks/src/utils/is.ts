const TYPES = {
  UNDEFINED: "[object Undefined]",
  NULL: "[object Null]",
  BOOLEAN: "[object Boolean]",
  NUMBER: "[object Number]",
  STRING: "[object String]",
  ARRAY: "[object Array]",
  OBJECT: "[object Object]",
  FUNCTION: "[object Function]",
};
function getType(val: any) {
  return Object.prototype.toString.call(val);
}
export default {
  undefined: (val: any): boolean => getType(val) === TYPES.UNDEFINED,
  null: (val: any): boolean => getType(val) === TYPES.NULL,
  boolean: (val: any): boolean => getType(val) === TYPES.BOOLEAN,
  number: (val: any): boolean => getType(val) === TYPES.NUMBER,
  string: (val: any): boolean => getType(val) === TYPES.STRING,
  array: (val: any): boolean => getType(val) === TYPES.ARRAY,
  object: (val: any): boolean => getType(val) === TYPES.OBJECT,
  function: (val: any): boolean => getType(val) === TYPES.FUNCTION,
};
