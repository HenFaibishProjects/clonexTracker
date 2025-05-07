
const API = '/api/clonex';
let lastRenderedEntries = [];
let dosageChart;
let isPageActive = true;
let lastTakenAt;

$('#logoutBtn').click(function () {
    localStorage.removeItem('token');
    window.location.href = 'index.html';
});

$.ajaxSetup({
    headers: {
        Authorization: `Bearer ${token}`
    }
});

document.addEventListener('visibilitychange', () => {
    isPageActive = !document.hidden;
});

$(document).ready(function () {
    const API = '/api/clonex';

    $('#exportCsvBtn').click(function () {
        exportToCSV(lastRenderedEntries);
    });

    $('#filterBtn').click(function () {
        const from = $('#filterFrom').val();
        const to = $('#filterTo').val();
        const dosageMin = parseFloat($('#filterDosageFrom').val().replace(',', '.'));
        const dosageMax = parseFloat($('#filterDosageTo').val().replace(',', '.'));
        const reasonFilter = $('#filterReason').val().trim().toLowerCase();
        const commentFilter = $('#filterComment').val().trim().toLowerCase();

        // Call backend only if date filters are present
        const shouldFilterDates = from || to;

        // If no dates, get all entries
        const endpoint = shouldFilterDates
            ? `${API}/between?from=${from || '1900-01-01'}&to=${to || '2100-12-31'}`
            : API;

        $.get(endpoint, function (entries) {
            let filtered = entries;

            // Dosage filter (optional)
            if (!isNaN(dosageMin)) {
                filtered = filtered.filter(e => e.dosageMg >= dosageMin);
            }
            if (!isNaN(dosageMax)) {
                filtered = filtered.filter(e => e.dosageMg <= dosageMax);
            }

            // Text filters
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
            $('#statsBox').addClass('d-none');
        });
    });

    $('#clearFilterBtn').click(function () {
        $('#filterFrom').val('');
        $('#filterTo').val('');
        $('#filterDosageFrom').val('');
        $('#filterDosageTo').val('');
        $('#filterReason').val('');
        $('#filterComment').val('');
        loadEntries();
        renderChart(lastRenderedEntries);
        $('#filterStatsBox').addClass('d-none').html('');
        $('#statsBox').removeClass('d-none');

    });




    // Submit new entry
    $('#clonexForm').submit(function (e) {
        e.preventDefault();

        const dosageValue = $('#dosage').val().replace(',', '.').trim();
        const takenAtValue = $('#takenAt').val();

        if (!dosageValue || !takenAtValue) {
            alert('Please fill dosage and time!');
            return;
        }

        const entry = {
            dosageMg: Number(dosageValue),
            takenAt: takenAtValue,
            reason: $('#reason').val(),
            comments: $('#comments').val()
        };

        $.ajax({
            url: API,
            method: 'POST',
            headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`
            },
            contentType: 'application/json',
            data: JSON.stringify(entry),
            success: function () {
                $('#clonexForm')[0].reset();
                //lastTakenAt = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jerusalem' }));
                loadEntries();
            },
            error: function (err) {
                console.error('Failed to save entry:', err);
                alert('Something went wrong saving the entry.');
            }
        });
    });

    $('#entriesTable').on('click', '.delete-btn', function () {
        const id = $(this).data('id');
        if (confirm('Delete this entry?')) {
            $.ajax({
                url: `${API}/${id}`,
                type: 'DELETE',
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                },
                success: loadEntries
            });
        }
    });

    loadEntries();
});

$('#nowBtn').click(function () {
    const now = new Date();
    const tzOffset = now.getTimezoneOffset() * 60000; // in ms
    const localISO = new Date(now - tzOffset).toISOString().slice(0, 16);
    $('#takenAt').val(localISO);
});

$('#toggleDarkMode').click(function () {
    const isDark = $('body').hasClass('dark-mode');
    applyDarkMode(!isDark);
});

$('#entriesTable').on('click', '.edit-btn', function () {
    const $row = $(this).closest('tr');
    $row.find('.value').addClass('d-none');
    $row.find('.edit').removeClass('d-none');
    $row.find('.edit-btn').addClass('d-none');
    $row.find('.save-btn').removeClass('d-none');
});

$('#entriesTable').on('click', '.save-btn', function () {
    const $row = $(this).closest('tr');
    const id = $row.data('id');

    const dosageValue = $row.find('input.dosage').val().replace(',', '.').trim();
    const dosageMg = Number(dosageValue);

    if (isNaN(dosageMg) || dosageMg < 0.1) {
        alert("Dosage must be a number and at least 0.1 mg.");
        return;
    }

    const updated = {
        dosageMg: Number($row.find('input.dosage').val().replace(',', '.').trim()),
        takenAt: $row.find('input.takenAt').val(),
        reason: $row.find('input.reason').val(),
        comments: $row.find('input.comments').val()
    };

    $.ajax({
        url: `${API}/${id}`,
        type: 'PATCH',
        headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        contentType: 'application/json',
        data: JSON.stringify(updated),
        success: loadEntries,
        error: () => alert('Error saving edit')
    });
});

setInterval(() => {
    if (!lastTakenAt || !isPageActive) return;

    const now = new Date();
    const diff = now - lastTakenAt;
    const hours = String(Math.floor(diff / (1000 * 60 * 60))).padStart(2, '0');
    const minutes = String(Math.floor((diff / (1000 * 60)) % 60)).padStart(2, '0');
    const seconds = String(Math.floor((diff / 1000) % 60)).padStart(2, '0');

    $('#runningTimer').text(`🕒 Time from Last Dosage: ${hours}:${minutes}:${seconds}`);
}, 1000);

function loadEntries() {
    $.get(API, function (entries) {
        renderEntries(entries);
        updateStats(entries);
        renderChart(entries);
    });
}

function updateFilterStats(entries) {
    if (!entries.length) {
        $('#filterStatsBox').addClass('d-none').html('');
        return;
    }

    const avg = (entries.reduce((sum, e) => sum + e.dosageMg.toFixed(3), 0) / entries.length).toFixed(2);

    $('#filterStatsBox')
        .removeClass('d-none')
        .html(`<strong>Filtered Average Dosage:</strong> ${avg} mg`);
}

function updateStats(entries) {
    if (!entries.length) {
        $('#statsBox').html('No entries yet.');
        return;
    }

    const total = entries.length;
    const lastEntry = entries[0];
    const averageDosage = (entries.reduce((sum, e) => sum + e.dosageMg.toFixed(3), 0) / total).toFixed(3);

    // Fix: Parse the date correctly depending on the format
    // Check if lastEntry.takenAt already includes time information
    if (lastEntry.takenAt.includes(':')) {
        // If it has time info (format like "2023-05-01T15:30"), just create the date
        lastTakenAt = new Date(lastEntry.takenAt);
    } else {
        // If it's just a date (format like "2023-05-01"), append time and timezone
        lastTakenAt = new Date(`${lastEntry.takenAt}:00:00+03:00`);
    }

    $('#statsBox').html(`
        <strong>Last Taken:</strong> ${lastTakenAt.toLocaleString('he-IL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    })}<br/>
        <strong>Last Dosage:</strong> ${lastEntry.dosageMg} mg
        <strong>Average Dosage:</strong> ${averageDosage} mg<br/>
        <strong id="runningTimer">🕒 Time from Last Dosage: ...</strong>
    `);
}

function exportToCSV(entries) {
    if (!entries.length) {
        alert('No entries to export!');
        return;
    }

    const headers = ['Dosage (mg)', 'Taken At', 'Reason', 'Comments'];
    const rows = entries.map(e => {
        const date = new Date(e.takenAt);

        const formattedDate = date.toLocaleDateString('he-IL'); // e.g. 29.04.2025
        const formattedTime = date.toLocaleTimeString('he-IL', {
            hour: '2-digit',
            minute: '2-digit'
        });

        const fullDateTime = `${formattedDate} ${formattedTime}`; // e.g. 29.04.2025 17:51

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
    link.setAttribute('download', `clonex_entries_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function renderEntries(entries) {
    lastRenderedEntries = entries;
    const $tbody = $('#entriesTable tbody');
    $tbody.empty();
    entries.forEach((entry) => {
        const row = `
      <tr data-id="${entry.id}">
        <td><span class="value dosage">${entry.dosageMg}</span><input type="number" step="0.01" class="form-control form-control-sm edit dosage d-none" value="${entry.dosageMg}" /></td>
        <td>
          <span class="value takenAt">${new Date(entry.takenAt).toLocaleString('he-IL', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                })}</span>
          <input type="datetime-local" class="form-control form-control-sm edit takenAt d-none" value="${entry.takenAt.slice(0, 16)}" />
        </td> 
        <td><span class="value reason">${entry.reason || ''}</span><input type="text" class="form-control form-control-sm edit reason d-none" value="${entry.reason || ''}" /></td>
        <td><span class="value comments">${entry.comments || ''}</span><input type="text" class="form-control form-control-sm edit comments d-none" value="${entry.comments || ''}" /></td>
        <td>
          <button class="btn btn-sm btn-secondary edit-btn">✏️</button>
          <button class="btn btn-sm btn-success save-btn d-none">💾</button>
          <button class="btn btn-sm btn-danger delete-btn" data-id="${entry.id}">🗑</button>
        </td>
      </tr>`;
        $tbody.append(row);
    });
}

function renderChart(entries) {
    const sorted = [...entries].sort((a, b) => new Date(a.takenAt) - new Date(b.takenAt));

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
    dosageChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Dosage (mg)',
                data: data,
                borderColor: 'rgba(75,192,192,1)',
                backgroundColor: 'rgba(75,192,192,0.2)',
                tension: 0.3,
                fill: true
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    labels: {
                        color: $('body').hasClass('dark-mode') ? '#e0e0e0' : '#000'
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        color: $('body').hasClass('dark-mode') ? '#aaa' : '#000'
                    }
                },
                y: {
                    ticks: {
                        color: $('body').hasClass('dark-mode') ? '#aaa' : '#000'
                    },
                    beginAtZero: true
                }
            }
        }
    });
}

function applyDarkMode(enabled) {
    $('body').toggleClass('dark-mode', enabled);
    $('#toggleDarkMode').text(enabled ? '☀️ Light Mode' : '🌙 Dark Mode');
    localStorage.setItem('darkMode', enabled ? '1' : '0');
}

$(function () {
    const saved = localStorage.getItem('darkMode');
    if (saved === '1') applyDarkMode(true);
});
