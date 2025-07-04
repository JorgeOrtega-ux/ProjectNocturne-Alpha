// /assets/js/tools/menu-interactions.js

"use strict";
import { use24HourFormat, deactivateModule, PREMIUM_FEATURES } from '../general/main.js';
import { getTranslation } from '../general/translations-controller.js';
import { addTimerAndRender, updateTimer, getTimersCount, getTimerLimit } from './timer-controller.js';
import { showDynamicIslandNotification } from '../general/dynamic-island-controller.js';
import { playSound, stopSound, generateSoundList, handleAudioUpload, deleteUserAudio } from './general-tools.js';

const initialState = {
    alarm: { hour: 0, minute: 0, sound: 'classic_beep' },
    timer: {
        currentTab: 'countdown',
        duration: { hours: 0, minutes: 5, seconds: 0 },
        countTo: { date: new Date(), selectedDate: null, selectedHour: null, selectedMinute: null, timeSelectionStep: 'hour', sound: 'classic_beep' },
        endAction: 'stop',
        sound: 'classic_beep'
    },
    worldClock: { country: '', timezone: '', countryCode: '', isEditing: false, editingId: null }
};

const state = JSON.parse(JSON.stringify(initialState));
state.timer.countTo.date = new Date();

const dropdownMap = {
    'toggleAlarmSoundDropdown': '.menu-alarm-sound',
    'toggleTimerEndActionDropdown': '.menu-timer-end-action',
    'toggleCountdownSoundDropdown': '.menu-countdown-sound',
    'toggleCountToDateSoundDropdown': '.menu-count-to-date-sound',
    'toggleCalendarDropdown': '.calendar-container',
    'toggleTimerHourDropdown': '.menu-timer-hour-selection',
    'toggleCountryDropdown': '.menu-worldclock-country',
    'toggleTimezoneDropdown': '.menu-worldclock-timezone',
    'toggleTimerTypeDropdown': '.menu-timer-type'
};

const menuTimeouts = {};
let areGlobalListenersInitialized = false;

function initMenuInteractions() {
    if (areGlobalListenersInitialized) return;
    setupGlobalEventListeners();
    areGlobalListenersInitialized = true;
}

const getMenuElement = (menuName) => {
    const menuSelectorMap = {
        'menuAlarm': '.menu-alarm[data-menu="Alarm"]',
        'menuTimer': '.menu-timer[data-menu="Timer"]',
        'menuWorldClock': '.menu-worldClock[data-menu="WorldClock"]'
    };
    return document.querySelector(menuSelectorMap[menuName]);
};

// --- SPINNER HELPER FUNCTIONS ---
function addSpinnerToCreateButton(button) {
    button.classList.add('disabled-interactive');
    const originalTextSpan = button.querySelector('span');
    if (originalTextSpan) {
        button.setAttribute('data-original-text', originalTextSpan.textContent);
        originalTextSpan.style.display = 'none';
    }

    const loader = document.createElement('span');
    loader.className = 'material-symbols-rounded spinning';
    loader.textContent = 'progress_activity';
    button.appendChild(loader);
}

function removeSpinnerFromCreateButton(button) {
    button.classList.remove('disabled-interactive');
    const originalText = button.getAttribute('data-original-text');
    const textSpan = button.querySelector('span[data-translate]');

    const loader = button.querySelector('.spinning');
    if (loader) {
        loader.remove();
    }

    if (textSpan) {
        textSpan.textContent = originalText;
        textSpan.style.display = 'inline';
        button.removeAttribute('data-original-text');
    }
}

const setAlarmDefaults = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 10);
    state.alarm.hour = now.getHours();
    state.alarm.minute = now.getMinutes();
};

const resetAlarmMenu = (menuElement) => {
    setAlarmDefaults();
    state.alarm.sound = 'classic_beep';

    const titleInput = menuElement.querySelector('#alarm-title');
    if (titleInput) {
        titleInput.value = '';
        titleInput.removeAttribute('disabled');
        titleInput.parentElement.classList.remove('disabled-interactive');
    }

    const searchInput = menuElement.querySelector('.search-content-text input');
    if (searchInput) searchInput.value = '';

    updateAlarmDisplay(menuElement);
    resetDropdownDisplay(menuElement, '#alarm-selected-sound', 'classic_beep', 'sounds');

    // Regenerate sound list with default active sound
    const soundListContainer = menuElement.querySelector('.menu-alarm-sound .menu-list');
    generateSoundList(soundListContainer, 'selectAlarmSound', state.alarm.sound);

    const createButton = menuElement.querySelector('.create-tool');
    if (createButton) {
        if (createButton.classList.contains('disabled-interactive')) {
            removeSpinnerFromCreateButton(createButton);
        }
        createButton.dataset.action = 'createAlarm';
        const buttonText = createButton.querySelector('span');
        if (buttonText) {
            buttonText.setAttribute('data-translate', 'create_alarm');
            buttonText.setAttribute('data-translate-category', 'alarms');
            buttonText.textContent = getTranslation('create_alarm', 'alarms');
        }
    }

    menuElement.removeAttribute('data-editing-id');

    const menuId = menuElement.dataset.menu;
    if (menuTimeouts[menuId]) {
        clearTimeout(menuTimeouts[menuId]);
        delete menuTimeouts[menuId];
    }
};

const resetTimerMenu = (menuElement) => {
    state.timer = JSON.parse(JSON.stringify(initialState.timer));
    state.timer.countTo.date = new Date();
    const countdownTitle = menuElement.querySelector('#timer-title');
    if (countdownTitle) {
        countdownTitle.value = '';
        countdownTitle.removeAttribute('disabled');
        countdownTitle.parentElement.classList.remove('disabled-interactive');
    }
    const countToTitle = menuElement.querySelector('#countto-title');
    if (countToTitle) {
        countToTitle.value = '';
        countToTitle.removeAttribute('disabled');
        countToTitle.parentElement.classList.remove('disabled-interactive');
    }
    updateTimerTabView(menuElement);
    updateTimerDurationDisplay(menuElement);
    renderCalendar(menuElement);
    updateDisplay('#selected-date-display', '-- / -- / ----', menuElement);
    updateDisplay('#selected-hour-display', '--', menuElement);
    updateDisplay('#selected-minute-display', '--', menuElement);
    resetDropdownDisplay(menuElement, '#timer-selected-end-action', 'stop_timer', 'timer');
    resetDropdownDisplay(menuElement, '#countdown-selected-sound', 'classic_beep', 'sounds');
    resetDropdownDisplay(menuElement, '#count-to-date-selected-sound', 'classic_beep', 'sounds');

    const countdownSoundList = menuElement.querySelector('.menu-countdown-sound .menu-list');
    generateSoundList(countdownSoundList, 'selectCountdownSound', state.timer.sound);

    const countToDateSoundList = menuElement.querySelector('.menu-count-to-date-sound .menu-list');
    generateSoundList(countToDateSoundList, 'selectCountToDateSound', state.timer.countTo.sound);


    const createButton = menuElement.querySelector('.create-tool');
    if (createButton) {
        if (createButton.classList.contains('disabled-interactive')) {
            removeSpinnerFromCreateButton(createButton);
        }
        createButton.dataset.action = 'createTimer';
        const buttonText = createButton.querySelector('span');
        if (buttonText) {
            buttonText.setAttribute('data-translate', 'create_timer');
            buttonText.setAttribute('data-translate-category', 'timer');
            buttonText.textContent = getTranslation('create_timer', 'timer');
        }
    }
    menuElement.removeAttribute('data-editing-id');
};

