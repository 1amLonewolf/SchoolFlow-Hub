// js/utils.js

class Utils {
    static showMessage(message, type = "info", duration = 3000) {
        let box = document.getElementById('appMessage');
        if (!box) {
            box = document.createElement('div');
            box.id = 'appMessage';
            box.className = 'app-message';
            document.body.appendChild(box);
        }
        box.classList.remove('app-message--success', 'app-message--error', 'app-message--warning');
        if (type === 'success') box.classList.add('app-message--success');
        if (type === 'error') box.classList.add('app-message--error');
        if (type === 'warning') box.classList.add('app-message--warning');
        box.textContent = message;
        box.classList.add('visible');
        window.clearTimeout(box._hideT);
        box._hideT = window.setTimeout(() => {
            box.classList.remove('visible');
        }, duration);
    }

    static showConfirmDialog(message, onConfirm) {
        const dialog = document.createElement('div');
        dialog.className = 'confirm-dialog';

        const content = document.createElement('div');
        content.className = 'confirm-dialog-content';

        const p = document.createElement('p');
        p.textContent = message || '';

        const buttons = document.createElement('div');
        buttons.className = 'confirm-dialog-buttons';

        const yesBtn = document.createElement('button');
        yesBtn.id = 'confirmYes';
        yesBtn.className = 'button primary-button';
        yesBtn.textContent = 'Yes';

        const noBtn = document.createElement('button');
        noBtn.id = 'confirmNo';
        noBtn.className = 'button cancel-button';
        noBtn.textContent = 'No';

        buttons.appendChild(yesBtn);
        buttons.appendChild(noBtn);

        content.appendChild(p);
        content.appendChild(buttons);

        dialog.appendChild(content);
        document.body.appendChild(dialog);

        yesBtn.addEventListener('click', () => {
            try { if (typeof onConfirm === 'function') onConfirm(); } finally { dialog.remove(); }
        });
        noBtn.addEventListener('click', () => dialog.remove());
    }

    // Utility function for debouncing search input
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Utils;
} else {
    window.Utils = Utils;
}