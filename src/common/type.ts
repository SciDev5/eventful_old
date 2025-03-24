
export function is_string(v: unknown, { matches }: { matches?: RegExp } = {}): v is string {
    return typeof v === "string"
        && (matches ? matches.test(v) : true)
}
export function is_bool(v: unknown): v is boolean {
    return typeof v === "boolean"
}
export function is_number(v: unknown, { int, lax, gte, lt }: { int?: boolean, lax?: boolean, gte?: number, lt?: number } = {}): v is number {
    return typeof v === "number"
        && ((lax ?? false) || Number.isFinite(v))
        && (!(int ?? false) || Number.isInteger(v))
        && (gte == null || v >= gte)
        && (lt == null || v < lt)
}
export function is_literally<T>(lit: T): (v: any) => v is T {
    return (v): v is T => v === lit
}

export type TypeReprRaw<H> = H extends TypeRepr<infer _, infer R> ? R : never
export type TypeReprT<H> = H extends TypeRepr<infer L, infer _> ? L : never
export type Ty<L, Repr = null> = Repr extends TypeRepr<L, infer R> ? TypeRepr<L, R> : Repr extends TypeRepr<any, any> ? never : TypeRepr<L, any>
export class TypeRepr<T, Raw> {
    constructor(
        readonly from_raw: (raw: Raw) => T,
        readonly to_raw: (live: T) => Raw,
        readonly is_raw: (v: any) => v is Raw,
    ) { }

    static identity_is<T>(is_raw: (v: any) => v is T): TypeRepr<T, T> {
        return new TypeRepr(v => v, v => v, is_raw)
    }
    static obj<T extends Record<string, TypeRepr<any, any>>>(
        spec: T,
    ): DictifyTR<T> {
        return new TypeRepr(
            v => Object.fromEntries(Object.entries(v).map(([k, v]) => [k, spec[k].from_raw(v)])) as any,
            v => Object.fromEntries(Object.entries(v).map(([k, v]) => [k, spec[k].to_raw(v)])) as any,
            (v): v is TypeReprRaw<DictifyTR<T>> =>
                typeof v === "object"
                && v !== null
                && new Set(Object.keys(v)).symmetricDifference(new Set(Object.keys(spec))).size === 0
                && Object.entries(v).every(([k, v]) => spec[k].is_raw(v)),
        )
    }
    static sum<T extends Record<string, TypeRepr<any, any>>>(
        spec: T,
    ): TypeRepr<{ [k in keyof T]: { [v in k]: TypeReprT<T[k]> } }[keyof T], { [k in keyof T]: { [v in k]: TypeReprRaw<T[k]> } }[keyof T]> {
        return new TypeRepr(
            v => {
                const k = Object.keys(v)[0]
                return { [k]: spec[k].from_raw(Object.values(v)[0]) } as { [k in keyof T]: { [v in k]: TypeReprT<T[k]> } }[keyof T]
            },
            v => {
                const k = Object.keys(v)[0]
                return { [k]: spec[k].to_raw(Object.values(v)[0]) } as { [k in keyof T]: { [v in k]: TypeReprRaw<T[k]> } }[keyof T]
            },
            ((v: any) => typeof v === "object" && v !== null && spec[Object.keys(v)[0]].is_raw(Object.values(v)[0])) as any,
        )
    }
    static ts_enum<T extends Record<str | int, int | str>>(spec: T) {
        return this.identity_is((v: unknown): v is T => typeof v === "number" && (v in spec))
    }
    static or<T extends TypeRepr<any, any>[]>(
        spec: T
    ): TypeRepr<TypeReprRaw<T[number]>, TypeReprRaw<T[number]>> {
        return new TypeRepr(
            v => v,
            v => v,
            (v: any): v is TypeReprRaw<T[number]> => spec.some(spec => spec.is_raw(v))
        )
    }
    static Map<K extends TypeRepr<any, any>, V extends TypeRepr<any, any>>(
        spec_k: K,
        spec_v: V,
    ): TypeRepr<Map<TypeReprT<K>, TypeReprT<V>>, [TypeReprRaw<K>, TypeReprRaw<V>][]> {
        return TypeRepr.identity_is((v: unknown): v is [TypeReprRaw<K>, TypeReprRaw<V>] => v instanceof Array && v.length === 2 && spec_k.is_raw(v[0]) && spec_v.is_raw(v[1]))
            .array()
            .map(
                v => new Map(v.map(([k, v]) => [spec_k.from_raw(k), spec_v.from_raw(v)])),
                v => [...v.entries()].map(([k, v]) => [spec_k.to_raw(k), spec_v.to_raw(v)]),
            )
    }

