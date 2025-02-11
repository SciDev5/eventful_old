import { float, int } from "./ty_shared"
import { find_map } from "./util/arr"
import { Color } from "./util/color"
import { identity, None, Option, Some, value_eq } from "./util/functional"

export type Simple = number | string | boolean | null | Simple[] | { [k: string]: Simple }


export interface Ty<T, S> {
    ser(v: T): S,
    des(v: S): Option<T>,
    verify(v: unknown): v is T,
}
export type TyInner<T extends Ty<unknown, unknown>> = Parameters<T["ser"]>[0]

function ty_any<S>(): Ty<S, S> {
    return {
        ser: v => v,
        des: v => Some(v),
        verify: (() => true) as never,
    }
}

function ty_raw<T extends I, I, S>(
    verify: (k: I) => k is T,
    ser: (v: T) => S,
    des: (v: S) => I,
): Ty<T, S> {
    return {
        ser,
        des: (raw) => {
            const intermediate = des(raw)
            return verify(intermediate) ? Some(intermediate) : None
        },
        verify,
    }
}
function ty_verify<T, S>(ty: Ty<T, S>, verify: (v: T) => boolean): Ty<T, S> {
    return {
        ser: ty.ser,
        des: v => ty.des(v).and_if(verify),
        verify: (v => ty.verify(v) && verify(v)) as (v: unknown) => v is T,
    }
}
export function ty_map<T, TS, S>(
    ty: Ty<TS, S>,
    ser: (v: T) => TS,
    des: (v: TS) => T,
    verify_outer: (v: unknown, ty: Ty<TS, S>) => v is T,
): Ty<T, S> {
    return {
        ser: v => ty.ser(ser(v)),
        des: v => ty.des(v).map(des),
        verify: v => verify_outer(v, ty),
    }
}

function ty_literal<T, S>(literal: T, repr: S): Ty<T, S> {
    return {
        ser: () => repr,
        des: (v) => v == repr ? Some(literal) : None,
        verify: (v): v is T => v === literal,
    }
}
function ty_literal_ident<T extends S, S>(literal: T): Ty<T, S> {
    return ty_literal(literal, literal)
}

const tys_number = ty_raw<number, Simple, Simple>(v => typeof v === "number", identity, identity)
const tys_number_finite = ty_verify(tys_number, Number.isFinite)
const tys_integer = ty_verify(tys_number, Number.isInteger)
const tys_integer_unsigned = ty_verify(tys_number, v => Number.isInteger(v) && v >= 0)
const tys_string = ty_raw<string, Simple, Simple>(v => typeof v === "string", identity, identity)
const tys_bool = ty_raw<boolean, Simple, Simple>(v => typeof v === "boolean", identity, identity)
const tys_null = ty_raw<null, Simple, Simple>(v => v === null, identity, identity)

function tys_array<T>(ty_elt: Ty<T, Simple>,): Ty<T[], Simple> {
    return {
        ser: (v) => v.map(ty_elt.ser),
        des: (v) => {
            if (!(v instanceof Array)) {
                return None
            }
            const v_ = v.map(elt => ty_elt.des(elt).unwrap_null())
            return v_.some(elt => elt == null)
                ? None
                : Some(v_.map(v => v!.value))
        },
        verify: v => (v instanceof Array) && v.every(v => ty_elt.verify(v))
    }
}

function tys_obj<T extends Record<string, unknown>>(
    ty_obj: { [k in keyof T]: Ty<T[k], Simple> | (() => Ty<T[k], Simple>) },
    strict: boolean = true,
): Ty<T, Simple> {
    const ty_obj_entries = Object.entries(ty_obj) as ({ [k in keyof T]: [k, Ty<T[k], Simple> | (() => Ty<T[k], Simple>)] }[keyof T])[]
    let fix: (() => void) | null = () => {
        for (const ent of ty_obj_entries) {
            const [k,] = ent
            if (ty_obj[k] instanceof Function) {
                ty_obj[k] = ty_obj[k]()
            }
            if (ent[1] instanceof Function) {
                ent[1] = ent[1]()
            }
        }
        fix = null
    }
    return {
        ser: v => {
            fix?.()
            return Object.fromEntries(Object.entries(v)
                .map(function <K extends keyof T>([k, v]: [K, T[K]]) {
                    return [k, (ty_obj[k] as Ty<T[K], Simple>).ser(v)]
                } as (() => [string, Simple])))
        },
        des: raw => {
            fix?.()
            if (typeof raw !== "object" || raw === null || (raw instanceof Array)) {
                return None
            }
            if (strict && (ty_obj_entries.length !== Object.keys(raw).length)) {
                return None
            }
            const v = {} as T

            for (const [k_ent, ty_v_ent] of ty_obj_entries) {
                const v_ent = k_ent in raw ? (ty_v_ent as Ty<T[keyof T], Simple>).des(raw[k_ent]) : None
                if (v_ent.is_some()) {
                    v[k_ent] = v_ent.some.v
                } else {
                    return None
                }
            }
            return Some(v)
        },
        verify: (v): v is T => {
            fix?.()
            if (typeof v !== "object" || v === null || (v instanceof Array)) {
                return false
            }
            if (strict && (ty_obj_entries.length !== Object.keys(v).length)) {
                return false
            }
            if (Object.getPrototypeOf(v) !== Object.prototype) {
                return false
            }
            for (const [k_ent, ty_v_ent] of ty_obj_entries) {
                if (!(k_ent in v) || !(ty_v_ent as Ty<T[keyof T], Simple>).verify((v as Record<string | number | symbol, unknown>)[k_ent])) {
                    return false
                }
            }
            return true
        }
    }
}
function tys_union<T extends Ty<unknown, S>[], S>(
    ...ty: T
): Ty<TyInner<T[number]>, S> {
    return {
        ser: v => ty.find(ty => ty.verify(v))!.ser(v),
        des: v => find_map(ty, ty => ty.des(v)),
        verify: (v): v is Parameters<T[number]["ser"]>[0] =>
            ty.some(ty => ty.verify(v)),
    }
}
function tys_tuple<T extends [Ty<unknown, Simple>, ...Ty<unknown, Simple>[]]>(
    ty: T
): Ty<{ [k in keyof T]: TyInner<T[k]> }, Simple> {
    return {
        ser: v => ty.map((ty, i) => ty.ser(v[i])),
        des: v => (v instanceof Array) ? (
            v.length === ty.length
                ? Option.arr_all(ty.map((ty, i) => ty.des(v[i] as never))) as Option<never>
                : None
        ) : None,
        verify: (v): v is { [k in keyof T]: Parameters<T[k]["ser"]>[0] } =>
            (v instanceof Array)
            && v.length === ty.length
            && ty.every((ty, i) => ty.verify(v[i]))
    }
}

