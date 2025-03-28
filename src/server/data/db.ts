import { hash } from "bcrypt"
import { UserAccount } from "../ty_server"
import { id } from "@/common/util/id"
import { Group, GroupDefinition, Timerange } from "@/common/ty_shared"

// todo real db
const MEMORY_DB = {
    users: new Map<id, UserAccount>(),
    groups: new Map<id, GroupDefinition>(),
}



export async function db_user_ref_by_handle(handle: string): Promise<UserAccount | null> {
    return [...MEMORY_DB.users.values()].find(v => v.handle === handle) ?? null
}
export async function db_group_ref(id: id): Promise<GroupDefinition | null> {
    return MEMORY_DB.groups.get(id) ?? null
}


//////////////////////////////////////////////////////////////////////////////////////

const OFF = 60
const TEST_GROUP: GroupDefinition = {
    id: 0x9000beef,

    owner: 0,
    remote: "https://remote",
    // remote: null,
    updated: new Date(),
    name: "hello",

    events: new Map([
        [0, {
            id: 0,

            name: "thevent",
            description: "wao description",

            host: [],
            location: [],
            tags: [],

            // time: { SimpleRepeat: { at: [new Timerange(new Date(Date.now() - 1000 * 60 * 60 * 24 * OFF), new Date(Date.now() + 1000 * 60 * 60 * 2 - 1000 * 60 * 60 * 24 * OFF))], n_repeats: 600, stride: 1000 * 60 * 60 * 24 } },
            time: { Once: { at: new Timerange(new Date(Date.now()), new Date(Date.now() + 1000 * 60 * 60 * 2)) } },
            overrides: [],
        }],
        [1, {
            id: 1,

            name: "djkjk",
            description: "wao description",

            host: [],
            location: [],
            tags: [],

            // time: { SimpleRepeat: { at: [new Timerange(new Date(Date.now()), new Date(Date.now() + 1000 * 60 * 60 * 24 * 2))], n_repeats: 10, stride: 7 * 1000 * 60 * 60 * 24 } },
            time: { Once: { at: new Timerange(new Date(Date.now()), new Date(Date.now() + 1000 * 60 * 60 * 2)) } },
            overrides: [],
        }],
    ]),

    hosts: [],
    locations: [],
    tags: [],
}
MEMORY_DB.groups.set(TEST_GROUP.id, TEST_GROUP)

const TEST_USER: UserAccount = {
    id: 0x69420abc,
    created: new Date(),
    groups: {
        self: 0x9000beef,
        joined: [],
    },
    handle: "handle",
    kerb: null,
    passhash: null,
    name: "name"
}
MEMORY_DB.users.set(TEST_USER.id, TEST_USER)