const USER_UUID_KEY_TRACKER = 'user-unique-id';

async function trackEvent(eventType, eventDetails = '') {
    const uuid = localStorage.getItem(USER_UUID_KEY_TRACKER);
    if (!uuid) {
        return;
    }
    try {
        await fetch('api/track-event.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                uuid,
                eventType,
                eventDetails
            }),
        });
    } catch (error) {}
}

export {
    trackEvent
};