import { hasChanged } from '@vue/shared'
import { createDep, Dep } from './dep'
import { activeEffect, trackEffects, triggerEffects } from './effect'
import { toReactive } from './reactive'

export interface Ref<T = any> {
    value: T
}

/**
 * ref 函数
 * @param value unknown
 * */
export function ref(value?: unknown) {
    return createRef(value, false)
}

/**
 * 创建 RefImpl 实例
 * @param rawValue 原始数据
 * @param shallow boolean 形数据，表示《浅层的响应性（即：只有 .value 是响应性的）》
 * @returns
 */
function createRef(rawVale: unknown, shallow: boolean) {
    if(isRef(rawVale)) return rawVale;
    return new RefImpl(rawVale, shallow)
}

class RefImpl<T> {
    private _value: T
    private _rawValue: T

    public dep?: Dep = undefined

    //是否为ref类型舒的标记
    public  readonly __v_isRef = true

    constructor(value: T, public readonly __v_isShallow: boolean) {
        this._value = __v_isShallow ? value : toReactive(value)

        //原始数据
        this._rawValue = value
    }

    get value() {
        trackRefValue(this)
        return this._value
    }

    set value(newVal) {
        /**
         * newVal 为新数据
         * this._rawValue 为旧数据（原始数据）
         * 对比两个数据是否发生了变化
         */
        if(hasChanged(newVal, this._rawValue)) {
            this._rawValue = newVal
            this._value = toReactive(newVal)
            triggerRefValue(this)
        }
    }
}

/**
 * 为 ref 的 value 进行依赖收集工作
 */
export function trackRefValue(ref) {
    if(activeEffect) {
        trackEffects(ref.dep || (ref.dep = createDep()))
    }
}

/**
 * 为 ref 的 value 进行触发依赖工作
 */
export function triggerRefValue(ref) {
    if(ref.dep) {
        triggerEffects(ref.dep)
    }
}


/**
 * 判断指定数据是否为 RefImpl 类型
 */
export function isRef(r: any): r is Ref {
    return !!(r && r.__v_isRef === true)
}
