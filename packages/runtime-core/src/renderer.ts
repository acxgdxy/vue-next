import {EMPTY_OBJ, isString} from '@vue/shared'
import {normalizeVNode} from "./componentRenderUtils";
import {Comment, Fragment, isSameVNodeType, Text} from "./vnode";

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
     * 创建comment（注释节点）
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
    const processText = (oldVNode, newVNode, container, anchor) => {
        //不存在旧的节点，则为 挂载 操作
        if (oldVNode == null) {
            //生成节点
            newVNode.el = hostCreateText(newVNode.children as string);
            hostInsert(newVNode.el, container, anchor);
        } else { //存在旧的节点，则为 更新 操作
            const el = (newVNode.el = oldVNode.el!);
            if (newVNode.children !== oldVNode.children) {
                hostSetText(el, newVNode.children as string);
            }
        }
    }

    /**
     * Element 的打补丁操作
     * */
    const processElement = (oldVNode, newVNode, container, anchor) => {
        if (oldVNode == null) {
            //挂载操作
            mountElement(newVNode, container, anchor);
        } else { //更新操作
            patchElement(oldVNode, newVNode);
        }
    }

    /**
     * Fragment 的打补丁操作
     */
    const processFragment = (oldVNode, newVNode, container, anchor) => {
        if (oldVNode == null) {
            mountChildren(newVNode.children, container, anchor);
        } else {
            pathcChildren(oldVNode, newVNode, container, anchor);
        }
    }

    /**
     * 组件的打补丁操作
     */
    const processComponent = (oldVNode, newVNode, container, anchor) => {
        if (oldVNode == null) {
            //挂载
            mountComponent(newVNode, container, anchor)
        }
    }

    const mountComponent = (initialVNode, container, anchor) => {
        //生成组件实例
        initialVNode.component = createComponentInstance(initialVNode);
        //浅拷贝，绑定同一块内存空间
        const instance = initialVNode.component;

        //标准化组件实例数据
        setupComponent(instance);

        //设置组件渲染
        setupRenderEffect(instance, initialVNode, container, anchor);
    }

    /**
     * 设置组件渲染
     * */
    const setupRenderEffect = (instance, initialVNode, container, anchor) => {
        //组件挂载和更新的方法
        const componentUpdateFN = () => {
            //当前处于 mounted 之前，即执行 挂载 逻辑
            if (!instance.isMounted) {
                const {bm, m} = instance;

                //beforeMount hook
                if (bm) {
                    bm();
                }

                //从 render 中获取需要的渲染的内容
                const subTree = (instance.subTree = renderComponentRoot(instance));

                // 通过 patch 对subTree, 进行打补丁。即：渲染组件
                patch(null, subTree, container, anchor)

                if (m) {
                    m()
                }

                // 把组件根节点的 el. 作为组件的 el
                initialVNode.el = subTree.el;

                //修改 mounted 状态
                instance.siMounted = true;
            } else {
                let {next, vnode} = instance;
                if (!next) {
                    next = vnode;
                }
                //获取下一次的 subTree
                const nextTree = renderComponentRoot(instance);

                //保存对应的 subTree,以便进行更新操作
                const prevTree = instance.subTree;
                instance.subTree = nextTree;

                // 通过 patch 进行更新操作
                patch(prevTree, nextTree, container, anchor)

                // 更新 next
                next.el = nextTree.el
            }
        }

        //创建包含 scheduler 的 effect 实例
        const effect = (instance.effect = new ReactiveEffect(
            componentUpdateFN,
            () => queuePreFlushCb(update)
        ))

        const update = (instance.update = () => effect.run())

        //触发
        update()
    }

    /**
     * element 的更新操作
     * */
    const patchElement = (oldVNode, newVNode) => {
        //获取指定的 el
        const el = (newVNode.el = oldVNode.el);

        //新旧 props
        const oldProps = oldVNode.props || EMPTY_OBJ;
        const newProps = newVNode.props || EMPTY_OBJ;

        // 更新子节点
        patchChildren(oldVNode, newVNode, el, null);

        //更新 props
        patchProps(el, newVNode, oldProps, newProps);
    }

    /**
     * element 的挂载操作
     * */
    const mountElement = (vnode, container, anchor) => {
        const {type, props, shapeFlag} = vnode;

        //创建 element
        const el = (vnode.el = hostCreateElement(type));

        if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
            //设置 文本子节点
            hostSetElementText(el, vnode.children as string);

        } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
            //设置 Array 子节点
            mountChildren(vnode.children, el, anchor)
        }

        //处理 props
        if (props) {
            //遍历 props 对象
            for (const key in props) {
                hostPatchProp(el, key, null, props[key])
            }
        }

        //插入 el 到指定的位置
        hostInsert(el, container, anchor)
    }

    /**
     * 为props打补丁
     * */
    const patchProps = (el: Element, vnode, oldProps, newProps) => {
        //新旧 props 不相同是才进行处理
        if (oldProps !== newProps) {
            //遍历新的props，依次触发hostPatchProp，赋值新属性
            for (const key in newProps) {
                const next = newProps[key];
                const prev = oldProps[key];
                if (next !== prev) {
                    hostPatchProp(el, key, prev, next)
                }
            }
            //存在旧的 props 时
            if (oldProps !== EMPTY_OBJ) {
                //遍历旧的props，一次触发hostPatchProp，删除不存在于新的props中的旧属性
                for (const key in oldProps) {
                    if (!(key in newProps)) {
                        hostPatchProp(el, key, oldProps[key], null);
                    }
                }
            }
        }
    }

    /**
     * 挂载子节点
     * */
    const mountChildren = (children, container, anchor) => {
        // 处理 Cannot assign to read only property '0' of string 'xxx'
        if (isString(children)) {
            children = children.split('')
        }
        for (let i = 0; i < children.length; i++) {
            const child = (children[i] = normalizeVNode(children[i]))
            patch(null, child, container, anchor)
        }
    }

    /**
     * 为子节点打补丁
     * */
    const patchChildren = (oldVNode, newVNode, container, anchor) => {
        //旧节点的children
        const c1 = oldVNode && oldVNode.children;
        //就节点的prevShapeFlag
        const prevShapeFlag = oldVNode ? oldVNode.shapeFlag : 0;
        //新节点的children
        const c2 = newVNode.children;

        // 新节点的 shapeFlag
        const {shapeFlag} = newVNode

        // 新子节点为 TEXT_CHILDREN
        if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
            // 旧子节点为 ARRAY_CHILDREN
            if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
                // TODO: 卸载旧子节点
            }
            // 新旧子节点不同
            if (c2 !== c1) {
                // 挂载新子节点的文本
                hostSetElementText(container, c2 as string)
            }
        } else {
            // 旧子节点为 ARRAY_CHILDREN
            if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
                // 新子节点也为 ARRAY_CHILDREN
                if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
                    // 这里要进行 diff 运算
                    patchKeyedChildren(c1, c2, container, anchor)
                }
                // 新子节点不为 ARRAY_CHILDREN，则直接卸载旧子节点
                else {
                    // TODO: 卸载
                }
            } else {
                // 旧子节点为 TEXT_CHILDREN
                if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
                    // 删除旧的文本
                    hostSetElementText(container, '')
                }
                // 新子节点为 ARRAY_CHILDREN
                if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
                    // TODO: 单独挂载新子节点操作
                }
            }
        }
    }




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
        while (i <= oldChildrenEnd && i <= newChildrenEnd) {
            const oldVNode = oldChildren[i];
            const newVNode = normalizeVNode(newChildren[i]);

            if (isSameVNodeType(oldVNode, newVNode)) {

            }
        }
    }

    const patch = (oldVNode, newVNode, container, anchor = null) => {
        if (oldVNode === newVNode) return

        /**
         * 判断是否为相同类型节点
         * */
        if (oldVNode && !isSameVNodeType(oldVNode, newVNode)) {
            unmount(oldVNode); //卸载节点
            oldVNode = null;
        }

        const {type, shapeFlag} = newVNode;
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
                if (shapeFlag & shapeFlags.ELEMENT) {
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
        if (vnode == null) {
            //卸载
            if (container._vnode) {
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
