import { uint } from "../type"
import { None, Option } from "./functional"

export function swap<T>(arr: T[], i: number, j: number) {
    const tmp = arr[i]
    arr[i] = arr[j]
    arr[j] = tmp
}
export function shuffle<T>(arr: T[]) {
    for (let i = 0; i < arr.length; i++) {
        swap(arr, i, Math.floor(Math.random() * arr.length))
    }
}
export function range_to_arr<T>(i0: number, n: number, map: (i: number) => T): T[] {
    return new Array(n).fill(0).map((_, i) => map(i + i0))
}

export function find_map<T, R>(arr: T[], predicate: (v: T) => Option<R>): Option<R> {
    for (const elt of arr) {
        const mapped = predicate(elt)
        if (mapped.is_some()) {
            return mapped
        }
    }
    return None
}

export function find_index<T>(arr: T[], target: number, map: (v: T) => number): uint {
    let a = 0;
    let b = arr.length;
    let i = 0
    while (a < b) {
        if (i++ > 10000) {
            throw new Error(`find_index not converging: a=${a}, b=${b}`)
        }
        const mid = Math.floor((a + b) / 2)
        const v = map(arr[mid])
        if (v < target) {
            a = mid + 1
        } else if (v > target) {
            b = mid
        } else {
            return mid
        }
    }
    return a
}