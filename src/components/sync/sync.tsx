import { JSONSimple, Simple, TyInner } from "@/common/serialization";
import { Group, GroupId, int, Session, ty_Group, ty_Session } from "@/common/ty_shared";
import { SyncDataType, SyncMessage, SyncModeType, SynchronizedData, SynchronizedDataArgConn, ty_SyncMessage } from "@/common/sync";
import { ReactNode, useCallback, useEffect, useMemo, useOptimistic, useState, useSyncExternalStore } from "react";
import { setTimeout } from "timers/promises";

function SyncProvider({
    children,
}: {
    children: (state: SyncState) => ReactNode | ReactNode[]
}) {
    const auth_token = localStorage.getItem("auth_token")
    const state = useMemo(() => new SyncState(auth_token), [])
    return children(state)
}


class SyncState {
    private readonly on_receive_binding = new Map<SyncDataType, Parameters<SynchronizedDataArgConn<null>["bind"]>[1]>()
    private readonly on_close_binding: (() => void)[] = []
    private readonly sync_conn_data: SynchronizedDataArgConn<null> = {
        send: (data_type, inflight_id, mode, stage, p) => {
            this.do_when_connected(conn => {
                conn.send([
                    mode,//mode
                    stage,//stage
                    data_type,//data_type
                    inflight_id,//request_id
                    p,//data
                ])
            })
        },
        bind: (data_type, on_receive, on_close) => {
            if (this.on_receive_binding.has(data_type)) {
                throw new Error(`Cannot bind the same sync data type '${SyncDataType[data_type]}' more than once`)
            }
            this.on_receive_binding.set(data_type, on_receive)
            this.on_close_binding.push(on_close)
        },
    }
    private readonly sync = {
        session: new SynchronizedData<Session, null, never, null>({
            patch_id: () => null,
            value_id: () => null,

            load_value: async i => null,

            apply_patch: () => null,
            apply_replace: (_, v_new) => v_new,

            ty_id: Simple.null,
            ty_value: ty_Session,
            ty_patch: null as never,

            data_type: SyncDataType.Session,
        }, this.sync_conn_data),
        groups: new SynchronizedData<Group, GroupId, never, null>({
            patch_id: () => { throw new Error("not implemented") },
            value_id: v => v.id,

            load_value: async i => null,

            apply_patch: () => null,
            apply_replace: (_, v_new) => v_new,

            ty_id: Simple.uint,
            ty_value: ty_Group,
            ty_patch: null as never,

            data_type: SyncDataType.Session,
        }, this.sync_conn_data),
    } as const

    readonly useSession = bind_useSynchronized(this.sync.session).bind(null, null)
    readonly useGroup = bind_useSynchronized(this.sync.groups)


    constructor(private auth_token: string | null) {
        this.connect_loop()
    }

    private conn: Connection | null = null
    private do_when_connected_queue: ((conn: Connection) => void)[] = []
    private force_close: () => void = () => { }
    private async connect_loop() {
        const FORCE_CLOSE_SYMBOL = Symbol("connection closed from client side")
        while (true) {
            try {
                let close_res = () => { }
                const promise_closed = new Promise<void>(res => { close_res = res })
                const on_close = () => {
                    this.conn = null
                    close_res()
                }
                this.conn = await Connection.connect(
                    this.auth_token,
                    this.receive,
                    on_close,
                    force_close => {
                        this.force_close = force_close
                    },
                    FORCE_CLOSE_SYMBOL,
                )
                while (this.do_when_connected_queue.length > 0 && this.conn) {
                    this.do_when_connected_queue.splice(0, 1)[0](this.conn)
                }
                await promise_closed
            } catch (e) {
                if (e === FORCE_CLOSE_SYMBOL) {
                    continue // do not wait to try reconnecting, do not pass go, do not collect 200$
                }
                console.error("connection lost", e)
            }
            await setTimeout(500)
        }
    }
    private do_when_connected(action: (conn: Connection) => void) {
        if (this.conn) {
            action(this.conn)
        } else {
            this.do_when_connected_queue.push(action)
        }
    }
    readonly receive = ([mode, stage, data_type, inflight_id, data]: SyncMessage) => {
        this.on_receive_binding.get(data_type)!(inflight_id, mode, stage, data, null)
    }


    set_auth_token(token: string | null) {
        this.auth_token = token
        this.force_close()
    }
}

class Connection {
    private constructor(
        readonly socket: WebSocket,
        readonly receive: (msg: SyncMessage) => void,
        on_close: () => void,
    ) {
        socket.addEventListener("message", this.on_message)
        socket.addEventListener("close", () => {
            on_close()
        })
    }
    readonly on_message = (e: MessageEvent<any>) => {
        const { data: data_str } = e
        if (typeof data_str !== "string") {
            console.warn("sync connection received non-string message")
            return
        }
        const message = JSONSimple.parse(ty_SyncMessage, data_str).unwrap_null()?.value
        if (message == null) {
            console.warn("sync connection received invalid message")
            return
        }

        this.receive(message)
    }
    send(msg: SyncMessage) {
        this.socket.send(JSONSimple.stringify(ty_SyncMessage, msg))
    }

    static connect(
        auth: string | null,
        receive: (msg: SyncMessage) => void,
        on_close: () => void,
        set_force_close: (force_close: () => void) => void,
        force_close_rejection_symbol: symbol,
    ): Promise<Connection> {
        const LOC = "ws://localhost:3001/"
        const socket = new WebSocket(LOC + (auth ?? ""))
        return new Promise((res, rej) => {
            set_force_close(() => {
                socket.close()
                on_close()
                rej(force_close_rejection_symbol)
            })
            socket.addEventListener("open", () => {
                res(new Connection(socket, receive, on_close))
            })
            socket.addEventListener("error", e => {
                rej(e)
                on_close()
            })
        })
    }
}


function bind_useSynchronized<Value, Id, Patch, UserContext>(sync: SynchronizedData<Value, Id, Patch, UserContext>) {
    return (useSynchronized<Value, Id, Patch, UserContext>).bind(null, sync)
}

function useSynchronized<Value, Id, Patch, UserContext>(sync: SynchronizedData<Value, Id, Patch, UserContext>, id: Id): [Value | null, (patch: Patch) => void] {
    const [true_value, set_true_value] = useState(() => {
        const v = sync.get(id)
        return v instanceof Promise ? null : v
    })
    const [value, set_optimistic_value] = useOptimistic(true_value)
    useEffect(() => sync.bind(id, set_true_value), [sync])

    return [
        value,
        useCallback(a => {
            throw new Error("not implemented")
        }, [sync, set_optimistic_value])
    ]
}