const resetWorldClockMenu = (menuElement) => {
    const menuId = menuElement.dataset.menu;
    if (menuTimeouts[menuId]) {
        clearTimeout(menuTimeouts[menuId]);
        delete menuTimeouts[menuId];
    }

    state.worldClock = JSON.parse(JSON.stringify(initialState.worldClock));
    const titleInput = menuElement.querySelector('#worldclock-title');
    if (titleInput) titleInput.value = '';

    const countrySearchInput = menuElement.querySelector('#country-search-input');
    if (countrySearchInput) countrySearchInput.value = '';

    const countryList = menuElement.querySelector('.menu-worldclock-country .menu-list');
    if (countryList) {
        const allCountries = countryList.querySelectorAll('.menu-link');
        allCountries.forEach(country => country.style.display = 'flex');
        const noResultsMsg = countryList.querySelector('.no-results-message');
        if (noResultsMsg) noResultsMsg.remove();
    }

    resetDropdownDisplay(menuElement, '#worldclock-selected-country', 'select_a_country', 'world_clock');
    resetDropdownDisplay(menuElement, '#worldclock-selected-timezone', 'select_a_timezone', 'world_clock');

    const timezoneSelector = menuElement.querySelector('[data-action="toggleTimezoneDropdown"]');
    if (timezoneSelector) {
        timezoneSelector.classList.add('disabled-interactive');
    }

    const createButton = menuElement.querySelector('.create-tool');
    if (createButton) {
        if (createButton.classList.contains('disabled-interactive')) {
            removeSpinnerFromCreateButton(createButton);
        }
        createButton.dataset.action = 'addWorldClock';
        const buttonText = createButton.querySelector('span');
        if (buttonText) buttonText.textContent = getTranslation('add_clock', 'tooltips');
    }

    menuElement.removeAttribute('data-editing-id');
};


export function prepareAlarmForEdit(alarmData) {
    const menuElement = getMenuElement('menuAlarm');
    if (!menuElement) return;

    state.alarm.hour = alarmData.hour;
    state.alarm.minute = alarmData.minute;
    state.alarm.sound = alarmData.sound;

    const titleInput = menuElement.querySelector('#alarm-title');
    if (titleInput) {
        if (alarmData.type === 'default') {
            titleInput.value = getTranslation(alarmData.title, 'alarms');
            titleInput.setAttribute('disabled', 'true');
            titleInput.parentElement.classList.add('disabled-interactive');
        } else {
            titleInput.value = alarmData.title;
            titleInput.removeAttribute('disabled');
            titleInput.parentElement.classList.remove('disabled-interactive');
        }
    }

    updateAlarmDisplay(menuElement);
    updateDisplay('#alarm-selected-sound', getTranslation(alarmData.sound.replace(/-/g, '_'), 'sounds'), menuElement);

    const soundListContainer = menuElement.querySelector('.menu-alarm-sound .menu-list');
    generateSoundList(soundListContainer, 'selectAlarmSound', alarmData.sound);

    const createButton = menuElement.querySelector('.create-tool');
    if (createButton) {
        createButton.dataset.action = 'saveAlarmChanges';
        const buttonText = createButton.querySelector('span');
        if (buttonText) {
            buttonText.setAttribute('data-translate', 'save_changes');
            buttonText.setAttribute('data-translate-category', 'alarms');
            buttonText.textContent = getTranslation('save_changes', 'alarms');
        }
    }
    menuElement.setAttribute('data-editing-id', alarmData.id);
}

export function prepareTimerForEdit(timerData) {
    const menuElement = getMenuElement('menuTimer');
    if (!menuElement) return;

    state.timer.currentTab = 'countdown';
    updateTimerTabView(menuElement);

    const durationInMs = timerData.initialDuration;
    const totalSeconds = Math.floor(durationInMs / 1000);
    state.timer.duration.hours = Math.floor(totalSeconds / 3600);
    state.timer.duration.minutes = Math.floor((totalSeconds % 3600) / 60);
    state.timer.duration.seconds = totalSeconds % 60;

    state.timer.endAction = timerData.endAction;
    state.timer.sound = timerData.sound;

    const titleInput = menuElement.querySelector('#timer-title');
    if (titleInput) {
        if (timerData.id.startsWith('default-timer-')) {
            titleInput.value = getTranslation(timerData.title, 'timer');
            titleInput.setAttribute('disabled', 'true');
            titleInput.parentElement.classList.add('disabled-interactive');
        } else {
            titleInput.value = timerData.title;
            titleInput.removeAttribute('disabled');
            titleInput.parentElement.classList.remove('disabled-interactive');
        }
    }

    updateTimerDurationDisplay(menuElement);
    updateDisplay('#timer-selected-end-action', getTranslation(`${timerData.endAction}_timer`, 'timer'), menuElement);
    updateDisplay('#countdown-selected-sound', getTranslation(timerData.sound.replace(/-/g, '_'), 'sounds'), menuElement);

    const soundListContainer = menuElement.querySelector('.menu-countdown-sound .menu-list');
    generateSoundList(soundListContainer, 'selectCountdownSound', timerData.sound);

    const createButton = menuElement.querySelector('.create-tool');
    if (createButton) {
        createButton.dataset.action = 'saveTimerChanges';
        const buttonText = createButton.querySelector('span');
        if (buttonText) {
            buttonText.setAttribute('data-translate', 'save_changes');
            buttonText.setAttribute('data-translate-category', 'timer');
            buttonText.textContent = getTranslation('save_changes', 'timer');
        }
    }
    menuElement.setAttribute('data-editing-id', timerData.id);
}

