import { Sum } from "./util/functional"

type ExtractIsType<T extends Is<any>> = T extends Is<infer R> ? R : 0
export type Is<T> = RawIs<T> & ClassIs<T>
type RawIs<T> = (v: unknown) => v is T
class ClassIs<T> {
    and(condition: (v: T) => boolean): Is<T> {
        return _is_((v => (this as unknown as Is<T>)(v) && condition(v)) as (v: unknown) => v is T)
    }
    or<R>(other: Is<R>): Is<T | R> {
        return is_one_of([this as unknown as Is<T>, other])
    }
    array(): Is<T[]> {
        return is_arr(this as unknown as Is<T>)
    }
    nullable(): Is<T | null> {
        return this.or(is_null)
    }

    gen_hydrator<U>(
        des: (v: T) => U,
        ser: (v: U) => T,
    ) {
        return new Hydrator(this as unknown as Is<T>, des, ser)
    }
    gen_hydrator_id() {
        return new Hydrator(this as unknown as Is<T>, v => v, v => v)
    }

}
class Hydrator<R, T> {
    constructor(
        readonly is: Is<R>,
        readonly des: (v: R) => T,
        readonly ser: (v: T) => R,
    ) { }

    to_json(v: T): R {
        return this.ser(v)
    }
    to_json_str(v: T): string {
        return JSON.stringify(this.to_json(v))
    }
    from_json(v: unknown): { ok: T } | null {
        return this.is(v) ? { ok: this.des(v) } : null
    }
    from_json_str(v: string): { ok: T } | null {
        let json_parsed
        try {
            json_parsed = JSON.parse(v)
        } catch {
            return null
        }
        return this.from_json(json_parsed)
    }
}
function _is_<T>(raw: (v: unknown) => v is T): Is<T> {
    Object.setPrototypeOf(raw, ClassIs.prototype)
    return raw as Is<T>
}


export function is_literally<T>(expect: T): Is<T> {
    return _is_((v: unknown): v is T => v === expect)
}
export function is_obj<T extends Record<string, Is<any>>>(spec: T): Is<{ [k in keyof T]: ExtractIsType<T[k]> }> {
    const keys_arr = Object.keys(spec)
    const keys = new Set(keys_arr)
    return _is_((v: unknown): v is { [k in keyof T]: ExtractIsType<T[k]> } => {
        if (typeof v !== "object" || v === null)
            return false
        const v_keys = new Set(Object.keys(v))
        if (keys.symmetricDifference(v_keys).size > 0) {
            return false
        }
        return keys_arr.every(k => spec[k]((v as any)[k]))
    })
}
export function is_arr<T extends Is<any>>(spec: T): Is<ExtractIsType<T>[]> {
    return _is_(v => (v instanceof Array) && v.every(spec))
}
export function is_one_of<T extends Is<any>[]>(spec: T): Is<ExtractIsType<T[number]>> {
    return _is_((v: unknown): v is ExtractIsType<T[number]> => spec.some(spec => spec(v)))
}
export function is_enum<T extends Record<string, Record<string, Is<any>>>, K extends string>(
    spec: T,
    key_name: K,
): Is<{ [k in keyof T]: { [k2 in keyof T[k]]: ExtractIsType<T[k][k2]> } & { [_ in K]: k } }[keyof T]> {
    return is_one_of(Object.entries(spec).map(([k, spec]) => is_obj({ ...spec, [key_name]: is_literally(k) }))) as never
}

// type StructSpec<T> = Is<T>|(T extends Record<string, unknown> ? {[k in keyof T]: StructSpec<T>} : never)
type StructSpecToType<S> =
    S extends Is<infer T> ? T :
    S extends Record<string, unknown> ? { [k in keyof S]: StructSpecToType<S[k]> } :
    S extends Array<infer T> ? Array<StructSpecToType<T>> :
    never

export function is_struct<T>(spec: T): Is<StructSpecToType<T>> {
    if (spec instanceof ClassIs) {
        return spec as never
    }
    if (spec instanceof Array) {
        if (spec.length === 1) {
            return is_struct(spec[0]).array() as never
        }
        throw new Error("invalid spec")
    }
    if (typeof spec === "object" && spec != null && Object.keys(spec).every(is_string)) {
        return is_obj(Object.fromEntries(
            Object.entries(spec).map(([k, spec]) => ([k, is_struct(spec)]))
        )) as never
    }
    throw new Error("invalid spec")
}


export const is_number_lax = _is_(v => typeof v === "number")
export const is_number = is_number_lax.and(v => Number.isFinite(v))
export const number = is_number.gen_hydrator_id()
export const is_int = is_number_lax.and(v => Number.isInteger(v))
export type int = number
export const int = is_int.gen_hydrator_id()

export const is_string = _is_(v => typeof v === "string")
export const string = is_string.gen_hydrator_id()
export const is_bool = _is_(v => typeof v === "boolean")
export const bool = is_bool.gen_hydrator_id()
export const is_null = is_literally(null)

enum A {
    Bcdef
}

const r = is_enum({
    [A.Bcdef]: { world: is_bool }
}, "_")



class Id {
    constructor(readonly raw: string) {
        if (!Id.type.is(raw)) { throw new Error("not a valid id") }
    }
    f() {

    }

    static type = is_string.and(v => /^[0-9a-zA-Z_-]{16}$/.test(v)).gen_hydrator<Id>(
        v => new Id(v),
        v => v.raw,
    )
}

const date = is_number.gen_hydrator<Date>(
    v => new Date(v),
    v => v.getTime()
)

export const is_User = is_struct({
    id: Id.type.is,
    created: date.is,
    // auth
    handle: is_string,
    passhash: is_string.nullable(),
    kerb: is_string.nullable(),
    // service
    name: is_string,
    groups: {
        self: Id.type.is,
        joined: [Id.type.is]
    },
})