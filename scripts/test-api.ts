// Comprehensive E2E Test Suite
const BASE_URL = 'http://localhost:8000';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

function getCookie(headers: Headers) {
    const cookies = (headers as any).getSetCookie ? (headers as any).getSetCookie() : [headers.get('set-cookie')];
    for (const c of cookies) {
        if (c && c.includes('auth_token=s%3A')) return c.split(';')[0];
    }
    return null;
}

async function test() {
    console.log(`${YELLOW}🚀 Starting COMPREHENSIVE API E2E Tests...${RESET}\n`);

    try {
        const timestamp = Date.now();
        const bookerEmail = `booker_${timestamp}@test.com`;
        const ownerEmail = `owner_${timestamp}@test.com`;

        // 1. AUTH & RBAC
        console.log(`${YELLOW}🔐 1. Testing Auth & RBAC...${RESET}`);
        await fetch(`${BASE_URL}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: "Booker", email: bookerEmail, password: "password", role: "BOOKER" })
        });
        await fetch(`${BASE_URL}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: "Owner", email: ownerEmail, password: "password", role: "OWNER" })
        });

        const bookerLogin = await fetch(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: bookerEmail, password: "password" })
        });
        const bookerCookie = getCookie(bookerLogin.headers)!;

        const ownerLogin = await fetch(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: ownerEmail, password: "password" })
        });
        const ownerCookie = getCookie(ownerLogin.headers)!;

        // RBAC CHECK: Booker hitting owner route
        const rbacFail = await fetch(`${BASE_URL}/api/owner/create-venue`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Cookie': bookerCookie },
            body: JSON.stringify({ name: "Illegal Venue" })
        });
        if (rbacFail.status === 401) console.log(`  ${GREEN}✓ RBAC: Booker blocked from Owner route (401)${RESET}`);
        else console.error(`  ${RED}✗ RBAC: Booker NOT blocked from Owner route (${rbacFail.status})${RESET}`);

        // 2. VENUE & PRICING
        console.log(`\n${YELLOW}🏗️ 2. Testing Venue & Pricing...${RESET}`);
        const venueResp = await fetch(`${BASE_URL}/api/owner/create-venue`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Cookie': ownerCookie },
            body: JSON.stringify({
                name: "Smash Arena", address: "123 Padel St", contact_number: "1234567890", email: ownerEmail,
                opening_time: "2026-01-01T08:00:00.000Z", closing_time: "2026-01-01T22:00:00.000Z"
            })
        });
        const venueId = (await venueResp.json()).venue?.venue_id;

        const courtResp = await fetch(`${BASE_URL}/api/owner/create-court`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Cookie': ownerCookie },
            body: JSON.stringify({ venue_id: venueId, court_number: 1 })
        });
        const courtId = (await courtResp.json()).court?.court_id;

        await fetch(`${BASE_URL}/api/owner/venue/${venueId}/pricing`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Cookie': ownerCookie },
            body: JSON.stringify({ pricing: [{ day_type: "WEEKDAY", price_per_hour: 500 }, { day_type: "WEEKEND", price_per_hour: 700 }] })
        });
        console.log(`  ${GREEN}✓ Venue, Court, and Pricing set up${RESET}`);

        // 3. CONCURRENCY CHECKOUT (MOST IMPORTANT)
        console.log(`\n${YELLOW}💳 3. Testing Checkout Concurrency...${RESET}`);
        
        // Setup User B
        const userBEmail = `userB_${timestamp}@test.com`;
        await fetch(`${BASE_URL}/api/auth/register`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: "UserB", email: userBEmail, password: "password", role: "BOOKER" })
        });
        const userBLogin = await fetch(`${BASE_URL}/api/auth/login`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: userBEmail, password: "password" })
        });
        const userBCookie = getCookie(userBLogin.headers)!;

        // Fetch a slot
        const slots = await (await fetch(`${BASE_URL}/api/booker/venues/${venueId}/slots?date=2026-03-25`, { headers: { 'Cookie': bookerCookie } })).json() as any[];
        const slot = slots[5]; // Pick a middle slot
        const slotPayload = { court_id: courtId, date: "2026-03-25", start_time: slot.start_time, end_time: slot.end_time };

        // Both add to cart
        await fetch(`${BASE_URL}/api/booker/cart`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Cookie': bookerCookie }, body: JSON.stringify(slotPayload) });
        await fetch(`${BASE_URL}/api/booker/cart`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Cookie': userBCookie }, body: JSON.stringify(slotPayload) });

        console.log(`  Simulating two users checking out SAME slot at SAME time...`);
        const results = await Promise.all([
            fetch(`${BASE_URL}/api/booker/cart/checkout`, { method: 'POST', headers: { 'Cookie': bookerCookie } }),
            fetch(`${BASE_URL}/api/booker/cart/checkout`, { method: 'POST', headers: { 'Cookie': userBCookie } })
        ]);

        const codes = results.map(r => r.status);
        if (codes.includes(200) && codes.includes(409)) {
            console.log(`  ${GREEN}✓ CONCURRENCY SUCCESS: One user succeeded (200), one failed (409 conflict)${RESET}`);
        } else {
            console.error(`  ${RED}✗ CONCURRENCY FAILED: Status codes were ${codes.join(', ')}${RESET}`);
        }

        // 4. RESCHEDULING & 12H RULE
        console.log(`\n${YELLOW}🔄 4. Testing Rescheduling...${RESET}`);
        
        // Edge Case: 12h rule
        console.log(`  Testing 12h rule (booking 2 hours from now)...`);
        const twoHoursFromNow = new Date(Date.now() + 2 * 60 * 60 * 1000);
        const nearSlot = {
            court_id: courtId,
            date: twoHoursFromNow.toISOString().split('T')[0],
            start_time: twoHoursFromNow.toISOString().split('T')[1].split('.')[0],
            end_time: new Date(twoHoursFromNow.getTime() + 60 * 60 * 1000).toISOString().split('T')[1].split('.')[0]
        };
        
        await fetch(`${BASE_URL}/api/booker/cart`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Cookie': bookerCookie }, body: JSON.stringify(nearSlot) });
        await fetch(`${BASE_URL}/api/booker/cart/checkout`, { method: 'POST', headers: { 'Cookie': bookerCookie } });
        
        const allBookings = await (await fetch(`${BASE_URL}/api/booker/bookings`, { headers: { 'Cookie': bookerCookie } })).json();
        const nearBooking = allBookings.find((b: any) => b.start_time.includes(nearSlot.start_time));
        
        const failResch = await fetch(`${BASE_URL}/api/booker/bookings/${nearBooking.booking_id}/reschedule`, {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'Cookie': bookerCookie },
            body: JSON.stringify({ new_date: "2026-04-10", new_start_time: "10:00:00", new_end_time: "11:00:00" })
        });
        
        if (failResch.status === 409) console.log(`  ${GREEN}✓ 12h Rule: Blocked (409) as expected${RESET}`);
        else {
            console.error(`  ${RED}✗ 12h Rule: FAILED (${failResch.status})${RESET}`);
            console.error(`  Response: ${await failResch.text()}`);
        }

        // Happy Path: Reschedule a future booking (already tested in previous loop, but consolidating here)
        const bookings = await (await fetch(`${BASE_URL}/api/booker/bookings`, { headers: { 'Cookie': userBCookie } })).json() as any[];
        if (bookings.length > 0) {
            const bBookingId = bookings[0].booking_id;
            const resch = await fetch(`${BASE_URL}/api/booker/bookings/${bBookingId}/reschedule`, {
                method: 'POST', headers: { 'Content-Type': 'application/json', 'Cookie': userBCookie },
                body: JSON.stringify({ new_date: "2026-04-15", new_start_time: "12:00:00", new_end_time: "13:00:00" })
            });
            if (resch.status === 200) console.log(`  ${GREEN}✓ Future Reschedule: Success${RESET}`);
        }

        console.log(`\n${GREEN}🏁 Verification completed!${RESET}`);
        process.exit(0);
    } catch (error) {
        console.error(`\n${RED}🛑 Test Error:${RESET}`, error);
        process.exit(1);
    }
}

test();
