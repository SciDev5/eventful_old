import { Group } from "@/common/ty_shared";
import { fetch_trex, trex_to_schedule } from "./schemas/t_rex";


export async function getdata_by_id(id: string): Promise<Group | null> {
    switch (id) {
        case "rex": return fetch_trex().then(trex => trex_to_schedule(id, trex))
        default: return null
    }
}