export function prepareCountToDateForEdit(timerData) {
    const menuElement = getMenuElement('menuTimer');
    if (!menuElement) return;

    state.timer.currentTab = 'count_to_date';
    updateTimerTabView(menuElement);

    const titleInput = menuElement.querySelector('#countto-title');
    if (titleInput) {
        if (timerData.id.startsWith('default-timer-')) {
            titleInput.value = getTranslation(timerData.title, 'timer');
            titleInput.setAttribute('disabled', 'true');
            titleInput.parentElement.classList.add('disabled-interactive');
        } else {
            titleInput.value = timerData.title;
            titleInput.removeAttribute('disabled');
            titleInput.parentElement.classList.remove('disabled-interactive');
        }
    }
    
    state.timer.countTo.sound = timerData.sound;

    const targetDate = new Date(timerData.targetDate);
    state.timer.countTo.date = targetDate;
    state.timer.countTo.selectedDate = targetDate.toISOString();
    state.timer.countTo.selectedHour = targetDate.getHours();
    state.timer.countTo.selectedMinute = targetDate.getMinutes();

    updateDisplay('#selected-date-display', targetDate.toLocaleDateString(), menuElement);
    updateDisplay('#selected-hour-display', String(targetDate.getHours()).padStart(2, '0'), menuElement);
    updateDisplay('#selected-minute-display', String(targetDate.getMinutes()).padStart(2, '0'), menuElement);
    updateDisplay('#count-to-date-selected-sound', getTranslation(timerData.sound.replace(/-/g, '_'), 'sounds'), menuElement);
    
    const soundListContainer = menuElement.querySelector('.menu-count-to-date-sound .menu-list');
    generateSoundList(soundListContainer, 'selectCountToDateSound', timerData.sound);
    renderCalendar(menuElement);

    const createButton = menuElement.querySelector('.create-tool');
    if (createButton) {
        createButton.dataset.action = 'saveCountToDateChanges';
        const buttonText = createButton.querySelector('span');
        if (buttonText) {
            buttonText.setAttribute('data-translate', 'save_changes');
            buttonText.setAttribute('data-translate-category', 'timer');
            buttonText.textContent = getTranslation('save_changes', 'timer');
        }
    }
    menuElement.setAttribute('data-editing-id', timerData.id);
}


export function prepareWorldClockForEdit(clockData) {
    const menuElement = getMenuElement('menuWorldClock');
    if (!menuElement) return;

    state.worldClock.isEditing = true;
    state.worldClock.editingId = clockData.id;
    state.worldClock.country = clockData.country;
    state.worldClock.timezone = clockData.timezone;
    state.worldClock.countryCode = clockData.countryCode;

    const titleInput = menuElement.querySelector('#worldclock-title');
    if (titleInput) titleInput.value = clockData.title;

    updateDisplay('#worldclock-selected-country', clockData.country, menuElement);

    populateTimezoneDropdown(menuElement, clockData.countryCode).then(() => {
        const timezoneSelector = menuElement.querySelector('[data-action="toggleTimezoneDropdown"]');
        if (timezoneSelector) timezoneSelector.classList.remove('disabled-interactive');
        const ct = window.ct;
        const tzObject = ct.getTimezone(clockData.timezone);
        const cityName = tzObject.name.split('/').pop().replace(/_/g, ' ');
        const displayName = `(UTC ${tzObject.utcOffsetStr}) ${cityName}`;
        updateDisplay('#worldclock-selected-timezone', displayName, menuElement);
    });

    const createButton = menuElement.querySelector('.create-tool');
    if (createButton) {
        createButton.dataset.action = 'saveWorldClockChanges';
        const buttonText = createButton.querySelector('span');
        if (buttonText) {
            buttonText.setAttribute('data-translate', 'save_changes');
            buttonText.setAttribute('data-translate-category', 'world_clock_options');
            buttonText.textContent = getTranslation('save_changes', 'world_clock_options');
        }
    }

    menuElement.setAttribute('data-editing-id', clockData.id);
}

const initializeAlarmMenu = (menuElement) => {
    if (!menuElement.hasAttribute('data-editing-id')) {
        setAlarmDefaults();
        const soundListContainer = menuElement.querySelector('.menu-alarm-sound .menu-list');
        generateSoundList(soundListContainer, 'selectAlarmSound', state.alarm.sound);
    }
    updateAlarmDisplay(menuElement);
};

const initializeTimerMenu = (menuElement) => {
    if (!menuElement.hasAttribute('data-editing-id')) {
        const countdownSoundList = menuElement.querySelector('.menu-countdown-sound .menu-list');
        generateSoundList(countdownSoundList, 'selectCountdownSound', state.timer.sound);

        const countToDateSoundList = menuElement.querySelector('.menu-count-to-date-sound .menu-list');
        generateSoundList(countToDateSoundList, 'selectCountToDateSound', state.timer.countTo.sound);
    }
    updateTimerDurationDisplay(menuElement); 
    renderCalendar(menuElement); 
    populateHourSelectionMenu(menuElement);
};

const initializeWorldClockMenu = (menuElement) => {
    const timezoneSelector = menuElement.querySelector('[data-action="toggleTimezoneDropdown"]');
    if (timezoneSelector) timezoneSelector.classList.add('disabled-interactive');
};

export function initializeMenuForOverlay(menuName) {
    const menuElement = getMenuElement(menuName);
    if (!menuElement) return;
    switch (menuName) {
        case 'menuAlarm': initializeAlarmMenu(menuElement); break;
        case 'menuTimer': initializeTimerMenu(menuElement); break;
        case 'menuWorldClock': initializeWorldClockMenu(menuElement); break;
    }
}

export function resetMenuForOverlay(menuName) {
    const menuElement = getMenuElement(menuName);
    if (!menuElement) return;
    switch (menuName) {
        case 'menuAlarm': resetAlarmMenu(menuElement); break;
        case 'menuTimer': resetTimerMenu(menuElement); break;
        case 'menuWorldClock': resetWorldClockMenu(menuElement); break;
    }
}

const loadCountriesAndTimezones = () => new Promise((resolve, reject) => {
    if (window.ct) return resolve(window.ct);
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/gh/manuelmhtr/countries-and-timezones@latest/dist/index.min.js';
    script.onload = () => window.ct ? resolve(window.ct) : reject(new Error('Library loaded but ct object not found'));
    script.onerror = () => reject(new Error('Failed to load script'));
    document.head.appendChild(script);
});

const updateDisplay = (selector, text, parent = document) => {
    const element = parent.querySelector(selector);
    if (element) element.textContent = text;
};

const handleSelect = (selectedItem, displaySelector) => {
    const parentMenu = selectedItem.closest('.menu-alarm, .menu-timer, .menu-worldClock');
    if (!parentMenu) return;
    const displayElement = parentMenu.querySelector(displaySelector);
    const dropdownMenu = selectedItem.closest('.dropdown-menu-container');
    const textToDisplay = selectedItem.querySelector('.menu-link-text span')?.textContent;
    if (displayElement && textToDisplay) displayElement.textContent = textToDisplay;
    if (dropdownMenu) dropdownMenu.classList.add('disabled');
};

