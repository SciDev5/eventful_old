import { Event, Group, Timerange } from "@/common/ty_shared";
import { Color } from "../../../common/util/Color";
import { make_group_parts } from "./group_maker";
import { id } from "@/common/util/id";

export type TRexAPIResponse = {
    /** The title of the current experience, such as "REX 2023" */
    name: string;
    /** ISO Date string of when the current JSON of events was published */
    published: string;
    events: TRexEvent[];
    dorms: string[];
    tags: string[];
    /** Maps event properties to background colors */
    colors: TRexAPIColors;
    start: string;
    end: string;
};

export type TRexAPIColors = {
    dorms: Record<string, string>;
    tags: Record<string, string>;
};

export type TRexEvent = {
    name: string;
    dorm: string[];
    /** The subcommunity or living group hosting this event, if any */
    group: string | null;
    location: string;
    start: Date;
    end: Date;
    description: string;
    tags: string[];
};

async function fetch_trex(): Promise<TRexAPIResponse> {
    return (await (await fetch("https://rex.mit.edu/api.json")).json()) as TRexAPIResponse
}

function trex_to_schedule(id: id, trex: TRexAPIResponse): Group {
    const { events, add_event, get_host, get_location, get_tag, hosts, locations, tags } = make_group_parts()


    for (const tag in trex.colors.tags) {
        tags[get_tag(tag)].color = Color.from_hex(trex.colors.tags[tag])
    }
    for (const host in trex.colors.dorms) {
        hosts[get_host(host)].color = Color.from_hex(trex.colors.dorms[host])
    }
    trex.events.map((v, id) => {
        return {
            id,
            name: v.name,
            description: v.description,
            host: v.dorm.map(get_host),
            location: [get_location(v.location)],
            tags: v.tags.map(get_tag),
            overrides: [],
            time: {
                Once: { at: new Timerange(new Date(v.start), new Date(v.end)) }
            },
        } satisfies Event
    }).forEach(add_event)

    return {
        id,
        name: trex.name,
        events,
        hosts,
        locations,
        tags,
    }
}

export async function fetch_convert_trex(id: id) {
    return fetch_trex().then(trex => trex_to_schedule(id, trex))
}