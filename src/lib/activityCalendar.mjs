/** Calendar labels use the viewer's local month; keys match stored YYYY-MM-DD activity dates. */
export function buildActivityCalendar(now = new Date()) {
    const year = now.getFullYear();
    const month = now.getMonth();
    const dayCount = new Date(year, month + 1, 0).getDate();
    const leadingDays = new Date(year, month, 1).getDay();
    const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
    return {
        monthLabel: now.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
        leadingDays,
        days: Array.from({ length: dayCount }, (_, index) => {
            const day = index + 1;
            return {
                day,
                key: `${prefix}-${String(day).padStart(2, '0')}`,
                label: new Date(year, month, day).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
                isToday: day === now.getDate(),
                isFuture: day > now.getDate(),
            };
        }),
    };
}
