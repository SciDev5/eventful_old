import { hash } from "bcrypt"
import { UserAccount } from "../ty_server"
import { id } from "@/common/util/id"
import { Group } from "@/common/ty_shared"

// todo real db
const MEMORY_DB = {}



export async function get_user_by_handle(handle: string): Promise<UserAccount | null> {
    // throw new Error("not implemented")
    return { id: 1234, name: "helloworld" } as never
    // return { id: 1234, passhash: await hash("world", 3) } as never
}
