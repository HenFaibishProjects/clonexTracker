const baseUrl = location.port === '8080'
    ? 'http://localhost:3000/api/benzos'
    : '/api/benzos';

// Immediate auth check before any execution
if (!localStorage.getItem('token')) {
    window.location.href = 'login.html';
}

let allEntries = [];

let lastRenderedEntries = [];

// Export functions defined after utilities — see bottom of file
let dosageChart;
let isPageActive = true;
let lastTakenAt;

// ========== NOTIFICATION SYSTEM ==========

function showConfirmDialog(options) {
    const {
        title = 'Are you sure?',
        message = '',
        confirmText = 'Confirm',
        cancelText = 'Cancel',
        icon = '⚠️',
        type = 'danger',
        onConfirm,
        onCancel
    } = options;

    $('.confirm-dialog-overlay').remove();

    const dialog = $(`
        <div class="confirm-dialog-overlay">
            <div class="confirm-dialog-content">
                <div class="dialog-icon">${icon}</div>
                <h3 class="dialog-title">${title}</h3>
                <p class="dialog-message">${message}</p>
                <div class="dialog-actions">
                    <button class="dialog-btn dialog-btn-cancel">${cancelText}</button>
                    <button class="dialog-btn dialog-btn-confirm" style="background: ${type === 'danger' ? 'var(--color-danger-600)' : 'var(--color-primary-600)'}">
                        ${confirmText}
                    </button>
                </div>
            </div>
        </div>
    `);

    $('body').append(dialog);

    // Handle cancel
    dialog.find('.dialog-btn-cancel').on('click', function () {
        dialog.fadeOut(200, function () {
            $(this).remove();
            if (onCancel) onCancel();
        });
    });

    // Handle confirm
    dialog.find('.dialog-btn-confirm').on('click', function () {
        dialog.fadeOut(200, function () {
            $(this).remove();
            if (onConfirm) onConfirm();
        });
    });

    // Close on overlay click
    dialog.on('click', function (e) {
        if (e.target === this) {
            dialog.find('.dialog-btn-cancel').click();
        }
    });
}

function showNotification(message, type = 'info', duration = 4000) {
    // Remove any existing notifications
    $('.notification-toast').remove();

    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };

    const colors = {
        success: 'var(--color-success-600)',
        error: 'var(--color-danger-600)',
        warning: 'var(--color-warning-600)',
        info: 'var(--color-primary-600)'
    };

    const bgColors = {
        success: 'var(--color-success-50)',
        error: 'var(--color-danger-50)',
        warning: 'var(--color-warning-50)',
        info: 'var(--color-primary-50)'
    };

    const notification = $(`
        <div class="notification-toast" style="
            position: fixed;
            top: 20px;
            right: 20px;
            min-width: 300px;
            max-width: 500px;
            padding: var(--space-4) var(--space-6);
            background: ${bgColors[type]};
            border: 2px solid ${colors[type]};
            border-radius: var(--radius-xl);
            box-shadow: var(--shadow-2xl);
            z-index: 10000;
            display: flex;
            align-items: center;
            gap: var(--space-3);
            animation: slideInRight 0.3s ease-out;
        ">
            <div style="font-size: 1.5rem;">${icons[type]}</div>
            <div style="flex: 1; color: var(--text-primary); font-weight: var(--font-weight-medium);">${message}</div>
            <button onclick="$(this).closest('.notification-toast').remove()" style="
                background: none;
                border: none;
                color: ${colors[type]};
                cursor: pointer;
                font-size: 1.2rem;
                padding: 0;
                line-height: 1;
            ">×</button>
        </div>
    `);

    // Add animation styles if not already present
    if (!$('#notification-styles').length) {
        $('<style id="notification-styles">@keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } } body.dark-mode .notification-toast { background: var(--bg-elevated) !important; border-color: ${colors[type]} !important; }</style>').appendTo('head');
    }

    $('body').append(notification);

    if (duration > 0) {
        setTimeout(() => {
            notification.fadeOut(300, function () { $(this).remove(); });
        }, duration);
    }
}



function formatTimestamp(datetimeStr) {
    if (!datetimeStr) return '';
    const date = new Date(datetimeStr);
    if (isNaN(date.getTime())) return datetimeStr;

    const storedFormat = localStorage.getItem('timeFormat') || '12';
    const options = {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: storedFormat === '12'
    };

    return date.toLocaleString('he-IL', options);
}






window.addEventListener('DOMContentLoaded', () => {
    const user = JSON.parse(localStorage.getItem('user'));
    const benzosType = JSON.parse(localStorage.getItem('user')).benzosType;
    document.getElementById('userNameDisplay').textContent = user.name;
    document.getElementById('benzosTitle').textContent = `Benzodiazepines Tracker for ${benzosType}`;

    // Apply saved theme
    const savedTheme = localStorage.getItem('appTheme') || 'default';
    applyTheme(savedTheme);
});

function applyTheme(theme) {
    document.body.classList.remove('theme-serenity', 'theme-midnight');
    if (theme !== 'default') {
        document.body.classList.add(`theme-${theme}`);
    }
    localStorage.setItem('appTheme', theme);

    // Update chart colors if they exist
    if (dosageChart) renderChart(allEntries);
    if (dailyChart) renderDailyChart(allEntries);
}