const toggleDropdown = (action, parentMenu) => {
    const targetSelector = dropdownMap[action];
    if (!targetSelector || !parentMenu) return;
    const targetDropdown = parentMenu.querySelector(targetSelector);
    if (!targetDropdown) return;
    const isCurrentlyOpen = !targetDropdown.classList.contains('disabled');
    document.querySelectorAll('.dropdown-menu-container').forEach(d => d.classList.add('disabled'));
    if (!isCurrentlyOpen) {
        targetDropdown.classList.remove('disabled');
        if (action === 'toggleCountryDropdown') populateCountryDropdown(parentMenu);
    }
};

const resetDropdownDisplay = (menuElement, displaySelector, translateKey, translateCategory) => {
    const display = menuElement.querySelector(displaySelector);
    if (display && typeof getTranslation === 'function') {
        display.textContent = getTranslation(translateKey, translateCategory);
    }
};

const updateAlarmDisplay = (parent) => {
    let finalHourText;
    if (use24HourFormat) {
        finalHourText = `${state.alarm.hour} h`;
    } else {
        const hour = state.alarm.hour;
        const ampm = hour >= 12 ? 'PM' : 'AM';
        let hour12 = hour % 12;
        hour12 = hour12 ? hour12 : 12;
        finalHourText = `${hour12} ${ampm}`;
    }
    updateDisplay('#hour-display', finalHourText, parent);
    updateDisplay('#minute-display', `${state.alarm.minute} min`, parent);
};

const updateTimerDurationDisplay = (timerMenu) => {
    if (!timerMenu) return;
    updateDisplay('#timer-hour-display', `${state.timer.duration.hours} h`, timerMenu);
    updateDisplay('#timer-minute-display', `${state.timer.duration.minutes} min`, timerMenu);
    updateDisplay('#timer-second-display', `${state.timer.duration.seconds} s`, timerMenu);
};

const updateTimerTabView = (timerMenu) => {
    if (!timerMenu) return;

    // Actualizar el texto y el icono del desplegable
    const display = timerMenu.querySelector('#timer-type-display');
    const iconDisplay = timerMenu.querySelector('#timer-type-icon');
    if (display && iconDisplay) {
        const isCountdown = state.timer.currentTab === 'countdown';
        const key = isCountdown ? 'countdown' : 'count_to_date';
        display.textContent = getTranslation(key, 'timer');
        iconDisplay.textContent = isCountdown ? 'timer' : 'event';
    }

    // Actualizar la clase 'active' en las opciones del desplegable
    const dropdown = timerMenu.querySelector('.menu-timer-type');
    if (dropdown) {
        dropdown.querySelectorAll('.menu-link').forEach(link => {
            link.classList.remove('active');
            if (link.dataset.tab === state.timer.currentTab) {
                link.classList.add('active');
            }
        });
    }

    // Mostrar/ocultar el contenido correspondiente
    timerMenu.querySelectorAll('.menu-content-wrapper[data-tab-content]').forEach(c => {
        c.classList.remove('active');
        c.classList.add('disabled');
    });
    const activeContent = timerMenu.querySelector(`.menu-content-wrapper[data-tab-content="${state.timer.currentTab}"]`);
    if (activeContent) {
        activeContent.classList.remove('disabled');
        activeContent.classList.add('active');
    }
};

const renderCalendar = (timerMenu) => {
    if (!timerMenu) return;
    const monthYearDisplay = timerMenu.querySelector('#calendar-month-year');
    const daysContainer = timerMenu.querySelector('.calendar-days');
    if (!monthYearDisplay || !daysContainer) return;
    const date = state.timer.countTo.date;
    monthYearDisplay.textContent = date.toLocaleDateString(navigator.language, { month: 'long', year: 'numeric' });
    daysContainer.innerHTML = '';
    const firstDayIndex = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    const lastDate = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    for (let i = 0; i < firstDayIndex; i++) daysContainer.innerHTML += `<div class="day other-month"></div>`;
    for (let i = 1; i <= lastDate; i++) {
        const dayEl = document.createElement('div');
        dayEl.className = 'day'; dayEl.textContent = i; dayEl.dataset.day = i;
        const today = new Date();
        if (i === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear()) dayEl.classList.add('today');
        if (state.timer.countTo.selectedDate && i === new Date(state.timer.countTo.selectedDate).getDate() && date.getMonth() === new Date(state.timer.countTo.selectedDate).getMonth()) dayEl.classList.add('selected');
        daysContainer.appendChild(dayEl);
    }
    const currentYear = new Date().getFullYear();
    const minYear = currentYear - 265;
    const prevButton = timerMenu.querySelector('[data-action="prev-month"]');
    const nextButton = timerMenu.querySelector('[data-action="next-month"]');
    if (prevButton) {
        if (date.getFullYear() < minYear || (date.getFullYear() === minYear && date.getMonth() === 0)) {
            prevButton.disabled = true;
            prevButton.classList.add('disabled-interactive');
        } else {
            prevButton.disabled = false;
            prevButton.classList.remove('disabled-interactive');
        }
    }
    if (nextButton) {
        nextButton.disabled = false;
        nextButton.classList.remove('disabled-interactive');
    }
};

const selectCalendarDate = (day, timerMenu) => {
    state.timer.countTo.selectedDate = new Date(state.timer.countTo.date.getFullYear(), state.timer.countTo.date.getMonth(), day).toISOString();
    updateDisplay('#selected-date-display', new Date(state.timer.countTo.selectedDate).toLocaleDateString(), timerMenu);
    timerMenu.querySelector('.calendar-container')?.classList.add('disabled');
    renderCalendar(timerMenu);
};

const populateHourSelectionMenu = (timerMenu) => {
    if (!timerMenu) return;
    const hourMenu = timerMenu.querySelector('.menu-timer-hour-selection .menu-list');
    if (!hourMenu || hourMenu.children.length > 0) return;
    for (let i = 0; i < 24; i++) {
        const hour = String(i).padStart(2, '0');
        const link = document.createElement('div');
        link.className = 'menu-link'; link.setAttribute('data-action', 'selectTimerHour'); link.setAttribute('data-hour', i);
        link.innerHTML = `<div class="menu-link-text"><span>${hour}:00</span></div>`;
        hourMenu.appendChild(link);
    }
};

const populateMinuteSelectionMenu = (hour, timerMenu) => {
    if (!timerMenu) return;
    const minuteMenu = timerMenu.querySelector('.menu-timer-minute-selection .menu-list');
    if (!minuteMenu) return;
    minuteMenu.innerHTML = '';
    for (let j = 0; j < 60; j += 5) {
        const hourStr = String(hour).padStart(2, '0');
        const minuteStr = String(j).padStart(2, '0');
        const link = document.createElement('div');
        link.className = 'menu-link'; link.setAttribute('data-action', 'selectTimerMinute'); link.setAttribute('data-hour', hour); link.setAttribute('data-minute', j);
        link.innerHTML = `<div class="menu-link-text"><span>${hourStr}:${minuteStr}</span></div>`;
        minuteMenu.appendChild(link);
    }
};

