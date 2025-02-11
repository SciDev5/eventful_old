export type ResolvablePromise<T> = Promise<T> & { res: (resolution: T) => void, rej: (error: unknown) => void, }
export function genResolvable<T>(): ResolvablePromise<T> {
    let res = (_: T) => { }
    let rej = (_: unknown) => { }
    const promise = new Promise((res_, rej_) => {
        res = res_
        rej = rej_
    }) as ResolvablePromise<T>
    promise.res = res
    promise.rej = rej
    return promise
}