import { ID } from "@/common/ty_shared"
import { sample_uniform } from "@/common/util/rng"
import { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies"
import { cookies } from "next/headers"


type SessionId = string

const SESSION_ID_LETTERS = "qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM1234567890_-".split("")
const SESSION_ID_LENGTH = Math.ceil(1024 * 8 / 3)
const SESSION_COOKIE_NAME = "sess"


const DEFAULT_CONFIG: SessionConfig = {
    expires_in: 1000 * 60 * 60 * 24 * 7
}
export interface SessionConfig {
    expires_in: number,
}


export interface SessionData {
    user_id: ID,
}
export interface SessionMeta {
    id: string,
    expires: number,
}
export type Session = SessionData & SessionMeta

class SessionStore {
    constructor(
        readonly sessions: Map<string, Session> = new Map()
    ) { }

    save() {
        // TODO: session save
    }
    static load(): SessionStore | null {
        // TODO: session load
        return null
    }

    static gen_session_id() {
        return new Array(SESSION_ID_LENGTH)
            .fill(0)
            .map(sample_uniform.bind(null, SESSION_ID_LETTERS))
            .join("")
    }

    private begin_internal(data: SessionData, config?: Partial<SessionConfig>): [SessionId, Session] {
        const id = SessionStore.gen_session_id()
        const config_ = { ...DEFAULT_CONFIG, ...config }
        if (config_.expires_in < 0 || !Number.isFinite(config_.expires_in)) {
            config_.expires_in = DEFAULT_CONFIG.expires_in
        }
        const session = {
            ...data,
            expires: Date.now() + config_.expires_in,
            id,
        } satisfies Session
        this.sessions.set(id, session)
        return [id, session]
    }
    private get_internal(id: SessionId): Session | null {
        const sess = this.sessions.get(id)
        if (sess == null) {
            return null
        }
        if (Date.now() > sess.expires) {
            this.sessions.delete(id)
            return null
        }
        return sess
    }

    begin(cookies: ReadonlyRequestCookies, data: SessionData, config?: Partial<SessionConfig>) {
        const [id, { expires }] = this.begin_internal(data, config)
        cookies.set(SESSION_COOKIE_NAME, id, { secure: true, expires })
    }
    get(cookies: ReadonlyRequestCookies): Session | null {
        const cookie = cookies.get(SESSION_COOKIE_NAME)
        if (cookie == null) {
            return null
        }
        return this.get_internal(cookie.value)
    }
    end(cookies: ReadonlyRequestCookies) {
        const cookie = cookies.get(SESSION_COOKIE_NAME)
        if (cookie != null) {
            this.sessions.delete(cookie.value)
        }
        cookies.delete(SESSION_COOKIE_NAME)
    }
}

export const session_store = SessionStore.load() ?? new SessionStore()