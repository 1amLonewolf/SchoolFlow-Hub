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

    /**
     * Export HTML element to PDF
     * @param {string} elementId - ID of the HTML element to export
     * @param {string} filename - Name of the PDF file to generate
     */
    static async exportToPDF(elementId, filename = 'report.pdf') {
        try {
            // Show loading message
            this.showMessage('Generating PDF report...', 'info');
            
            // Get the element to export
            const element = document.getElementById(elementId);
            if (!element) {
                throw new Error('Element not found');
            }
            
            // Use html2canvas to capture the element
            const canvas = await html2canvas(element, {
                scale: 2, // Higher quality
                useCORS: true,
                logging: false
            });
            
            // Convert canvas to image data
            const imgData = canvas.toDataURL('image/png');
            
            // Create PDF using jsPDF
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'px',
                format: [canvas.width, canvas.height]
            });
            
            // Add image to PDF
            pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
            
            // Save the PDF
            pdf.save(filename);
            
            // Show success message
            this.showMessage('PDF report generated successfully!', 'success');
        } catch (error) {
            console.error('Error generating PDF:', error);
            this.showMessage('Error generating PDF report. Please try again.', 'error');
        }
    }

    /**
     * Export table data to PDF
     * @param {string} tableId - ID of the table element to export
     * @param {string} title - Title for the PDF report
     * @param {string} filename - Name of the PDF file to generate
     */
    static async exportTableToPDF(tableId, title = 'Report', filename = 'report.pdf') {
        try {
            // Show loading message
            this.showMessage('Generating PDF report...', 'info');
            
            // Get the table element
            const table = document.getElementById(tableId);
            if (!table) {
                throw new Error('Table not found');
            }
            
            // Create a temporary container for the PDF content
            const container = document.createElement('div');
            container.style.padding = '20px';
            container.style.backgroundColor = 'white';
            container.style.width = '800px';
            
            // Add title
            const titleElement = document.createElement('h1');
            titleElement.textContent = title;
            titleElement.style.textAlign = 'center';
            titleElement.style.color = '#2F1857';
            titleElement.style.marginBottom = '20px';
            container.appendChild(titleElement);
            
            // Clone the table
            const tableClone = table.cloneNode(true);
            tableClone.style.width = '100%';
            tableClone.style.borderCollapse = 'collapse';
            tableClone.style.marginTop = '20px';
            
            // Apply some basic styling to the cloned table
            const headers = tableClone.querySelectorAll('th');
            headers.forEach(header => {
                header.style.backgroundColor = '#2F1857';
                header.style.color = 'white';
                header.style.padding = '12px';
                header.style.textAlign = 'left';
                header.style.fontWeight = 'bold';
            });
            
            const cells = tableClone.querySelectorAll('td');
            cells.forEach(cell => {
                cell.style.padding = '10px';
                cell.style.borderBottom = '1px solid #ddd';
            });
            
            container.appendChild(tableClone);
            
            // Add to body temporarily
            container.style.position = 'absolute';
            container.style.left = '-9999px';
            document.body.appendChild(container);
            
            // Generate PDF
            const canvas = await html2canvas(container, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: 'white'
            });
            
            // Clean up
            document.body.removeChild(container);
            
            // Convert to PDF
            const { jsPDF } = window.jspdf;
            const imgWidth = 800;
            const pageHeight = canvas.height * imgWidth / canvas.width;
            const pdf = new jsPDF('p', 'px', [imgWidth, pageHeight]);
            
            const imgData = canvas.toDataURL('image/png');
            pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, pageHeight);
            
            // Save the PDF
            pdf.save(filename);
            
            // Show success message
            this.showMessage('PDF report generated successfully!', 'success');
        } catch (error) {
            console.error('Error generating PDF:', error);
            this.showMessage('Error generating PDF report. Please try again.', 'error');
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Utils;
} else {
    window.Utils = Utils;
}