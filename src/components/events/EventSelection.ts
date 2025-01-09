import { Group, ms_int, ms_uint, Timerange, uint } from "@/common/ty_shared";
import { EventFilter } from "../filter/FilterBar";
import { useMappedSet } from "@/util/use";
import { useCallback, useMemo } from "react";
import { EventInstance, Eventslist } from "@/common/event_management";
import { day_int } from "@/common/util/datetime";

export class EventSelection {
    constructor(
        readonly groups: Set<Group>,
        readonly filter: EventFilter,
        readonly timerange: Timerange,
    ) { }
    static equals(a: EventSelection, b: EventSelection): boolean {
        return a.groups.symmetricDifference(b.groups).size === 0 && a.filter === b.filter && Timerange.equals(a.timerange, b.timerange)
    }
    replace_if_changed(new_sel: EventSelection): EventSelection {
        return EventSelection.equals(this, new_sel) ? this : new_sel
    }
}

export function useMemoizedEventslists(sel: EventSelection): Eventslist[] {
    const { groups, timerange } = sel
    return useMappedSet(
        groups,
        useCallback(group => new Eventslist(group, timerange), [timerange]),
    )
}

export function useEventsAll(sel: EventSelection) {
    const eventslists = useMemoizedEventslists(sel)
    return useMemo(() => eventslists.flatMap(v => v.all()).filter(sel.filter), [eventslists, sel.filter])
}
export function useEventsDuringDay(sel: EventSelection) {
    const eventslists = useMemoizedEventslists(sel)
    return useCallback((day: day_int) => eventslists.flatMap(v => v.starts_or_ends_during_day(day)).filter(sel.filter), [eventslists, sel.filter])
}








export function assemble_tracks(
    events: EventInstance[],
): ({
    track_n: uint,
    event: EventInstance,
}[])[] {
    const tracks: (EventInstance[])[] = []
    const events_ordered: ({ track_i: uint, event: EventInstance })[] = []
    for (const event_instance of events.toSorted((a, b) => a.time.end.getTime() - b.time.end.getTime())) {
        let track_i = tracks.findIndex(track => !track[track.length - 1].time.overlaps(event_instance.time))
        if (track_i === -1) track_i = (() => {
            const new_track: EventInstance[] = []
            tracks.push(new_track)
            return tracks.length - 1
        })()

        tracks[track_i].push(event_instance)
        events_ordered.push({ track_i, event: event_instance })
    }

    if (events_ordered.length === 0) {
        return []
    }


    const events_out: ({ track_n: uint, event: EventInstance }[])[] = tracks.map(() => [])
    let streak_bounds: Timerange = events_ordered[0].event.time
    let max_track_i = events_ordered[0].track_i
    const events_streak = [{ track_i: 0, event: events_ordered[0].event }]
    const end_streak = () => {
        const track_n = max_track_i + 1
        for (const { track_i, event } of events_streak) {
            events_out[track_i].push({
                track_n,
                event,
            })
        }
        events_streak.length = 0
    }
    for (const { track_i, event } of events_ordered.slice(1)) {
        const { time } = event
        if (streak_bounds.overlaps(time)) {
            events_streak.push({ track_i, event })
            if (track_i > max_track_i) {
                max_track_i = track_i
            }
            streak_bounds = streak_bounds.merge(time)
        } else {
            end_streak()
            events_streak.push({ track_i, event })
            max_track_i = track_i
            streak_bounds = time
        }
    }
    end_streak()
    return events_out
}

