export function int_lt(max: number): number {
    return Math.floor(Math.random() * max)
}

export function int_range(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min) + min)
}

export function sample_uniform<T>(arr: T[]): T {
    return arr[int_lt(arr.length)]
}
