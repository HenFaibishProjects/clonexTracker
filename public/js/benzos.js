const baseUrl = location.port === '8080'
    ? 'http://localhost:3000/api/'
    : '/api/benzos';
let allEntries = [];
let lastRenderedEntries = [];
let dosageChart;
let isPageActive = true;
let lastTakenAt;



function formatTimestamp(datetimeStr) {
    const storedFormat = localStorage.getItem('timeFormat') || '12';
    const date = new Date(datetimeStr);

    const options = {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: storedFormat === '12'
    };

    return date.toLocaleString('default', options);
}


window.addEventListener('DOMContentLoaded', () => {
    const user = JSON.parse(localStorage.getItem('user'));
    const benzosType = JSON.parse(localStorage.getItem('user')).benzosType;
    document.getElementById('userNameDisplay').textContent = user.name;
    document.getElementById('benzosTitle').textContent = `💊 Benzodiazepines Tracker for ${benzosType}`;
});

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
            alert('✅ Import complete!');
            loadEntries();
            setTimeout(() => {
                location.reload();
                setTimeout(() => location.reload(), 500); // second refresh after 0.5 sec
            }, 300);
        })
        .catch(() => alert('⚠️ Some entries failed to import.'));
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
        alert('You must be logged in to access this page.');
        window.location.href = 'login.html';
        return;
    }
    const saved = localStorage.getItem('darkMode');
    if (saved === '1') applyDarkMode(true);

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
                        `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`
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
                alert('CSV appears empty or malformed.');
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
                    error: () => alert('Failed to delete existing entries')
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

    $('#toggleDarkMode').click(function () {
        const isDark = $('body').hasClass('dark-mode');
        applyDarkMode(!isDark);
    });


    $('#dailyRange').on('change', function () {
        const selected = $(this).val(); // Will be "14" for the new option
        renderDailyChart(lastRenderedEntries, selected);
    });

    $('#dosageRange').on('change', function () {
        const selected = $(this).val(); // Will be "14" for the new option
        renderChart(lastRenderedEntries, selected);
    });

    $.ajaxSetup({
        headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
        }
    });

    document.addEventListener('visibilitychange', () => {
        isPageActive = !document.hidden;
    });

    $('#exportCsvBtn').click(function () {
        exportToCSV(lastRenderedEntries);
    });

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
            alert('Please fill dosage and time!');
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
            },
            error: function (err) {
                console.error('Failed to save entry:', err);
                alert('Something went wrong saving the entry.');
            }
        });
    });

    function localToUtcIso(localDatetimeStr) {
        return new Date(localDatetimeStr).toISOString();
    }

    $('#entriesTable').on('click', '.delete-btn', function () {
        const id = $(this).data('id');
        if (confirm('Delete this entry?')) {
            $.ajax({
                url: `${baseUrl}/${id}`,
                type: 'DELETE',
                success: loadEntries
            });
        }
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
            alert("Dosage must be a number and at least 0.1 mg.");
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
            },
            error: () => alert('Error saving edit')
        });
    });


    $('#dailyRangeDropdown .dropdown-item').on('click', function () {
        //const selectedRange = $(this).data('range');
        const selectedRange = $(this).data('range');
        $('#dailyRangeBtn').text($(this).text());
        renderDailyChart(allEntries, selectedRange); // ✅ now passes selected range
    });

    loadEntries();
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

