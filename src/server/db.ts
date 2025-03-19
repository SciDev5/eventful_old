import { hash } from "bcrypt"
import { UserAccount } from "./ty_server"

// todo real db
const MEMORY_DB = {}



export async function get_user_by_handle(handle: string): Promise<UserAccount | null> {
    // throw new Error("not implemented")
    return { id: 1234, passhash: await hash("world", 3) } as never
}

