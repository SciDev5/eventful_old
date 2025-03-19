import { bool, date, int, obj, or, raw, str, sum, Ty, TypeRepr, TypeReprT, u32, uint } from "./type";
import { Color } from "./util/Color";
import { Sum } from "./util/functional";
import { id } from "./util/id";

export type ms_int = int
export type ms_uint = uint
const ms_int = int
const ms_uint = uint


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

    static readonly type = raw({ s: date, e: date }).map(({ s, e }) => new Timerange(s, e), ({ start, end }) => ({ s: start, e: end }))
}


const _Label_ = raw({
    title: str,
    color: Color.type.nullable(),
})
export interface Label extends TypeReprT<typeof _Label_> { }
export const Label: Ty<Label, typeof _Label_> = _Label_

const _Labels_ = or([Label, uint]).map(
    v => uint.is_raw(v) ? v : Label.from_raw(v),
    v => uint.is_raw(v) ? v : Label.to_raw(v),
).array().nullable()
type _Labels_ = TypeReprT<typeof _Labels_>

function _IdMap_<T, Raw>(spec: TypeRepr<T, Raw>) {
    return TypeRepr.Map(id, spec)
}


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
export const EventTime: Ty<EventTime> = sum({
    Once: obj({
        at: Timerange.type,
    }),
    SimpleRepeat: obj({
        at: Timerange.type.array(),
        stride: uint,
        n_repeats: uint.nullable(),
    }),
})

export interface EventOverrides {
    affect_index: uint,
    affect_after: boolean,

    name: string | null,
    description: string | null,
    host: _Labels_,
    location: _Labels_,
    tags: _Labels_,
}
export const EventOverrides: Ty<EventOverrides> = obj({
    affect_index: uint,
    affect_after: bool,

    name: str.nullable(),
    description: str.nullable(),
    host: _Labels_,
    location: _Labels_,
    tags: _Labels_,
})

export interface Event {
    id: id,

    name: string,
    description: string,

    host: _Labels_,
    location: _Labels_,
    tags: _Labels_,

    time: EventTime,
    overrides: EventOverrides[],
}
export const Event: Ty<Event> = obj({
    id,

    name: str,
    description: str,

    host: _Labels_,
    location: _Labels_,
    tags: _Labels_,

    time: EventTime,
    overrides: EventOverrides.array(),
})

export interface Group {
    id: id,

    name: string,
    owner: id,

    events: Map<id, Event>,

    hosts: Label[],
    locations: Label[],
    tags: Label[],
}
export const Group: Ty<Group> = obj({
    id,

    name: str,
    owner: uint,

    events: _IdMap_(Event),

    hosts: Label.array(),
    locations: Label.array(),
    tags: Label.array(),
})

export interface EventUser {
    // each index switches whether the user intends to go to the event, defaulting to yes
    skips: uint[] | null,
}
export const EventUser: Ty<EventUser> = obj({
    skips: uint.array().nullable(),
})

export interface GroupUser {
    permissions: {
        events_edit: boolean,
        group_edit: boolean,
        users_see: boolean,
        users_edit: boolean,
    },
    participation: Map<id, EventUser>,
}
export const GroupUser: Ty<GroupUser> = obj({
    permissions: obj({
        events_edit: bool,
        group_edit: bool,
        users_see: bool,
        users_edit: bool,
    }),
    participation: _IdMap_(EventUser),
})


export interface User {
    id: id,

    name: string,

    self_group_id: id,
    groups: Map<id, GroupUser>,
}
export const User: Ty<User> = obj({
    id,

    name: str,

    self_group_id: uint,
    groups: _IdMap_(GroupUser),
})


export type SessionData = {
    self_id: id,
}
export const SessionData: Ty<SessionData> = obj({
    self_id: id
})