function loadEntries() {
    $.get(baseUrl, function (entries) {
        allEntries = entries; // ✅ Update global allEntries
        renderEntries(entries);
        updateStats(entries);
        updateStatsGrid(entries);
        renderChart(entries);
        renderDailyChart(entries); // ✅ This will now include today
    });
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

    const lastEntry = entries[0];
    const lastDosage = lastEntry.dosageMg.toFixed(3);

    $grid.append(`
        <div class="stat-card">
            <div class="stat-icon">💊</div>
            <div class="stat-value">${total}</div>
            <div class="stat-label">Total Entries</div>
        </div>
    `);

    $grid.append(`
        <div class="stat-card">
            <div class="stat-icon">📊</div>
            <div class="stat-value">${avgDosage} mg</div>
            <div class="stat-label">Average Dosage</div>
        </div>
    `);

    $grid.append(`
        <div class="stat-card">
            <div class="stat-icon">📅</div>
            <div class="stat-value">${avgWeek} mg</div>
            <div class="stat-label">Avg Last 7 Days</div>
        </div>
    `);

    $grid.append(`
        <div class="stat-card">
            <div class="stat-icon">🗓️</div>
            <div class="stat-value">${avgMonth} mg</div>
            <div class="stat-label">Avg Last 30 Days</div>
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
        alert('No entries to export!');
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
    const $tbody = $('#entriesTable tbody');
    $tbody.empty();
    entries.forEach((entry) => {
        const row = `
 <tr data-id="${entry.id}">
 <td><span class="value dosage">${entry.dosageMg}</span><input type="number" step="0.01" class="form-control form-control-sm edit dosage d-none" value="${entry.dosageMg}" /></td>
 <td>
 <span class="value takenAt">${formatTimestamp(entry.takenAt)}</span>

 <input type="datetime-local" class="form-control form-control-sm edit takenAt d-none" value="${getDatetimeInputValue(entry.takenAt)}" />
 </td> 
 <td><span class="value reason">${entry.reason || ''}</span><input type="text" class="form-control form-control-sm edit reason d-none" value="${entry.reason || ''}" /></td>
 <td><span class="value comments">${entry.comments || ''}</span><input type="text" class="form-control form-control-sm edit comments d-none" value="${entry.comments || ''}" /></td>
 <td>
 <button class="btn btn-sm btn-secondary edit-btn" data-bs-toggle="tooltip" title="Edit entry">✏️</button>
 <button class="btn btn-sm btn-success save-btn d-none" data-bs-toggle="tooltip" title="Save changes">💾</button>
 <button class="btn btn-sm btn-warning cancel-btn d-none" data-bs-toggle="tooltip" title="Cancel editing">❌</button>
 <button class="btn btn-sm btn-danger delete-btn" data-id="${entry.id}" data-bs-toggle="tooltip" title="Delete entry">🗑</button>

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

    // ✅ FIX: Use filtered entries instead of original entries
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
                        display: false
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

$('.dropdown-item:contains("Settings")').click(function () {
    $('.settings-overlay').fadeIn();
});

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
    const realRange = +range+1
    if (sortedEntries.length > 1 && realRange) {
        // Calculate total time span in days
        const firstDose = new Date(sortedEntries[0].takenAt);
        const lastDose = new Date(sortedEntries[sortedEntries.length - 1].takenAt);
        const totalDays = (lastDose - firstDose) / (1000 * 60 * 60 * 24);

        // Calculate average days between doses
        const avgGapDays = (totalDays / (sortedEntries.length - 1)).toFixed(1);

        // Calculate average dosage per dose
        const avgDose = (sortedEntries.reduce((sum, e) => sum + e.dosageMg, 0) / sortedEntries.length).toFixed(2);
        const avgPerDay = (realRange /  sortedEntries.length).toFixed(2);
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
function applyDarkMode(enabled) {
    $('body').toggleClass('dark-mode', enabled);
    $('#toggleDarkMode').text(enabled ? '☀️ Light Mode' : '🌙 Dark Mode');
    localStorage.setItem('darkMode', enabled ? '1' : '0');
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
    $.ajax({
        url: `${baseUrl}/tapering-progress`,
        method: 'GET',
        headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        success: function(progress) {
            if (progress.hasGoal) {
                displayTaperingProgress(progress);
                $('#taperingGoalSection').show();
                $('#setGoalPrompt').hide();
            } else {
                $('#taperingGoalSection').hide();
                $('#setGoalPrompt').show();
            }
        },
        error: function() {
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

    // Update status message
    const statusBox = $('#goalStatus');
    if (progress.progressPercentage >= 100) {
        statusBox.removeClass('alert-success alert-warning alert-info')
            .addClass('alert-success')
            .html('🎉 <strong>Congratulations!</strong> You\'ve reached your target dosage goal!')
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
    $.ajax({
        url: `${baseUrl}/tapering-goal`,
        method: 'GET',
        headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        success: function(goal) {
            $('#taperingModalTitle').text('Edit Tapering Goal');
            $('#taperingModalSubmitText').text('Update Goal');
            
            $('#goalStartDosageInput').val(goal.startDosage);
            $('#goalTargetDosageInput').val(goal.targetDosage);
            $('#goalStartDateInput').val(goal.startDate);
            $('#goalTargetDateInput').val(goal.targetDate);
            $('#goalNotesInput').val(goal.notes || '');
            
            $('#taperingGoalModal').addClass('active');
        },
        error: function() {
            alert('Failed to load goal details');
        }
    });
}

function closeTaperingGoalModal() {
    $('#taperingGoalModal').removeClass('active');
}

function deleteTaperingGoal() {
    if (!confirm('Are you sure you want to delete your tapering goal? This cannot be undone.')) {
        return;
    }
    
    $.ajax({
        url: `${baseUrl}/tapering-goal`,
        method: 'DELETE',
        headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        success: function() {
            $('#taperingGoalSection').hide();
            $('#setGoalPrompt').show();
            alert('Tapering goal deleted successfully.');
        },
        error: function() {
            alert('Failed to delete tapering goal.');
        }
    });
}

// ========== ENHANCED ANALYTICS FUNCTIONS ==========

function loadEnhancedAnalytics() {
    $.ajax({
        url: `${baseUrl}/enhanced-analytics`,
        method: 'GET',
        headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        success: function(analytics) {
            if (analytics.hasData) {
                displayEnhancedAnalytics(analytics);
                $('#enhancedAnalyticsSection').show();
            } else {
                $('#enhancedAnalyticsSection').hide();
            }
        },
        error: function() {
            $('#enhancedAnalyticsSection').hide();
        }
    });
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
        <div style="padding: var(--space-3); background: var(--bg-elevated); border-radius: var(--radius-lg);">
            <div style="font-size: var(--text-lg); font-weight: var(--font-weight-bold); color: var(--text-primary);">${item.dosage.toFixed(2)} mg</div>
            <div style="font-size: var(--text-sm); color: var(--text-secondary);">${item.count} times (${item.percentage}%)</div>
        </div>
    `).join('');
    $('#analyticsMostCommon').html(mostCommonHtml);
    
    // Display statistical summary
    $('#analyticsMean').text(`${analytics.distribution.mean.toFixed(3)} mg`);
    $('#analyticsMedian').text(`${analytics.distribution.median.toFixed(3)} mg`);
    $('#analyticsMin').text(`${analytics.distribution.min.toFixed(3)} mg`);
    $('#analyticsMax').text(`${analytics.distribution.max.toFixed(3)} mg`);
}

// Handle tapering goal form submission
$(document).ready(function() {
    $('#taperingGoalForm').submit(function(e) {
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
            alert('Dosages must be positive numbers.');
            return;
        }

        if (goalData.targetDosage >= goalData.startDosage) {
            alert('Target dosage must be less than starting dosage.');
            return;
        }

        if (new Date(goalData.targetDate) <= new Date(goalData.startDate)) {
            alert('Target date must be after start date.');
            return;
        }

        const isEditing = $('#taperingModalTitle').text().includes('Edit');
        const method = isEditing ? 'PATCH' : 'POST';

        $.ajax({
            url: `${baseUrl}/tapering-goal`,
            method: method,
            headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`
            },
            contentType: 'application/json',
            data: JSON.stringify(goalData),
            success: function() {
                closeTaperingGoalModal();
                loadTaperingGoal();
                alert(isEditing ? 'Goal updated successfully!' : 'Goal created successfully!');
            },
            error: function() {
                alert('Failed to save tapering goal.');
            }
        });
    });

    // Load tapering goal on page load
    loadTaperingGoal();
    
    // Load enhanced analytics on page load
    loadEnhancedAnalytics();
    
    // Refresh tapering progress every 60 seconds
    setInterval(function() {
        if ($('#taperingGoalSection').is(':visible')) {
            loadTaperingGoal();
        }
    }, 60000);

    // Close modal when clicking outside
    $('#taperingGoalModal').on('click', function(e) {
        if (e.target === this) {
            closeTaperingGoalModal();
        }
    });
});
