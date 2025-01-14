import { extend, isArray } from '@vue/shared'
import { ComputedRefImpl } from "./computed";
import {createDep, Dep} from './dep'

export type EffectScheduler = (...args: any[]) => any

type KeyToDepMap = Map<any, Dep>;

/**
 * 收集所有依赖的 WeakMap 实例：
 * 1. `key`：响应性对象
 * 2. `value`：`Map` 对象
 * 		1. `key`：响应性对象的指定属性
 * 		2. `value`：指定对象的指定属性的 执行函数
 */
const targetMap = new WeakMap<any, KeyToDepMap>();

/**
 * 用于收集依赖的方法，目的是触发依赖
 * @param target WeakMap 的 key
 * @param key 代理对象的 key，当依赖被触发时，需要根据该 key 获取
 */
export function track(target: object, key: unknown) {
    if (!activeEffect) return;
    let depsMap = targetMap.get(target);
    if(!depsMap) {
        targetMap.set(target, (depsMap = new Map()))
    }
    let dep = depsMap.get(key)
    if(!dep) {
        depsMap.set(key, (dep = createDep()))
    }

    trackEffects(dep)
}

/**
 * 利用 dep 依次跟踪指定 key 的所有 effect
 * @param dep
 */

export function trackEffects(dep: Dep) {
    // activeEffect! ： 断言 activeEffect 不为 null
    dep.add(activeEffect!)
}


/**
 * 触发依赖的方法
 * @param target WeakMap 的 key
 * @param key 代理对象的 key，当依赖被触发时，需要根据该 key 获取
 */

export function trigger(target: object, key?: unknown) {
    const depsMap = targetMap.get(target);
    if(!depsMap) return;
    let dep: Dep | undefined = depsMap.get(key); //找到依赖
    if(!dep) return;
    triggerEffects(dep);//触发依赖
}

/**
 * 依次触发 dep 中保存的依赖
 */
export function triggerEffects(dep: Dep) {
    const effects = isArray(dep) ? dep: [...dep];
    for(const effect of effects) {
        effect.run()
    }
}


/**
 * 单例的，当前的 effect
 */
export let activeEffect: ReactiveEffect | undefined

export class ReactiveEffect<T = any> {
    /**
     * 存在该属性，则表示当前的 effect 为计算属性的 effect----computed
     */
    computed?: ComputedRefImpl<T>
    constructor(
        public fn: () => T,
        public scheduler: EffectScheduler | null = null
    ) {}

    run() {
        activeEffect = this;
        return this.fn()
    }

    stop() {}
}

export interface ReactiveEffectOptions {
    lazy?: boolean
    scheduler?: EffectScheduler
}

/**
 * effect 函数
 * @param fn 执行方法
 * @returns 以 ReactiveEffect 实例为this的执行函数
 * */
export function effect<T = any>(fn: () => T, options?: ReactiveEffectOptions) {
    const _effect = new ReactiveEffect(fn);
    if(options) {
        extend(_effect, options)
    }

    if(!options || !options.lazy) {
        _effect.run()
    }
}

















