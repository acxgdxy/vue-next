import {normalizeVNode} from "./componentRenderUtils";
import {isSameVNodeType} from "./vnode";

export interface RendererOptions {

}

/**
 * 生成 renderer 渲染器
 * @param options 兼容性操作配置对象
 * @returns
 * */
function baseCreaterRenderer(options: RendererOptions): any {


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
