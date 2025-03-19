"use server"

import { str } from "@/common/type"
import { compare } from "bcrypt"
import { get_user_by_handle } from "./db"
import { session_store } from "./session"
import { cookies } from "next/headers"

export async function auth_sess_begin_noauth(handle_: string): Promise<boolean> {
    const handle = str.try_from(handle_)
    if (!handle) { return false }

    const user = await get_user_by_handle(handle)
    if (!user) { return false }
    if (user.passhash || user.kerb) { return false }

    session_store.begin(cookies(), { self_id: user.id })

    return true

}
export async function auth_sess_begin_password(handle_: string, password_: string): Promise<boolean> {
    const handle = str.try_from(handle_)
    const password = str.try_from(password_)
    if (!handle || !password) { return false }

    const user = await get_user_by_handle(handle)
    if (!user) { return false }
    if (!user.passhash) { return false }

    if (!await compare(password, user.passhash)) { return false }

    session_store.begin(cookies(), { self_id: user.id })

    return true
}
