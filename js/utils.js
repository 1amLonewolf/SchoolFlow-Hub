// js/utils.js

class Utils {
    /**
     * Displays a temporary message box in the application.
     * @param {string} message - The message content.
     * @param {'info'|'success'|'error'|'warning'} type - Type of message for styling.
     * @param {number} duration - How long the message is visible in milliseconds.
     */
    static showMessage(message, type = "info", duration = 3000) {
        let box = document.getElementById('appMessage');
        if (!box) {
            box = document.createElement('div');
            box.id = 'appMessage';
            box.className = 'app-message'; // Base class for styling
            document.body.appendChild(box);
        }

        // Reset classes and apply type-specific class
        box.classList.remove('app-message--success', 'app-message--error', 'app-message--warning', 'app-message--info');
        box.classList.add(`app-message--${type}`);
        
        box.textContent = message;
        box.classList.add('visible'); // Make it visible

        // Clear any existing hide timeout and set a new one
        window.clearTimeout(box._hideT);
        box._hideT = window.setTimeout(() => {
            box.classList.remove('visible'); // Hide after duration
            // Optionally remove from DOM after transition for cleanliness
            box.addEventListener('transitionend', function handler() {
                if (!box.classList.contains('visible')) {
                    box.remove();
                    box.removeEventListener('transitionend', handler);
                }
            });
        }, duration);
    }

    /**
     * Displays a confirmation dialog.
     * @param {string} message - The message to display in the dialog.
     * @param {Function} onConfirm - Callback function to execute if user confirms.
     * @param {Function} [onCancel] - Optional callback function if user cancels.
     */
    static showConfirmDialog(message, onConfirm, onCancel) {
        // Prevent multiple dialogs
        if (document.getElementById('confirmDialog')) {
            console.warn("Confirm dialog already open.");
            return;
        }

        const dialog = document.createElement('div');
        dialog.className = 'confirm-dialog-overlay'; // Overlay for full screen backdrop
        dialog.id = 'confirmDialog';

        const content = document.createElement('div');
        content.className = 'confirm-dialog-content';

        const p = document.createElement('p');
        p.textContent = message || 'Are you sure?';

        const buttons = document.createElement('div');
        buttons.className = 'confirm-dialog-buttons';

        const yesBtn = document.createElement('button');
        yesBtn.id = 'confirmYes';
        yesBtn.className = 'button primary-button';
        yesBtn.textContent = 'Yes';
        yesBtn.addEventListener('click', () => {
            onConfirm();
            dialog.remove();
        });

        const noBtn = document.createElement('button');
        noBtn.id = 'confirmNo';
        noBtn.className = 'button cancel-button';
        noBtn.textContent = 'No';
        noBtn.addEventListener('click', () => {
            if (onCancel) onCancel();
            dialog.remove();
        });

        buttons.appendChild(yesBtn);
        buttons.appendChild(noBtn);
        content.appendChild(p);
        content.appendChild(buttons);
        dialog.appendChild(content);
        document.body.appendChild(dialog);

        // Basic styling for the dialog (should ideally be in CSS)
        const style = document.createElement('style');
        style.textContent = `
            .confirm-dialog-overlay {
                position: fixed;
                top: 0; left: 0; right: 0; bottom: 0;
                background-color: rgba(0,0,0,0.6);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10000;
                opacity: 0;
                transition: opacity 0.3s ease-out;
            }
            .confirm-dialog-overlay.active { opacity: 1; }
            .confirm-dialog-content {
                background-color: white;
                padding: 30px;
                border-radius: 10px;
                box-shadow: 0 5px 15px rgba(0,0,0,0.3);
                text-align: center;
                max-width: 400px;
                width: 90%;
                transform: translateY(-20px);
                transition: transform 0.3s ease-out;
            }
            .confirm-dialog-overlay.active .confirm-dialog-content { transform: translateY(0); }
            .confirm-dialog-content p {
                margin-bottom: 20px;
                font-size: 1.1em;
                color: #333;
            }
            .confirm-dialog-buttons button {
                margin: 0 10px;
                padding: 10px 20px;
                border: none;
                border-radius: 5px;
                cursor: pointer;
                font-size: 1em;
                transition: background-color 0.2s ease;
            }
            .confirm-dialog-buttons .primary-button { background-color: #4CAF50; color: white; }
            .confirm-dialog-buttons .primary-button:hover { background-color: #45a049; }
            .confirm-dialog-buttons .cancel-button { background-color: #f44336; color: white; }
            .confirm-dialog-buttons .cancel-button:hover { background-color: #da190b; }
        `;
        document.head.appendChild(style); // Append style to head

        // Activate dialog with a slight delay for transition
        setTimeout(() => dialog.classList.add('active'), 10);
    }

