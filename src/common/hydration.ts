
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



type HydratorR<H> = H extends Hydrator<infer _, infer R> ? R : never
export type HydratorL<H> = H extends Hydrator<infer L, infer _> ? L : never

export class Hydrator<Liv, Raw> {
    constructor(
        readonly raise: (raw: Raw) => Liv,
        readonly lower: (live: Liv) => Raw,
        readonly is_raw: (v: any) => v is Raw,
    ) { }

    static identity_is<T>(is_raw: (v: any) => v is T): Hydrator<T, T> {
        return new Hydrator(v => v, v => v, is_raw)
    }
    static obj<T extends Record<string, Hydrator<any, any>>>(
        spec: T,
    ): DictifyHydrator<T> {
        return new Hydrator(
            v => Object.fromEntries(Object.entries(v).map(([k, v]) => [k, spec[k].raise(v)])) as any,
            v => Object.fromEntries(Object.entries(v).map(([k, v]) => [k, spec[k].lower(v)])) as any,
            (v): v is HydratorR<DictifyHydrator<T>> =>
                typeof v === "object"
                && v !== null
                && new Set(Object.keys(v)).symmetricDifference(new Set(Object.keys(spec))).size === 0
                && Object.entries(v).every(([k, v]) => spec[k].is_raw(v)),
        )
    }
    static enu<T extends Record<string, Hydrator<any, any>>>(
        spec: T,
    ): Hydrator<{ [k in keyof T]: { [v in k]: HydratorL<T[k]> } }[keyof T], { [k in keyof T]: { [v in k]: HydratorR<T[k]> } }[keyof T]> {
        return new Hydrator(
            v => spec[Object.keys(v)[0]].raise(Object.values(v)[0]),
            v => spec[Object.keys(v)[0]].lower(Object.values(v)[0]),
            ((v: any) => spec[Object.keys(v)[0]].is_raw(Object.values(v)[0])) as any,
        )
    }

    array(
        verify_array = (raw: Raw[]) => true,
    ): Hydrator<Liv[], Raw[]> {
        return new Hydrator(
            v => v.map(elt => this.raise(elt)),
            v => v.map(elt => this.lower(elt)),
            (v): v is Raw[] =>
                v instanceof Array
                && v.every(elt => this.is_raw(elt))
                && verify_array(v),
        )
    }
    map<L2>(
        raise: (v: Liv) => L2,
        lower: (v: L2) => Liv,
    ): Hydrator<L2, Raw> {
        return new Hydrator(
            v => raise(this.raise(v)),
            v => this.lower(lower(v)),
            this.is_raw,
        )
    }
    filter_raw(
        filter: (v: Raw) => boolean,
    ): Hydrator<Liv, Raw> {
        return new Hydrator(
            this.raise,
            this.lower,
            (v): v is Raw => this.is_raw(v) && filter(v),
        )
    }
    nullable(): Hydrator<Liv | null, Raw | null> {
        return new Hydrator(
            v => v === null ? null : this.raise(v),
            v => v === null ? null : this.lower(v),
            (v): v is Raw | null => v === null || this.is_raw(v),
        )
    }

    try_raise(raw: Raw): Liv | null {
        return this.is_raw(raw) ? this.raise(raw) : null
    }
}

export const { obj, enu } = Hydrator

type ArrayifyHydrator<T extends Hydrator<any, any>> =
    T extends Hydrator<infer L, infer R> ? Hydrator<L[], R[]> : never
type DictifyHydrator<T extends Record<string, Hydrator<any, any>>> =
    Hydrator<{ [k in keyof T]: HydratorL<T[k]> }, { [k in keyof T]: HydratorR<T[k]> }>

type RawHydrator<V> =
    V extends Hydrator<infer L, infer R> ? Hydrator<L, R> :
    V extends [infer T] ? ArrayifyHydrator<RawHydrator<T>> :
    V extends Record<string, any> ? DictifyHydrator<{ [k in keyof V]: RawHydrator<V[k]> }> :
    never
type RawHydratorInput = Hydrator<any, any> | { [k: string]: RawHydratorInput } | [RawHydratorInput]

export function raw<V extends RawHydratorInput>(v_raw_: V): RawHydrator<V> {
    const v_raw = v_raw_ as any
    if (v_raw instanceof Hydrator) {
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

export const str = Hydrator.identity_is(is_string)
export type str = HydratorL<typeof str>

export const f64 = Hydrator.identity_is(is_number)
export type f64 = HydratorL<typeof f64>

export const bool = Hydrator.identity_is(is_bool)
export type bool = HydratorL<typeof bool>

export const i32 = Hydrator.identity_is(v => is_number(v, { int: true, gte: -0x8000_0000, lt: 0x8000_0000 }))
export type i32 = HydratorL<typeof i32>

export const u32 = Hydrator.identity_is(v => is_number(v, { int: true, gte: 0, lt: 0x1_0000_0000 }))
export type u32 = HydratorL<typeof u32>

export const int = Hydrator.identity_is(v => is_number(v, { int: true, gte: -Number.MIN_SAFE_INTEGER, lt: Number.MAX_SAFE_INTEGER }))
export type int = HydratorL<typeof int>

export const date = int.map(v => new Date(v), v => v.getTime())
export type date = HydratorL<typeof date>


export const bitmask = (n: int) => int.map(
    v => new Array(n).fill(0).map((_, i) => ((v >> i) & 1) > 0),
    v => v.map((_, i) => 1 << i).filter(v => v).reduce((a, b) => a | b),
)
export type bitmask = bool[]

export const id = int
export type id = int


export const User = raw({
    id,
    created: date,
    // auth
    handle: str,
    passhash: str.nullable(),
    kerb: str.nullable(),
    // service
    name: str,
    groups: {
        self: id,
        joined: [id]
    },
})
export type User = HydratorL<typeof User>

const v = User.lower({ id: 3023, created: new Date(), groups: { joined: [], self: 0 }, handle: "helo", name: "jdjk", passhash: "d", kerb: null })