async function populateCountryDropdown(parentMenu) {
    const countryList = parentMenu.querySelector('.menu-worldclock-country .menu-list');
    if (!countryList) return;
    if (countryList.children.length > 1) return;
    const loadingText = (typeof getTranslation === 'function') ? getTranslation('loading_countries', 'world_clock') : 'Loading countries...';
    countryList.innerHTML = `<div class="menu-link-text" style="padding: 0 12px;"><span>${loadingText}</span></div>`;
    try {
        const ct = await loadCountriesAndTimezones();
        const countries = Object.values(ct.getAllCountries()).sort((a, b) => a.name.localeCompare(b.name));
        countryList.innerHTML = '';
        countries.forEach(country => {
            const link = document.createElement('div');
            link.className = 'menu-link'; link.setAttribute('data-action', 'selectCountry'); link.setAttribute('data-country-code', country.id);
            link.innerHTML = `<div class="menu-link-icon"><span class="material-symbols-rounded">public</span></div><div class="menu-link-text"><span>${country.name}</span></div>`;
            countryList.appendChild(link);
        });
    } catch (error) {
        const errorText = (typeof getTranslation === 'function') ? getTranslation('error_loading_countries', 'world_clock') : '❌ Error loading countries.';
        countryList.innerHTML = `<div class="menu-link-text" style="padding: 0 12px;"><span>${errorText}</span></div>`;
    }
}

async function populateTimezoneDropdown(parentMenu, countryCode) {
    const timezoneList = parentMenu.querySelector('.menu-worldclock-timezone .menu-list');
    const timezoneSelector = parentMenu.querySelector('[data-action="toggleTimezoneDropdown"]');
    if (!timezoneList || !timezoneSelector) return;
    timezoneList.innerHTML = '';
    try {
        const ct = await loadCountriesAndTimezones();
        const timezones = ct.getTimezonesForCountry(countryCode);
        if (timezones && timezones.length > 0) {
            timezones.forEach(tz => {
                const cityName = tz.name.split('/').pop().replace(/_/g, ' ');
                const displayName = `(UTC ${tz.utcOffsetStr}) ${cityName}`;
                const link = document.createElement('div');
                link.className = 'menu-link'; link.setAttribute('data-action', 'selectTimezone'); link.setAttribute('data-timezone', tz.name);
                link.innerHTML = `<div class="menu-link-icon"><span class="material-symbols-rounded">schedule</span></div><div class="menu-link-text"><span>${displayName}</span></div>`;
                timezoneList.appendChild(link);
            });
            timezoneSelector.classList.remove('disabled-interactive');
        } else {
            const noTimezonesText = (typeof getTranslation === 'function') ? getTranslation('no_timezones_found', 'world_clock') : '⚠️ No timezones found.';
            timezoneList.innerHTML = `<div class="menu-link-text" style="padding: 0 12px;"><span>${noTimezonesText}</span></div>`;
            timezoneSelector.classList.add('disabled-interactive');
        }
    } catch (error) {
        const errorText = (typeof getTranslation === 'function') ? getTranslation('error_loading_timezones', 'world_clock') : '❌ Error loading timezones.';
        timezoneList.innerHTML = `<div class="menu-link-text" style="padding: 0 12px;"><span>${errorText}</span></div>`;
        timezoneSelector.classList.add('disabled-interactive');
    }
}

