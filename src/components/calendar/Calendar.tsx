"use client"

import { useCallback, useMemo } from "react"
import styles from "./Calendar.module.css"
import { range_to_arr } from "@/common/util/arr"
import { date_to_day, day_int, day_to_date, day_weekday, MILLISECONDS_PER_DAY, MILLISECONDS_PER_HOUR, month_int, month_length, month_start_weekday } from "@/common/util/datetime"
import { Group, ms_int, Timerange, uint } from "@/common/ty_shared"
import { useSettings } from "../settings/settings"
import { css_vars } from "@/util/css"
import { EventInstance, Eventslist } from "@/common/event_management"
import { useChangedValue, useMappedSet } from "@/util/use"

export function CalendarMonth({
    start,
}: {
    start: month_int,

}) {
    const { zero_weekday } = useSettings()

    const [year, month] = [Math.floor(start / 12), start % 12]
    const start_weekday = (month_start_weekday(year, month) - zero_weekday + 7) % 7
    const n_days = month_length(year, month)
    const n_days_prev = month_length(year, month - 1)
    const n_weeks = Math.ceil((n_days + start_weekday) / 7)

    const i_today = Math.floor((Date.now() - new Date(year, month, 1).getTime()) / 1000 / 60 / 60 / 24)

    return (
        <div className={styles.cal_monthly}>
            <div className={styles.week_header}>
                {range_to_arr(0, 7, i => (
                    <div key={i}>{
                        new Date(year, month, 8 + i - start_weekday)
                            .toLocaleString(undefined, { weekday: "short" })
                    }</div>
                ))}
            </div>
            {range_to_arr(0, n_weeks, week_i => (
                <div key={week_i} className={styles.week}>
                    {range_to_arr(7 * week_i - start_weekday, 7, day_i => (
                        <CalendarMonthDay {...{
                            day_i,
                            n_days,
                            n_days_prev,
                            today: i_today === day_i,
                        }} key={day_i} />
                    ))}
                </div>
            ))}
        </div>
    )
}
function CalendarMonthDay({
    day_i, n_days, n_days_prev, today,
}: {
    day_i: number, n_days: number, n_days_prev: number, today: boolean,
}) {
    const day_fixed = 1 + (
        day_i < 0 ? n_days_prev + day_i :
            day_i >= n_days ? day_i - n_days :
                day_i
    )
    const in_range = day_i >= 0 && day_i < n_days
    return (
        <div
            className={[
                styles.day,
                ...in_range ? [] : [styles.out_of_range],
                ...today ? [styles.today] : []
            ].join(" ")}
        >
            <div>
                {day_fixed}
            </div>
        </div>
    )
}


