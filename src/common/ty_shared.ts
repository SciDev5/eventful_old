import { Color } from "./util/color";
import { Simple, Ty, ty_map } from "./serialization";
import { Sum } from "./util/functional";

export type int = number;
export type uint = number;
export type u16 = number;
export type u32 = number;
export type u48 = number;
export type float = number;

export type index = uint;
const ty_index = Simple.uint
/// milliseconds [int]
export type ms_int = int;
/// milliseconds [uint]
export type ms_uint = uint;

export type UserId = index;
export type GroupId = index;
export type EventId = index;


export class Timerange {
    readonly end: Date
    constructor(
        readonly start: Date,
        end: Date,
    ) {
        this.end = end.getTime() > start.getTime() ? end : start // ensure length >= 0
    }

    get start_ms() { return this.start.getTime() }
    get end_ms() { return this.end.getTime() }
    get length_ms() { return (this.end.getTime() - this.start.getTime()) }
    get length_seconds() { return (this.end.getTime() - this.start.getTime()) / 1000 }
    get length_hours() { return (this.end.getTime() - this.start.getTime()) / 1000 / 60 / 60 }

    overlaps(other: Timerange): boolean {
        return other.start < this.end && this.start < other.end
    }
    contains(time: Date): boolean {
        return time < this.end && time >= this.start
    }
    merge(other: Timerange): Timerange {
        return new Timerange(
            this.start < other.start ? this.start : other.start,
            this.end > other.end ? this.end : other.end,
        )
    }
    with_end_extended_by_ms(len: ms_uint): Timerange {
        return new Timerange(
            this.start,
            new Date(this.end_ms + len),
        )
    }
    with_offset_by_ms(off: ms_uint): Timerange {
        return new Timerange(
            new Date(this.start_ms + off),
            new Date(this.end_ms + off),
        )
    }
    round_outward(interval_ms: number, base: Date = new Date("2024-01-01 00:00")): Timerange {
        const base_ms = base.getTime()
        return new Timerange(
            new Date(Math.floor((this.start.getTime() - base_ms) / interval_ms) * interval_ms + base_ms),
            new Date(Math.ceil((this.end.getTime() - base_ms) / interval_ms) * interval_ms + base_ms),
        )
    }
    static equals(a: Timerange, b: Timerange): boolean {
        return a.start_ms === b.start_ms && a.end_ms === b.end_ms
    }
}
export const ty_Timerange: Ty<Timerange, Simple> = ty_map(
    Simple.obj({
        at: Simple.int,
        len: Simple.uint,
    }),
    v => ({ at: v.start_ms, len: v.length_ms }),
    ({ at, len }) => new Timerange(new Date(at), new Date(at + len)),
    v => v instanceof Timerange,
)


export class ID {
    private static cache = new Map<u48, ID>()
    constructor(readonly id: u48) {
        const existing = ID.cache.get(id)
        if (existing != null) { return existing }
        ID.cache.set(id, this)
    }
    toString() {
        return this.id.toString(16).padStart(12, "0")
    }
}
export const ty_ID = ty_map<ID, u48, Simple>(
    Simple.u48,
    ({ id }) => id,
    id => new ID(id),
    id_obj => id_obj instanceof ID,
)


export interface Label {
    title: string,
    color: null | Color,
}
export const ty_Label: Ty<Label, Simple> = Simple.obj({
    title: Simple.string,
    color: Simple.union(Simple.Color, Simple.null),
})


// ------ User Data Types ------ //

export type EventTime = Sum<{
    Once: {
        at: Timerange,
    },
    SimpleRepeat: {
        // sensible events repeat at the same clock time before and after time zone switches
        // this requires switching timezones mid-repeat, which is hell and who tf designed this i want to punt them into the sun
        // another thing i will be punting is implementing this. "its impossible to know and a sin to ask"
        at: Timerange[],
        stride: ms_uint,
        n_repeats: uint | null,
    },
}>
export const ty_EventTime: Ty<EventTime, Simple> = Simple.sum({
    Once: Simple.obj({
        at: ty_Timerange,
    }),
    SimpleRepeat: Simple.obj({
        at: Simple.array(ty_Timerange),
        stride: Simple.uint,
        n_repeats: Simple.nullable(Simple.uint),
    }),
})

export interface EventOverrides {
    affect_index: index,
    affect_after: boolean,

    name: string | null,
    description: string | null,
    host: (index | Label)[] | null,
    location: (index | Label)[] | null,
    tags: (index | Label)[] | null,
}
export const ty_EventOverrides: Ty<EventOverrides, Simple> = Simple.obj({
    affect_index: ty_index,
    affect_after: Simple.bool,

    name: Simple.nullable(Simple.string),
    description: Simple.nullable(Simple.string),
    host: Simple.nullable(Simple.array(Simple.union(ty_index, ty_Label))),
    location: Simple.nullable(Simple.array(Simple.union(ty_index, ty_Label))),
    tags: Simple.nullable(Simple.array(Simple.union(ty_index, ty_Label))),
})

export interface Event {
    id: EventId,

    name: string,
    description: string,

    host: (index | Label)[],
    location: (index | Label)[],
    tags: (index | Label)[],

    time: EventTime,
    overrides: EventOverrides[],
}
export const ty_Event: Ty<Event, Simple> = Simple.obj({
    id: Simple.uint,

    name: Simple.string,
    description: Simple.string,

    host: Simple.array(Simple.union(ty_index, ty_Label)),
    location: Simple.array(Simple.union(ty_index, ty_Label)),
    tags: Simple.array(Simple.union(ty_index, ty_Label)),

    time: ty_EventTime,
    overrides: Simple.array(ty_EventOverrides),
})

export interface Group {
    id: GroupId,

    name: string,
    owner: UserId,

    events: Map<EventId, Event>,

    hosts: Label[],
    locations: Label[],
    tags: Label[],
}
export const ty_Group: Ty<Group, Simple> = Simple.obj({
    id: Simple.uint,

    name: Simple.string,
    owner: Simple.uint,

    events: Simple.Map(Simple.uint, ty_Event),

    hosts: Simple.array(ty_Label),
    locations: Simple.array(ty_Label),
    tags: Simple.array(ty_Label),
})

export interface EventUser {
    // each index switches whether the user intends to go to the event, defaulting to yes
    skips: index[] | null,
}
export const ty_EventUser: Ty<EventUser, Simple> = Simple.obj({
    skips: Simple.nullable(Simple.array(ty_index)),
})

export interface GroupUser {
    permissions: {
        events_edit: boolean,
        group_edit: boolean,
        users_see: boolean,
        users_edit: boolean,
    },
    participation: Map<EventId, EventUser>,
}
export const ty_GroupUser: Ty<GroupUser, Simple> = Simple.obj({
    permissions: Simple.obj({
        events_edit: Simple.bool,
        group_edit: Simple.bool,
        users_see: Simple.bool,
        users_edit: Simple.bool,
    }),
    participation: Simple.Map(Simple.uint, ty_EventUser),
})


export interface User {
    id: UserId,

    name: string,

    self_group_id: GroupId,
    groups: Map<GroupId, GroupUser>,
}
export const ty_User: Ty<User, Simple> = Simple.obj({
    id: Simple.uint,

    name: Simple.string,

    self_group_id: Simple.uint,
    groups: Simple.Map(Simple.uint, ty_GroupUser),
})


export type Session = null | {
    user: User,
}
export const ty_Session: Ty<Session, Simple> = Simple.union(
    Simple.null,
    Simple.obj({
        user: ty_User,
    }),
)