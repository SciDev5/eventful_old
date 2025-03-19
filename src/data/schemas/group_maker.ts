import { Event, Label } from "@/common/ty_shared";
import { id } from "@/common/util/id";

export function make_events(): [Map<id, Event>, (event: Event) => void] {
    const events = new Map<number, Event>()
    const add_event = (e: Event) => { events.set(e.id, e) }
    return [
        events,
        add_event,
    ]
}

export function make_labels(): [Label[], (s: string) => number] {
    const labels: Label[] = []
    const labels_map = new Map<string, number>()
    const get_label = (s: string) => {
        let i = labels_map.get(s)
        if (i == null) {
            i = labels.length
            labels_map.set(s, i)
            labels.push({ title: s, color: null })
        }
        return i
    }
    return [labels, get_label]
}

export function make_group_parts() {
    const [events, add_event] = make_events()
    const [tags, get_tag] = make_labels()
    const [locations, get_location] = make_labels()
    const [hosts, get_host] = make_labels()
    return {
        events, add_event,
        tags, get_tag,
        locations, get_location,
        hosts, get_host,
    }
}