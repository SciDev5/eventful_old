import { int, ms_uint, uint } from "../ty_shared"

export const MILLISECONDS_PER_HOUR = 1000 * 60 * 60
export const MILLISECONDS_PER_DAY = MILLISECONDS_PER_HOUR * 24

export function month_length(year: number, month: number): number {
    return (Date.UTC(year, month + 1, 1) - Date.UTC(year, month, 1)) / MILLISECONDS_PER_DAY
}
export function month_start_weekday(year: number, month: number): number {
    return new Date(Date.UTC(year, month, 1)).getUTCDay()
}

export type day_int = int
export type month_int = int
const DAY_0 = Date.UTC(0, 0, 1)
const DAY_0_LOCAL = () => new Date(0, 0, 1).getTime()
export function date_to_day(date: Date, local = true): day_int {
    return Math.floor((date.getTime() - (local ? DAY_0_LOCAL() : DAY_0)) / MILLISECONDS_PER_DAY)
}
export function date_to_day_utc(date: Date): day_int {
    return date_to_day(date, false)
}
export function day_to_date(day: day_int, local = true): Date {
    return new Date((day * MILLISECONDS_PER_DAY + (local ? DAY_0_LOCAL() : DAY_0)))
}
export function day_to_date_utc(day: day_int): Date {
    return day_to_date(day, false)
}
const DAY_0_WEEKDAY = new Date(DAY_0).getUTCDay()
export function day_weekday(day: day_int): uint {
    return (day + DAY_0_WEEKDAY) % 7
}