import { date, Ty, raw, str, obj } from "@/common/type";
import { id } from "@/common/util/id";

export interface UserAccount {
    id: id,
    created: Date,
    // auth
    handle: str,
    passhash: str | null,
    kerb: str | null,
    // service
    name: str,
    groups: {
        self: id,
        joined: id[],
    },
}
export const UserAccount: Ty<UserAccount> = raw({
    id,
    created: date,
    // auth
    handle: str,
    passhash: str.nullable(),
    kerb: str.nullable(),
    // service
    name: str,
    groups: obj({
        self: id,
        joined: id.array()
    }),
})
