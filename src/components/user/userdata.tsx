import { Group, Profile, SessionData } from "@/common/ty_shared";
import { id } from "@/common/util/id";
import { action_get_group, action_sess_get_profiles } from "@/server/data/actions_c";
import { action_sess_begin_noauth, action_sess_end, action_sess_get } from "@/server/session/actions_c";
import { useUpdate } from "@/util/use";
import { createContext, ReactNode, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useState } from "react";

const SESSION_CONTEXT = createContext<{
    session_data: SessionData | null,
    set_session_data: (v: SessionData | null) => void,
    profile: Profile | null,
    set_profile: (v: Profile | null) => void,
    groups: Map<id, Group>,
    refresh_groups: () => void,
    last_updated: Date,
}>({
    session_data: null,
    set_session_data: () => { throw new Error("no UserDataProvider in context") },
    profile: null,
    set_profile: () => { throw new Error("no UserDataProvider in context") },
    groups: new Map(),
    refresh_groups: () => { throw new Error("no UserDataProvider in context") },
    last_updated: new Date(),
})

export function useSessionData() {
    return useContext(SESSION_CONTEXT).session_data
}
export function useGroups() {
    return useContext(SESSION_CONTEXT).groups
}

export function UserDataProvider({ children }: { children: ReactNode }) {
    const [session_data, set_session_data] = useState<SessionData | null>(null)
    useEffect(() => {
        action_sess_get()
            .then(session_data => SessionData.nullable().try_from(session_data))
            .then(set_session_data)
    }, [])

    const [profile, set_profile] = useState<Profile | null>(null)
    // profile switching logic happens in <ProfileSelector> for performance reasons

    const [groups, set_groups] = useState(new Map<id, Group>())
    const refresh_groups = useCallback(() => {
        Promise.all([...profile?.join_groups.keys() ?? []].map(async id => [id, await action_get_group(id)] satisfies [any, any]))
            .then(pairs => new Map(pairs.filter(([_, v]) => v != null) as [id, Group][]))
            .then(set_groups)
    }, [profile])
    useEffect(() => {
        refresh_groups()
    }, [refresh_groups])

    return (<SESSION_CONTEXT.Provider
        value={useMemo(
            () => ({
                session_data, set_session_data,
                profile, set_profile,
                groups, refresh_groups,
                last_updated: new Date(),
            }),
            [
                session_data, set_session_data,
                profile, set_profile,
                groups, refresh_groups,
            ],
        )}
    >{children}</SESSION_CONTEXT.Provider>)
}

export function LoginButton() {
    const { session_data, set_session_data } = useContext(SESSION_CONTEXT)
    return (<>
        {/* <dialog>

        </dialog> */}
        {session_data ? (
            <button onClick={async () => {
                await action_sess_end()
                set_session_data(null)
            }}>logout {session_data.name}</button>
        ) : (
            <button onClick={async () => {
                const handle = prompt("handle")
                if (!handle) return
                if (await action_sess_begin_noauth(handle)) {
                    set_session_data(SessionData.try_from(await action_sess_get()))
                } else {
                    alert("failed")
                }
            }}>login</button>
        )}
    </>)
}

export function ProfileSelector() {
    const [profiles, set_profiles] = useState<Profile[]>([])
    const { session_data, profile, set_profile } = useContext(SESSION_CONTEXT)
    useEffect(() => {
        action_sess_get_profiles()
            .then(profiles => Profile.array().nullable().try_from(profiles) ?? [])
            .then(set_profiles)
    }, [session_data?.self_id])
    const ok = profile != null && profiles.includes(profile)
    useLayoutEffect(() => {
        if (!ok && profiles.length > 0) {
            set_profile(profiles[0])
        }
    }, [profiles, set_profile, ok])
    return (ok ? <>
        <select value={profiles.indexOf(profile)} onChange={e => {
            const i = parseInt(e.currentTarget.value)
            if (Number.isInteger(i) && i >= 0 && i < profiles.length) {
                set_profile(profiles[i])
            }
        }}>
            {profiles.map((profile, i) => (
                <option value={i} key={i}>
                    {profile.name}
                </option>
            ))}
        </select>
    </> : <>{"// TODO: no profiles"}</>)
}

export function GroupsRefresh() {
    const OLD_THRESHOLD = 5 * 1000
    const { refresh_groups, last_updated } = useContext(SESSION_CONTEXT)
    const [_, update] = useUpdate()

    useEffect(() => {
        const until_old = last_updated.getTime() + OLD_THRESHOLD - Date.now()
        if (until_old < 0) {
            return
        }
        const id = setTimeout(() => {
            update()
        }, until_old + 100)
        return () => {
            clearTimeout(id)
        }
    }, [last_updated.getTime()])

    return (
        <button
            onClick={() => refresh_groups()}
        >
            {Date.now() - last_updated.getTime() > OLD_THRESHOLD ? "last updated: " + last_updated.toLocaleString() + " " : ""}refresh
        </button>
    )
}