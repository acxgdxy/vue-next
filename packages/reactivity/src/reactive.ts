import { isObject } from '@vue/shared'
import { mutableHandlers } from './baseHandlers'

export const enum ReactiveFlags {
    IS_REACTIVE = '__v_isReactive'
}

/**
 * 响应性 Map 缓存对象
 * key: target
 * val: proxy
 * */
export const reactiveMap = new WeakMap<object, any>()

/**
 * 为复杂数据类型，创建响应性对象
 * @param target 被代理对象
 * @returns 代理对象
 */
export function reactive(target: object) {
    return createReactiveObject(target, mutableHandlers, reactiveMap)
}

/**
 * 创建响应性对象
 * @param target 被代理对象
 * @param baseHandlers handler
 */
function createReactiveObject(
    target: object,
    baseHandlers: ProxyHandler<any>,
    proxyMap: WeakMap<object, any>
) {
    const existingProxy = proxyMap.get(target)
    if(existingProxy) {
        return existingProxy
    }

    const proxy = new Proxy(target, baseHandlers)
     proxy[ReactiveFlags.IS_REACTIVE] = true

    proxyMap.set(target, proxy)
    return proxy
}

/**
 * 将指定数据变为 reactive 数据
 */
export const toReactive = <T extends unknown>(value: T): T =>
    isObject(value) ? reactive(value as object) : value

/**
 * 判断一个数据是否为 Reactive
 * */
export function isReactive(value): boolean {
    return !!(value && value[ReactiveFlags.IS_REACTIVE])
}
