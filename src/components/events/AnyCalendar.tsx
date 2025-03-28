import { Group } from "@/common/ty_shared";
import { EventViewer } from "./EventViewer";

export function AnyCalendar({ groups }: { groups: Set<Group> }) {
    // const { zero_weekday } = useSettings()
    // const d = date_to_day(new Date())
    return (
        // <CalendarMonth start={2024 * 12 + 9} />
        // <CalendarDays start={d - day_weekday(d) + zero_weekday} n={7} sel={new EventSelection(groups, () => true, new Timerange(new Date("2022-01-16"), new Date("2028-01-19")))} />
        <EventViewer groups={groups} />
        // <CalendarDays start={date_to_day(new Date("2025-01-16"))} n={7} sel={new EventSelection(groups, () => true, new Timerange(new Date("2025-01-16"), new Date("2025-01-19")))} />
    )
}