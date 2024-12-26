"use client";

import { Attributes, Fragment, RefObject, useCallback, useEffect, useMemo, useState } from "react";
import styles from "./EventTimeline.module.css";
import { css_vars } from "@/util/css";
import { swap } from "@/common/util/arr";
import { Chip } from "../chip/Chip";
import { Color } from "@/common/util/color";
import { EventModal, EventModalShower } from "./EventModal";
import { Group, Label, Timerange } from "@/common/ty_shared";
import { useMemoizedEventslists } from "../calendar/Calendar";
import { useChangedValue } from "@/util/use";
import { day_to_date } from "@/common/util/datetime";
import { EventFilter } from "../filter/FilterBar";
import { EventInstance } from "@/common/event_management";

export type FavoriteId = string

export function EventTimeline({ event_schedule, timerange, em_per_hr, event_filter, color_from_hosts, time_scroll_ref, favorites }: {
    event_schedule: Set<Group>,
    timerange: Timerange,
    em_per_hr: number | "inherit",
    event_filter: EventFilter,
    favorites: FavoriteId[],
    color_from_hosts?: boolean,
    time_scroll_ref?: RefObject<HTMLDivElement>,
}) {
    console.log(event_schedule, timerange, em_per_hr, event_filter, color_from_hosts);

    const events = useMemoizedEventslists(
        event_schedule,
        timerange,
    )

    const tracks = useMemo(
        () => assemble_tracks(
            timerange,
            events.flatMap(v => v.all()).filter(event_filter)
        ).map(tr => tr.map(ent => ({ ...ent, data: { event: ent.data } }))),
        [timerange, event_schedule, event_filter],
    )
    const timetrack: TrackData<{ date: Date }> = useMemo(
        () => new Array(Math.ceil(timerange.length_hours)).fill(0)
            .map((_, i) => new Date((Math.floor(timerange.start.getTime() / 1000 / 60 / 60) + i) * 1000 * 60 * 60))
            .map(t => ({
                spacer: 0,
                width: (Math.min(t.getTime() + 60 * 60 * 1000, timerange.end.getTime()) - Math.max(t.getTime(), timerange.start.getTime())) / timerange.length_ms,
                data: { date: t },
            })),
        [timerange]
    )

    const modal_control = useMemo(() => ({
        set_modal: (e: EventInstance | null) => {
            console.warn("failed to set modal_control.set_modal in time")
        }
    }), [])


    const passthrough = useMemo(() => ({
        color_from_hosts: color_from_hosts ?? false,
        modal_control,
    }), [color_from_hosts, modal_control])
    return (
        <div
            className={styles.timeline_time_scroll}
            style={css_vars({ length_hours: timerange.length_hours, ...em_per_hr !== "inherit" ? { em_per_hr } : {} })}
            ref={time_scroll_ref}
        >
            <EventModalShower control_ref={modal_control} favorites={favorites} />
            <div className={styles.timeline_space_scroll_container}>
                <TimelineTrack
                    track_data={timetrack}
                    passthrough={{}}
                    Inner={TimelineTrackTime}
                />
                <div className={styles.timeline_space_scroll}>
                    <TimeIndicator timerange={timerange} />
                    {
                        useMemo(() => tracks.map((t, i) => (
                            <TimelineTrack
                                track_data={t}
                                passthrough={passthrough}
                                Inner={TimelineTrackEvent}
                                key={i}
                            />
                        )), [passthrough, tracks])
                    }
                    <div className={styles.antihover} />
                </div>
            </div>
        </div>
    )
}

function TimeIndicator({ timerange }: { timerange: Timerange }) {
    const [hrs, set_hrs] = useState<null | number>(null)
    useEffect(() => {
        let id = -1;
        const callback = () => {
            set_hrs(
                timerange.contains(new Date())
                    ? (Date.now() - timerange.start.getTime()) / 1000 / 60 / 60
                    : null
            )
            setTimeout(callback, 10000)
        }
        callback()
        return () => clearTimeout(id)
    }, [timerange])
    return (hrs != null ? <div
        className={styles.timeline_time_indicator}
        style={css_vars({ hrs })}
    /> : <></>)
}

