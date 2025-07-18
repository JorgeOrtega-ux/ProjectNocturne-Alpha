import { getTranslation } from './translations-controller.js';

function updateTitle(newTitle) {
    document.title = newTitle;
}

function formatTitle(pageName) {
    return `ProjectNocturne - ${pageName}`;
}

function updateTitleForSection(sectionName) {
    // Esta función ahora solo maneja los títulos estáticos.
    // Los controladores de cada herramienta se encargarán de sus propios títulos dinámicos.
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
        
        // Se elimina la gestión de 'timer', 'stopwatch' y 'worldClock' de aquí
        // para que sus controladores tengan control total y se evite el parpadeo.
        case 'timer':
        case 'stopwatch':
        case 'worldClock':
            // No hacer nada aquí. El controlador se encargará.
            break;

        default:
             // Maneja los títulos de las páginas legales
            let titleKey;
            if (sectionName === 'privacy-policy') titleKey = 'privacy_title';
            else if (sectionName === 'terms-conditions') titleKey = 'terms_title';
            else if (sectionName === 'cookies-policy') titleKey = 'cookies_title';

            if (titleKey) {
                updateTitle(formatTitle(getTranslation(titleKey, 'legal_docs')));
            } else {
                updateTitle('ProjectNocturne');
            }
            break;
    }
}

export { updateTitleForSection };