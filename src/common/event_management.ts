import { Event, Group, Timerange, EventTime, Label } from "./ty_shared"
import { uint } from "./type"
import { find_index } from "./util/arr"
import { day_int, day_to_date, MILLISECONDS_PER_DAY } from "./util/datetime"
import { id } from "./util/id"


function eventtime_in_timerange(event_time: EventTime, timerange: Timerange): boolean {
    return timerange.overlaps(eventtime_max_extent(event_time))
}
export function eventtime_max_extent(event_time: EventTime): Timerange {
    if ("Once" in event_time) {
        return event_time.Once.at
    }
    if ("SimpleRepeat" in event_time) {
        const { at, n_repeats, stride } = event_time.SimpleRepeat
        // FIXME: this neglects time overrides
        return at.reduce((a, b) => a.merge(b)).with_end_extended_by_ms(stride * (n_repeats ?? 1))

    }
    throw new Error("invalid EventTime (should be unreachable)")
}
function event_instances_in_timerange(group: Group, event: Event, timerange: Timerange): EventInstance[] {
    const base_times: [uint, Timerange][] = []
    if ("Once" in event.time) {
        base_times.push([0, event.time.Once.at] satisfies [number, Timerange])
    }
    if ("SimpleRepeat" in event.time) {
        const { at, n_repeats, stride } = event.time.SimpleRepeat
        for (const at_ of at) {
            // FIXME: this neglects time overrides
            const i_start = Math.max(0, Math.floor((timerange.start_ms - at_.end_ms) / stride))
            let i_end = Math.ceil((timerange.end_ms - at_.start_ms) / stride)
            if (n_repeats != null) {
                i_end = Math.min(n_repeats, i_end)
            }
            if (i_start >= i_end) continue
            base_times.push(...new Array(i_end - i_start).fill(0)
                .map((_, i) => [(i + i_start), at_.with_offset_by_ms((i + i_start) * stride)] satisfies [number, Timerange]))
        }
    }

    // TODO overrides, too lazy rn
    // const current_info = {
    //     name: event.name,
    //     host: event.host,
    //     location: event.location,
    //     tags: event.tags,
    // }
    // let next_override_at_i = event.overrides[0]?.affect_index ?? Infinity
    // let override_i = -1
    // return base_times.map(([i,t])=>{
    //     while (i >= next_override_i) {

    //     }
    // })
    // console.log(base_times);

    const reify_label_map = (lut: Label[]) => (label_or_id: Label | uint) => typeof label_or_id === "number" ? lut[label_or_id] : label_or_id

    return base_times.map(([i, time]) => ({
        i,
        event,
        id: event.id,
        group,

        name: event.name,
        description: event.description,
        host: event.host?.map(reify_label_map(group.hosts)) ?? [],
        location: event.location?.map(reify_label_map(group.locations)) ?? [],
        tags: event.tags?.map(reify_label_map(group.tags)) ?? [],

        time,
    }))
}

export interface EventInstance {
    event: Event,
    id: id,
    group: Group,
    name: string,
    description: string,
    time: Timerange,
    host: Label[],
    location: Label[],
    tags: Label[],
}

export class Eventslist {
    // store events in order of start time
    // maintain index sorted by end time, generation using insertion sort should be efficient

    // dont care if doesnt start/end in same day, so the issue of that being rather inefficient doesnt matter

    // !! insertion/deletion is O(n) (because list operations)
    private sorted_by_start: EventInstance[] = []
    private sorted_by_end: EventInstance[] = []
    constructor(readonly group: Group, for_time: Timerange) {
        this.rebuild(for_time)
    }

    rebuild(for_time: Timerange) {
        // TODO: make this less horrifically slow
        const event_instances = [...this.group.events.values()]
            .filter(ev => eventtime_in_timerange(ev.time, for_time))
            .flatMap(ev => event_instances_in_timerange(this.group, ev, for_time))
        this.sorted_by_start = event_instances.sort((a, b) => a.time.start_ms - b.time.start_ms)
        this.sorted_by_end = this.sorted_by_start.slice().sort((a, b) => a.time.end_ms - b.time.end_ms)
    }

    starts_or_ends_during_day(day: day_int): EventInstance[] {
        const t_start = day_to_date(day).getTime()

        // console.log(
        //     "!!",
        //     this.sorted_by_start,
        //     this.sorted_by_end,
        //     find_index(this.sorted_by_start, t_start, v => v.time.start_ms),
        //     find_index(this.sorted_by_start, t_start + MILLISECONDS_PER_DAY, v => v.time.start_ms),
        // );

        return [
            ...this.sorted_by_start.slice(
                find_index(this.sorted_by_start, t_start, v => v.time.start_ms),
                find_index(this.sorted_by_start, t_start + MILLISECONDS_PER_DAY, v => v.time.start_ms),
            ),
            ...this.sorted_by_end.slice(
                find_index(this.sorted_by_end, t_start, v => v.time.end_ms),
                find_index(this.sorted_by_end, t_start + MILLISECONDS_PER_DAY, v => v.time.end_ms),
            )
                .filter(v => v.time.start_ms < t_start), // don't double count events which start and end in the same day
        ]
    }
    all(): EventInstance[] {
        return this.sorted_by_start.slice()
    }
}