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
import { EventFilter } from "../filter/FilterBar"
import { assemble_tracks, EventSelection, useEventsDuringDay } from "../events/EventSelection"

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
    sel,
}: {
    start: day_int,
    n: uint,
    sel: EventSelection,
}) {
    const day_events = useEventsDuringDay(sel)
    console.log(day_events);


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
                        <CalendarDaysDayContent day_i={day_i} day_events={day_events} />
                    </div>
                ))}
            </div>
        </div>
    )
}
function CalendarDaysDayContent({
    day_i,
    day_events,
}: {
    day_i: day_int,
    day_events: (day: day_int) => EventInstance[],
}) {
    const ms_day_start = day_to_date(day_i).getTime()
    const events = useMemo(() => day_events(day_i), [day_events, day_i])
    // console.log(day_i, day_events, events);

    const assembled = assemble_tracks(events)
        .flatMap((v, track_i) => v.map(({ track_n, event }) => ({
            track_i,
            track_n,
            event_instance: event,
            ms_start: event.time.start_ms - ms_day_start,
            ms_end: event.time.end_ms - ms_day_start,
        })))

    return (
        <>
            {assembled.map((data, i) => (
                <CalendarDayEvent
                    {...data}
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

