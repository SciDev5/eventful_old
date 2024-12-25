import { useEffect, useMemo, useState } from "react";

export function useAwait<T>(promise: Promise<T>, handle_err?: (err: any) => void): T | null {
    const [value, set_value] = useState<T | null>(null)
    useEffect(() => {
        let res_destroy = () => { }
        const destroy = new Promise<void>((res) => { res_destroy = res })

        Promise.any([promise.then(v => ({ v })), destroy]).then(res => {
            if (res == null) return
            set_value(res.v)
        }).catch(err => {
            handle_err?.(err)
        })

        return res_destroy
    }, [promise, handle_err, set_value])
    return value
}

export function useChangedValue<T>(value: T, changed: (from: T, to: T) => boolean): T {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const ref = useMemo(() => ({ value }), [])

    return useMemo(() => {
        if (changed(ref.value, value)) {
            ref.value = value
        }
        return ref.value
    }, [ref, value, changed])
}
export function useMappedSet<T, R>(set: Set<T>, map_fn: (v: T) => R): R[] {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const ref = useMemo(() => ({ set: new Set<T>(), map: new Map<T, R>(), out: [] as R[], map_fn }), [])

    return useMemo(() => {
        if (map_fn != ref.map_fn) {
            ref.map_fn = map_fn
            ref.map.clear()
            ref.set.clear()
            ref.out = []
        }

        const added = set.difference(ref.set)
        const removed = ref.set.difference(set)

        for (const value of added) {
            const value_mapped = map_fn(value)
            ref.map.set(value, value_mapped)
        }
        for (const value of removed) {
            ref.map.delete(value)
        }
        if (added.size > 0 || removed.size > 0) {
            ref.set = new Set(set)
            ref.out = [...set.values()].map(value => ref.map.get(value)!)
        }

        return ref.out
    }, [ref, set, map_fn])

}