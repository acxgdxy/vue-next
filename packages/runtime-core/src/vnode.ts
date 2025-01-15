export const Fragment = Symbol('Fragment');
export const Text = Symbol('Text');
export const Comment = Symbol('Comment');
/**
 * VNode
 * */
export interface VNode {
    __v_isVNode: true
    key: any
    type: any
    props: any
    children: any
    shapeFlag: number
}


/**
 * 根据key || type 判断是否相同类型节点
 * */
export function isSameVNodeType(n1: VNode, n2: VNode):boolean {
    return n1.type === n2.type && n1.key === n2.key;
}
