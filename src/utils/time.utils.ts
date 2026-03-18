export const generateTimeIntervals = (openingTime: Date, closingTime: Date) => {
    const intervals: { start_time: string; end_time: string }[] = [];

    // Create new Date objects to avoid mutating the originals
    const current = new Date(openingTime);
    const end = new Date(closingTime);

    // Ensure they are on the same day for comparison logic
    // We just care about the time portion for generating intervals 
    // If closing time is past midnight, it would ideally be handled, but for standard operations we assume same day.

    const timeOptions: Intl.DateTimeFormatOptions = {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZone: 'UTC'
    };

    while (current < end) {
        const startStr = current.toLocaleTimeString('en-US', timeOptions);

        // Add 1 hour safely using milliseconds
        current.setTime(current.getTime() + 60 * 60 * 1000);

        // Don't add intervals that go past closing time
        if (current <= end) {
            const endStr = current.toLocaleTimeString('en-US', timeOptions);
            intervals.push({
                start_time: startStr,
                end_time: endStr
            });
        }
    }

    return intervals;
};
