"use client"

import { useSearchParams } from "next/navigation";
import styles from "../page.module.css";
import { id } from "@/common/util/id";
import { useAwaited } from "@/util/use";
import { Suspense, useCallback, useMemo } from "react";
import { action_get_group } from "@/server/data/actions_c";
import { Group } from "@/common/ty_shared";
import { UserDataProvider } from "@/components/user/userdata";
import { EventViewer, EventViewerDataMissing } from "@/components/events/EventViewer";

export default function Home() {
    const params = useSearchParams()

    const group_id = id.try_from(parseInt(params.get("group") ?? ""))
    const group = useAwaited(useCallback(async () => (group_id !== null ? await action_get_group(group_id) : null) ?? false, [group_id]))
    const groups = useMemo(() => group ? new Set([group]) : new Set<Group>(), [group])

    const is_embed = params.get("is_embed") != null

    return (
        <Suspense fallback={<HomeFallback />}>
            <UserDataProvider>
                {group === null ? (<EventViewerDataMissing failed={false} />) : group === false ? (
                    <EventViewerDataMissing failed={params.get("group") ?? "<no id provided>"} />
                ) : (

                    <main className={styles.main + (is_embed ? " " + styles.is_embed : "")}>
                        {is_embed ? null : <h2 style={{ padding: "0.6em 1.0em", color: "#aaf9", textWrap: "nowrap" }}>:: EVENTFUL timeline :: [{group.name}]</h2>}
                        <div style={{ position: "absolute", left: 0, right: 0, top: is_embed ? 0 : "3em", bottom: 0 }}>
                            <EventViewer groups={groups} />
                        </div>
                    </main >
                )}

            </UserDataProvider>
        </Suspense>
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
