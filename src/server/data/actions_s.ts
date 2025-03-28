"use server"

import { Group, GroupDefinition, Profile } from "@/common/ty_shared";
import { str } from "@/common/type";
import { id } from "@/common/util/id";
import { def_action_0_1, def_action_1_1, def_action_2_1 } from "../actions";
import { db_group_ref } from "./db";

export const _action_get_group = def_action_1_1(id, Group, async id => {
    // TODO: auth, real data
    return db_group_ref(id)
})
export const _action_get_groupdef = def_action_1_1(id, GroupDefinition, async id => {
    // TODO: auth, real data
    return db_group_ref(id)
})
export const _action_set_groupdef_remote = def_action_2_1(id, str, str.nullable(), async (id, url) => {
    // TODO: auth, real data
    const v = await db_group_ref(id)
    if (v === null) return null
    if (v.remote === null) return null
    v.remote = url
    return url
})
export const _action_set_groupdef_name = def_action_2_1(id, str, str.nullable(), async (id, name) => {
    // TODO: auth, real data
    const v = await db_group_ref(id)
    if (v === null) return null
    if (v.name === null) return null
    v.name = name
    return name
})

export const _action_sess_get_profiles = def_action_0_1(Profile.array(), async () => {
    // TODO: auth, real data
    return [
        // { name: "test1", join_groups: new Map([[[...TEST_GROUPS.keys()][0], { join_events: [] }]]) },
        { name: "test2", join_groups: new Map([]) } as Profile,
    ]
})

export const _action_sess_get_groups_owned = def_action_0_1(id.array(), async () => {
    // TODO: auth, real data
    return [0x9000beef]
})