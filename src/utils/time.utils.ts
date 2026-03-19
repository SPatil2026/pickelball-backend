export const RESCHEDULE_WINDOW_HOURS = 12;

export const formatTimeToUTC = (date: Date): string => {
    return date.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZone: 'UTC'
    });
};

export const combineDateAndTime = (date: string | Date, timeStr: string): Date => {
    const d = new Date(date);
    d.setUTCHours(0, 0, 0, 0);

    const [hour, min, sec] = timeStr.split(':').map(Number);
    const combined = new Date(d);
    combined.setUTCHours(hour, min, sec, 0);
    return combined;
};

export const generateTimeIntervals = (openingTime: Date, closingTime: Date) => {
    const intervals: { start_time: string; end_time: string }[] = [];

    // Create new Date objects to avoid mutating the originals
    const current = new Date(openingTime);
    const end = new Date(closingTime);

    // Ensure they are on the same day for comparison logic
    // We just care about the time portion for generating intervals 
    // If closing time is past midnight, it would ideally be handled, but for standard operations we assume same day.

    while (current < end) {
        const startStr = formatTimeToUTC(current);

        // Add 1 hour safely using milliseconds
        current.setTime(current.getTime() + 60 * 60 * 1000);

        // Don't add intervals that go past closing time
        if (current <= end) {
            const endStr = formatTimeToUTC(current);
            intervals.push({
                start_time: startStr,
                end_time: endStr
            });
        }
    }

    return intervals;
};
