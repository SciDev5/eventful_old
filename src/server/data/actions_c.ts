"use client"

import { Group, GroupDefinition, Profile } from "@/common/ty_shared"
import { bind_action_0_1, bind_action_1_1, bind_action_2_1 } from "../actions"
import { _action_get_group, _action_get_groupdef, _action_sess_get_groups_owned, _action_sess_get_profiles, _action_set_groupdef_name, _action_set_groupdef_remote } from "./actions_s"
import { id } from "@/common/util/id"
import { str } from "@/common/type"

export const action_get_group = bind_action_1_1(_action_get_group, id, Group)
export const action_get_groupdef = bind_action_1_1(_action_get_groupdef, id, GroupDefinition)
export const action_set_groupdef_name = bind_action_2_1(_action_set_groupdef_name, id, str, str.nullable())
export const action_set_groupdef_remote = bind_action_2_1(_action_set_groupdef_remote, id, str, str.nullable())
export const action_sess_get_profiles = bind_action_0_1(_action_sess_get_profiles, Profile.array())
export const action_sess_get_groups_owned = bind_action_0_1(_action_sess_get_groups_owned, id.array())