    /**
     * Converts an array of rows (each row an array of cells) into a CSV string.
     * @param {Array<Array<any>>} rows - Data to convert.
     * @returns {string} CSV string.
     */
    static toCSV(rows) {
        // Sanitize to mitigate CSV/Excel formula injection (leading '=', '+', '-', '@', tabs, newlines)
        const sanitize = (value) => {
            if (value === null || value === undefined) return '';
            let s = String(value);
            // Prefix with a single quote if the string starts with characters that Excel might interpret as formulas
            if (/^[=+\-@\t\r\n]/.test(s)) {
                s = "'" + s;
            }
            // Escape double quotes by doubling them
            return s.replace(/"/g, '""');
        };
        // Join cells with comma, wrap each cell in double quotes, join rows with newline
        return rows.map(row => 
            row.map(cell => `"${sanitize(cell)}"`).join(',')
        ).join('\n');
    }

    /**
     * Generates and downloads a PDF from an HTML table using html2canvas and jspdf.
     * Requires html2canvas and jspdf libraries to be loaded globally.
     * @param {string} tableId - The ID of the HTML table element.
     * @param {string} title - Title for the PDF report.
     * @param {string} filename - Desired filename for the PDF.
     */
    static async exportTableToPDF(tableId, title = 'Report', filename = 'report.pdf') {
        const table = document.getElementById(tableId);
        if (!table) {
            this.showMessage('Table not found for PDF export.', 'error');
            return;
        }

        this.showMessage('Generating PDF report...', 'info', 5000);

        try {
            // Clone table and add some styling for print (optional)
            const tableClone = table.cloneNode(true);
            tableClone.style.width = '100%';
            tableClone.style.borderCollapse = 'collapse';
            tableClone.querySelectorAll('th, td').forEach(cell => {
                cell.style.border = '1px solid #ddd';
                cell.style.padding = '8px';
                cell.style.textAlign = 'left';
            });
            tableClone.querySelector('thead').style.backgroundColor = '#f2f2f2';

            // Create a temporary container to render the cloned table
            const container = document.createElement('div');
            container.style.padding = '20px'; // Add some padding around the table
            container.appendChild(tableClone);
            
            // Add to body temporarily, off-screen, to allow html2canvas to render it
            container.style.position = 'absolute';
            container.style.left = '-9999px';
            document.body.appendChild(container);
            
            // Generate canvas from HTML
            const canvas = await html2canvas(container, {
                scale: 2, // Increase scale for better resolution in PDF
                useCORS: true, // Enable CORS for images if any
                logging: false, // Disable html2canvas logs
                backgroundColor: 'white' // Ensure white background
            });
            
            // Clean up temporary container
            document.body.removeChild(container);
            
            // Convert canvas to PDF
            const { jsPDF } = window.jspdf; // Ensure jspdf is loaded globally
            const imgData = canvas.toDataURL('image/png');
            
            const pdf = new jsPDF('p', 'mm', 'a4'); // 'p' for portrait, 'mm' for units, 'a4' for size
            const imgWidth = 210; // A4 width in mm
            const pageHeight = (canvas.height * imgWidth) / canvas.width; // Calculate height to maintain aspect ratio
            let heightLeft = pageHeight;
            let position = 0;

            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, pageHeight);
            heightLeft -= pdf.internal.pageSize.height;

            while (heightLeft >= 0) {
                position = heightLeft - pageHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, imgWidth, pageHeight);
                heightLeft -= pdf.internal.pageSize.height;
            }
            
            // Save the PDF
            pdf.save(filename);
            
            this.showMessage('PDF report generated successfully!', 'success');
            console.log("[Utils] PDF report generated.");
        } catch (error) {
            console.error('Error generating PDF:', error);
            this.showMessage('Error generating PDF report. Please try again.', 'error');
        }
    }

    /**
     * Gets today's date in YYYY-MM-DD format.
     * @returns {string} Today's date string.
     */
    static getTodayDateString() {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    /**
     * Applies a theme to the document body (e.g., 'dark', 'light', 'default').
     * Expects corresponding CSS classes (e.g., '.theme-dark') to be defined.
     * @param {string} themeName - The name of the theme to apply.
     */
    static applyTheme(themeName) {
        document.body.classList.remove('theme-default', 'theme-dark', 'theme-light'); // Remove all known themes
        if (themeName && themeName !== 'default') {
            document.body.classList.add(`theme-${themeName}`);
            // Also handle the dark mode toggle if it exists and theme is dark/light
            const darkModeToggle = document.getElementById('settingsDarkModeToggle');
            if (darkModeToggle) {
                darkModeToggle.checked = (themeName === 'dark');
            }
        } else {
            // Default theme logic (e.g., no specific class or a 'theme-default' class)
            document.body.classList.add('theme-default'); // Or just leave empty
            const darkModeToggle = document.getElementById('settingsDarkModeToggle');
            if (darkModeToggle) {
                darkModeToggle.checked = false; // Default is usually light
            }
        }
        console.log(`[Utils] Theme applied: ${themeName}`);
    }

    /**
     * Adds a horizontal scroll slider for elements that overflow horizontally.
     * This is useful for forms or tables that become too wide on small screens.
     * @param {HTMLElement} container - The container element to add the slider for.
     */
    static addHorizontalSlider(container) {
        // Prevent adding multiple sliders or if container is not valid
        if (!container || container.querySelector(':scope > .h-scroll-slider')) return;

        // Determine the actual scrollable content element within the container
        const contentEl = container.querySelector('form') || container.querySelector('table') || container.firstElementChild || container;

        // Function to calculate horizontal overflow
        const getOverflow = () => (Math.max(container.scrollWidth, contentEl ? contentEl.scrollWidth : 0) - container.clientWidth);

        let needsSlider = getOverflow() > 8; // Small threshold for minor overflows
        // Force slider for the students form container on the students tab specifically for better UX on mobile
        const forced = !!(container.closest('#students') && container.querySelector('form'));
        
        if (!needsSlider && !forced) return; // No need for a slider if no overflow and not forced

        // Add a class to the container to apply necessary CSS for the slider
        container.classList.add('has-hscroll');

        // Create slider elements
        const wrap = document.createElement('div');
        wrap.className = 'h-scroll-slider'; // CSS for positioning and styling the slider

        const range = document.createElement('input');
        range.type = 'range';
        range.min = 0;
        range.max = 1000; // Use 1000 for fine-grained control (0-100%)
        range.value = 0;
        wrap.appendChild(range);

        // Function to synchronize slider value from container scroll position
        const syncFromScroll = () => {
            const maxScroll = getOverflow();
            if (maxScroll <= 0) {
                // If no overflow, disable slider or remove it
                if (forced) {
                    range.disabled = true;
                    range.value = 0;
                    return;
                }
                if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
                return;
            }
            range.disabled = false;
            const pos = container.scrollLeft / maxScroll;
            range.value = Math.round(pos * 1000);
        };

        // Function to synchronize container scroll position from slider value
        const syncFromRange = () => {
            const maxScroll = getOverflow();
            const pos = parseInt(range.value, 10) / 1000;
            container.scrollLeft = Math.round(maxScroll * pos);
        };

        // Attach event listeners
        container.addEventListener('scroll', syncFromScroll);
        range.addEventListener('input', syncFromRange);

        // Use ResizeObserver to react to container or content size changes
        const ro = new ResizeObserver(() => {
            // Re-evaluate if slider is needed and update max value
            const newOverflow = getOverflow();
            if (newOverflow <= 4 && !forced) { // If no overflow and not forced, remove slider
                if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
                container.classList.remove('has-hscroll');
            } else {
                if (!wrap.parentNode) container.appendChild(wrap); // Add back if it was removed
                container.classList.add('has-hscroll');
                range.disabled = newOverflow <= 4;
                syncFromScroll(); // Update slider position
            }
        });
        ro.observe(container); // Observe the main container
        if (contentEl && contentEl !== container) {
            ro.observe(contentEl); // Also observe content element if it's different
        }

        container.appendChild(wrap); // Add the slider to the container
        syncFromScroll(); // Initial sync
        console.log("[Utils] Horizontal slider added.");
    }

    /**
     * Parses CSV content into an array of objects. Assumes first row is header.
     * @param {string} csvText - The CSV content string.
     * @returns {Array<Object>} Array of parsed objects.
     */
    static parseCSV(csvText) {
        const lines = csvText.split(/\r\n|\n/).filter(line => line.trim() !== '');
        if (lines.length === 0) return [];

        const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        const records = [];

        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
            const record = {};
            headers.forEach((header, index) => {
                record[header] = values[index] !== undefined ? values[index] : '';
            });
            records.push(record);
        }
        return records;
    }

    /**
     * Parses JSON content into an array of objects.
     * @param {string} jsonText - The JSON content string.
     * @returns {Array<Object>} Array of parsed objects.
     */
    static parseJSON(jsonText) {
        try {
            const data = JSON.parse(jsonText);
            // Ensure it's an array of objects. If it's a single object, wrap it.
            return Array.isArray(data) ? data : [data];
        } catch (e) {
            console.error("Error parsing JSON:", e);
            throw new Error("Invalid JSON file. Please ensure it's a valid JSON array or object.");
        }
    }
}

// Export for use in other modules
export default Utils;