    or<R extends TypeRepr<any, any>>(other: R): TypeRepr<Raw | TypeReprRaw<R>, Raw | TypeReprRaw<R>> {
        return TypeRepr.or([this, other]) as any
    }

    array(
        verify_array = (raw: Raw[]) => true,
    ): TypeRepr<T[], Raw[]> {
        return new TypeRepr(
            v => v.map(elt => this.from_raw(elt)),
            v => v.map(elt => this.to_raw(elt)),
            (v): v is Raw[] =>
                v instanceof Array
                && v.every(elt => this.is_raw(elt))
                && verify_array(v),
        )
    }
    map<L2>(
        raise: (v: T) => L2,
        lower: (v: L2) => T,
    ): TypeRepr<L2, Raw> {
        return new TypeRepr(
            v => raise(this.from_raw(v)),
            v => this.to_raw(lower(v)),
            this.is_raw,
        )
    }
    filter_raw(
        filter: (v: Raw) => boolean,
    ): TypeRepr<T, Raw> {
        return new TypeRepr(
            this.from_raw,
            this.to_raw,
            (v): v is Raw => this.is_raw(v) && filter(v),
        )
    }
    nullable(): TypeRepr<T | null, Raw | null> {
        return new TypeRepr(
            v => v === null ? null : this.from_raw(v),
            v => v === null ? null : this.to_raw(v),
            (v): v is Raw | null => v === null || this.is_raw(v),
        )
    }

    try_from(raw: unknown): T | null {
        return this.is_raw(raw) ? this.from_raw(raw) : null
    }
}

export const { obj, sum, or, ts_enum } = TypeRepr

type ArrayifyTR<T extends TypeRepr<any, any>> =
    T extends TypeRepr<infer L, infer R> ? TypeRepr<L[], R[]> : never
type DictifyTR<T extends Record<string, TypeRepr<any, any>>> =
    TypeRepr<{ [k in keyof T]: TypeReprT<T[k]> }, { [k in keyof T]: TypeReprRaw<T[k]> }>

type RawTR<V> =
    V extends TypeRepr<infer L, infer R> ? TypeRepr<L, R> :
    V extends [infer T] ? ArrayifyTR<RawTR<T>> :
    V extends Record<string, any> ? DictifyTR<{ [k in keyof V]: RawTR<V[k]> }> :
    never
type RawTRInput = TypeRepr<any, any> | { [k: string]: RawTRInput } | [RawTRInput]

export function raw<V extends RawTRInput>(v_raw_: V): RawTR<V> {
    const v_raw = v_raw_ as any
    if (v_raw instanceof TypeRepr) {
        return v_raw as any
    } else if (v_raw instanceof Array) {
        if (v_raw.length !== 1) {
            throw new Error("not allowed")
        }
        return raw(v_raw[0]).array() as any
    } else if (typeof v_raw === "object" && v_raw !== null) {
        return obj(
            Object.fromEntries(Object.entries(v_raw)
                .map(([k, v]) => [k, raw(v as any)])
            )
        ) as any
    } else {
        throw new Error("not allowed")
    }
}

export const str = TypeRepr.identity_is(is_string)
export type str = TypeReprT<typeof str>

export const f64 = TypeRepr.identity_is(is_number)
export type f64 = TypeReprT<typeof f64>

export const bool = TypeRepr.identity_is(is_bool)
export type bool = TypeReprT<typeof bool>

export const i32 = TypeRepr.identity_is(v => is_number(v, { int: true, gte: -0x8000_0000, lt: 0x8000_0000 }))
export type i32 = TypeReprT<typeof i32>

export const u32 = TypeRepr.identity_is(v => is_number(v, { int: true, gte: 0, lt: 0x1_0000_0000 }))
export type u32 = TypeReprT<typeof u32>

export const int = TypeRepr.identity_is(v => is_number(v, { int: true, gte: Number.MIN_SAFE_INTEGER, lt: Number.MAX_SAFE_INTEGER }))
export type int = TypeReprT<typeof int>

export const uint = TypeRepr.identity_is(v => is_number(v, { int: true, gte: 0 }))
export type uint = TypeReprT<typeof uint>

export const date = int.map(v => new Date(v), v => v.getTime())
export type date = TypeReprT<typeof date>

export const null_type = TypeRepr.identity_is((v: unknown): v is null => v === null)


export const bitmask = (n: int) => int.map(
    v => new Array(n).fill(0).map((_, i) => ((v >> i) & 1) > 0),
    v => v.map((_, i) => 1 << i).filter(v => v).reduce((a, b) => a | b),
)
export type bitmask = bool[]

