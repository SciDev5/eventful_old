"use server"

import { bool, str } from "@/common/type"
import { compare } from "bcrypt"
import { session_store } from "./session"
import { cookies } from "next/headers"
import { SessionData, SessionDataRaw } from "@/common/ty_shared"
import { def_action_0_1, def_action_1_1, def_action_2_1 } from "../actions"
import { db_user_ref_by_handle } from "../data/db"

export const _action_sess_begin_noauth = def_action_1_1(str, bool, async handle => {
    const user = await db_user_ref_by_handle(handle)
    if (!user) { return false }
    if (user.passhash || user.kerb) { return false }

    session_store.begin(cookies(), { self_id: user.id, name: user.name })
    return true
})
export const _action_sess_begin_password = def_action_2_1(str, str, bool, async (handle, password) => {
    const user = await db_user_ref_by_handle(handle)
    if (!user) { return false }
    if (!user.passhash) { return false }

    if (!await compare(password, user.passhash)) { return false }

    session_store.begin(cookies(), { self_id: user.id, name: user.name })
    return true
})
export const _action_sess_end = async () => {
    session_store.end(cookies())
}
export const _action_sess_get = def_action_0_1(SessionData, async () => {
    const sess = session_store.get(cookies())
    if (sess == null) { return null }
    const { self_id, name } = sess
    return { self_id, name }
})