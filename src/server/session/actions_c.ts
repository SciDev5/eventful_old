"use client"

import { SessionData } from "@/common/ty_shared"
import { _action_sess_begin_noauth, _action_sess_begin_password, _action_sess_end, _action_sess_get } from "./actions_s"
import { bind_action_0_1, bind_action_1_1, bind_action_2_1 } from "../actions"
import { bool, str } from "@/common/type"


export const action_sess_begin_noauth = bind_action_1_1(_action_sess_begin_noauth, str, bool)
export const action_sess_begin_password = bind_action_2_1(_action_sess_begin_password, str, str, bool)
export const action_sess_end = _action_sess_end
export const action_sess_get = bind_action_0_1(_action_sess_get, SessionData)