export function CalendarDays({
    start, n,
    groups,
}: {
    start: day_int,
    n: uint,
    groups: Set<Group>,
}) {
    const events = useMemoizedEventslists(
        groups,
        useChangedValue(new Timerange(day_to_date(start - 2), day_to_date(start + n + 2)), Timerange.equals),
    )
    console.log(events);


    const today = date_to_day(new Date())
    return (
        <div className={styles.cal_daily}>
            <div className={styles.head}>
                <div className={styles.times} />
                {range_to_arr(start, n, day_i => (
                    <div
                        className={[
                            styles.day,
                            ...today == day_i ? [styles.today] : [],
                        ].join(" ")}
                        key={day_i}
                    >
                        <div>{day_to_date(day_i).toLocaleDateString(undefined, { weekday: "short", day: "numeric" })}</div>
                    </div>
                ))}
            </div>
            <div className={styles.body}>
                <div className={styles.times}>
                    {range_to_arr(0, 24, hr => (
                        <div
                            key={hr}
                        >
                            {new Date(0, 0, 0, hr, 0).toLocaleTimeString(undefined, { hour: "numeric" })}
                            {/* {new Date(0, 0, 0, hr, 0).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false })} */}
                        </div>
                    ))}
                </div>
                {range_to_arr(start, n, day_i => (
                    <div
                        className={[
                            styles.day,
                            ...today == day_i ? [styles.today] : [],
                        ].join(" ")}
                        key={day_i}
                    >
                        <CalendarDaysDayContent day_i={day_i} events={events} />
                    </div>
                ))}
            </div>
        </div>
    )
}
function CalendarDaysDayContent({
    day_i,
    events,
}: {
    day_i: day_int,
    events: Eventslist[],
}) {
    const ms_day_start = day_to_date(day_i).getTime()
    const day_events = events.flatMap(events => events.starts_or_ends_during_day(day_i))
    // console.log(day_i, day_events, events);

    const assembled = assemble_tracks(ms_day_start, day_events.map(event_instance => ({ time: event_instance.time, event_instance })))

    return (
        <>
            {assembled.map(({ track_i, track_n, ms_start, ms_end, event_instance }, i) => (
                <CalendarDayEvent
                    {...{ ms_start, ms_end, track_i, track_n, events, event_instance }}
                    key={i}
                />
            ))}
        </>
    )
}
function CalendarDayEvent({
    event_instance,
    track_n,
    track_i,
    ms_start,
    ms_end,
}: {
    event_instance: EventInstance,
    track_n: uint,
    track_i: uint,
    ms_start: ms_int,
    ms_end: ms_int,
}) {
    const { event, name } = event_instance
    if (ms_end < ms_start) { return (<>!!!err!!!</>) }

    return (<div
        className={
            styles.event
            + (ms_start < 0 ? " " + styles.cut_start : "")
            + (ms_end > MILLISECONDS_PER_DAY ? " " + styles.cut_end : "")
        }
        style={css_vars({
            track_n,
            track_i,
            start_hrs: Math.max(ms_start, 0) / MILLISECONDS_PER_HOUR,
            len_hrs: (Math.min(ms_end, MILLISECONDS_PER_DAY) - Math.max(ms_start, 0)) / MILLISECONDS_PER_HOUR,
        })}
    >
        {name ?? `[EVENT ${event.id}]`}
    </div>)

}


export function useMemoizedEventslists(groups: Set<Group>, timerange: Timerange): Eventslist[] {
    return useMappedSet(
        groups,
        useCallback(group => new Eventslist(group, timerange), [timerange]),
    )
}

function assemble_tracks<T>(
    ms_day_start: uint,
    events: {
        time: Timerange,
        event_instance: T,
    }[],
): {
    track_n: uint,
    track_i: uint,
    ms_start: ms_int,
    ms_end: ms_int,
    event_instance: T,
}[] {
    const tracks: ({ time: Timerange, event_instance: T }[])[] = []
    const events_ordered: ({ track_i: uint, event: { time: Timerange, event_instance: T } })[] = []
    for (const event_instance of events.toSorted((a, b) => a.time.end.getTime() - b.time.end.getTime())) {
        let track_i = tracks.findIndex(track => !track[track.length - 1].time.overlaps(event_instance.time))
        if (track_i === -1) track_i = (() => {
            const new_track: { time: Timerange, event_instance: T }[] = []
            tracks.push(new_track)
            return tracks.length - 1
        })()

        tracks[track_i].push(event_instance)
        events_ordered.push({ track_i, event: event_instance })
    }

    if (events_ordered.length === 0) {
        return []
    }


    const events_out = []
    let streak_bounds: Timerange = events_ordered[0].event.time
    let max_track_i = events_ordered[0].track_i
    const events_streak = [{ track_i: 0, ...events_ordered[0].event }]
    for (const { track_i, event: { time, event_instance } } of events_ordered.slice(1)) {
        if (streak_bounds.overlaps(time)) {
            events_streak.push({ track_i, time, event_instance })
            if (track_i > max_track_i) {
                max_track_i = track_i
            }
            streak_bounds = streak_bounds.merge(time)
        } else {
            events_out.push(...events_streak.map(({
                event_instance,
                time,
                track_i,
            }) => ({
                ms_start: time.start_ms - ms_day_start,
                ms_end: time.end_ms - ms_day_start,
                track_i,
                track_n: max_track_i + 1,
                event_instance,
            })))
            events_streak.length = 0
            events_streak.push({ track_i, time, event_instance })
            max_track_i = track_i
            streak_bounds = time
        }
    }
    events_out.push(...events_streak.map(({
        event_instance,
        time,
        track_i,
    }) => ({
        ms_start: time.start_ms - ms_day_start,
        ms_end: time.end_ms - ms_day_start,
        track_i,
        track_n: max_track_i + 1,
        event_instance,
    })))
    return events_out
}