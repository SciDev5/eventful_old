import { Group, GroupRaw, Profile, ProfileRaw, Timerange } from "@/common/ty_shared";
import { id } from "@/common/util/id";


const OFF = 60
const TEST_GROUPS = new Map<id, Group>([
    [0x9000beef, {
        id: 0,

        name: "hello",

        events: new Map([
            [0, {
                id: 0,

                name: "thevent",
                description: "wao description",

                host: [],
                location: [],
                tags: [],

                time: { SimpleRepeat: { at: [new Timerange(new Date(Date.now() - 1000 * 60 * 60 * 24 * OFF), new Date(Date.now() + 1000 * 60 * 60 * 2 - 1000 * 60 * 60 * 24 * OFF))], n_repeats: 600, stride: 1000 * 60 * 60 * 24 } },
                // time: { Once: { at: new Timerange(new Date(Date.now()), new Date(Date.now() + 1000 * 60 * 60 * 2)) } },
                overrides: [],
            }],
            [1, {
                id: 1,

                name: "djkjk",
                description: "wao description",

                host: [],
                location: [],
                tags: [],

                time: { SimpleRepeat: { at: [new Timerange(new Date(Date.now()), new Date(Date.now() + 1000 * 60 * 60 * 24 * 2))], n_repeats: 10, stride: 7 * 1000 * 60 * 60 * 24 } },
                // time: { Once: { at: new Timerange(new Date(Date.now()), new Date(Date.now() + 1000 * 60 * 60 * 2)) } },
                overrides: [],
            }],
        ]),

        hosts: [],
        locations: [],
        tags: [],
    }]
])

export async function userdata_get_group(group_id_: id): Promise<GroupRaw | null> {
    const group_id = id.try_from(group_id_)
    if (!group_id) { return null }

    // TODO: auth, real data
    return TEST_GROUPS.has(group_id) ? Group.to_raw(TEST_GROUPS.get(group_id)!) : null
}

export async function userdata_get_profiles(): Promise<ProfileRaw[] | null> {
    // TODO: auth, real data
    return [
        Profile.to_raw({ name: "test1", join_groups: new Map([]) }),
        Profile.to_raw({ name: "test2", join_groups: new Map([[[...TEST_GROUPS.keys()][0], { join_events: [] }]]) }),
    ]
}