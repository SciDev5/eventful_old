export class Option<T> {
    private constructor(
        readonly some?: { v: T },
    ) { }

    is_some(): this is Omit<Option<0>, "some"> & { some: { v: T } } {
        return "some" in this
    }
    is_some_and(map: (v: T) => boolean): boolean {
        return this.is_some() ? map(this.some.v) : false
    }
    unwrap_null(): { value: T } | null {
        return this.is_some() ? { value: this.some.v } : null
    }
    unwrap_or(v_default: T): T {
        return this.is_some() ? this.some.v : v_default
    }
    unwrap_or_else(v_default: () => T): T {
        return this.is_some() ? this.some.v : v_default()
    }
    map<R>(map: (v: T) => R): Option<R> {
        return this.is_some() ? Some(map(this.some.v)) : None
    }
    and_then<R>(map: (v: T) => Option<R>): Option<R> {
        return this.is_some() ? map(this.some.v) : None
    }
    and_if(map: (v: T) => boolean): Option<T> {
        return this.is_some() && map(this.some.v) ? this : None
    }
    toString(): string {
        return this.is_some() ? `Some(${this.some.v})` : "None"
    }
    static Some<T>(some: T) {
        return new Option({ v: some })
    }
    static None = new Option() as Option<never>

    static arr_all<T>(v: Option<T>[]): Option<T[]> {
        return v.every(Option.is_some)
            ? Some(v.map(v => v.some))
            : None
    }
    static is_some<T>(v: Option<T>): v is Option<T> & { some: T } {
        return v.is_some()
    }
}
export const { Some, None } = Option


export type Result<T, R> = ({ ok: T } | { err: R }) & { err_to_null(): { value: T } | null }
const RESULT_proto = {
    ok() {
        const this_ = (this as never as Option<unknown>)
        return "ok" in this_ ? Some(this_.ok) : null
    }
}
export function Ok<T, R>(ok: T): Result<T, R> {
    return Object.setPrototypeOf({ ok }, RESULT_proto)
}
export function Err<T, R>(err: R): Result<T, R> {
    return Object.setPrototypeOf({ err }, RESULT_proto)
}

export function identity<T>(v: T): T { return v }



export type Sum<T extends Record<string, unknown>> =
    { [k in keyof T]:
        { [k_ in k]:
            T[k]
        }
    }[keyof T]

export type value_eq = number | string | symbol | bigint | boolean | null | ValueEq
interface ValueEq { }