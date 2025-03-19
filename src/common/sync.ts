// TODO: implement sync again



// import { ts_enum } from "./type"
// import { genResolvable, ResolvablePromise } from "./util/promise"

// export enum SyncError {
//     InvalidRequest,
//     InvalidResponse,
//     NoPermission,
//     Nonexistent,
//     ConnectionTerminated,
// }
// export const TSyncError = ts_enum(SyncError)

// export enum SyncModeType {
//     Patch,
//     Get,
//     Set,
// }
// const TSyncModeType = ts_enum(SyncModeType)
// export enum SyncStageType {
//     Request,
//     Resolve,
//     Reject,
// }
// const TSyncStageType = ts_enum(SyncStageType)

// export enum SyncDataType {
//     Session,
//     Group
// }
// const TSyncDataType = ts_enum(SyncDataType)


// /// [mode, stage, data_type, request_id, data]
// export type SyncMessage = [SyncModeType, SyncStageType, SyncDataType, int, Simple]
// export const ty_SyncMessage: Ty<SyncMessage, Simple> = Simple.tuple([
//     ty_SyncModeType,
//     ty_SyncStageType,
//     ty_SyncDataType,
//     Simple.int,
//     Simple.any,
// ])



// export type SynchronizedDataArgConfig<Value, Id, Patch, UserContext> = {
//     patch_id: (p: Patch) => Id,
//     value_id: (p: Value) => Id,

//     load_value: (i: Id) => Promise<Value | null>,

//     apply_patch: (v: Value, p: Patch, context: UserContext) => Value | null,
//     apply_replace: (v_old: Value, v_new: Value, context: UserContext) => Value | null,

//     ty_id: Ty<Id, Simple>,
//     ty_value: Ty<Value, Simple>,
//     ty_patch: Ty<Patch, Simple>,

//     data_type: SyncDataType,
// }
// export type SynchronizedDataArgConn<UserContext> = {
//     send: (
//         data_type: SyncDataType,
//         inflight_id: int,
//         mode: SyncModeType,
//         stage: SyncStageType,
//         p: Simple,
//     ) => void,
//     bind: (
//         data_type: SyncDataType,
//         on_receive:
//             (
//                 inflight_id: int,
//                 mode: SyncModeType,
//                 stage: SyncStageType,
//                 v: Simple,
//                 ctx: UserContext,
//             ) => void,
//         on_close: () => void,
//     ) => void,
// }

// export class SynchronizedData<Value, Id, Patch, UserContext> {
//     constructor(
//         private readonly config: SynchronizedDataArgConfig<Value, Id, Patch, UserContext>,
//         private readonly conn: SynchronizedDataArgConn<UserContext>,

//     ) {
//         conn.bind(config.data_type, this.on_receive, this.on_close)
//     }

//     private readonly values = new Map<Id, Value>()
//     private readonly airborne_requests = {
//         get: new Map<int, ResolvablePromise<Value>>(),
//         set: new Map<int, ResolvablePromise<void>>(),
//         patch: new Map<int, ResolvablePromise<void>>(),
//     } as const

//     send(
//         inflight_id: int, mode: SyncModeType, stage: SyncStageType, p: Simple
//     ) {
//         this.conn.send(this.config.data_type, inflight_id, mode, stage, p)
//     }

//     readonly on_receive = async (inflight_id: int, mode: SyncModeType, stage: SyncStageType, v: Simple, ctx: UserContext) => {
//         switch (stage) {
//             case SyncStageType.Request: {
//                 const id_ = this.config.ty_id.des(v)
//                 if (!id_.is_some()) {
//                     this.send(inflight_id, mode, SyncStageType.Reject, ty_SyncError.ser(SyncError.InvalidRequest))
//                     return
//                 }
//                 const id = id_.some.v

//                 switch (mode) {
//                     case SyncModeType.Patch: {
//                         throw new Error("not implemented")
//                     }
//                     case SyncModeType.Get: {
//                         const value = this.values.get(id) ?? await this.config.load_value(id)
//                         if (value == null) {
//                             this.send(inflight_id, mode, SyncStageType.Reject, ty_SyncError.ser(SyncError.Nonexistent))
//                         } else {
//                             this.send(inflight_id, mode, SyncStageType.Resolve, this.config.ty_value.ser(value))
//                         }
//                         break
//                     }
//                     case SyncModeType.Set: {
//                         throw new Error("not implemented")
//                     }
//                 }

//                 break
//             }
//             case SyncStageType.Resolve: {
//                 switch (mode) {
//                     case SyncModeType.Patch: {
//                         throw new Error("not implemented")
//                     }
//                     case SyncModeType.Get: {
//                         const req = this.airborne_requests.get.get(inflight_id)
//                         if (req == null) {
//                             console.warn("null request")
//                             return
//                         }
//                         this.airborne_requests.get.delete(inflight_id)

//                         const value_ = this.config.ty_value.des(v)
//                         if (!value_.is_some()) {
//                             console.warn("resolved with bad data")
//                             req.rej(SyncError.InvalidResponse)
//                         } else {
//                             const value = value_.some.v
//                             const id = this.config.value_id(value)
//                             this.on_change.get(id)?.forEach(handle => handle(value))
//                             this.values.set(id, value)
//                             req.res(value)
//                         }

//                         break
//                     }
//                     case SyncModeType.Set: {
//                         throw new Error("not implemented")
//                     }
//                 }
//                 break
//             }
//             case SyncStageType.Reject: {
//                 const reqs = ({
//                     [SyncModeType.Get]: this.airborne_requests.get,
//                     [SyncModeType.Set]: this.airborne_requests.set,
//                     [SyncModeType.Patch]: this.airborne_requests.patch,
//                 })[mode]
//                 const req = reqs.get(inflight_id)
//                 if (req == null) {
//                     console.warn("null request")
//                     return
//                 }
//                 reqs.delete(inflight_id)

//                 req.rej(ty_SyncError.des(v).unwrap_or_else(() => {
//                     console.warn("response error had errors")
//                     return SyncError.InvalidResponse
//                 }))

//                 break
//             }
//         }
//     }
//     readonly on_close = () => {
//         [
//             ...this.airborne_requests.get.values(),
//             ...this.airborne_requests.set.values(),
//             ...this.airborne_requests.patch.values(),
//         ].map(v => v.rej(SyncError.ConnectionTerminated))
//         this.airborne_requests.get.clear()
//         this.airborne_requests.set.clear()
//         this.airborne_requests.patch.clear()
//     }


//     readonly on_change = new Map<Id, Set<(v: Value) => void>>()

//     private gen_inflight_id(): int {
//         return Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)
//     }
//     async req_get(id: Id): Promise<Value> {
//         const inflight_id = this.gen_inflight_id()
//         const value_promise = genResolvable<Value>()
//         this.airborne_requests.get.set(inflight_id, value_promise)
//         this.send(inflight_id, SyncModeType.Get, SyncStageType.Request, this.config.ty_id.ser(id))
//         const value = await value_promise
//         return value
//     }

//     get(id: Id): Value | Promise<Value> {
//         const value_cached = this.values.get(id)
//         if (value_cached != null) {
//             return value_cached
//         } else {
//             return this.req_get(id)
//         }
//     }

//     bind(id: Id, set_callback: (v: Value) => void): () => void {
//         const callback_set = this.on_change.get(id) ?? (() => {
//             const set = new Set<(v: Value) => void>()
//             this.on_change.set(id, set)
//             return set
//         })()
//         callback_set.add(set_callback)
//         return () => {
//             callback_set.delete(set_callback)
//         }
//     }
// }