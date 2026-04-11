const baseUrl = location.port === '8080'
    ? 'http://localhost:3000/api/benzos'
    : '/api/benzos';

const baseAuthUrl = location.port === '8080'
    ? 'http://localhost:3000/api/auth'
    : '/api/auth';

// ========== NOTIFICATION SYSTEM ==========
function showNotification(message, type = 'info') {
    const colors = {
        success: '#10b881',
        error: '#ef4444',
        warning: '#f59e0b',
        info: '#4169ff'
    };

    // Inject keyframe animation style once
    if (!document.getElementById('notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = '@keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }';
        document.head.appendChild(style);
    }

    const notification = document.createElement('div');
    notification.className = 'notification-toast';
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--bg-elevated);
        color: var(--text-primary);
        padding: 16px 24px;
        border-radius: 12px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.1);
        display: flex;
        align-items: center;
        gap: 12px;
        z-index: 99999;
        border-left: 5px solid ${colors[type]};
        animation: slideInRight 0.3s ease-out;
        transition: opacity 0.3s ease;
    `;
    const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️';
    notification.innerHTML = `
        <span style="font-size: 1.2rem;">${icon}</span>
        <span style="font-weight: 500;">${message}</span>
    `;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

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

    // Remove any existing dialog
    document.querySelectorAll('.confirm-dialog-overlay').forEach(el => el.remove());

    const overlay = document.createElement('div');
    overlay.className = 'confirm-dialog-overlay';
    overlay.innerHTML = `
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
    `;
    document.body.appendChild(overlay);

    const closeDialog = () => {
        overlay.style.opacity = '0';
        setTimeout(() => overlay.remove(), 200);
    };

    overlay.querySelector('.dialog-btn-cancel').addEventListener('click', () => {
        closeDialog();
        if (onCancel) onCancel();
    });

    overlay.querySelector('.dialog-btn-confirm').addEventListener('click', () => {
        closeDialog();
        if (onConfirm) onConfirm();
    });

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            closeDialog();
            if (onCancel) onCancel();
        }
    });
}

async function checkValuesOnPassword() {
    const currentPassword = document.getElementById('current-password').value.trim();
    const newPassword = document.getElementById('new-password').value.trim();
    const confirmPassword = document.getElementById('confirm-password').value.trim();
    const token = localStorage.getItem('token');

    if (!currentPassword || !newPassword || !confirmPassword) {
        showNotification("All fields are required.", "warning");
        return;
    }

    if (newPassword === currentPassword) {
        showNotification("New password must be different from current password.", "warning");
        return;
    }

    const isValid = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(newPassword);
    if (!isValid) {
        showNotification("Password must be at least 8 characters long and include upper, lower case letters and a number.", "error");
        return;
    }

    if (newPassword !== confirmPassword) {
        showNotification("New password and confirmation do not match.", "error");
        return;
    }

    try {
        const response = await fetch(`${baseAuthUrl}/change-password`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ currentPassword, newPassword })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to change password');
        }

        showNotification("Password changed successfully! Logging out...", "success");
        const theme = localStorage.getItem('appTheme');
        localStorage.clear();
        if (theme) localStorage.setItem('appTheme', theme);
        
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);
    } catch (err) {
        showNotification(err.message, "error");
    }
}

window.addEventListener('DOMContentLoaded', () => {
    const savedFormat = localStorage.getItem('timeFormat') || '12';
    const saveButton = document.querySelector('button[onclick="saveTimeFormat()"]');

    const currentRadio = document.querySelector(`input[name="time-format"][value="${savedFormat}"]`);
    if (currentRadio) {
        currentRadio.checked = true;
        saveButton.disabled = true;
    }

    document.querySelectorAll('input[name="time-format"]').forEach(radio => {
        radio.addEventListener('change', () => {
            const selected = document.querySelector('input[name="time-format"]:checked').value;
            saveButton.disabled = (selected === savedFormat);
        });
    });

    // Style selection logic
    document.querySelectorAll('input[name="time-format"]').forEach(radio => {
        const container = radio.closest('.radio-option');
        if (radio.checked) container.classList.add('selected');
        radio.addEventListener('change', () => {
            document.querySelectorAll('.radio-option').forEach(opt => opt.classList.remove('selected'));
            container.classList.add('selected');
        });
    });

    // Optional: load user name + email
    const user = JSON.parse(localStorage.getItem('user'));
    if (user?.name) {
        document.getElementById('userName').value = user.name;
    }
    if (user?.email) {
        document.getElementById('primary-email').value = user.email;
    }
    if (user?.benzosType) {
        document.getElementById('BenzodiazepinesTypeId').value = user.benzosType;
    }

    // Initialize theme selection
    const savedTheme = localStorage.getItem('appTheme') || 'default';
    const themeRadio = document.querySelector(`input[name="app-theme"][value="${savedTheme}"]`);
    const saveThemeBtn = document.getElementById('saveThemeBtn');
    
    if (themeRadio) {
        themeRadio.checked = true;
        const container = themeRadio.closest('.radio-option');
        container.classList.add('selected');
    }

    // Add listeners for theme changes
    document.querySelectorAll('input[name="app-theme"]').forEach(radio => {
        radio.addEventListener('change', () => {
            const selected = document.querySelector('input[name="app-theme"]:checked').value;
            const isSame = selected === savedTheme;
            saveThemeBtn.disabled = isSame;
            
            // Update visual selection
            document.querySelectorAll('#theme-radio-group .radio-option').forEach(opt => opt.classList.remove('selected'));
            radio.closest('.radio-option').classList.add('selected');
            
            // Live preview the theme
            applyAppTheme(selected);
        });
    });
});


    function changeBenzodiazepinesType() {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const existingBenzosType = user.benzosType;
        const newEnteredBenzosType = document.getElementById("BenzodiazepinesTypeId")?.value?.trim();

        if (existingBenzosType === newEnteredBenzosType) {
          showNotification("Same frequency entered — nothing was saved.", "info");
          return;
        }

        const token = localStorage.getItem('token');
        fetch(`${baseUrl}/changeBenzosType`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ newBenzosType: newEnteredBenzosType })
        })
        .then(response => {
            if (!response.ok) throw new Error('Failed to update frequency');
            return response.json();
        })
        .then(data => {
            const user = JSON.parse(localStorage.getItem('user'));
            user.benzosType = newEnteredBenzosType;
            localStorage.setItem('user', JSON.stringify(user));

            showNotification('✅ Medication frequency updated!', 'success');
            setTimeout(() => {
                window.location.href = '/benzos.html';
            }, 1500);
        })
        .catch(err => {
            showNotification(err.message, 'error');
        });
    }

    function checkValuesOnName() {
        const existingUser = JSON.parse(localStorage.getItem('user'));
        const newEnteredUser = document.getElementById("userName")?.value?.trim();

        if (existingUser?.name === newEnteredUser) {
            showNotification("Same name entered — nothing was saved.", "info");
            return;
        }

        const token = localStorage.getItem('token');
        fetch(`${baseUrl}/changeName`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ newName: newEnteredUser })
        })
        .then(response => {
            if (!response.ok) throw new Error('Failed to update name');
            return response.json();
        })
        .then(data => {
            const user = JSON.parse(localStorage.getItem('user'));
            user.name = newEnteredUser;
            localStorage.setItem('user', JSON.stringify(user));

            showNotification('✅ Name updated successfully!', 'success');
            setTimeout(() => {
                window.location.href = '/benzos.html';
            }, 1500);
        })
        .catch(err => {
            showNotification(err.message, 'error');
        });
    }


    function cancelSettings() {
        window.location.href = `../benzos.html`;
    }

    function saveTimeFormat() {
        const selectedFormat = document.querySelector('input[name="time-format"]:checked')?.value;

        if (!selectedFormat) {
            showNotification("Please select a time format.", "warning");
            return;
        }

        localStorage.setItem('timeFormat', selectedFormat);
        showNotification("📝 Time format saved successfully!", "success");
        setTimeout(() => {
            window.location.href = '/benzos.html';
        }, 1500);
    }


    document.querySelectorAll('input[name="time-format"]').forEach(radio => {
        radio.addEventListener('change', function () {
            document.querySelectorAll('.radio-option').forEach(option => {
                option.classList.remove('selected');
            });
            this.closest('.radio-option').classList.add('selected');
        });
    });

    document.querySelector('input[name="time-format"]:checked').closest('.radio-option').classList.add('selected');


function saveThemePreference() {
    const selectedTheme = document.querySelector('input[name="app-theme"]:checked')?.value;
    if (!selectedTheme) return;

    localStorage.setItem('appTheme', selectedTheme);
    const themeName = selectedTheme.charAt(0).toUpperCase() + selectedTheme.slice(1);
    
    showNotification(`✨ ${themeName} theme saved as default!`, "success");
    document.getElementById('saveThemeBtn').disabled = true;
}

function applyAppTheme(theme) {
    document.body.classList.remove('theme-serenity', 'theme-midnight');
    if (theme !== 'default') {
        document.body.classList.add(`theme-${theme}`);
    }
}

// Apply theme on initial load of settings page
applyAppTheme(localStorage.getItem('appTheme') || 'default');

