import { NextRequest } from "next/server";

export async function GET(req: NextRequest): Promise<Response> {

    console.log("it works");

    const res = new Response("", {})

    return new Response("the")
}