function TimelineTrackTime({ date }: { date: Date }) {
    return (<div className={`${styles.track_time} ${date.getHours() >= 6 && date.getHours() < 20 ? styles.day : styles.night}`}>
        <div>
            <span>{date.toLocaleString(undefined, { weekday: "short" })}</span>
            <span>{date.toLocaleString(undefined, { day: "numeric" })}</span>
        </div>
        <div>
            {date.toLocaleString(undefined, { hour: "numeric" })}
        </div>
    </div>)
}
function ColorHeader({ labels }: { labels: Label[] }) {
    const mapped_labels = labels.flatMap(label => label.color != null ? [label.color.to_hex()] : []).map((color, i) => (
        <div style={css_vars({ color })} key={i} />
    ))
    return (<div className={styles.colors}>
        {mapped_labels}
        {mapped_labels.length === 0 && <div className={styles.no_color} />}
    </div>)
}
function TimelineTrackEvent({ event, color_from_hosts, modal_control }: { event: EventInstance, color_from_hosts: boolean, modal_control: { set_modal: (ev: EventInstance | null) => void } }) {

    const summon_modal = useCallback(() => modal_control.set_modal(event), [event, modal_control])

    const DEFAULT_GREY = new Color(0.5, 0.5, 0.5)

    return (<div className={styles.event} onClick={summon_modal}>
        {
            color_from_hosts
                ? <ColorHeader labels={event.host} />
                : <ColorHeader labels={event.tags} />
        }
        <div className={styles.event_name}>
            {event.name}
        </div>
        {/* <div className={styles.event_description + " " + styles.hide_no_hov}>
            {event.description}
        </div> */}
        <div className={styles.hide_no_hov}>
            <div className={styles.event_time}>
                <span>{event.time.start.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}</span>
                <span className={styles.line} />
                <span>{event.time.end.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}</span>
            </div>
            <div className={styles.event_host}>{event.host.map(host => (<span style={css_vars({ host_color: (host.color ?? DEFAULT_GREY).to_hex() })} key={host.title}>{host.title}</span>))}</div>
            {/* {event.group && <div className={styles.event_group}>{schedule.groups[event.group].name}</div>} */}
            <div className={styles.event_location}>{event.location.map(v => v.title).join(", ")}</div>
            <div className={styles.event_tags}>
                {event.tags.map(tag => (<Chip color={tag.color ?? DEFAULT_GREY} key={tag.title}>{tag.title}</Chip>))}
            </div>
        </div>
    </div>)
}

function assemble_tracks<T extends { time: Timerange }>(
    timerange_outer: Timerange,
    events: T[],
): TrackData<T>[] {
    const tracks: (T[])[] = []
    let i = 0
    for (const event of events.toSorted((a, b) => a.time.end.getTime() - b.time.end.getTime())) {
        let track = tracks.find(track => !track[track.length - 1].time.overlaps(event.time)) ?? (() => {
            const new_track: T[] = []
            tracks.push(new_track)
            return new_track
        })()
        track.push(event)
        // i += 6700417 * 131071
        // i %= tracks.length
        // swap(tracks, 0, i)
    }
    const outer_timelen_ms = timerange_outer.length_ms
    return tracks.map(track => track.map((data, i, a) => ({ data: data, width: data.time.length_ms / outer_timelen_ms, spacer: (data.time.start.getTime() - (a[i - 1]?.time?.end ?? timerange_outer.start).getTime()) / outer_timelen_ms })) satisfies TrackData<T>)
}

type TrackData<T> = { spacer: number, width: number, data: T }[]
function TimelineTrack<A, B>({ track_data, passthrough, Inner }: {
    track_data: TrackData<A>,
    passthrough: B,
    Inner: (props: A & B) => JSX.Element,
}) {
    return (<div className={styles.track}>
        {track_data.map(({ data, spacer, width }, i) => (
            <Fragment key={i}>
                {spacer > 0 && <div style={css_vars({ width: spacer })} />}
                {spacer < 0 && <span style={{ background: "#f00" }}>!!!ERROR: NEGATIVE SPACER WIDTH!!!</span>}
                <div style={css_vars({ width })}>
                    <Inner {...data} {...passthrough} key={undefined} />
                </div>
            </Fragment>
        ))}
    </div>)
}
