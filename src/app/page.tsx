"use client"

import styles from "./page.module.css";
import { useAwait } from "@/util/use";
import { Suspense, useEffect, useMemo, useState } from "react";
import { EventViewer, EventViewerDataMissing } from "@/components/events/EventViewer";
import { useSearchParams } from "next/navigation";
import { CalendarDays } from "@/components/events/Calendar";
import { Event, Group, GroupId, Timerange, User } from "@/common/ty_shared";
import { make_group_parts } from "@/data/schemas/group_maker";
import { Color } from "@/common/util/color";
import { useSettings } from "@/components/settings/settings";
import { date_to_day } from "@/common/util/datetime";
import { EventSelection } from "@/components/events/EventSelection";
import { getdata_by_id } from "@/data/fetcher";


const data_user: User = {
    name: "the_user_lol",
    self_group_id: 0x9000beef,
    groups: new Map([

    ]),
}
const OFF = 60
const data_groups = new Map<GroupId, Group>([
    [0x9000beef, {
        id: 0,

        name: "hello",
        owner: 8008135,

        events: new Map([
            [0, {
                id: 0,

                name: "thevent",
                description: "wao description",

                host: [],
                location: [],
                tags: [],

                time: { SimpleRepeat: { at: [new Timerange(new Date(Date.now() - 1000 * 60 * 60 * 24 * OFF), new Date(Date.now() + 1000 * 60 * 60 * 2 - 1000 * 60 * 60 * 24 * OFF))], n_repeats: 600, stride: 1000 * 60 * 60 * 24 } },
                // time: { Once: { at: new Timerange(new Date(Date.now()), new Date(Date.now() + 1000 * 60 * 60 * 2)) } },
                overrides: [],
            }],
            [1, {
                id: 1,

                name: "djkjk",
                description: "wao description",

                host: [],
                location: [],
                tags: [],

                time: { SimpleRepeat: { at: [new Timerange(new Date(Date.now()), new Date(Date.now() + 1000 * 60 * 60 * 24 * 2))], n_repeats: 10, stride: 7 * 1000 * 60 * 60 * 24 } },
                // time: { Once: { at: new Timerange(new Date(Date.now()), new Date(Date.now() + 1000 * 60 * 60 * 2)) } },
                overrides: [],
            }],
        ]),

        hosts: [],
        locations: [],
        tags: [],
    }]
])

export default function Home() {
    return (
        <Suspense fallback={<HomeFallback />}>
            <TEST />
            {/*<HomeLoaded />*/}
        </Suspense>
    );
}

function TEST() {
    const [live, set_live] = useState(() => false)
    const groups = useMemo(() => new Set([...data_groups.values()]), [])

    useEffect(() => {
        set_live(true)
    }, [])
    if (live && groups != null) {
        return (<TESTCAL groups={groups} />)
    } else {

    }
}

export function TESTCAL({ groups }: { groups: Set<Group> }) {
    const { zero_weekday } = useSettings()
    const d = date_to_day(new Date())
    return (
        // <CalendarMonth start={2024 * 12 + 9} />
        // <CalendarDays start={d - day_weekday(d) + zero_weekday} n={7} groups={groups} />
        <CalendarDays start={date_to_day(new Date("2025-01-16"))} n={7} sel={new EventSelection(groups, () => true, new Timerange(new Date("2025-01-16"), new Date("2025-01-19")))} />
    )
}

function HomeLoaded() {
    const params = useSearchParams()
    const event_id = params.get("event") ?? "rex" // event info source, current major event is rex so default to that
    const is_embed = params.get("is_embed") != null

    const group = useAwait(
        useMemo(async () => (await getdata_by_id(event_id)) ?? "failed", [event_id])
    )


    return (
        <main className={styles.main + (is_embed ? " " + styles.is_embed : "")}>
            {is_embed ? null : <h2 style={{ padding: "0.6em 1.0em", color: "#aaf9", textWrap: "nowrap" }}>:: EVENTFUL timeline :: [{(group !== "failed" ? group : null)?.name}]</h2>}
            <div style={{ position: "absolute", left: 0, right: 0, top: is_embed ? 0 : "3em", bottom: 0 }}>
                {
                    group != null && group != "failed"
                        ? <EventViewer groups={new Set([group])} />
                        : <EventViewerDataMissing failed={group === "failed" ? event_id : false} />
                }
            </div>
        </main >
    );
}
function HomeFallback() {
    return (
        <main className={styles.main}>
            {<h2 style={{ padding: "0.6em 1.0em", color: "#aaf9", textWrap: "nowrap" }}>:: EVENTFUL timeline ::</h2>}
            <div style={{ position: "absolute", left: 0, right: 0, top: "3em", bottom: 0 }}>
                <EventViewerDataMissing failed={false} />
            </div>
        </main >
    );
}
