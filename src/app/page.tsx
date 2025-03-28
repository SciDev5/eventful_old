"use client"

import styles from "./page.module.css";
import { Suspense, useEffect, useMemo, useState } from "react";
import { EventViewer, EventViewerDataMissing } from "@/components/events/EventViewer";
import { useSearchParams } from "next/navigation";
import { CalendarDays } from "@/components/events/Calendar";
import { Event, Group, Timerange } from "@/common/ty_shared";
import { make_group_parts } from "@/server/data/schemas/group_maker";
import { Color } from "@/common/util/Color";
import { useSettings } from "@/components/settings/settings";
import { date_to_day, day_weekday } from "@/common/util/datetime";
import { EventSelection } from "@/components/events/EventSelection";
import { id } from "@/common/util/id";
import { GroupsRefresh, LoginButton, ProfileSelector, useGroups, UserDataProvider } from "@/components/user/userdata";
import { OwnedGroups } from "@/components/user/usergroups";
import { AnyCalendar } from "@/components/events/AnyCalendar";

export default function Home() {
    const [en, set_en] = useState(true)

    return (
        <Suspense fallback={<HomeFallback />}>
            <UserDataProvider>
                <LoginButton />
                <ProfileSelector />
                <GroupsRefresh />
                <input type="checkbox" checked={en} onChange={e => set_en(e.currentTarget.checked)} />
                {en && <OwnedGroups />}
                <TEST />
                {/*<HomeLoaded />*/}
            </UserDataProvider>
        </Suspense>
    );
}

function TEST() {
    const [live, set_live] = useState(() => false)
    const groups_map = useGroups()
    const groups = useMemo(() => new Set(groups_map.values()), [groups_map])

    const { zero_weekday } = useSettings()
    const d = date_to_day(new Date())

    useEffect(() => {
        set_live(true)
    }, [])
    if (live && groups != null) {
        return (<CalendarDays start={d - day_weekday(d) + zero_weekday} n={7} sel={new EventSelection(groups, () => true, new Timerange(new Date("2022-01-16"), new Date("2028-01-19")))} />)
        // return (<AnyCalendar groups={groups} />)
    } else {

    }
}

// function HomeLoaded() {
//     const params = useSearchParams()
//     const event_id = params.get("event") ?? "rex" // event info source, current major event is rex so default to that
//     const is_embed = params.get("is_embed") != null

//     const group = useAwait(
//         useMemo(async () => (await getdata_by_id(event_id)) ?? "failed", [event_id])
//     )


//     return (
//         <main className={styles.main + (is_embed ? " " + styles.is_embed : "")}>
//             {is_embed ? null : <h2 style={{ padding: "0.6em 1.0em", color: "#aaf9", textWrap: "nowrap" }}>:: EVENTFUL timeline :: [{(group !== "failed" ? group : null)?.name}]</h2>}
//             <div style={{ position: "absolute", left: 0, right: 0, top: is_embed ? 0 : "3em", bottom: 0 }}>
//                 {
//                     group != null && group != "failed"
//                         ? <EventViewer groups={new Set([group])} />
//                         : <EventViewerDataMissing failed={group === "failed" ? event_id : false} />
//                 }
//             </div>
//         </main >
//     );
// }
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