function batchImport(entries) {
    const promises = entries.map(entry =>
        $.ajax({
            url: baseUrl,
            method: 'POST',
            headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`
            },
            contentType: 'application/json',
            data: JSON.stringify(entry)
        })
    );

    Promise.all(promises)
        .then(() => {
            showNotification('Import complete!', 'success');
            loadEntries();
            setTimeout(() => {
                location.reload();
                setTimeout(() => location.reload(), 500); // second refresh after 0.5 sec
            }, 300);
        })
        .catch(() => showNotification('Some entries failed to import.', 'error'));
}


$(document).ready(function () {
    const hourFormat = localStorage.getItem('timeFormat') || '12';

    const flatpickrInstance = flatpickr('#entryTakenAt', {
        enableTime: true,
        dateFormat: hourFormat === '24' ? 'Y-m-d H:i' : 'Y-m-d h:i K',
        time_24hr: hourFormat === '24',
        altInput: true,
        altFormat: hourFormat === '24' ? 'Y-m-d H:i' : 'Y-m-d h:i K',
        allowInput: true
    });

    $('#nowBtn').click(function () {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const localDatetimeStr = `${year}-${month}-${day}T${hours}:${minutes}`;
        flatpickrInstance.setDate(localDatetimeStr, true);
    });

    const token = localStorage.getItem('token');
    if (!token) {
        showNotification('You must be logged in to access this page.', 'warning');
        setTimeout(() => { window.location.href = 'login.html'; }, 1000);
        return;
    }

    $('#importCsvBtn').click(function () {
        $('#csvFileInput').click();
    });

    $('#csvFileInput').on('change', function (e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function (event) {
            const csv = event.target.result;
            const lines = csv.split('\n').filter(Boolean).slice(1); // skip header

            const importedEntries = lines.map(line => {
                const parts = line
                    .split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/)
                    .map(s => s.replace(/^"|"$/g, '').trim());

                if (parts.length < 2) return null;

                const [dosageStr, datetimeStr, reason = '', comments = ''] = parts;

                if (!dosageStr || !datetimeStr) return null;

                const dosage = parseFloat(dosageStr);
                if (isNaN(dosage)) return null;

                try {
                    const [datePart, timePart] = datetimeStr.split(' ');
                    const [day, month, year] = datePart.split('.');
                    const [hour, minute] = timePart.split(':');
                    const iso = new Date(
                        `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hour.padStart(2, '0')}:${minute.padStart(2, '0')}:00Z`
                    ).toISOString();


                    return {
                        dosageMg: dosage,
                        takenAt: iso,
                        reason,
                        comments
                    };
                } catch (err) {
                    console.warn('⚠️ Bad datetime:', datetimeStr);
                    return null;
                }
            });


            const validEntries = importedEntries.filter(Boolean);
            console.log(`✅ Parsed ${validEntries.length} valid entries`);

            if (!validEntries.length) {
                showNotification('CSV appears empty or malformed.', 'error');
                return;
            }

            $('#importModal').addClass('active');

            $('#deleteAndImportBtn').off('click').on('click', function () {
                closeImportModal();
                $.ajax({
                    url: `${baseUrl}/delete-many`,
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`
                    },
                    contentType: 'application/json',
                    data: JSON.stringify({ ids: lastRenderedEntries.map(e => e.id) }),
                    success: () => batchImport(validEntries),
                    error: () => showNotification('Failed to delete existing entries', 'error')
                });
            });

            $('#mergeImportBtn').off('click').on('click', function () {
                closeImportModal();
                batchImport(validEntries);
            });


            $('#csvFileInput').val('');
        };
        reader.readAsText(file);
    });


    $('#logoutBtn').click(function () {
        localStorage.removeItem('token');
        window.location.href = 'login.html';
    });



    $('#dailyRange').on('change', function () {
        const selected = $(this).val(); // Will be "14" for the new option
        renderDailyChart(lastRenderedEntries, selected);
    });

    $('#dosageRange').on('change', function () {
        const selected = $(this).val();
        renderChart(lastRenderedEntries, selected);
    });

    $('#analyticsRange').on('change', function () {
        const selected = $(this).val();
        loadEnhancedAnalytics(selected);
    });

    $.ajaxSetup({
        headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
        }
    });

    document.addEventListener('visibilitychange', () => {
        isPageActive = !document.hidden;
    });

    // Export buttons are handled via onclick attributes in HTML

    $('#filterBtn').click(function () {
        $('#dosageRange').prop('disabled', true);
        $('#dosageRange').addClass('disabled');
        $('#dailyRange').prop('disabled', true);
        $('#dailyRange').addClass('disabled');
        const from = $('#filterFrom').val();
        const to = $('#filterTo').val();
        const dosageMin = parseFloat($('#filterDosageFrom').val().replace(',', '.'));
        const dosageMax = parseFloat($('#filterDosageTo').val().replace(',', '.'));
        const reasonFilter = $('#filterReason').val().trim().toLowerCase();
        const commentFilter = $('#filterComment').val().trim().toLowerCase();

        const shouldFilterDates = from || to;
        const endpoint = shouldFilterDates
            ? `${baseUrl}/between?from=${from || '1900-01-01'}&to=${to || '2100-12-31'}`
            : baseUrl;

        $.get(endpoint, function (entries) {
            let filtered = entries;

            if (!isNaN(dosageMin)) {
                filtered = filtered.filter(e => e.dosageMg >= dosageMin);
            }
            if (!isNaN(dosageMax)) {
                filtered = filtered.filter(e => e.dosageMg <= dosageMax);
            }

            if (reasonFilter) {
                filtered = filtered.filter(e => (e.reason || '').toLowerCase().includes(reasonFilter));
            }
            if (commentFilter) {
                filtered = filtered.filter(e => (e.comments || '').toLowerCase().includes(commentFilter));
            }

            renderEntries(filtered);
            updateStats(filtered);
            updateFilterStats(filtered);
            renderChart(filtered);
            renderDailyChart(filtered);
            $('#statsBox').addClass('d-none');
        });
    });

    $('#clearFilterBtn').click(function () {
        $('#filterFrom, #filterTo, #filterDosageFrom, #filterDosageTo, #filterReason, #filterComment').val('');
        loadEntries();
        renderChart(lastRenderedEntries);
        $('#filterStatsBox').addClass('d-none').html('');
        $('#statsBox').removeClass('d-none');
        $('#dosageRange').prop('disabled', false).removeClass('disabled');
        $('#dailyRange').prop('disabled', false).removeClass('disabled');
    });

    $('#benzosForm').submit(function (e) {
        e.preventDefault();

        const dosageValue = $('#dosage').val().replace(',', '.').trim();
        const takenAtValue = $('#entryTakenAt').val();

        if (!dosageValue || !takenAtValue) {
            showNotification('Please fill dosage and time!', 'warning');
            return;
        }

        const entry = {
            dosageMg: Number(dosageValue),
            takenAt: localToUtcIso(takenAtValue),
            reason: $('#reason').val(),
            comments: $('#comments').val()
        };

        $.ajax({
            url: baseUrl,
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`
            },
            contentType: 'application/json',
            data: JSON.stringify(entry),
            success: function () {
                $('#benzosForm')[0].reset();
                loadEntries();
                showNotification('Entry added successfully!', 'success');
            },
            error: function (err) {
                console.error('Failed to save entry:', err);
                showNotification('Something went wrong saving the entry.', 'error');
            }
        });
    });

    function localToUtcIso(localDatetimeStr) {
        if (!localDatetimeStr) return null;
        // The most standard way across all browsers/servers:
        return new Date(localDatetimeStr).toISOString();
    }





    $('#entriesTable').on('click', '.delete-btn', function () {
        const id = $(this).data('id');
        showConfirmDialog({
            title: 'Delete Entry?',
            message: 'Are you sure you want to remove this medication record? This action cannot be undone.',
            confirmText: 'Delete',
            icon: '🗑️',
            onConfirm: () => {
                $.ajax({
                    url: `${baseUrl}/${id}`,
                    type: 'DELETE',
                    success: () => {
                        loadEntries();
                        showNotification('Entry deleted.', 'success');
                    }
                });
            }
        });
    });

    $('#entriesTable').on('click', '.edit-btn', function () {
        const $row = $(this).closest('tr');
        $row.find('.value').addClass('d-none');
        $row.find('.edit').removeClass('d-none');
        $row.find('.edit-btn').addClass('d-none');
        $row.find('.save-btn').removeClass('d-none');
        $row.find('.cancel-btn').removeClass('d-none');

        $('#entriesTable .edit-btn, #entriesTable .delete-btn').not($row.find('.edit-btn, .delete-btn')).each(function () {
            $(this).prop('disabled', true).addClass('disabled-blur');
        });
    });

    $('#entriesTable').on('click', '.cancel-btn', function () {
        const $row = $(this).closest('tr');
        $row.find('.value').removeClass('d-none');
        $row.find('.edit').addClass('d-none');
        $row.find('.edit-btn').removeClass('d-none');
        $row.find('.save-btn').addClass('d-none');
        $row.find('.cancel-btn').addClass('d-none');

        $('#entriesTable .edit-btn, #entriesTable .delete-btn').prop('disabled', false);
    });

    $('#entriesTable').on('click', '.save-btn', function () {
        const $row = $(this).closest('tr');
        const id = $row.data('id');

        const dosageValue = $row.find('input.dosage').val().replace(',', '.').trim();
        const dosageMg = Number(dosageValue);

        if (isNaN(dosageMg) || dosageMg < 0.1) {
            showNotification('Dosage must be a number and at least 0.1 mg.', 'warning');
            return;
        }

        const updated = {
            dosageMg,
            takenAt: localToUtcIso($row.find('input.takenAt').val()),
            reason: $row.find('input.reason').val(),
            comments: $row.find('input.comments').val()
        };

        $.ajax({
            url: `${baseUrl}/${id}`,
            type: 'PATCH',
            contentType: 'application/json',
            data: JSON.stringify(updated),
            success: function () {
                loadEntries();
                $('#entriesTable .edit-btn, #entriesTable .delete-btn').prop('disabled', false);
                showNotification('Entry updated successfully!', 'success');
            },
            error: () => showNotification('Error saving edit', 'error')
        });
    });


    $('#dailyRangeDropdown .dropdown-item').on('click', function () {
        //const selectedRange = $(this).data('range');
        const selectedRange = $(this).data('range');
        $('#dailyRangeBtn').text($(this).text());
        renderDailyChart(allEntries, selectedRange); // ✅ now passes selected range
    });

    // ---- Export buttons ----
    $('#exportCsvBtn').on('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        const entries = lastRenderedEntries;
        if (!entries || entries.length === 0) {
            showNotification('No entries to export.', 'warning');
            return;
        }

        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const benzosType = user.benzosType || 'Unknown';
        const now = new Date().toLocaleDateString();

        const lines = [
            `# Benzos Tracker Export - ${benzosType} - ${now}`,
            'Dosage (mg),Taken At,Reason,Comments',
            ...entries.map(e => [
                e.dosageMg ?? '',
                formatTimestamp(e.takenAt),
                `"${(e.reason || '').replace(/"/g, '""')}"`,
                `"${(e.comments || '').replace(/"/g, '""')}"`
            ].join(','))
        ].join('\n');

        const blob = new Blob([lines], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `benzos-export-${new Date().toISOString().slice(0, 10)}.csv`;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        showNotification(`✅ Exported ${entries.length} entries to CSV`, 'success');
    });

    $('#exportPdfBtn').on('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        const entries = lastRenderedEntries;
        if (!entries || entries.length === 0) {
            showNotification('No entries to export.', 'warning');
            return;
        }

        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const benzosType = user.benzosType || 'Unknown';
        const now = new Date().toLocaleDateString();

        const rows = entries.map(e => `<tr>
            <td><strong>${e.dosageMg ?? '—'} mg</strong></td>
            <td>${formatTimestamp(e.takenAt)}</td>
            <td>${e.reason || '—'}</td>
            <td>${e.comments || '—'}</td>
        </tr>`).join('');

        const win = window.open('', '_blank');
        if (!win) { showNotification('Allow popups for PDF export.', 'warning'); return; }

        win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>Benzos Export</title><style>
body{font-family:Arial,sans-serif;padding:32px;color:#1a1a2e}
h1{font-size:20px;margin-bottom:4px}
.meta{font-size:12px;color:#666;margin-bottom:24px}
table{width:100%;border-collapse:collapse;font-size:13px}
th{background:#4169ff;color:white;padding:10px 12px;text-align:left}
td{padding:9px 12px;border-bottom:1px solid #e5e7eb}
tr:nth-child(even) td{background:#f9fafb}
.footer{margin-top:32px;font-size:11px;color:#999;text-align:center}
</style></head><body>
<h1>💊 Benzos Tracker — ${benzosType}</h1>
<div class="meta">Exported: ${now} | ${entries.length} entries</div>
<table><thead><tr><th>Dosage</th><th>Taken At</th><th>Reason</th><th>Comments</th></tr></thead>
<tbody>${rows}</tbody></table>
<div class="footer">Generated by Benzos Tracker • LiDa Software © 2026</div>
</body></html>`);
        win.document.close();
        win.focus();
        setTimeout(() => win.print(), 500);
        showNotification(`🖨️ PDF ready — ${entries.length} entries`, 'success');
    });

    loadEntries(30);
});

setInterval(() => {
    if (!lastTakenAt || !isPageActive) return;

    const now = new Date();
    const diff = now - lastTakenAt;
    const hours = String(Math.floor(diff / (1000 * 60 * 60))).padStart(2, '0');
    const minutes = String(Math.floor((diff / (1000 * 60)) % 60)).padStart(2, '0');
    const seconds = String(Math.floor((diff / 1000) % 60)).padStart(2, '0');

    $('#runningTimer').text(`${hours}:${minutes}:${seconds}`);
}, 1000);

function loadEntries(days = 30) {
    let endpoint = baseUrl;
    let timeframeLabel = 'All Data';

    if (days !== 'all') {
        // Use the new timeframeDays query parameter for better backend performance
        endpoint = `${baseUrl}?timeframeDays=${days}`;
        timeframeLabel = `Last ${days} Days`;
    }

    $('#viewStatusLabel').text(timeframeLabel);

    // Update button states in the UI
    $('.btn-group-modern .btn-modern').removeClass('btn-primary-modern').addClass('btn-secondary-modern');
    if (days === 'all') {
        $('.btn-group-modern .btn-modern[onclick*="all"]').addClass('btn-primary-modern').removeClass('btn-secondary-modern');
    } else {
        $(`.btn-group-modern .btn-modern[onclick*="(${days})"]`).addClass('btn-primary-modern').removeClass('btn-secondary-modern');
    }

    // Show Loading Skeleton
    const $tbody = $('#entriesTable tbody');
    $tbody.html(`
        <tr class="skeleton-row-container">
            <td colspan="5"><div class="skeleton-row"></div></td>
        </tr>
        <tr class="skeleton-row-container">
            <td colspan="5"><div class="skeleton-row" style="animation-delay: 0.2s"></div></td>
        </tr>
        <tr class="skeleton-row-container">
            <td colspan="5"><div class="skeleton-row" style="animation-delay: 0.4s"></div></td>
        </tr>
    `);

    $.ajax({
        url: endpoint,
        method: 'GET',
        headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        success: function (entries) {
            allEntries = entries; // Update current view entries
            renderEntries(entries);
            updateStats(entries);
            updateStatsGrid(entries);
            renderChart(entries);
            renderDailyChart(entries);
            updateMedicationAdvisor(entries);
            loadEnhancedAnalytics();

            // Refresh goal progress to ensure today's dosage is accurate
            if ($('#taperingGoalSection').is(':visible')) {
                loadTaperingGoal();
            }
        },
        error: function (xhr) {
            if (xhr.status === 401) {
                window.location.href = 'index.html';
            }
        }
    });

}


function updateMedicationAdvisor(entries) {
    if (!entries.length) {
        $('#advisorCard').hide();
        return;
    }

    // Get the absolute latest entry from all entries (not just filtered ones)
    const sorted = [...allEntries].sort((a, b) => new Date(b.takenAt).getTime() - new Date(a.takenAt).getTime());
    const lastEntry = sorted[0];

    let lastTimeStr = lastEntry.takenAt;
    if (typeof lastTimeStr === 'string' && !lastTimeStr.includes('Z') && !lastTimeStr.includes('+')) {
        lastTimeStr += 'Z';
    }
    const lastDate = new Date(lastTimeStr);
    const now = new Date();
    const diffMs = now - lastDate;
    const diffHours = diffMs / (1000 * 60 * 60);

    const advisorCard = $('#advisorCard');
    const advisorIcon = $('#advisorIcon');
    const advisorText = $('#advisorText');
    const advisorMessage = $('#advisorMessage');

    let status = '';
    let icon = '';
    let message = '';
    let levelClass = '';

    if (diffHours < 4) {
        status = 'Strong Red - Avoid';
        levelClass = 'advisor-strong-red';
        icon = '🚫';
        message = 'Please avoid taking another dose right now.';
    } else if (diffHours < 7) {
        status = 'Red - Warning';
        levelClass = 'advisor-red';
        icon = '⚠️';
        message = 'Only take if you really have to.';
    } else if (diffHours < 11) {
        status = 'Yellow - Caution';
        levelClass = 'advisor-yellow';
        icon = '🕒';
        message = 'Approaching safe time - be aware.';
    } else {
        status = 'Green - Safe';
        levelClass = 'advisor-safe';
        icon = '✅';
        message = 'Safe interval reached.';
    }

    const h = Math.floor(diffHours);
    const m = Math.floor((diffHours % 1) * 60);

    // State configuration
    const states = {
        'strong-red': {
            bg: 'linear-gradient(135deg, #1a0505 0%, #2d0a0a 100%)',
            glow: 'radial-gradient(ellipse at 30% 50%, rgba(220,38,38,0.25) 0%, transparent 70%)',
            ringBg: 'rgba(220,38,38,0.2)',
            ringBorder: '3px solid #ef4444',
            badgeBg: 'rgba(220,38,38,0.2)',
            badgeColor: '#fca5a5',
            badgeText: '🚫 AVOID — Strong Red',
            textColor: '#fff',
            subColor: '#fca5a5',
            hourColor: '#ef4444',
            icon: '🚫',
            title: `It's been <strong>${h}h ${m}m</strong> since your last dose`,
            msg: 'Please avoid taking another dose right now. The suggested gap is over 11h.'
        },
        'red': {
            bg: 'linear-gradient(135deg, #1a0a05 0%, #2d1005 100%)',
            glow: 'radial-gradient(ellipse at 30% 50%, rgba(234,88,12,0.25) 0%, transparent 70%)',
            ringBg: 'rgba(234,88,12,0.2)',
            ringBorder: '3px solid #f97316',
            badgeBg: 'rgba(234,88,12,0.2)',
            badgeColor: '#fdba74',
            badgeText: '⚠️ WARNING — Red',
            textColor: '#fff',
            subColor: '#fdba74',
            hourColor: '#f97316',
            icon: '⚠️',
            title: `It's been <strong>${h}h ${m}m</strong> since your last dose`,
            msg: 'Only take if you really have to. The suggested gap is over 11h.'
        },
        'yellow': {
            bg: 'linear-gradient(135deg, #1a1505 0%, #2d2005 100%)',
            glow: 'radial-gradient(ellipse at 30% 50%, rgba(202,138,4,0.25) 0%, transparent 70%)',
            ringBg: 'rgba(202,138,4,0.2)',
            ringBorder: '3px solid #eab308',
            badgeBg: 'rgba(202,138,4,0.2)',
            badgeColor: '#fde047',
            badgeText: '🕒 CAUTION — Yellow',
            textColor: '#fff',
            subColor: '#fde047',
            hourColor: '#eab308',
            icon: '🕒',
            title: `It's been <strong>${h}h ${m}m</strong> since your last dose`,
            msg: 'Approaching safe time — be aware. The suggested gap is over 11h.'
        },
        'safe': {
            bg: 'linear-gradient(135deg, #051a0d 0%, #0a2d18 100%)',
            glow: 'radial-gradient(ellipse at 30% 50%, rgba(16,185,129,0.3) 0%, transparent 70%)',
            ringBg: 'rgba(16,185,129,0.2)',
            ringBorder: '3px solid #10b981',
            badgeBg: 'rgba(16,185,129,0.2)',
            badgeColor: '#6ee7b7',
            badgeText: '✅ SAFE — Green',
            textColor: '#fff',
            subColor: '#6ee7b7',
            hourColor: '#10b981',
            icon: '✅',
            title: `It's been <strong>${h}h ${m}m</strong> since your last dose`,
            msg: 'Safe interval reached. The suggested gap is over 11h.'
        }
    };

    const cfg = states[levelClass.replace('advisor-', '')] || states['safe'];
    const card = document.getElementById('advisorCard');
    const inner = document.getElementById('advisorInner');
    const ring = document.getElementById('advisorRing');
    const badge = document.getElementById('advisorBadge');
    const advisorTextEl = document.getElementById('advisorText');
    const advisorMsgEl = document.getElementById('advisorMessage');
    const hourNum = document.getElementById('advisorHourNum');
    const bgGlow = document.getElementById('advisorBgGlow');

    card.style.display = 'block';
    card.style.background = cfg.bg;
    bgGlow.style.background = cfg.glow;
    ring.style.background = cfg.ringBg;
    ring.style.border = cfg.ringBorder;
    ring.style.boxShadow = `0 0 20px ${cfg.hourColor}40`;
    ring.textContent = cfg.icon;
    badge.style.background = cfg.badgeBg;
    badge.style.color = cfg.badgeColor;
    badge.textContent = cfg.badgeText;
    advisorTextEl.style.color = cfg.textColor;
    advisorTextEl.innerHTML = cfg.title;
    advisorMsgEl.style.color = cfg.subColor;
    advisorMsgEl.innerHTML = cfg.msg;
    hourNum.style.color = cfg.hourColor;
    hourNum.textContent = h;
}


function updateStatsGrid(entries) {
    const $grid = $('#statsGrid');
    $grid.empty();

    if (!entries.length) {
        $grid.html('<div class="empty-state"><div class="empty-state-icon">📊</div><div class="empty-state-text">No data yet</div></div>');
        return;
    }

    const total = entries.length;
    const totalDosage = entries.reduce((sum, e) => sum + e.dosageMg, 0);
    const avgDosage = (totalDosage / total).toFixed(3);

    // Last 7 days
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const weekEntries = entries.filter(e => new Date(e.takenAt) >= oneWeekAgo);
    const weekTotal = weekEntries.reduce((sum, e) => sum + e.dosageMg, 0);
    const avgWeek = weekEntries.length ? (weekTotal / weekEntries.length).toFixed(2) : '0.00';

    // Last 30 days
    const oneMonthAgo = new Date();
    oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);
    const monthEntries = entries.filter(e => new Date(e.takenAt) >= oneMonthAgo);
    const monthTotal = monthEntries.reduce((sum, e) => sum + e.dosageMg, 0);
    const avgMonth = monthEntries.length ? (monthTotal / monthEntries.length).toFixed(2) : '0.00';

    // Trend: compare this week avg vs last 30-day avg
    const weekAvgNum = parseFloat(avgWeek);
    const monthAvgNum = parseFloat(avgMonth);
    const trendDiff = weekAvgNum - monthAvgNum;
    const absDiff = Math.abs(trendDiff);

    let trendIcon, trendColor, trendText;
    if (absDiff <= 0.13) {
        trendIcon = '🔵';
        trendColor = '#3b82f6';   // Blue — Consistent
        trendText = 'Consistent';
    } else if (trendDiff < 0) {
        trendIcon = '🟢';
        trendColor = '#10b981';   // Green — Reducing
        trendText = 'Reducing';
    } else {
        trendIcon = '🔴';
        trendColor = '#ef4444';   // Red — Increasing
        trendText = 'Increasing';
    }

    $grid.append(`
        <div class="stat-card premium-blur">
            <div class="stat-icon">💊</div>
            <div class="stat-value">${total}</div>
            <div class="stat-label">Total Entries</div>
        </div>
    `);

    $grid.append(`
        <div class="stat-card premium-blur" style="border-bottom: 3px solid ${trendColor}">
            <div class="stat-icon">${trendIcon}</div>
            <div class="stat-value" style="background: none; -webkit-text-fill-color: initial; color: ${trendColor}">${avgWeek} mg</div>
            <div class="stat-label">
                Weekly Avg: <strong>${trendText}</strong>
                <br><small style="opacity:.7">vs 30-day avg: ${avgMonth} mg</small>
            </div>
        </div>
    `);


    $grid.append(`
        <div class="stat-card premium-blur">
            <div class="stat-icon">📊</div>
            <div class="stat-value">${avgDosage} mg</div>
            <div class="stat-label">Overall Average</div>
        </div>
    `);

    $grid.append(`
        <div class="stat-card premium-blur">
            <div class="stat-icon">🗓️</div>
            <div class="stat-value">${avgMonth} mg</div>
            <div class="stat-label">Monthly Average</div>
        </div>
    `);
}


function updateFilterStats(entries) {
    if (!entries.length) {
        $('#filterStatsBox').addClass('d-none').html('');
        return;
    }

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const lastWeekEntries = entries.filter(e => new Date(e.takenAt) >= oneWeekAgo);

    const avgPerDayWeek = calculateAveragePerDay(entries, 7);
    const avgPerDayMonth = calculateAveragePerDay(entries, 30);

    const avgWeek = lastWeekEntries.length
        ? (lastWeekEntries.reduce((sum, e) => sum + e.dosageMg, 0) / lastWeekEntries.length).toFixed(2)
        : '0.00';

    const oneMonthAgo = new Date();
    oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);

    const lastMonthEntries = entries.filter(e => new Date(e.takenAt) >= oneMonthAgo);

    const avgMonth = lastMonthEntries.length
        ? (lastMonthEntries.reduce((sum, e) => sum + e.dosageMg, 0) / lastMonthEntries.length).toFixed(2)
        : '0.00';



    $('#filterStatsBox')
        .removeClass('d-none')
        .html(`
 <strong>Average Dosage in Last Week:</strong> ${avgWeek} mg<br/>
 <strong>Average Dosage in Last Month:</strong> ${avgMonth} mg
 `);
}

function updateStats(entries) {
    if (!entries.length) {
        $('#runningTimerCard').hide();
        return;
    }

    const lastEntry = entries[0];

    if (lastEntry.takenAt.includes(':')) {
        lastTakenAt = new Date(lastEntry.takenAt);
    } else {
        lastTakenAt = new Date(`${lastEntry.takenAt}:00:00+03:00`);
    }

    // Show and update the running timer card
    $('#runningTimerCard').show();
    $('#lastDoseInfo').html(`Last dose: ${lastEntry.dosageMg} mg at ${lastTakenAt.toLocaleString('he-IL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    })}`);
}

function exportToCSV(entries) {
    if (!entries.length) {
        showNotification('No entries to export!', 'warning');
        return;
    }

    const headers = ['Dosage (mg)', 'Taken At', 'Reason', 'Comments'];
    const rows = entries.map(e => {
        const date = new Date(e.takenAt);

        const formattedDate = date.toLocaleDateString('he-IL');
        const formattedTime = date.toLocaleTimeString('he-IL', {
            hour: '2-digit',
            minute: '2-digit'
        });

        const fullDateTime = `${formattedDate} ${formattedTime}`;

        return [
            e.dosageMg.toFixed(3),
            fullDateTime,
            `"${(e.reason || '').replace(/"/g, '""')}"`,
            `"${(e.comments || '').replace(/"/g, '""')}"`
        ];
    });

    const csvContent = [headers, ...rows]
        .map(row => row.join(','))
        .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.setAttribute('download', `benzos_entries_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification('CSV exported successfully!', 'success');
}



function getDatetimeInputValue(dateStr) {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function renderEntries(entries) {
    lastRenderedEntries = entries;
    updateExportBadge(entries);
    const $tbody = $('#entriesTable tbody');
    $tbody.empty();

    if (!entries.length) {
        $tbody.append(`
            <tr>
                <td colspan="5" style="border: none;">
                    <div class="pro-empty-state">
                        <div class="pro-empty-icon">📊</div>
                        <div class="pro-empty-title">No Entries Found</div>
                        <div class="pro-empty-text">Start tracking your medication by adding your first entry above. Your data will appear here in a beautiful organized way.</div>
                    </div>
                </td>
            </tr>
        `);
        return;
    }

    entries.forEach((entry) => {
        const row = `
 <tr data-id="${entry.id}" class="animate-fade-in">
 <td data-label="Dosage"><span class="value dosage">${entry.dosageMg}</span><input type="number" step="0.01" class="form-control form-control-sm edit dosage d-none" value="${entry.dosageMg}" /></td>
 <td data-label="Taken At">
 <span class="value takenAt">${formatTimestamp(entry.takenAt)}</span>
 <input type="datetime-local" class="form-control form-control-sm edit takenAt d-none" value="${getDatetimeInputValue(entry.takenAt)}" />
 </td> 
 <td data-label="Reason"><span class="value reason">${entry.reason || '-'}</span><input type="text" class="form-control form-control-sm edit reason d-none" value="${entry.reason || ''}" /></td>
 <td data-label="Comments"><span class="value comments">${entry.comments || '-'}</span><input type="text" class="form-control form-control-sm edit comments d-none" value="${entry.comments || ''}" /></td>
 <td style="text-align: center;">
 <div class="btn-group-modern" style="justify-content: center;">
 <button class="btn-modern btn-secondary-modern btn-sm edit-btn" title="Edit">
    <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4L18.5 2.5z"></path></svg>
 </button>
 <button class="btn-modern btn-primary-modern btn-sm save-btn d-none" title="Save">💾</button>
 <button class="btn-modern btn-secondary-modern btn-sm cancel-btn d-none" title="Cancel">❌</button>
 <button class="btn-modern btn-danger-modern btn-sm delete-btn" data-id="${entry.id}" title="Delete">
    <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
 </button>
 </div>
 </td>
 </tr>`;
        $tbody.append(row);
    });
}

function renderChart(entries, range = 'all') {
    const today = new Date();
    const filtered = entries.filter(e => {
        if (range === 'all') return true;
        const daysAgo = parseInt(range);
        const date = new Date(e.takenAt);
        return date >= new Date(today.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    });

    // Sort entries by date for the chart
    const sorted = [...filtered].sort((a, b) => new Date(a.takenAt) - new Date(b.takenAt));

    const labels = sorted.map(e =>
        new Date(e.takenAt).toLocaleDateString('he-IL', {
            day: '2-digit',
            month: '2-digit',
            year: '2-digit'
        }) + ' ' +
        new Date(e.takenAt).toLocaleTimeString('he-IL', {
            hour: '2-digit',
            minute: '2-digit'
        })
    );

    const data = sorted.map(e => e.dosageMg);

    if (dosageChart) {
        dosageChart.destroy();
    }

    const ctx = document.getElementById('dosageChart').getContext('2d');

    // Check if there's a target goal to show as an annotation
    const targetDosage = parseFloat($('#goalTargetDosage').text());
    const annotations = {};

    if (!isNaN(targetDosage) && $('#taperingGoalSection').is(':visible')) {
        annotations.targetLine = {
            type: 'line',
            yMin: targetDosage,
            yMax: targetDosage,
            borderColor: 'var(--color-success)',
            borderWidth: 2,
            borderDash: [6, 6],
            label: {
                display: true,
                content: `Target: ${targetDosage}mg`,
                position: 'end',
                backgroundColor: 'var(--color-success)',
                color: 'white'
            }
        };
    }

    dosageChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Dosage (mg)',
                data: data,
                borderColor: 'var(--color-primary-500)',
                backgroundColor: 'rgba(65, 105, 255, 0.1)',
                tension: 0.4,
                fill: true,
                pointRadius: 4,
                pointBackgroundColor: 'var(--color-primary-500)',
                pointBorderColor: 'white',
                pointBorderWidth: 2,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    padding: 12,
                    titleFont: { size: 14, weight: 'bold' },
                    bodyFont: { size: 13 },
                    cornerRadius: 8
                },
                annotation: {
                    annotations: annotations
                }
            },
            scales: {
                x: {
                    ticks: {
                        display: false
                    },
                    grid: {
                        display: false
                    }
                },
                y: {
                    ticks: {
                        color: 'var(--text-secondary)',
                        font: { size: 11 }
                    },
                    grid: {
                        color: 'var(--border-color)',
                        drawBorder: false
                    },
                    beginAtZero: true
                }
            }
        }
    });
}

function closeSettings() {
    $('.settings-overlay').fadeOut();
}

let dailyChart;

function renderDailyChart(entries, range = 'all') {
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today

    const now = new Date();
    now.setHours(0, 0, 0, 0); // Start of today

    // ✅ FIXED: Filter entries based on selected range
    const filtered = entries.filter(e => {
        if (range === 'all') return true;
        const daysAgo = parseInt(range);
        const date = new Date(e.takenAt);
        // FIXED: Remove the -1 to include the full number of days
        return date >= new Date(now.getTime() - (daysAgo - 1) * 86400000) && date <= new Date(today);
    });

    // ✅ FIXED: Show today even when no entries exist
    if (!filtered.length) {
        // Still show today with 0 dosage
        const todayKey = today.toISOString().split('T')[0];
        const dateLabels = [todayKey];
        const dateSums = [0];

        if (dailyChart) dailyChart.destroy();
        const ctx = document.getElementById('dailyChart').getContext('2d');
        dailyChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: dateLabels,
                datasets: [{
                    label: 'Daily Dosage (mg)',
                    data: dateSums,
                    backgroundColor: 'rgba(54, 162, 235, 0.5)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    x: {
                        ticks: {
                            color: $('body').hasClass('dark-mode') ? '#aaa' : '#000',
                            autoSkip: true,
                            maxTicksLimit: 15
                        }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: $('body').hasClass('dark-mode') ? '#aaa' : '#000'
                        }
                    }
                },
                plugins: {
                    legend: {
                        labels: {
                            color: $('body').hasClass('dark-mode') ? '#e0e0e0' : '#000'
                        }
                    }
                }
            }
        });

        $('#dailyAverageBox')
            .removeClass('d-none')
            .html(`
 <strong>Daily Avg for Selected Range:</strong> 0.00 mg/day<br/>
 <strong>No entries found for the selected range</strong>
 `);
        return;
    }

    // ✅ Sort entries by date
    const sortedEntries = [...filtered].sort((a, b) => new Date(a.takenAt) - new Date(b.takenAt));

    // ✅ Calculate max gap between doses (including gap to today)
    let maxGapHours = 0;
    for (let i = 1; i < sortedEntries.length; i++) {
        const gap = new Date(sortedEntries[i].takenAt) - new Date(sortedEntries[i - 1].takenAt);
        const gapHours = gap / (1000 * 60 * 60);
        if (gapHours > maxGapHours) maxGapHours = gapHours;
    }

    // Also check gap from last dose to today
    if (sortedEntries.length > 0) {
        const lastDoseTime = new Date(sortedEntries[sortedEntries.length - 1].takenAt);
        const gapToToday = today - lastDoseTime;
        const gapToTodayHours = gapToToday / (1000 * 60 * 60);
        if (gapToTodayHours > maxGapHours) maxGapHours = gapToTodayHours;
    }

    // ✅ Format gap string
    let gapStr = '';
    const roundedHours = Math.round(maxGapHours);
    if (roundedHours < 12) {
        gapStr = `${roundedHours} hours`;
    } else if (roundedHours < 24) {
        gapStr = `${roundedHours} hours (half day)`;
    } else {
        const days = Math.floor(roundedHours / 24);
        const extraHours = roundedHours % 24;
        const dayStr = days === 1 ? 'one day' : `${days} days`;
        gapStr = `${roundedHours} hours (${dayStr}${extraHours >= 12 ? ' and a half' : ''})`;
    }

    // ✅ NEW: Calculate average dosing frequency
    let avgFrequencyStr = '';
    let avgFrequency = '';
    const realRange = +range + 1
    if (sortedEntries.length > 1 && realRange) {
        // Calculate total time span in days
        const firstDose = new Date(sortedEntries[0].takenAt);
        const lastDose = new Date(sortedEntries[sortedEntries.length - 1].takenAt);
        const totalDays = (lastDose - firstDose) / (1000 * 60 * 60 * 24);

        // Calculate average days between doses
        const avgGapDays = (totalDays / (sortedEntries.length - 1)).toFixed(1);

        // Calculate average dosage per dose
        const avgDose = (sortedEntries.reduce((sum, e) => sum + e.dosageMg, 0) / sortedEntries.length).toFixed(2);
        const avgPerDay = (realRange / sortedEntries.length).toFixed(2);
        avgFrequencyStr = `The dosage was taken ${sortedEntries.length} times over the past ${realRange} days.`;
        avgFrequency = `Average of taking medication every ${avgPerDay} days in the time period of ${realRange} days.`;
    } else if (sortedEntries.length === 1) {
        avgFrequencyStr = `Only one dose recorded in ${realRange} days`;
    }

    // ✅ Group by day
    const dailyMap = {};
    filtered.forEach(e => {
        const day = new Date(e.takenAt).toISOString().split('T')[0];
        if (!dailyMap[day]) dailyMap[day] = [];
        dailyMap[day].push(e.dosageMg);
    });

    // ✅ FIXED: Calculate proper date range for chart display
    const start = filtered.length > 0
        ? new Date(Math.min(...filtered.map(e => new Date(e.takenAt))))
        : new Date(today);

    // For range filtering, ensure we show the full requested range
    if (range !== 'all') {
        const daysAgo = parseInt(range);
        const rangeStart = new Date(now.getTime() - (daysAgo - 1) * 86400000);
        rangeStart.setHours(0, 0, 0, 0);

        // Use the earlier of the two dates to ensure full range is shown
        if (rangeStart < start) {
            start.setTime(rangeStart.getTime());
        }
    }

    const todayKey = today.toISOString().split('T')[0];
    const end = new Date(today);
    end.setHours(23, 59, 59, 999); // End of today

    const dateLabels = [];
    const dateSums = [];

    let d = new Date(start);
    d.setHours(0, 0, 0, 0); // Start of day

    // Generate all dates in the range
    while (d <= end) {
        const key = d.toISOString().split('T')[0];
        const sum = dailyMap[key]
            ? dailyMap[key].reduce((sum, val) => sum + val, 0)
            : 0;

        dateLabels.push(key);
        dateSums.push(parseFloat(sum.toFixed(3)));
        d.setDate(d.getDate() + 1);
    }

    // Double-check that today is included
    if (!dateLabels.includes(todayKey)) {
        dateLabels.push(todayKey);
        dateSums.push(0); // No dosage for today
    }

    // ✅ Destroy old chart and redraw
    if (dailyChart) dailyChart.destroy();
    const ctx = document.getElementById('dailyChart').getContext('2d');
    dailyChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dateLabels,
            datasets: [{
                label: 'Daily Dosage (mg)',
                data: dateSums,
                backgroundColor: 'rgba(54, 162, 235, 0.5)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                x: {
                    ticks: {
                        color: $('body').hasClass('theme-midnight') ? '#aaa' : '#000',
                        autoSkip: true,
                        maxTicksLimit: 15
                    }
                },
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: $('body').hasClass('dark-mode') ? '#aaa' : '#000'
                    }
                }
            },
            plugins: {
                legend: {
                    labels: {
                        color: $('body').hasClass('theme-midnight') ? '#e0e0e0' : '#000'
                    }
                }
            }
        }
    });

    // ✅ Show stats with frequency calculation
    const totalDosage = filtered.reduce((sum, e) => sum + e.dosageMg, 0);
    const totalDays = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1);
    const avgPerDay = (totalDosage / totalDays).toFixed(2);

    $('#dailyAverageBox')
        .removeClass('d-none')
        .html(`
 <strong>Daily Avg for Selected Range:</strong> ${avgPerDay} mg/day<br/>
 <strong>Largest Time Between Doses:</strong> ${gapStr}<br/>
 <strong>${avgFrequencyStr}</strong><br/>
 <strong>${avgFrequency}</strong>
 `);
}

function settings() {
    window.location.href = `${window.location.origin}/settings.html`;
}

function calculateAveragePerDay(entries, daysBack) {
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - daysBack + 1); // inclusive range

    const filtered = entries.filter(e => {
        const takenDate = new Date(e.takenAt);
        return takenDate >= startDate && takenDate <= today;
    });

    const totalDosage = filtered.reduce((sum, e) => sum + e.dosageMg, 0);
    const avgPerDay = (totalDosage / daysBack).toFixed(2);
    return avgPerDay;
}

// ========== TAPERING GOAL FUNCTIONS ==========

// Make functions globally accessible
window.openTaperingGoalModal = openTaperingGoalModal;
window.editTaperingGoal = editTaperingGoal;
window.closeTaperingGoalModal = closeTaperingGoalModal;
window.deleteTaperingGoal = deleteTaperingGoal;
window.closeImportModal = closeImportModal;

function closeImportModal() {
    $('#importModal').removeClass('active');
}

function loadTaperingGoal() {
    const taperingUrl = location.port === '8080'
        ? 'http://localhost:3000/api/benzos/tapering-progress'
        : '/api/benzos/tapering-progress';

    $.ajax({
        url: taperingUrl,
        method: 'GET',
        headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        success: function (progress) {
            if (progress.hasGoal) {
                displayTaperingProgress(progress);
                $('#taperingGoalSection').show();
                $('#setGoalPrompt').hide();
            } else {
                $('#taperingGoalSection').hide();
                $('#setGoalPrompt').show();
            }
        },
        error: function () {
            $('#taperingGoalSection').hide();
            $('#setGoalPrompt').show();
        }
    });
}

function displayTaperingProgress(progress) {
    // Update metrics
    $('#goalStartDosage').text(`${progress.startDosage.toFixed(3)} mg`);
    $('#goalCurrentDosage').text(`${progress.currentAvgDosage.toFixed(3)} mg`);
    $('#goalTargetDosage').text(`${progress.targetDosage.toFixed(3)} mg`);
    $('#goalDaysRemaining').text(progress.daysRemaining);

    // Update progress percentage
    $('#goalProgressPercent').text(`${progress.progressPercentage}%`);
    $('#goalProgressBar').css('width', `${progress.progressPercentage}%`);

    if (progress.progressPercentage >= 10) {
        $('#goalProgressText').text(`${progress.progressPercentage}%`);
    } else {
        $('#goalProgressText').text('');
    }

    // Update time progress
    $('#goalTimeInfo').text(`${progress.daysElapsed} / ${progress.daysTotal} days`);
    $('#goalTimeBar').css('width', `${progress.timeProgress}%`);

    // Update status message - FIXED: Check both progress AND time completion
    const statusBox = $('#goalStatus');
    const isTimeComplete = progress.daysRemaining <= 0;
    const isDosageComplete = progress.progressPercentage >= 100;

    if (isDosageComplete && isTimeComplete) {
        // Only show congratulations if BOTH conditions are met
        statusBox.removeClass('alert-success alert-warning alert-info')
            .addClass('alert-success')
            .html('🎉 <strong>Congratulations!</strong> You\'ve reached your target dosage goal!')
            .show();
    } else if (isDosageComplete && !isTimeComplete) {
        // Reached dosage goal early
        statusBox.removeClass('alert-success alert-warning alert-info')
            .addClass('alert-success')
            .html('🎯 <strong>Goal Achieved Early!</strong> You\'ve reached your target dosage ahead of schedule!')
            .show();
    } else if (progress.onTrack) {
        statusBox.removeClass('alert-success alert-warning alert-info')
            .addClass('alert-success')
            .html('✅ <strong>On Track!</strong> You\'re making great progress toward your goal.')
            .show();
    } else if (progress.progressPercentage < progress.timeProgress - 10) {
        statusBox.removeClass('alert-success alert-warning alert-info')
            .addClass('alert-warning')
            .html('⚠️ <strong>Behind Schedule</strong> - Consider consulting your healthcare provider about adjusting your plan.')
            .show();
    } else {
        statusBox.hide();
    }

    // Display notes if present
    if (progress.notes) {
        $('#goalNotesText').text(progress.notes);
        $('#goalNotes').show();
    } else {
        $('#goalNotes').hide();
    }

    // NEW: Today's Dosage Progress (Mini Goal)
    updateTodayGoalProgress(progress);
}

function updateTodayGoalProgress(progress) {
    const today = new Date().toISOString().split('T')[0];
    const todayEntries = allEntries.filter(e => e.takenAt.startsWith(today));
    const todayTotal = todayEntries.reduce((sum, e) => sum + e.dosageMg, 0);

    // Calculate target for today (simplistic: current target dosage)
    const dailyTarget = progress.targetDosage || progress.currentAvgDosage;

    let miniGoalHtml = `
        <div class="mt-4 p-4 premium-blur" style="background: rgba(255,255,255,0.1); border-radius: var(--radius-lg); border: 1px solid var(--border-color);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-2);">
                <span style="font-size: var(--text-sm); font-weight: var(--font-weight-semibold);">📅 Today's Dosage Limit</span>
                <span style="font-size: var(--text-sm); font-weight: var(--font-weight-bold);">${todayTotal.toFixed(3)} / ${dailyTarget.toFixed(3)} mg</span>
            </div>
            <div style="background: var(--bg-tertiary); border-radius: var(--radius-full); height: 10px; overflow: hidden;">
                <div style="width: ${Math.min(100, (todayTotal / dailyTarget) * 100)}%; height: 100%; background: ${todayTotal > dailyTarget ? 'var(--color-error)' : 'var(--color-primary-500)'}; transition: width 0.3s ease;"></div>
            </div>
            ${todayTotal > dailyTarget ? '<div style="font-size: var(--text-xs); color: var(--color-error); margin-top: 4px;">⚠️ Over today\'s target limit!</div>' : ''}
        </div>
    `;

    // Insert into tapering section if not already there
    if (!$('#todayGoalMini').length) {
        $('#taperingGoalSection .entry-form-card').append('<div id="todayGoalMini"></div>');
    }
    $('#todayGoalMini').html(miniGoalHtml);
}


function openTaperingGoalModal() {
    $('#taperingModalTitle').text('Set Tapering Goal');
    $('#taperingModalSubmitText').text('Create Goal');
    $('#taperingGoalForm')[0].reset();

    // Set default start date to today
    const today = new Date().toISOString().split('T')[0];
    $('#goalStartDateInput').val(today);

    $('#taperingGoalModal').addClass('active');
}

function editTaperingGoal() {
    const taperingUrl = location.port === '8080'
        ? 'http://localhost:3000/api/benzos/tapering-goal'
        : '/api/benzos/tapering-goal';

    $.ajax({
        url: taperingUrl,
        method: 'GET',
        headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        success: function (goal) {
            $('#taperingModalTitle').text('Edit Tapering Goal');
            $('#taperingModalSubmitText').text('Update Goal');

            $('#goalStartDosageInput').val(goal.startDosage);
            $('#goalTargetDosageInput').val(goal.targetDosage);
            $('#goalStartDateInput').val(goal.startDate);
            $('#goalTargetDateInput').val(goal.targetDate);
            $('#goalNotesInput').val(goal.notes || '');

            $('#taperingGoalModal').addClass('active');
        },
        error: function () {
            showNotification('Failed to load goal details', 'error');
        }
    });
}

function closeTaperingGoalModal() {
    $('#taperingGoalModal').removeClass('active');
}

function deleteTaperingGoal() {
    showConfirmDialog({
        title: 'Delete Tapering Goal?',
        message: 'Are you sure you want to delete your tapering goal?\n\nThis action is permanent and cannot be undone. All goal progress and data will be lost.',
        confirmText: 'Delete Permanent',
        icon: '🎯',
        onConfirm: function () {
            // On confirm
            const taperingUrl = location.port === '8080'
                ? 'http://localhost:3000/api/benzos/tapering-goal'
                : '/api/benzos/tapering-goal';

            $.ajax({
                url: taperingUrl,
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                },
                success: function (response) {
                    $('#taperingGoalSection').hide();
                    $('#setGoalPrompt').show();
                    showNotification('Tapering goal deleted successfully.', 'success');
                },
                error: function (xhr, status, error) {
                    const errorMsg = xhr.responseJSON?.message || 'Failed to delete tapering goal.';
                    showNotification(errorMsg, 'error');
                }
            });
        }
    });
}

// ========== ENHANCED ANALYTICS FUNCTIONS ==========

function loadEnhancedAnalytics(range = 'all') {
    // Filter entries based on selected range
    let filteredEntries = allEntries;

    if (range !== 'all') {
        const daysAgo = parseInt(range);
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysAgo);

        filteredEntries = allEntries.filter(e => {
            const entryDateRaw = e.takenAt;
            let entryDateStr = entryDateRaw;
            if (typeof entryDateStr === 'string' && !entryDateStr.includes('Z') && !entryDateStr.includes('+')) {
                entryDateStr += 'Z';
            }
            const entryDate = new Date(entryDateStr);
            return entryDate >= cutoffDate;
        });
    }

    // If no entries in the filtered range, hide analytics
    if (filteredEntries.length === 0) {
        $('#enhancedAnalyticsSection').hide();
        return;
    }

    // Calculate analytics on filtered entries (simplified version for client-side)
    const analytics = calculateClientSideAnalytics(filteredEntries, range);

    if (analytics.hasData) {
        displayEnhancedAnalytics(analytics);
        $('#enhancedAnalyticsSection').show();
    } else {
        $('#enhancedAnalyticsSection').hide();
    }
}

function calculateClientSideAnalytics(entries, range = 'all') {
    if (!entries.length) {
        return { hasData: false };
    }

    // Helper function to get entries from N days ago
    const getEntriesFromDaysAgo = (days) => {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        return entries.filter(e => new Date(e.takenAt) >= cutoffDate);
    };

    // Get time-period entries
    const thisWeek = getEntriesFromDaysAgo(7);
    const lastWeek = entries.filter(e => {
        const date = new Date(e.takenAt);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const twoWeeksAgo = new Date();
        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
        return date >= twoWeeksAgo && date < weekAgo;
    });

    const thisMonth = getEntriesFromDaysAgo(30);
    const lastMonth = entries.filter(e => {
        const date = new Date(e.takenAt);
        const monthAgo = new Date();
        monthAgo.setDate(monthAgo.getDate() - 30);
        const twoMonthsAgo = new Date();
        twoMonthsAgo.setDate(twoMonthsAgo.getDate() - 60);
        return date >= twoMonthsAgo && date < monthAgo;
    });

    // Calculate averages
    const calcAvg = (arr) => arr.length ? arr.reduce((sum, e) => sum + (e.dosageMg || 0), 0) / arr.length : 0;

    const thisWeekAvg = calcAvg(thisWeek);
    const lastWeekAvg = calcAvg(lastWeek);
    const thisMonthAvg = calcAvg(thisMonth);
    const lastMonthAvg = calcAvg(lastMonth);

    // Calculate trends
    const weekTrend = lastWeekAvg > 0 ? ((thisWeekAvg - lastWeekAvg) / lastWeekAvg) * 100 : 0;
    const monthTrend = lastMonthAvg > 0 ? ((thisMonthAvg - lastMonthAvg) / lastMonthAvg) * 100 : 0;

    // Consistency score
    const allDosages = entries.map(e => e.dosageMg || 0).filter(d => d > 0);
    const mean = calcAvg(entries);
    const variance = allDosages.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / entries.length;
    const stdDev = Math.sqrt(variance);
    const coefficientOfVariation = mean > 0 ? (stdDev / mean) * 100 : 0;
    const consistencyScore = Math.max(0, Math.min(100, 100 - coefficientOfVariation));

    // Time patterns
    const timePatterns = { morning: 0, afternoon: 0, evening: 0, night: 0 };
    entries.forEach(e => {
        const hour = new Date(e.takenAt).getHours();
        if (hour >= 6 && hour < 12) timePatterns.morning++;
        else if (hour >= 12 && hour < 18) timePatterns.afternoon++;
        else if (hour >= 18 && hour < 24) timePatterns.evening++;
        else timePatterns.night++;
    });

    const total = entries.length;
    const timePercentages = {
        morning: ((timePatterns.morning / total) * 100).toFixed(0),
        afternoon: ((timePatterns.afternoon / total) * 100).toFixed(0),
        evening: ((timePatterns.evening / total) * 100).toFixed(0),
        night: ((timePatterns.night / total) * 100).toFixed(0)
    };

    const maxCount = Math.max(...Object.values(timePatterns));
    const peakTime = Object.keys(timePatterns).find(key => timePatterns[key] === maxCount);

    // Streaks
    const sortedEntries = [...entries].sort((a, b) => new Date(a.takenAt) - new Date(b.takenAt));
    let longestGap = 0;
    for (let i = 1; i < sortedEntries.length; i++) {
        const gap = new Date(sortedEntries[i].takenAt) - new Date(sortedEntries[i - 1].takenAt);
        if (gap > longestGap) longestGap = gap;
    }

    const now = new Date();
    const lastDose = sortedEntries.length ? new Date(sortedEntries[sortedEntries.length - 1].takenAt) : now;
    const currentStreak = now - lastDose;

    // Dosage distribution
    const dosageFrequency = {};
    entries.forEach(e => {
        if (!e.dosageMg) return;
        const rounded = e.dosageMg.toFixed(2);
        dosageFrequency[rounded] = (dosageFrequency[rounded] || 0) + 1;
    });

    const sortedDosages = Object.entries(dosageFrequency)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([dosage, count]) => ({
            dosage: parseFloat(dosage),
            count,
            percentage: ((count / total) * 100).toFixed(0)
        }));

    return {
        hasData: true,
        trends: {
            weekTrend: parseFloat(weekTrend.toFixed(1)),
            monthTrend: parseFloat(monthTrend.toFixed(1)),
            thisWeekAvg: parseFloat(thisWeekAvg.toFixed(3)),
            lastWeekAvg: parseFloat(lastWeekAvg.toFixed(3)),
            thisMonthAvg: parseFloat(thisMonthAvg.toFixed(3)),
            lastMonthAvg: parseFloat(lastMonthAvg.toFixed(3))
        },
        consistency: {
            score: parseFloat(consistencyScore.toFixed(0)),
            stdDev: parseFloat(stdDev.toFixed(3)),
            coefficientOfVariation: parseFloat(coefficientOfVariation.toFixed(1))
        },
        timePatterns: {
            percentages: timePercentages,
            counts: timePatterns,
            peakTime
        },
        streaks: {
            longestGapMs: longestGap,
            longestGapDays: parseFloat((longestGap / (1000 * 60 * 60 * 24)).toFixed(1)),
            longestGapHours: parseFloat((longestGap / (1000 * 60 * 60)).toFixed(1)),
            currentStreakMs: currentStreak,
            currentStreakDays: parseFloat((currentStreak / (1000 * 60 * 60 * 24)).toFixed(1)),
            currentStreakHours: parseFloat((currentStreak / (1000 * 60 * 60)).toFixed(1))
        },
        distribution: {
            mostCommon: sortedDosages,
            average: parseFloat(mean.toFixed(3)),
            min: allDosages.length ? Math.min(...allDosages) : 0,
            max: allDosages.length ? Math.max(...allDosages) : 0
        },
        timeframe: {
            range: range,
            days: range === 'all' ? calculateTotalDays(entries) : parseInt(range)
        }
    };
}

function calculateTotalDays(entries) {
    if (entries.length < 2) return 1;
    const sorted = [...entries].sort((a, b) => new Date(a.takenAt) - new Date(b.takenAt));
    const start = new Date(sorted[0].takenAt);
    const end = new Date(sorted[sorted.length - 1].takenAt);
    const diff = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
    return diff;
}

function displayEnhancedAnalytics(analytics) {
    // Display trends
    const weekTrendIcon = analytics.trends.weekTrend > 0 ? '↗️' : analytics.trends.weekTrend < 0 ? '↘️' : '→';
    const monthTrendIcon = analytics.trends.monthTrend > 0 ? '↗️' : analytics.trends.monthTrend < 0 ? '↘️' : '→';

    const weekTrendColor = analytics.trends.weekTrend > 0 ? 'var(--color-danger-600)' : analytics.trends.weekTrend < 0 ? 'var(--color-success-600)' : 'var(--text-primary)';
    const monthTrendColor = analytics.trends.monthTrend > 0 ? 'var(--color-danger-600)' : analytics.trends.monthTrend < 0 ? 'var(--color-success-600)' : 'var(--text-primary)';

    $('#analyticsWeekTrend').html(`<span style="color: ${weekTrendColor}">${weekTrendIcon} ${Math.abs(analytics.trends.weekTrend)}%</span>`);
    $('#analyticsMonthTrend').html(`<span style="color: ${monthTrendColor}">${monthTrendIcon} ${Math.abs(analytics.trends.monthTrend)}%</span>`);

    // Display consistency score
    const score = analytics.consistency.score;
    let consistencyLabel = '';
    let consistencyColor = '';

    if (score >= 80) {
        consistencyLabel = 'Excellent Consistency';
        consistencyColor = 'var(--color-success-600)';
    } else if (score >= 60) {
        consistencyLabel = 'Good Consistency';
        consistencyColor = 'var(--color-primary-600)';
    } else if (score >= 40) {
        consistencyLabel = 'Moderate Consistency';
        consistencyColor = 'var(--color-warning-600)';
    } else {
        consistencyLabel = 'Variable Dosing';
        consistencyColor = 'var(--color-danger-600)';
    }

    $('#analyticsConsistencyScore').text(score).css('color', consistencyColor);
    $('#analyticsConsistencyLabel').text(consistencyLabel);
    $('#analyticsConsistencyDescription').text(`Your dosages vary by an average of ±${analytics.consistency.stdDev}mg (${analytics.consistency.coefficientOfVariation}% coefficient of variation)`);

    // Display time patterns
    $('#analyticsMorning').text(`${analytics.timePatterns.percentages.morning}%`);
    $('#analyticsAfternoon').text(`${analytics.timePatterns.percentages.afternoon}%`);
    $('#analyticsEvening').text(`${analytics.timePatterns.percentages.evening}%`);
    $('#analyticsNight').text(`${analytics.timePatterns.percentages.night}%`);

    if (analytics.timePatterns.peakTime) {
        const peakTimeLabel = {
            morning: '🌅 Morning (6AM-12PM)',
            afternoon: '☀️ Afternoon (12PM-6PM)',
            evening: '🌆 Evening (6PM-12AM)',
            night: '🌙 Night (12AM-6AM)'
        };
        $('#analyticsPeakTime').html(`<strong>Peak Time:</strong> ${peakTimeLabel[analytics.timePatterns.peakTime]} - You take medication most often during this time.`).show();
    }

    // Display streaks
    const longestGapDays = Math.floor(analytics.streaks.longestGapDays);
    const longestGapHours = Math.floor(analytics.streaks.longestGapHours % 24);
    $('#analyticsLongestGap').text(`${longestGapDays} days, ${longestGapHours} hours`);

    const currentStreakDays = Math.floor(analytics.streaks.currentStreakDays);
    const currentStreakHours = Math.floor(analytics.streaks.currentStreakHours % 24);
    $('#analyticsCurrentStreak').text(`${currentStreakDays} days, ${currentStreakHours} hours`);

    // Display most common dosages
    const mostCommonHtml = analytics.distribution.mostCommon.map(item => `
        <div style="padding: var(--space-3); background: var(--bg-elevated); border: 1px solid var(--border-color); border-radius: var(--radius-lg);">
            <div style="font-size: var(--text-lg); font-weight: var(--font-weight-bold); color: var(--text-primary);">${item.dosage.toFixed(2)} mg</div>
            <div style="font-size: var(--text-sm); color: var(--text-secondary);">${item.count} times (${item.percentage}%)</div>
        </div>
    `).join('');
    $('#analyticsMostCommon').html(mostCommonHtml);

    // Display statistical summary
    const totalDoses = analytics.distribution.mostCommon.reduce((sum, item) => sum + item.count, 0) || analytics.timePatterns.counts.morning + analytics.timePatterns.counts.afternoon + analytics.timePatterns.counts.evening + analytics.timePatterns.counts.night;
    const totalDays = analytics.timeframe.days || 1;
    const dailyDosageAvg = (analytics.distribution.average * (totalDoses / totalDays)).toFixed(3);
    const intervalAvg = (totalDays / (totalDoses || 1)).toFixed(1);

    $('#analyticsAverage').text(`${dailyDosageAvg} mg`);
    $('#analyticsInterval').text(`${intervalAvg}`);
    $('#analyticsMin').text(`${analytics.distribution.min.toFixed(3)} mg`);
    $('#analyticsMax').text(`${analytics.distribution.max.toFixed(3)} mg`);
}

// Handle tapering goal form submission
$(document).ready(function () {
    $('#taperingGoalForm').submit(function (e) {
        e.preventDefault();

        const goalData = {
            startDosage: parseFloat($('#goalStartDosageInput').val()),
            targetDosage: parseFloat($('#goalTargetDosageInput').val()),
            startDate: $('#goalStartDateInput').val(),
            targetDate: $('#goalTargetDateInput').val(),
            notes: $('#goalNotesInput').val().trim() || undefined
        };

        // Validation
        if (goalData.startDosage <= 0 || goalData.targetDosage < 0) {
            showNotification('Dosages must be positive numbers.', 'error');
            return;
        }

        if (goalData.targetDosage >= goalData.startDosage) {
            showNotification('Target dosage must be less than starting dosage.', 'error');
            return;
        }

        if (new Date(goalData.targetDate) <= new Date(goalData.startDate)) {
            showNotification('Target date must be after start date.', 'error');
            return;
        }

        const isEditing = $('#taperingModalTitle').text().includes('Edit');
        const method = isEditing ? 'PATCH' : 'POST';

        const taperingUrl = location.port === '8080'
            ? 'http://localhost:3000/api/benzos/tapering-goal'
            : '/api/benzos/tapering-goal';

        $.ajax({
            url: taperingUrl,
            method: method,
            headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`
            },
            contentType: 'application/json',
            data: JSON.stringify(goalData),
            success: function (response) {
                closeTaperingGoalModal();
                loadTaperingGoal();
                showNotification(isEditing ? 'Goal updated successfully!' : 'Goal created successfully!', 'success');
            },
            error: function (xhr, status, error) {
                console.error('Error saving goal:', xhr.responseText);
                const errorMsg = xhr.responseJSON?.message || 'Failed to save tapering goal. Please try again.';
                showNotification(errorMsg, 'error');
            }
        });
    });

    // Load tapering goal on page load
    loadTaperingGoal();

    // Refresh tapering progress every 60 seconds
    setInterval(function () {
        if ($('#taperingGoalSection').is(':visible')) {
            loadTaperingGoal();
        }
    }, 60000);

    // Close modal when clicking outside
    $('#taperingGoalModal').on('click', function (e) {
        if (e.target === this) {
            closeTaperingGoalModal();
        }
    });
});