function setupGlobalEventListeners() {
    document.addEventListener('click', (event) => {
        const isClickInsideDropdown = event.target.closest('.dropdown-menu-container');
        const isClickOnToggle = event.target.closest('[data-action]')?.dataset.action in dropdownMap;
        const isCalendarNavigation = event.target.closest('.calendar-nav, .calendar-header, .calendar-weekdays, .day.other-month');
        if (!isClickInsideDropdown && !isClickOnToggle && !isCalendarNavigation) {
            document.querySelectorAll('.dropdown-menu-container').forEach(d => d.classList.add('disabled'));
        }
    });

    document.body.addEventListener('input', (event) => {
        const searchInput = event.target.closest('#country-search-input');
        if (searchInput) {
            const searchTerm = searchInput.value.toLowerCase();
            const countryDropdown = searchInput.closest('.menu-worldclock-country');
            const countryList = countryDropdown.querySelector('.menu-list');
            const countries = countryList.querySelectorAll('.menu-link');
            let matchesFound = 0;

            countries.forEach(country => {
                const countryName = country.querySelector('.menu-link-text span').textContent.toLowerCase();
                if (countryName.includes(searchTerm)) {
                    country.style.display = 'flex';
                    matchesFound++;
                } else {
                    country.style.display = 'none';
                }
            });

            let noResultsMsg = countryList.querySelector('.no-results-message');
            if (matchesFound === 0 && searchTerm) {
                if (!noResultsMsg) {
                    noResultsMsg = document.createElement('div');
                    noResultsMsg.className = 'menu-link-text no-results-message';
                    noResultsMsg.style.padding = '8px 12px'; noResultsMsg.style.textAlign = 'center'; noResultsMsg.style.color = '#888';
                    countryList.appendChild(noResultsMsg);
                }
                const noResultsText = (typeof getTranslation === 'function') ? getTranslation('no_results', 'search') : 'No results found for';
                noResultsMsg.textContent = `${noResultsText} "${searchInput.value}"`;
                noResultsMsg.style.display = 'block';
            } else {
                if (noResultsMsg) noResultsMsg.style.display = 'none';
            }
        }
    });

    document.body.addEventListener('click', async (event) => {
        const parentMenu = event.target.closest('.menu-alarm, .menu-timer, .menu-worldClock');
        if (!parentMenu) return;

        // --- INICIO DE LA MODIFICACIÓN PARA EL MENÚ DESPLEGABLE ---
        const tabTarget = event.target.closest('.menu-timer-type .menu-link[data-tab]');
        if (tabTarget) {
            event.stopPropagation();
            state.timer.currentTab = tabTarget.dataset.tab;
            updateTimerTabView(parentMenu);
            const dropdown = tabTarget.closest('.dropdown-menu-container');
            if (dropdown) {
                dropdown.classList.add('disabled');
            }
            return;
        }
        // --- FIN DE LA MODIFICACIÓN ---

        const dayTarget = event.target.closest('.calendar-days .day:not(.other-month)');
        if (dayTarget && dayTarget.dataset.day) { event.stopPropagation(); selectCalendarDate(parseInt(dayTarget.dataset.day, 10), parentMenu); return; }

        const actionTarget = event.target.closest('[data-action]');
        if (!actionTarget) return;

        const action = actionTarget.dataset.action;
        if (dropdownMap[action]) { toggleDropdown(action, parentMenu); return; }
        // ... el resto del switch case se mantiene igual ...

        switch (action) {
            case 'increaseHour': state.alarm.hour = (state.alarm.hour + 1) % 24; updateAlarmDisplay(parentMenu); break;
            case 'decreaseHour': state.alarm.hour = (state.alarm.hour - 1 + 24) % 24; updateAlarmDisplay(parentMenu); break;
            case 'increaseMinute': state.alarm.minute = (state.alarm.minute + 1) % 60; updateAlarmDisplay(parentMenu); break;
            case 'decreaseMinute': state.alarm.minute = (state.alarm.minute - 1 + 60) % 60; updateAlarmDisplay(parentMenu); break;
            case 'selectAlarmSound':
                event.stopPropagation();
                handleSelect(actionTarget, '#alarm-selected-sound');
                state.alarm.sound = actionTarget.dataset.sound;
                const alarmSoundList = actionTarget.closest('.menu-list');
                if (alarmSoundList) {
                    alarmSoundList.querySelectorAll('.menu-link').forEach(link => link.classList.remove('active'));
                }
                actionTarget.classList.add('active');
                break;
            case 'increaseTimerHour': state.timer.duration.hours = (state.timer.duration.hours + 1) % 100; updateTimerDurationDisplay(parentMenu); break;
            case 'decreaseTimerHour': state.timer.duration.hours = (state.timer.duration.hours - 1 + 100) % 100; updateTimerDurationDisplay(parentMenu); break;
            case 'increaseTimerMinute': state.timer.duration.minutes = (state.timer.duration.minutes + 1) % 60; updateTimerDurationDisplay(parentMenu); break;
            case 'decreaseTimerMinute': state.timer.duration.minutes = (state.timer.duration.minutes - 1 + 60) % 60; updateTimerDurationDisplay(parentMenu); break;
            case 'increaseTimerSecond': state.timer.duration.seconds = (state.timer.duration.seconds + 1) % 60; updateTimerDurationDisplay(parentMenu); break;
            case 'decreaseTimerSecond': state.timer.duration.seconds = (state.timer.duration.seconds - 1 + 60) % 60; updateTimerDurationDisplay(parentMenu); break;
            case 'selectTimerEndAction': event.stopPropagation(); handleSelect(actionTarget, '#timer-selected-end-action'); state.timer.endAction = actionTarget.dataset.endAction; break;
            case 'selectCountdownSound':
                event.stopPropagation();
                handleSelect(actionTarget, '#countdown-selected-sound');
                state.timer.sound = actionTarget.dataset.sound;
                const countdownSoundList = actionTarget.closest('.menu-list');
                if (countdownSoundList) {
                    countdownSoundList.querySelectorAll('.menu-link').forEach(link => link.classList.remove('active'));
                }
                actionTarget.classList.add('active');
                break;
            case 'selectCountToDateSound':
                event.stopPropagation();
                handleSelect(actionTarget, '#count-to-date-selected-sound');
                state.timer.countTo.sound = actionTarget.dataset.sound;
                const countToDateSoundList = actionTarget.closest('.menu-list');
                if (countToDateSoundList) {
                    countToDateSoundList.querySelectorAll('.menu-link').forEach(link => link.classList.remove('active'));
                }
                actionTarget.classList.add('active');
                break;
            case 'prev-month': state.timer.countTo.date.setMonth(state.timer.countTo.date.getMonth() - 1); renderCalendar(parentMenu); break;
            case 'next-month': state.timer.countTo.date.setMonth(state.timer.countTo.date.getMonth() + 1); renderCalendar(parentMenu); break;
            case 'selectTimerHour':
                event.stopPropagation();
                const hour = parseInt(actionTarget.dataset.hour, 10);
                state.timer.countTo.selectedHour = hour;
                updateDisplay('#selected-hour-display', String(hour).padStart(2, '0'), parentMenu);
                updateDisplay('#selected-minute-display', '--', parentMenu);
                actionTarget.closest('.dropdown-menu-container')?.classList.add('disabled');
                populateMinuteSelectionMenu(hour, parentMenu);
                const minuteMenu = parentMenu.querySelector('.menu-timer-minute-selection');
                if (minuteMenu) minuteMenu.classList.remove('disabled');
                state.timer.countTo.timeSelectionStep = 'minute';
                break;
            case 'selectTimerMinute':
                event.stopPropagation();
                const minute = parseInt(actionTarget.dataset.minute, 10);
                state.timer.countTo.selectedMinute = minute;
                updateDisplay('#selected-minute-display', String(minute).padStart(2, '0'), parentMenu);
                actionTarget.closest('.dropdown-menu-container')?.classList.add('disabled');
                state.timer.countTo.timeSelectionStep = 'hour';
                break;
            case 'selectCountry':
                event.stopPropagation();
                const countryCode = actionTarget.getAttribute('data-country-code');
                handleSelect(actionTarget, '#worldclock-selected-country');
                state.worldClock.country = actionTarget.querySelector('.menu-link-text span')?.textContent;
                state.worldClock.countryCode = countryCode;
                resetDropdownDisplay(parentMenu, '#worldclock-selected-timezone', 'select_a_timezone', 'world_clock');
                state.worldClock.timezone = '';
                await populateTimezoneDropdown(parentMenu, countryCode);
                break;
            case 'previewAlarmSound':
                stopSound();
                playSound(state.alarm.sound);
                setTimeout(stopSound, 1000);
                break;
            case 'previewCountdownSound':
                stopSound();
                playSound(state.timer.sound);
                setTimeout(stopSound, 1000);
                break;
            case 'previewCountToDateSound':
                stopSound();
                playSound(state.timer.countTo.sound);
                setTimeout(stopSound, 1000);
                break;
            case 'selectTimezone':
                event.stopPropagation();
                handleSelect(actionTarget, '#worldclock-selected-timezone');
                state.worldClock.timezone = actionTarget.getAttribute('data-timezone');
                break;

            case 'upload-audio':
                event.stopPropagation();
                handleAudioUpload((newAudio) => {
                    // Refrescar la lista de sonidos del menú actual
                    const dropdown = actionTarget.closest('.dropdown-menu-container');
                    const listElement = dropdown?.querySelector('.menu-list');
                    const soundSelector = actionTarget.closest('.custom-select-wrapper');
                    
                    if (listElement && soundSelector) {
                        const isAlarm = soundSelector.querySelector('[data-action="toggleAlarmSoundDropdown"]');
                        const isCountdown = soundSelector.querySelector('[data-action="toggleCountdownSoundDropdown"]');
                        const isCountToDate = soundSelector.querySelector('[data-action="toggleCountToDateSoundDropdown"]');

                        let actionName = '';
                        let activeSoundId = '';

                        if(isAlarm) {
                            actionName = 'selectAlarmSound';
                            activeSoundId = state.alarm.sound;
                        } else if (isCountdown) {
                            actionName = 'selectCountdownSound';
                            activeSoundId = state.timer.sound;
                        } else if (isCountToDate) {
                            actionName = 'selectCountToDateSound';
                            activeSoundId = state.timer.countTo.sound;
                        }
                        
                        generateSoundList(listElement, actionName, activeSoundId);
                    }
                });
                break;
            case 'delete-user-audio':
                event.stopPropagation();
                const audioIdToDelete = actionTarget.dataset.audioId;
                if (confirm(getTranslation('confirm_delete_audio', 'sounds'))) {
                    deleteUserAudio(audioIdToDelete);
                    // Refrescar la lista actual
                    const listElement = actionTarget.closest('.menu-list');
                    const dropdown = actionTarget.closest('.dropdown-menu-container');
                    if (listElement && dropdown) {
                        const grandParent = dropdown.closest('.menu-alarm, .menu-timer');
                        let actionName = '', activeSoundId = '';

                        if (grandParent.classList.contains('menu-alarm')) {
                            actionName = 'selectAlarmSound';
                            activeSoundId = state.alarm.sound;
                        } else {
                            const soundSelector = grandParent.querySelector('[data-action="toggleCountdownSoundDropdown"]') ? 'countdown' : 'count_to_date';
                            actionName = soundSelector === 'countdown' ? 'selectCountdownSound' : 'selectCountToDateSound';
                            activeSoundId = soundSelector === 'countdown' ? state.timer.sound : state.timer.countTo.sound;
                        }
                        generateSoundList(listElement, actionName, activeSoundId);
                    }
                }
                break;

            case 'createAlarm': {
                const alarmTitleInput = parentMenu.querySelector('#alarm-title');
                const alarmTitle = alarmTitleInput ? alarmTitleInput.value.trim() : '';

                if (!alarmTitle) {
                    console.warn('⚠️ Se bloqueó la creación de la alarma: falta el título.');
                    return;
                }

                // --- PRE-CHECK FOR ALARM LIMIT ---
                if (window.alarmManager && typeof window.alarmManager.getAlarmCount === 'function' && typeof window.alarmManager.getAlarmLimit === 'function') {
                    const currentAlarmCount = window.alarmManager.getAlarmCount();
                    const alarmLimit = window.alarmManager.getAlarmLimit();
                    if (currentAlarmCount >= alarmLimit) {
                        showDynamicIslandNotification('system', 'premium_required', 'limit_reached_generic', 'notifications', {
                            type: getTranslation('alarms', 'tooltips'),
                            limit: alarmLimit
                        });
                        console.warn('⚠️ Alarm creation blocked: limit reached.');
                        return; // Stop execution
                    }
                } else {
                    console.error('AlarmManager or its limit functions are not available, cannot perform pre-check.');
                }
                // --- END PRE-CHECK ---

                const createButton = actionTarget;
                const menuId = parentMenu.dataset.menu;
                addSpinnerToCreateButton(createButton);

                if (menuTimeouts[menuId]) {
                    clearTimeout(menuTimeouts[menuId]);
                }

                menuTimeouts[menuId] = setTimeout(() => {
                    if (window.alarmManager && typeof window.alarmManager.createAlarm === 'function') {
                        const success = window.alarmManager.createAlarm(
                            alarmTitle,
                            state.alarm.hour,
                            state.alarm.minute,
                            state.alarm.sound
                        );

                        if (success && deactivateModule) {
                            deactivateModule('overlayContainer', { source: 'create-alarm' });
                        } else if (!success) { // If createAlarm returns false (due to limit or other internal reasons)
                            removeSpinnerFromCreateButton(createButton);
                        }
                    } else {
                        console.error('El alarmManager no está disponible.');
                        removeSpinnerFromCreateButton(createButton);
                    }

                    resetAlarmMenu(parentMenu);
                    delete menuTimeouts[menuId];
                }, 500);
                break;

            } case 'saveAlarmChanges': {
                const editingId = parentMenu.getAttribute('data-editing-id');
                const alarmTitleInput = parentMenu.querySelector('#alarm-title');
                const alarmTitle = alarmTitleInput ? alarmTitleInput.value.trim() : '';

                if (!editingId || !alarmTitle) {
                    console.warn('⚠️ Faltan datos para guardar los cambios de la alarma.');
                    return;
                }

                const saveButton = actionTarget;
                const menuId = parentMenu.dataset.menu;
                addSpinnerToCreateButton(saveButton);

                if (menuTimeouts[menuId]) {
                    clearTimeout(menuTimeouts[menuId]);
                }

                menuTimeouts[menuId] = setTimeout(() => {
                    if (window.alarmManager && typeof window.alarmManager.updateAlarm === 'function') {
                        window.alarmManager.updateAlarm(editingId, {
                            title: alarmTitle,
                            hour: state.alarm.hour,
                            minute: state.alarm.minute,
                            sound: state.alarm.sound
                        });
                    } else {
                        console.error('El alarmManager no está disponible.');
                    }

                    if (deactivateModule) {
                        deactivateModule('overlayContainer', { source: 'save-alarm' });
                    }

                    resetAlarmMenu(parentMenu);
                    delete menuTimeouts[menuId];
                }, 500);
                break;
            }
            case 'createTimer': {
                const createButton = actionTarget;
                const menuId = parentMenu.dataset.menu;

                // --- PRE-CHECK FOR TIMER LIMIT ---
                if (window.timerManager && typeof getTimersCount === 'function' && typeof getTimerLimit === 'function') {
                    const currentTimerCount = getTimersCount();
                    const timerLimit = getTimerLimit();
                    if (currentTimerCount >= timerLimit) {
                        showDynamicIslandNotification('system', 'premium_required', 'limit_reached_generic', 'notifications', {
                            type: getTranslation('timer', 'tooltips'),
                            limit: timerLimit
                        });
                        console.warn('⚠️ Timer creation blocked: limit reached.');
                        return; // Stop execution
                    }
                } else {
                    console.error('TimerManager or its limit functions are not available, cannot perform pre-check.');
                }
                // --- END PRE-CHECK ---

                addSpinnerToCreateButton(createButton);

                if (menuTimeouts[menuId]) clearTimeout(menuTimeouts[menuId]);

                menuTimeouts[menuId] = setTimeout(() => {
                    let success = false;
                    const timerMenu = parentMenu;
                    if (state.timer.currentTab === 'countdown') {
                        const timerTitleInput = timerMenu.querySelector('#timer-title');
                        const timerTitle = timerTitleInput.value.trim() || getTranslation('my_new_timer_placeholder', 'timer');
                        const { hours, minutes, seconds } = state.timer.duration;

                        if (timerTitle && (hours > 0 || minutes > 0 || seconds > 0)) {
                            const durationInMs = (hours * 3600 + minutes * 60 + seconds) * 1000;
                            addTimerAndRender({ type: 'countdown', title: timerTitle, duration: durationInMs, endAction: state.timer.endAction, sound: state.timer.sound });
                            success = true;
                        }
                    } else {
                        const eventTitleInput = timerMenu.querySelector('#countto-title');
                        const eventTitle = eventTitleInput ? eventTitleInput.value.trim() : '';
                        const { selectedDate, selectedHour, selectedMinute } = state.timer.countTo;

                        if (eventTitle && selectedDate != null && typeof selectedHour === 'number' && typeof selectedMinute === 'number') {
                            const targetDate = new Date(selectedDate);
                            targetDate.setHours(selectedHour, selectedMinute, 0, 0);
                            addTimerAndRender({ type: 'count_to_date', title: eventTitle, targetDate: targetDate.toISOString(), sound: state.timer.countTo.sound });
                            success = true;
                        }
                    }

                    if (success) {
                        deactivateModule('overlayContainer', { source: 'create-timer' });
                    } else {
                        removeSpinnerFromCreateButton(createButton);
                    }

                    resetTimerMenu(parentMenu);
                    delete menuTimeouts[menuId];
                }, 500);
                break;
            }
            case 'saveTimerChanges': {
                const editingId = parentMenu.getAttribute('data-editing-id');
                if (!editingId) return;

                const saveButton = actionTarget;
                addSpinnerToCreateButton(saveButton);
                const menuId = parentMenu.dataset.menu;

                if (menuTimeouts[menuId]) clearTimeout(menuTimeouts[menuId]);

                menuTimeouts[menuId] = setTimeout(() => {
                    const timerTitleInput = parentMenu.querySelector('#timer-title');
                    const timerTitle = timerTitleInput.value.trim() || getTranslation('my_new_timer_placeholder', 'timer');
                    const { hours, minutes, seconds } = state.timer.duration;

                    if (hours > 0 || minutes > 0 || seconds > 0) {
                        const durationInMs = (hours * 3600 + minutes * 60 + seconds) * 1000;
                        updateTimer(editingId, { title: timerTitle, duration: durationInMs, endAction: state.timer.endAction, sound: state.timer.sound });
                        deactivateModule('overlayContainer', { source: 'save-timer' });
                    } else {
                        removeSpinnerFromCreateButton(saveButton); 
                    }

                    resetTimerMenu(parentMenu);
                    delete menuTimeouts[menuId];
                }, 500);
                break;
            }
            case 'saveCountToDateChanges': {
                const editingId = parentMenu.getAttribute('data-editing-id');
                if (!editingId) return;

                const saveButton = actionTarget;
                addSpinnerToCreateButton(saveButton);
                const menuId = parentMenu.dataset.menu;

                if (menuTimeouts[menuId]) clearTimeout(menuTimeouts[menuId]);

                menuTimeouts[menuId] = setTimeout(() => {
                    const eventTitleInput = parentMenu.querySelector('#countto-title');
                    const eventTitle = eventTitleInput ? eventTitleInput.value.trim() : '';
                    const { selectedDate, selectedHour, selectedMinute } = state.timer.countTo;

                    if (eventTitle && selectedDate != null && typeof selectedHour === 'number' && typeof selectedMinute === 'number') {
                        const targetDate = new Date(selectedDate);
                        targetDate.setHours(selectedHour, selectedMinute, 0, 0);

                        updateTimer(editingId, {
                            type: 'count_to_date',
                            title: eventTitle,
                            targetDate: targetDate.toISOString(),
                            sound: state.timer.countTo.sound
                        });
                        deactivateModule('overlayContainer', { source: 'save-timer' });
                    } else {
                        removeSpinnerFromCreateButton(saveButton);
                    }

                    resetTimerMenu(parentMenu);
                    delete menuTimeouts[menuId];
                }, 500);
                break;
            }
            case 'addWorldClock': {
                const clockTitleInput = parentMenu.querySelector('#worldclock-title');
                const clockTitle = clockTitleInput ? clockTitleInput.value.trim() : '';
                const { country, timezone } = state.worldClock;

                if (!clockTitle || !country || !timezone) {
                    console.warn('⚠️ Faltan datos (título, país o zona horaria), no se inicia la animación.');
                    return;
                }

                // --- PRE-CHECK FOR WORLD CLOCK LIMIT ---
                if (window.worldClockManager && typeof window.worldClockManager.getClockCount === 'function' && typeof window.worldClockManager.getClockLimit === 'function') {
                    const currentClockCount = window.worldClockManager.getClockCount();
                    const clockLimit = window.worldClockManager.getClockLimit();
                    if (currentClockCount >= clockLimit) {
                        showDynamicIslandNotification('system', 'premium_required', 'limit_reached_generic', 'notifications', {
                            type: getTranslation('world_clock', 'tooltips'),
                            limit: clockLimit
                        });
                        console.warn('⚠️ World Clock creation blocked: limit reached.');
                        return; // Stop execution
                    }
                } else {
                    console.error('WorldClockManager or its limit functions are not available, cannot perform pre-check.');
                }
                // --- END PRE-CHECK ---

                const createButton = actionTarget;
                const menuId = parentMenu.dataset.menu;
                addSpinnerToCreateButton(createButton);

                if (menuTimeouts[menuId]) {
                    clearTimeout(menuTimeouts[menuId]);
                }

                menuTimeouts[menuId] = setTimeout(() => {
                    if (window.worldClockManager && typeof window.worldClockManager.createAndStartClockCard === 'function') {
                        window.worldClockManager.createAndStartClockCard(clockTitle, country, timezone);
                    } else {
                        console.error('El worldClockManager no está disponible.');
                    }

                    if (deactivateModule) {
                        deactivateModule('overlayContainer', { source: 'add-world-clock' });
                    }

                    resetWorldClockMenu(parentMenu);
                    delete menuTimeouts[menuId];
                }, 500);
                break;
            }
            case 'saveWorldClockChanges': {
                const editingId = parentMenu.getAttribute('data-editing-id');
                const clockTitleInput = parentMenu.querySelector('#worldclock-title');
                const clockTitle = clockTitleInput ? clockTitleInput.value.trim() : '';
                const { country, timezone } = state.worldClock;

                if (!editingId || !clockTitle || !country || !timezone) {
                    console.warn('⚠️ Faltan datos para guardar los cambios, no se inicia la animación.');
                    return;
                }

                const saveButton = actionTarget;
                const menuId = parentMenu.dataset.menu;
                addSpinnerToCreateButton(saveButton);

                if (menuTimeouts[menuId]) {
                    clearTimeout(menuTimeouts[menuId]);
                }

                menuTimeouts[menuId] = setTimeout(() => {
                    if (window.worldClockManager && typeof window.worldClockManager.updateClockCard === 'function') {
                        window.worldClockManager.updateClockCard(editingId, { title: clockTitle, country, timezone });
                    } else {
                        console.error('El worldClockManager o la función updateClockCard no están disponibles.');
                    }

                    if (deactivateModule) {
                        deactivateModule('overlayContainer', { source: 'save-world-clock' });
                    }

                    resetWorldClockMenu(parentMenu);
                    delete menuTimeouts[menuId];
                }, 500);
                break;
            }
        }
    });
}

initMenuInteractions();