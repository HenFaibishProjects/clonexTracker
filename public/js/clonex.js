const baseUrl = location.port === '8080'
    ? 'http://localhost:3000/api/'
    : '/api/clonex';
let lastRenderedEntries = [];
let dosageChart;
let isPageActive = true;
let lastTakenAt;

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
    const token = localStorage.getItem('token');
    if (!token) {
        alert('You must be logged in to access this page.');
        window.location.href = 'index.html';
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

            const modal = new bootstrap.Modal(document.getElementById('importChoiceModal'));
            modal.show();

            $('#deleteAndImportBtn').off('click').on('click', function () {
                modal.hide();
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
                modal.hide();
                batchImport(validEntries);
            });


            $('#csvFileInput').val('');
        };
        reader.readAsText(file);
    });


    $('#logoutBtn').click(function () {
        localStorage.removeItem('token');
        window.location.href = 'index.html';
    });

    $('#toggleDarkMode').click(function () {
        const isDark = $('body').hasClass('dark-mode');
        applyDarkMode(!isDark);
    });

    $('#nowBtn').click(function () {
        const now = new Date();
        const tzOffset = now.getTimezoneOffset() * 60000; // in ms
        const localISO = new Date(now - tzOffset).toISOString().slice(0, 16);
        $('#takenAt').val(localISO);
    });

    $('#dailyRange').on('change', function () {
        const selected = $(this).val();
        renderDailyChart(lastRenderedEntries, selected);
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
            $('#statsBox').addClass('d-none');
        });
    });

    $('#clearFilterBtn').click(function () {
        $('#filterFrom, #filterTo, #filterDosageFrom, #filterDosageTo, #filterReason, #filterComment').val('');
        loadEntries();
        renderChart(lastRenderedEntries);
        $('#filterStatsBox').addClass('d-none').html('');
        $('#statsBox').removeClass('d-none');
    });

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
            url: baseUrl,
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`
            },
            contentType: 'application/json',
            data: JSON.stringify(entry),
            success: function () {
                $('#clonexForm')[0].reset();
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
            takenAt: $row.find('input.takenAt').val(),
            reason: $row.find('input.reason').val(),
            comments: $row.find('input.comments').val()
        };

        $.ajax({
            url: `${baseUrl}/${id}`,
            type: 'PATCH',
            contentType: 'application/json',
            data: JSON.stringify(updated),
            success: loadEntries,
            error: () => alert('Error saving edit')
        });
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

    $('#runningTimer').text(`🕒 Time from Last Dosage: ${hours}:${minutes}:${seconds}`);
}, 1000);

function loadEntries() {
    $.get(baseUrl, function (entries) {
        renderEntries(entries);
        updateStats(entries);
        renderChart(entries);
        renderDailyChart(entries);
    });
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
        $('#statsBox').html('No entries yet.');
        return;
    }

    const total = entries.length;
    const lastEntry = entries[0];

    // Last 7 days
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const weekEntries = entries.filter(e => new Date(e.takenAt) >= oneWeekAgo);
    const avgWeek = weekEntries.length
        ? (weekEntries.reduce((sum, e) => sum + e.dosageMg, 0) / weekEntries.length).toFixed(2)
        : '0.00';
    const avgPerDayWeek = (weekEntries.reduce((sum, e) => sum + e.dosageMg, 0) / 7).toFixed(2);

    // Last 30 days
    const oneMonthAgo = new Date();
    oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);
    const monthEntries = entries.filter(e => new Date(e.takenAt) >= oneMonthAgo);
    const avgMonth = monthEntries.length
        ? (monthEntries.reduce((sum, e) => sum + e.dosageMg, 0) / monthEntries.length).toFixed(2)
        : '0.00';
    const avgPerDayMonth = (monthEntries.reduce((sum, e) => sum + e.dosageMg, 0) / 30).toFixed(2);

    const averageDosage = (entries.reduce((sum, e) => sum + e.dosageMg, 0) / total).toFixed(3);

    if (lastEntry.takenAt.includes(':')) {
        lastTakenAt = new Date(lastEntry.takenAt);
    } else {
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
        <br>
        <strong>Average Dosage in Last Week:</strong> ${avgWeek} mg<br/>
  
        <strong>Average Dosage in Last Month:</strong> ${avgMonth} mg<br/>
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

let dailyChart;

function renderDailyChart(entries, range = 'all') {
    const today = new Date();

    const filtered = entries.filter(e => {
        if (range === 'all') return true;
        const daysAgo = parseInt(range);
        const date = new Date(e.takenAt);
        return date >= new Date(today.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    });

    if (!filtered.length) {
        if (dailyChart) dailyChart.destroy();
        $('#dailyAverageBox').addClass('d-none');
        return;
    }

    const dailyMap = {};
    filtered.forEach(e => {
        const day = new Date(e.takenAt).toISOString().split('T')[0];
        if (!dailyMap[day]) dailyMap[day] = [];
        dailyMap[day].push(e.dosageMg);
    });

    const start = range === 'all'
        ? entries.length
            ? new Date(Math.min(...entries.map(e => new Date(e.takenAt))))
            : new Date(today)
        : new Date(today.getTime() - parseInt(range) * 24 * 60 * 60 * 1000);

    const dateLabels = [];
    const dateSums = [];

    for (let d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) {
        const key = d.toISOString().split('T')[0];
        const avg = dailyMap[key]
            ? (dailyMap[key].reduce((sum, val) => sum + val, 0)).toFixed(3)
            : 0;
        dateLabels.push(key);
        dateSums.push(avg);
    }

    if (dailyChart) {
        dailyChart.destroy();
    }

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

    // ✅ Daily average display
    const totalDosage = filtered.reduce((sum, e) => sum + e.dosageMg, 0);
    const totalDays = Math.max(1, Math.ceil((today - start) / (1000 * 60 * 60 * 24)));
    const avgPerDay = (totalDosage / totalDays).toFixed(2);

    // 👉 Calculate longest gap between dose days (in hours)
    let maxGapHours = 0;
    const doseDates = Object.keys(dailyMap)
        .filter(day => dailyMap[day].some(d => d > 0))
        .sort();

    for (let i = 1; i < doseDates.length; i++) {
        const prev = new Date(doseDates[i - 1]);
        const curr = new Date(doseDates[i]);
        const diffHours = Math.round((curr - prev) / (1000 * 60 * 60));
        if (diffHours > maxGapHours) maxGapHours = diffHours;
    }

// 👉 Format the hours to readable string
    function formatGap(hours) {
        if (hours < 12) return `${hours} hours`;
        if (hours < 24) return `${hours} hours (half day)`;

        const days = Math.floor(hours / 24);
        const rem = hours % 24;

        if (rem === 0) return `${hours} hours (${days} day${days > 1 ? 's' : ''})`;
        if (rem <= 12) return `${hours} hours (${days}½ day${days > 0 ? 's' : ''})`;
        return `${hours} hours (${days + 1} day${days + 1 > 1 ? 's' : ''})`;
    }

    $('#dailyAverageBox')
        .removeClass('d-none')
        .html(`
        <strong>Daily Avg for Selected Range:</strong> ${avgPerDay} mg/day<br/>
        <strong>Longest Gap Between Doses:</strong> ${formatGap(maxGapHours)}
    `);
}


function applyDarkMode(enabled) {
    $('body').toggleClass('dark-mode', enabled);
    $('#toggleDarkMode').text(enabled ? '☀️ Light Mode' : '🌙 Dark Mode');
    localStorage.setItem('darkMode', enabled ? '1' : '0');
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
