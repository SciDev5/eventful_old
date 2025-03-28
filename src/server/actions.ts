import { TypeRepr } from "@/common/type"

export function def_action_1_1<TArg, RawArg, TRet, RawRet>(
    ty_arg: TypeRepr<TArg, RawArg>,
    ty_ret: TypeRepr<TRet, RawRet>,
    fn: (v: TArg) => Promise<TRet | null>,
): (arg: RawArg) => Promise<RawRet | null> {
    return async arg => {
        if (!ty_arg.is_raw(arg)) {
            return null
        }
        return ty_ret.nullable().to_raw(await fn(ty_arg.from_raw(arg)))
    }
}

export function bind_action_1_1<TArg, RawArg, TRet, RawRet>(
    fn: (v: RawArg) => Promise<RawRet | null>,
    ty_arg: TypeRepr<TArg, RawArg>,
    ty_ret: TypeRepr<TRet, RawRet>,
): (arg: TArg) => Promise<TRet | null> {
    return async arg => ty_ret.try_from(await fn(ty_arg.to_raw(arg)))
}

export function def_action_0_1<TRet, RawRet>(
    ty_ret: TypeRepr<TRet, RawRet>,
    fn: () => Promise<TRet | null>,
): () => Promise<RawRet | null> {
    return async () => {
        return ty_ret.nullable().to_raw(await fn())
    }
}

export function bind_action_0_1<TRet, RawRet>(
    fn: () => Promise<RawRet | null>,
    ty_ret: TypeRepr<TRet, RawRet>,
): () => Promise<TRet | null> {
    return async () => ty_ret.try_from(await fn())
}

export function def_action_2_1<TArg0, RawArg0, TArg1, RawArg1, TRet, RawRet>(
    ty_arg0: TypeRepr<TArg0, RawArg0>,
    ty_arg1: TypeRepr<TArg1, RawArg1>,
    ty_ret: TypeRepr<TRet, RawRet>,
    fn: (a: TArg0, b: TArg1) => Promise<TRet | null>,
): (arg0: RawArg0, arg1: RawArg1) => Promise<RawRet | null> {
    return async (arg0, arg1) => {
        if (!ty_arg0.is_raw(arg0) || !ty_arg1.is_raw(arg1)) {
            return null
        }
        return ty_ret.nullable().to_raw(await fn(ty_arg0.from_raw(arg0), ty_arg1.from_raw(arg1)))
    }
}

export function bind_action_2_1<TArg0, RawArg0, TArg1, RawArg1, TRet, RawRet>(
    fn: (a: RawArg0, b: RawArg1) => Promise<RawRet | null>,
    ty_arg0: TypeRepr<TArg0, RawArg0>,
    ty_arg1: TypeRepr<TArg1, RawArg1>,
    ty_ret: TypeRepr<TRet, RawRet>,
): (arg0: TArg0, arg1: TArg1) => Promise<TRet | null> {
    return async (arg0, arg1) => ty_ret.try_from(await fn(ty_arg0.to_raw(arg0), ty_arg1.to_raw(arg1)))
}