// ========== EXPORT SYSTEM ==========

function updateExportBadge(entries) {
    const badge = document.getElementById('exportCountBadge');
    const label = document.getElementById('exportFilterLabel');
    if (!badge) return;
    const isFiltered = entries.length !== allEntries.length;
    if (entries.length > 0) {
        badge.textContent = `${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}`;
        badge.style.display = 'inline-block';
    } else {
        badge.style.display = 'none';
    }
    if (label) label.style.display = isFiltered ? 'inline' : 'none';
}

function _exportToast(message, color) {
    const t = document.createElement('div');
    t.textContent = message;
    t.style.cssText = `position:fixed;top:20px;right:20px;background:${color};color:#fff;
        padding:14px 22px;border-radius:10px;font-size:14px;font-weight:600;
        z-index:99999;box-shadow:0 8px 24px rgba(0,0,0,.2);`;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
}

function exportEntries(format) {
    const entries = lastRenderedEntries;
    if (!entries || entries.length === 0) {
        _exportToast('⚠️ No entries to export', '#f59e0b');
        return;
    }
    if (format === 'csv') {
        doExportCsv(entries);
    } else {
        doExportPdf(entries);
    }
}

function doExportCsv(entries) {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const benzosType = user.benzosType || 'Unknown';
    const now = new Date().toLocaleDateString();

    const fmt = (ts) => {
        if (!ts) return '';
        const d = new Date(ts);
        return isNaN(d) ? ts : d.toLocaleString();
    };

    const lines = [
        `# Benzos Tracker Export - ${benzosType} - ${now}`,
        'Dosage (mg),Taken At,Reason,Comments',
        ...entries.map(e => [
            e.dosageMg ?? '',
            fmt(e.takenAt),
            `"${(e.reason || '').replace(/"/g, '""')}"`,
            `"${(e.comments || '').replace(/"/g, '""')}"`
        ].join(','))
    ].join('\n');

    const blob = new Blob([lines], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `benzos-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    _exportToast(`✅ Exported ${entries.length} entries`, '#10b981');
}

function doExportPdf(entries) {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const benzosType = user.benzosType || 'Unknown';
    const now = new Date().toLocaleDateString();

    const fmt = (ts) => {
        if (!ts) return '';
        const d = new Date(ts);
        return isNaN(d) ? ts : d.toLocaleString();
    };

    const rows = entries.map(e => `
        <tr>
            <td><strong>${e.dosageMg ?? '—'} mg</strong></td>
            <td>${fmt(e.takenAt)}</td>
            <td>${e.reason || '—'}</td>
            <td>${e.comments || '—'}</td>
        </tr>`).join('');

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>Benzos Export</title><style>
body{font-family:Arial,sans-serif;padding:32px;color:#1a1a2e}
h1{font-size:20px;margin-bottom:4px}
.meta{font-size:12px;color:#666;margin-bottom:24px}
table{width:100%;border-collapse:collapse;font-size:13px}
th{background:#4169ff;color:white;padding:10px 12px;text-align:left}
td{padding:9px 12px;border-bottom:1px solid #e5e7eb}
tr:nth-child(even) td{background:#f9fafb}
.footer{margin-top:32px;font-size:11px;color:#999;text-align:center}
</style></head><body>
<h1>💊 Benzos Tracker — ${benzosType}</h1>
<div class="meta">Exported: ${now} | ${entries.length} entries</div>
<table><thead><tr>
<th>Dosage</th><th>Taken At</th><th>Reason</th><th>Comments</th>
</tr></thead><tbody>${rows}</tbody></table>
<div class="footer">Generated by Benzos Tracker • LiDa Software © 2026</div>
</body></html>`;

    const win = window.open('', '_blank');
    if (!win) {
        _exportToast('⚠️ Allow popups for PDF export', '#f59e0b');
        return;
    }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 500);
    _exportToast(`🖨️ PDF ready — ${entries.length} entries`, '#4169ff');
}
