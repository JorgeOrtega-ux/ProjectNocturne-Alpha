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
            updateTitle(formatTitle(getTranslation('alarm', 'tooltips')));
            break;

        // Se establece un título genérico inicial para evitar que persista el de la sección anterior.
        // Los controladores específicos se encargarán después del título dinámico (ej. el tiempo).
        case 'timer':
            updateTitle(formatTitle(getTranslation('timer', 'tooltips')));
            break;
        case 'stopwatch':
            updateTitle(formatTitle(getTranslation('stopwatch', 'tooltips')));
            break;
        case 'worldClock':
            updateTitle(formatTitle(getTranslation('world_clock', 'tooltips')));
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