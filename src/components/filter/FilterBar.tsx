import { ChangeEvent, useCallback, useEffect, useId, useMemo, useRef, useState } from "react"
import { Chip } from "../chip/Chip"
import styles from "./FilterBar.module.css"
import { css_vars } from "@/util/css"
import { EventInstance } from "@/common/event_management"
import { Group, Label } from "@/common/ty_shared"
import { Color } from "@/common/util/color"

export type EventFilter = (event: EventInstance) => boolean

export function FilterBar({ children }: { children: JSX.Element | JSX.Element[] }) {
    return (<div className={styles.filter_bar}>
        {children}
    </div>)
}

export function useComposedFilters(n: number): [EventFilter, ...((filter: EventFilter) => void)[]] {
    const filters = useMemo(() => new Array(n).fill(0).map(() => (event: EventInstance) => true as boolean), [n])
    const [update_state, update] = useState(0)

    return [
        useMemo(() => { update_state; return (event: EventInstance) => filters.every(filter => filter(event)) }, [filters, update_state]),
        ...useMemo(() => filters.map((_, i) => (filter: EventFilter) => {
            filters[i] = filter
            update(Math.random)
        }), [filters])
    ]
}

export function TaglikeFilter({ set_filter, property, options }: {
    property: { [k in keyof EventInstance]: EventInstance[k] extends Label[] ? k : never }[keyof EventInstance],
    options: Label[],
    set_filter: (filter: EventFilter) => void,
}) {
    const [checked, set_checked] = useState(() => options.map(() => false))

    const label_id = useId()

    useEffect(() => {
        const tid = setTimeout(() => {
            if (checked.every(v => v === false)) {
                set_filter(_ => true)
            } else {
                const required_tags = checked.map((v, i) => [v, i] satisfies [any, any]).filter(([v,]) => v).map(([, i]) => i)
                set_filter(event => required_tags.some(tag => event[property].includes(options[tag]))) // depends on reference equality
            }
        }, 10)
        return () => clearTimeout(tid)
    }, [set_filter, property, options, checked])


    const [focused_outer, set_focused_outer] = useState(false)

    const DEFAULT_GREY = Color.from_hex("#77f")!

    return (
        <div
            className={styles.filter_taglike + (focused_outer ? " " + styles.focused_outer : "")}
            tabIndex={1}
            onKeyDown={() => {
                console.log("focus!");
                set_focused_outer(true)
            }}
            onBlur={() => set_focused_outer(false)}
        >
            <div
                className={styles.filter_taglike_preview}
            >
                {
                    checked.every(v => v === false)
                        ? (<>
                            {<div className={styles.placeholder}>filter by {property}</div>}
                        </>) : (<>
                            {<div className={styles.label}>{property}</div>}
                            <div className={styles.scroller}>
                                {
                                    checked.map((v, i) => v ? [options[i], i] satisfies [any, any] : null).filter(v => v != null).map(([{ title, color }, id]) => (
                                        <Chip color={(color ?? DEFAULT_GREY)} key={id}>
                                            {title}
                                        </Chip>
                                    ))
                                }
                            </div>
                        </>)
                }
            </div>
            <dialog
                className={styles.filter_taglike_body}
                open
                tabIndex={-1}
            >
                {
                    options.map(({ color, title }, id) => (
                        <label
                            style={css_vars({
                                text_color: (color ?? DEFAULT_GREY).contrasting_text_color().to_hex(),
                                color: (color ?? DEFAULT_GREY).to_hex(0.75),
                            })}
                            className={styles.filter_taglike_entry}
                            htmlFor={label_id + "_" + id}
                            key={id}
                        >
                            {title}
                            <input
                                id={label_id + "_" + id}
                                type="checkbox"
                                checked={checked[id]}
                                onChange={e => {
                                    const checked_ = [...checked]
                                    checked_[id] = e.currentTarget.checked
                                    set_checked(checked_)
                                }}
                            />
                        </label>
                    ))
                }
            </dialog>
        </div>
    )
}



export function NameFilter({ set_filter, schedule }: {
    set_filter: (filter: EventFilter) => void,
    schedule: Set<Group>,
}) {
    const [query, set_query] = useState("")
    const id = useId()

    useEffect(() => {
        const tid = setTimeout(() => {
            const norm = (s: string) => s.toLowerCase().replaceAll(/\W+/g, " ").trim()
            const query_norm = norm(query)
            if (query_norm === "") {
                set_filter(_ => true)
            } else {
                set_filter(event => (
                    (norm(event.name).includes(query_norm))
                    || ([...event.location, ...event.tags, ...event.host]).some(e => norm(e.title).includes(query_norm))
                    || norm(event.description).includes(query_norm)
                ))
            }
        }, 50)
        return () => clearTimeout(tid)

    }, [set_filter, query, schedule])

    return (<label className={styles.filter_searchbar} htmlFor={id}>
        <span>
            search
        </span>
        <input
            value={query}
            id={id}
            onChange={useCallback((e: ChangeEvent<HTMLInputElement>) => set_query(e.currentTarget.value), [set_query])}
        />
    </label>)
}

export function Toggle({ label, value, on_change }: { label: string, value: boolean, on_change: (value: boolean) => void }) {
    const id = useId()

    return (
        <label
            className={styles.ext_toggle}
            htmlFor={id}
        >
            <span>
                {label}
            </span>
            <input
                id={id}
                type="checkbox"
                checked={value}
                onChange={e => on_change(e.currentTarget.checked)}
            />
        </label>
    )
}