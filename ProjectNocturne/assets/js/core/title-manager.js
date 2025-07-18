import { getTranslation } from './translations-controller.js';

let timerUpdateInterval = null;
let stopwatchUpdateInterval = null; 

function updateTitle(newTitle) {
    document.title = newTitle;
}

function formatTitle(pageName) {
    return `ProjectNocturne - ${pageName}`;
}

function updateTitleForSection(sectionName) {
    clearInterval(timerUpdateInterval);
    clearInterval(stopwatchUpdateInterval);

    switch (sectionName) {
        case 'everything':
            updateTitle(formatTitle(getTranslation('everything', 'tooltips')));
            break;
        case 'alarm':
            if (window.alarmManager) {
                const nextAlarmTime = window.alarmManager.getNextAlarmDetails();
                const alarmTitle = nextAlarmTime || getTranslation('alarms', 'tooltips');
                updateTitle(formatTitle(alarmTitle));
            } else {
                updateTitle(formatTitle(getTranslation('alarms', 'tooltips')));
            }
            break;
        case 'timer':
            if (window.timerManager) {
                const pinnedTimer = window.timerManager.getPinnedTimer();
                if (pinnedTimer && pinnedTimer.isRunning) {
                    const update = () => {
                        const currentTimerState = window.timerManager.getPinnedTimer();
                        if (currentTimerState && currentTimerState.isRunning && currentTimerState.id === pinnedTimer.id) {
                            const remainingTime = window.timerManager.formatTime(currentTimerState.remaining);
                            updateTitle(formatTitle(remainingTime));
                        } else {
                            clearInterval(timerUpdateInterval);
                             updateTitle(formatTitle(getTranslation('timer', 'tooltips')));
                        }
                    };
                    update();
                    timerUpdateInterval = setInterval(update, 1000);
                } else {
                    updateTitle(formatTitle(getTranslation('timer', 'tooltips')));
                }
            } else {
                updateTitle(formatTitle(getTranslation('timer', 'tooltips')));
            }
            break;
        case 'stopwatch':
            if (window.stopwatchController) {
                const stopwatchState = window.stopwatchController.getStopwatchState();
                if (stopwatchState.isRunning) {
                    const update = () => {
                        const currentState = window.stopwatchController.getStopwatchState();
                        if (currentState.isRunning) {
                            const currentTime = window.stopwatchController.formatTime(Date.now() - currentState.startTime, true); 
                            updateTitle(formatTitle(currentTime));
                        } else {
                            clearInterval(stopwatchUpdateInterval);
                            updateTitle(formatTitle(getTranslation('stopwatch', 'tooltips')));
                        }
                    };
                    update();
                    stopwatchUpdateInterval = setInterval(update, 100); 
                } else {
                    updateTitle(formatTitle(getTranslation('stopwatch', 'tooltips')));
                }
            } else {
                updateTitle(formatTitle(getTranslation('stopwatch', 'tooltips')));
            }
            break;
        case 'worldClock':
            updateTitle(formatTitle(getTranslation('world_clock', 'tooltips')));
            break;
        default:
            updateTitle('ProjectNocturne');
            break;
    }
}

export { updateTitleForSection };