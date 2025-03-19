import { useEffect, useRef, useCallback, MouseEvent, RefObject, useState } from "react";
import styles from "./EventModal.module.css"
import { css_vars } from "@/util/css";
import { Chip } from "../chip/Chip";
import { Color } from "@/common/util/Color";
import { FavoriteId } from "./EventTimeline";
import { save_favorites } from "./EventViewer";
import { Group } from "@/common/ty_shared";
import { EventInstance } from "@/common/event_management";

export function EventModalShower({ control_ref, favorites }: { control_ref: { set_modal: (e: EventInstance) => void }, favorites: FavoriteId[] }) {
    const [show_modal, set_show_modal] = useState<EventInstance | null>(null)
    const dismiss_modal = useCallback(() => {
        console.log("DISMISSING");

        set_show_modal(null)
    }, [set_show_modal])

    control_ref.set_modal = set_show_modal

    return (<>
        {show_modal && <EventModal event={show_modal} dismiss={dismiss_modal} favorites={favorites} />}
    </>)
}

export function EventModal({ event, dismiss, favorites }: { event: EventInstance, dismiss: () => void, favorites: FavoriteId[] }) {
    const ref = useRef<HTMLDialogElement>(null)

    const [, _set_updator] = useState(0)
    const force_update = useCallback(() => _set_updator(Math.random()), [])

    useEffect(() => {
        ref.current!.showModal()
    }, [])

    const dismiss_on_click = useCallback((e: MouseEvent) => { if (e.target === e.currentTarget) dismiss() }, [dismiss])

    const DEFAULT_GREY = Color.from_hex("#77f")!
    const color = event.host.map(v => v.color).find(v => v != null) ?? event.tags.map(v => v.color).find(v => v != null) ?? DEFAULT_GREY

    return (
        <>
            <dialog
                ref={ref}
                className={styles.event_modal}
                onClick={dismiss_on_click}
                onClose={dismiss}
                tabIndex={-1}
            >
                <div style={css_vars({ color: color.to_hex(0.2), color_light: color.to_hex(.1) })}>
                    {/* <button onClick={() => {
                        const id = event.name
                        const i_id = favorites.indexOf(id)
                        if (i_id != -1) {
                            favorites.splice(i_id, 1)
                        } else {
                            favorites.push(id)
                        }
                        save_favorites(schedule.id, favorites)
                        force_update()
                    }} className={`${styles.favorite} ${favorites.includes(event.name) ? styles.favorited : styles.unfavorited}`}></button> */}
                    <div className={styles.event_time}>
                        <span>{event.time.start.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}</span>
                        <span className={styles.line} />
                        <span>{event.time.end.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}</span>
                    </div>

                    <div className={styles.event_name}>
                        {event.name}
                    </div>

                    <div className={styles.event_description + " " + styles.hide_no_hov}>
                        {event.description}
                    </div>


                    <div className={styles.event_host}>{event.host.map(host => (<span style={css_vars({ host_color: (host.color ?? DEFAULT_GREY).to_hex() })} key={host.title}>{host.title}</span>))}</div>

                    {/* {event.group != null && <div className={styles.event_group}>{schedule.groups[event.group].name}</div>} */}

                    <div className={styles.event_location}>{event.location.map(v => v.title).join(", ")}</div>

                    <div className={styles.event_tags}>
                        {event.tags.map(tag => (<Chip color={tag.color ?? DEFAULT_GREY} key={tag.title}>{tag.title}</Chip>))}
                    </div>
                </div>

            </dialog>
        </>
    )
}