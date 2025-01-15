import {normalizeVNode} from "./componentRenderUtils";
import {isSameVNodeType, Text, Fragment, Comment} from "./vnode";

export interface RendererOptions {
    /**
     * 未指定 element 的 prop 打补丁
     * */
    patchProp(el: Element, key: string, prevValue: any, nextValue: any): void;
    /**
     * 为指定的 Element 设置 text
     * */
    setElementText(node: Element, text: string): void;
    /**
     * 插入指定的 el 到 parent 中，anchor 表示插入的位置，即：锚点
     * 如何理解锚点，请看以下代码
     * 1. 初始HTML：
     * <div id="parent">
     *   <span id="child1">Child 1</span>
     *   <span id="child2">Child 2</span>
     * </div>
     *
     * 2. 使用 diamagnetic 插入一个新的节点
     * const newElement = document.createElement('span')
     * newElement.textContent = 'New Child'
     * // 插入到 child2 之前
     * const parent = document.getElementById('parent')
     * const child2 = document.getElementById('child2')
     * parent.insertBefore(newElement, child2)
     *
     * 3. 执行之后的结果：
     * <div id="parent">
     *   <span id="child1">Child 1</span>
     *   <span>New Child</span>
     *   <span id="child2">Child 2</span>
     * </div>
     *
     * js 代码其中的 child2 就是锚点，表示了插入的位置
     * 新元素插入到 child2 之前
     *
     * */
    insert(el, parent: Element, anchor?): void
    /**
     * 创建指定的 Element
     * */
    createElement(type: string)
    /**
     * 卸载指定dom
     * */
    remove(el): void
    /**
     * 创建text节点
     * */
    createText(text: string)
    /**
     * 设置text
     * */
    setText(node, text): void
    /**
     * 创建comment
     * */
    createComment(text: string)
}

/**
 * 对外暴露的创建渲染器的方法
 * */
export function createRenderer(options: RendererOptions) {
    return baseCreaterRenderer(options)
}


/**
 * 生成 renderer 渲染器
 * @param options 兼容性操作配置对象
 * @returns
 * */
function baseCreaterRenderer(options: RendererOptions): any {
    /**
     * 解构 options，获取所有的兼容性方法
     */
    const {
        insert: hostInsert,
        patchProp: hostPatchProp,
        createElement: hostCreateElement,
        setElementText: hostSetElementText,
        remove: hostRemove,
        createText: hostCreateText,
        setText: hostSetText,
        createComment: hostCreateComment
    } = options

    /**
     * Comment 的打补丁操作
     * */
    const processCommentNode = (oldVNode, newVNode, container, anchor) => {
        if (oldVNode == null) {
            newVNode.el = hostCreateComment((newVNode.children as string) || '')
            // 挂载
            hostInsert(newVNode.el, container, anchor)
        } else {
            //无更新
            newVNode.el = oldVNode.el
        }
    }

    /**
     * Text 的打补丁操作
     * */

    /**
     * diff
     * */
    const patchKeyedChildren = (
        oldChildren,
        newChildren,
        container,
        parentAnchor
    ) => {
        let i = 0;
        const newChildrenLength = newChildren.length;
        let oldChildrenEnd = oldChildren.length - 1;
        let newChildrenEnd = newChildrenLength - 1;

        //1.从前向后节点对比
        while(i <= oldChildrenEnd && i <= newChildrenEnd) {
            const oldVNode = oldChildren[i];
            const newVNode = normalizeVNode(newChildren[i]);

            if(isSameVNodeType(oldVNode, newVNode)) {

            }
        }
    }

    const patch = (oldVNode, newVNode, container, anchor = null) => {
        if(oldVNode === newVNode) return

        /**
         * 判断是否为相同类型节点
         * */
        if(oldVNode && !isSameVNodeType(oldVNode, newVNode)) {
            unmount(oldVNode); //卸载节点
            oldVNode = null;
        }

        const { type, shapeFlag } = newVNode;
        switch (type) {
            case Text:
                processText(oldVNode, newVNode, container, anchor)
                break;
            case Comment:
                processCommentNode(oldVNode, newVNode, container, anchor);
                break;
            case Fragment:
                processFragment(oldVNode, newVNode, container, anchor);
                break;
            default:
                if(shapeFlag & shapeFlags.ELEMENT) {
                    //普通节点
                    processElement(oldVNode, newVNode, container, anchor)
                } else if (shapeFlag & ShapeFlags.COMPONENT) {
                    //组件
                    processComponent(oldVNode, newVNode, container, anchor)
                }
        }
    }

    const unmount = vnode => {
        hostRemove(vnode.el!)
    }

    /**
     * 渲染函数
     * */
    const render = (vnode, container) => {
        if(vnode == null) {
            //卸载
            if(container._vnode) {
                unmount(container._vnode)
            }
        } else {
            //打补丁（包括了挂在和更新）
            patch(container._vnode || null, vnode, container)
        }
        container._vnode = vnode;
    }

    return {
        render,
        createApp: createAppAPI(render)
    }
}


//获取最长递增子序列
function getSequence(arr) {
    const p = arr.slice();
    const result = [0]; //result中存放的是对arr的一个递增序列的索引
    let i, j, u, v, c;
    const len = arr.length
    for (i = 0; i < len; i++) {
        const arrI = arr[i];
        if (arrI !== 0) {
            j = result[result.length - 1];
            if (arr[j] < arrI) {
                p[i] = j; //p记录的是升序的前一个元素
                result.push(i);
                continue;
            }
            //二分查找
            u = 0; //left
            v = result.length - 1; //right
            while (u < v) {//二分查找的是result中的索引
                c = (u + v) / 2; //min
                if (arr[result[c]] < arrI) {
                    u = c + 1;
                } else {
                    v = c;
                }
            }
            if (arrI < arr[result[u]]) {
                if (u > 0) {
                    p[i] = result[u - 1];
                }

                result[u] = i;
            }
        }
    }
    u = result.length;
    v = result[u - 1];
    while (u-- > 0) { //更具p数组修正result数组，因为前边的贪心导致最终的结果并不是一个恒增的子序列
        result[u] = v;
        v = p[v]
    }
    return result;
}