type TysSumType<T extends Record<string, Ty<unknown, S> | (() => Ty<unknown, S>)>, S> =
    { [k in keyof T]:
        { [k_ in k]:
            T[k] extends Ty<unknown, S>
            ? TyInner<T[k]>
            : T[k] extends () => Ty<unknown, S>
            ? TyInner<ReturnType<T[k]>>
            : "<ERROR>"
        }
    }[keyof T]

function tys_sum<T extends Record<string, Ty<unknown, Simple> | (() => Ty<unknown, Simple>)>>(
    ty: T
): Ty<TysSumType<T, Simple>, Simple> {
    return tys_union(
        ...Object.entries(ty)
            .map(([k, v]) => Simple.obj({
                [k]: v
            })) as never // making the type system happy here is left as an exercise to the reader.
    )
}

export const Simple = {
    float_loose: tys_number,
    float: tys_number_finite,
    int: tys_integer,
    int_in_range(min: int, max_exclusive: int): Ty<int, Simple> {
        return ty_verify(tys_integer, v => (v >= min) && (v < max_exclusive))
    },
    uint: tys_integer_unsigned,
    u16: ty_verify(tys_integer, v => (v >= 0) && (v < 0x1_0000)),
    u32: ty_verify(tys_integer, v => (v >= 0) && (v < 0x1_0000_0000)),
    u48: ty_verify(tys_integer, v => (v >= 0) && (v < 0x1_0000_0000_0000)),
    string: tys_string,
    bool: tys_bool,
    null: tys_null,
    any: ty_any<Simple>(),
    literal: ty_literal,
    literal_ident: ty_literal_ident,
    array: tys_array,
    obj: tys_obj,
    union: tys_union,
    tuple: tys_tuple,
    sum: tys_sum,
    nullable<T>(ty: Ty<T, Simple>): Ty<T | null, Simple> {
        return tys_union(ty, tys_null)
    },
    enum<T extends Record<string | number, number | string>>(enum_static: T): Ty<T[keyof T], Simple> {
        return tys_union(...Object.values(enum_static).map(v => typeof v === "number"
            ? ty_literal(v as T[keyof T], v)
            : null
        ).filter(v => v != null))
    },
    Option<T>(ty: Ty<T, Simple>): Ty<Option<T>, Simple> {
        return ty_map(
            tys_union(tys_tuple([ty]), tys_null),
            option => // Option<T> => <raw>
                option.is_some() ? [option.some.v] : null,
            raw => // <raw> => Option<T>
                raw == null ? None : Some(raw[0]),
            (v, ty): v is Option<T> => // verify
                (v instanceof Option) && v.is_some_and(ty.verify),
        )
    },
    Map<K extends value_eq, V>(ty_k: Ty<K, Simple>, ty_v: Ty<V, Simple>): Ty<Map<K, V>, Simple> {
        return {
            ser: v => {
                const raw: [Simple, Simple][] = []
                for (const [k, v_elt] of v.entries()) {
                    raw.push([ty_k.ser(k), ty_v.ser(v_elt)])
                }
                return raw
            },
            des: raw => {
                const map = new Map()
                if (!(raw instanceof Array)) { return None }
                for (const raw_elt of raw) {
                    if (!(raw_elt instanceof Array) || raw_elt.length !== 2) { return None }

                    const k = ty_k.des(raw_elt[0])
                    const v = ty_v.des(raw_elt[1])
                    if (!k.is_some() || !v.is_some()) { return None }

                    if (map.has(k)) { return None }
                    map.set(k, v)
                }
                return Some(map)
            },
            verify: (map): map is Map<K, V> => {
                if (!(map instanceof Map)) { return false }

                for (const [k, v] of map.entries()) {
                    if (!ty_k.verify(k) || !ty_v.verify(v)) {
                        return false
                    }
                }
                return true
            }
        }
    },
    Color: ty_map(
        tys_tuple([tys_number_finite, tys_number_finite, tys_number_finite, tys_number_finite]),
        ({ r, g, b, a }: Color) => [r, g, b, a] satisfies [float, float, float, float],
        ([r, g, b, a]) => new Color(r, g, b, a),
        v => v instanceof Color,
    )
} as const
function JSONParseSafe(str: string): Option<Simple> {
    try {
        return Some(JSON.parse(str))
    } catch {
        return None
    }
}
export const JSONSimple = {
    parse<T>(ty: Ty<T, Simple>, v: string): Option<T> {
        return JSONParseSafe(v).and_then(ty.des)
    },
    stringify<T>(ty: Ty<T, Simple>, v: T): string {
        return JSON.stringify(ty.ser(v))
    },
} as const
