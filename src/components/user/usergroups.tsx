import { GroupDefinition } from "@/common/ty_shared";
import { str } from "@/common/type";
import { id } from "@/common/util/id";
import { action_get_groupdef, action_sess_get_groups_owned, action_set_groupdef_name, action_set_groupdef_remote } from "@/server/data/actions_c";
import { useAwaited, useRemoteState, useUpdate } from "@/util/use";
import { startTransition, useCallback, useMemo, useOptimistic, useState, useSyncExternalStore } from "react";

export function OwnedGroups() {
    const owned_groups_raw = useAwaited(useCallback(() => action_sess_get_groups_owned(), []))
    const owned_groups = useMemo(() => id.array().nullable().try_from(owned_groups_raw), [owned_groups_raw])

    return (<div>
        {
            owned_groups?.map(group_id => (
                <OwnedGroup {...{ group_id }} key={group_id} />
            ))
        }
    </div>)
}

function OwnedGroup({ group_id }: { group_id: id }) {
    const [updated, do_update] = useUpdate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const group = useAwaited(useCallback(() => action_get_groupdef(group_id), [group_id, updated]))


    return (group !== null ? (
        <div>
            group
            <EditStrField group_id={group_id} initial={group.name} action_set={action_set_groupdef_name} />
            {group.remote !== null ? (
                <EditStrField group_id={group_id} initial={group.remote} action_set={action_set_groupdef_remote} />
            ) : (
                <>no remote</>
            )}
        </div>
    ) : (
        <div>group [0x{group_id.toString(16)}]</div>
    ))
}

function EditStrField({ group_id, initial, action_set }: { group_id: id, initial: str, action_set: (group_id: id, v: str) => Promise<str | null> }) {
    const [remote, set_remote, pending] = useRemoteState(initial, useCallback(v => action_set(group_id, v), [group_id, action_set]))

    return (<>
        <input value={remote} onChange={async e => set_remote(e.currentTarget.value)} />
        {pending ? "..." : ""}
    </>)
}