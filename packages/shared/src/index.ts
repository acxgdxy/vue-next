/**
 * 判断是否为一个数组
 * */
export const isArray = Array.isArray

/**
 * 判断是否为一个对象
 * */
export const isObject = (val: unknown) =>
    val !== null && typeof val === 'object'

/**
 * 是否为一个function
 * */
export const isFunction = (val: unknown): val is Function =>
    typeof val === 'function'

/**
 * Object.assign
 */
export const extend = Object.assign


/**
 * 对比两个数据是否发生了改变
 * */
export const hasChanged = (value: any, oldValue: any): boolean =>
    !Object.is(value, oldValue)