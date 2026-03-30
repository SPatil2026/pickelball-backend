export const RESCHEDULE_WINDOW_HOURS = 12;
export const CANCEL_WINDOW_HOURS = 12;

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

export const generateTimeIntervals = (openingTime: Date, closingTime: Date, targetDate: Date) => {
    const intervals: { start_time: string; end_time: string }[] = [];

    const current = new Date(openingTime);
    const end = new Date(closingTime);

    const now = new Date();

    const isToday = targetDate.toLocaleDateString() === now.toLocaleDateString();

    // get curernt time to match the intervals format(HH:MM:SS)
    const currentLocalTimeStr = now.getHours().toString().padStart(2, '0') + ":" +
        now.getMinutes().toString().padStart(2, '0') + ":" +
        now.getSeconds().toString().padStart(2, '0');

    while (current < end) {
        const startStr = formatTimeToUTC(current);

        current.setTime(current.getTime() + 60 * 60 * 1000);

        if (isToday && startStr < currentLocalTimeStr) {
            current.setTime(current.getTime());
            continue;
        }

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
