const baseUrl = location.port === '8080'
    ? 'http://localhost:3000/api/'
    : '/api/benzos';

const baseAuthUrl = location.port === '8080'
    ? 'http://localhost:3000/api/'
    : '/api/auth';

async function checkValuesOnPassword() {
    const currentPassword = document.getElementById('current-password').value.trim();
    const newPassword = document.getElementById('new-password').value.trim();
    const confirmPassword = document.getElementById('confirm-password').value.trim();
    const token = localStorage.getItem('token');

    // Basic frontend validation
    if (!currentPassword || !newPassword || !confirmPassword) {
        alert("⚠️ All fields are required.");
        return;
    }

    if (newPassword === currentPassword) {
        alert("⚠️ New password must be different from current password.");
        return;
    }

    const isValid = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(newPassword);
    if (!isValid) {
        alert("❌ Password must be at least 8 characters long and include upper, lower case letters and a number.");
        return;
    }

    if (newPassword !== confirmPassword) {
        alert("❌ New password and confirmation do not match.");
        return;
    }

    // Backend call
    try {
        const response = await fetch(`${baseAuthUrl}/change-password`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                currentPassword,
                newPassword
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to change password');
        }

        alert("✅ Password changed successfully. You will now be logged out.");
        const theme = localStorage.getItem('theme');
        localStorage.clear();
        if (theme) {
            localStorage.setItem('theme', theme);
        }
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 200);
    } catch (err) {
        alert("❌ " + err.message);
    }
}

function showTimeFormatSavedPopup(format) {
    const formatText = format === '24' ? '24-hour (14:30)' : '12-hour (2:30 PM)';

    const overlay = document.createElement('div');
    overlay.className = 'popup-overlay';

    const popup = document.createElement('div');
    popup.className = 'custom-popup-content';
    popup.innerHTML = `
        ✅ <strong>Time format saved!</strong><br>
        Your preference: <em>${formatText}</em>
    `;

    overlay.appendChild(popup);
    document.body.appendChild(overlay);

    setTimeout(() => {
        overlay.remove();
    }, 2000); // remove after 2 seconds
}



    window.addEventListener('DOMContentLoaded', () => {
        const savedFormat = localStorage.getItem('timeFormat') || '12';
        const saveButton = document.querySelector('button[onclick="saveTimeFormat()"]');

        const currentRadio = document.querySelector(`input[name="time-format"][value="${savedFormat}"]`);
        if (currentRadio) {
            currentRadio.checked = true;
            saveButton.disabled = true;
            saveButton.title = "Change value to enable Save";
        }

// Add change listeners
        document.querySelectorAll('input[name="time-format"]').forEach(radio => {
            radio.addEventListener('change', () => {
                const selected = document.querySelector('input[name="time-format"]:checked').value;
                const isSame = selected === savedFormat;
                saveButton.disabled = isSame;
                saveButton.title = isSame ? "Change value to enable Save" : "";
            });
        });

        // Set the correct radio button as checked based on saved format
        const radio = document.querySelector(`input[name="time-format"][value="${savedFormat}"]`);
        if (radio) {
            radio.checked = true;
        }

        // NOW apply visual selection styling
        document.querySelectorAll('input[name="time-format"]').forEach(radio => {
            const container = radio.closest('.radio-option');
            if (radio.checked) {
                container.classList.add('selected');
            } else {
                container.classList.remove('selected');
            }

            // Update on change
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
    });


    function changeBenzodiazepinesType() {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const existingBenzosType = user.benzosType;
        const newEnteredBenzosType = document.getElementById("BenzodiazepinesTypeId")?.value?.trim();


        if (existingBenzosType === newEnteredBenzosType) {
          this.showNoChangePopup();
        }

         else {
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
                     if (!response.ok) throw new Error('Failed to update Benzo Type');
                     return response.json();
                 })
                 .then(data => {
                     console.log('Benzo Type updated successfully:', data);
                     // Optional: update localStorage, show popup, etc.
                 }).then(() => {
                 const user = JSON.parse(localStorage.getItem('user'));
                 user.benzosType = newEnteredBenzosType;
                 localStorage.setItem('user', JSON.stringify(user));

                 showSavedPopup('✅ Benzo Type updated! Going to Benzos screen...');
                 setTimeout(() => {
                     window.location.href = '/benzos.html';
                 }, 1500);
             })
                 .catch(err => {
                     console.error(err);
                 });
             this.showSavedPopup('New Benzo Type Saved')
         }
    }

    function showSavedPopup(details) {
        const modal = document.getElementById("settingsModal");
        const msg = document.getElementById("modalMessage");
        msg.innerHTML = `${details}<br><br>Going to Benzos screen...`;
        modal.style.display = "flex";
    }

    function showUnSavedPopup(details) {
        const modal = document.getElementById("settingsModal");
        const msg = document.getElementById("modalMessage");
        msg.innerHTML = `${details}<br><br>Going to Benzos screen...`;
        modal.style.display = "flex";
    }

    function saveInGeneral(feature) {
        const actions = {
            uName: checkValuesOnName,
        };

        const action = actions[feature];
        if (action) action();
    }


    function checkValuesOnName() {
        const existingUser = JSON.parse(localStorage.getItem('user'));
        const newEnteredUser = document.getElementById("userName")?.value?.trim();


        if (existingUser?.name === newEnteredUser) {
            this.showNoChangePopup();
        }

        else {
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
                    console.log('Name updated successfully:', data);
                    // Optional: update localStorage, show popup, etc.
                }).then(() => {
                const user = JSON.parse(localStorage.getItem('user'));
                user.name = newEnteredUser;
                localStorage.setItem('user', JSON.stringify(user));

                showSavedPopup('✅ Name updated! Going to Benzos screen...');
                setTimeout(() => {
                    window.location.href = '/benzos.html';
                }, 1500);
            })
                .catch(err => {
                    console.error(err);
                });
            this.showSavedPopup('New Name Saved')
        }
    }

    function showNoChangePopup(message = "Same values entered as existing — nothing was saved.") {
        document.getElementById("noChangeMessage").innerText = message;
        document.getElementById("noChangeModal").style.display = "flex";
    }

    function closeNoChange() {
        document.getElementById("noChangeModal").style.display = "none";
    }

    function confirmRedirect() {
        const modal = document.getElementById("settingsModal");
        modal.style.display = "none";
        window.location.href = `../benzos.html`;
    }

    function cancelSettings() {
        window.location.href = `../benzos.html`;
    }

    function saveTimeFormat() {
        const selectedFormat = document.querySelector('input[name="time-format"]:checked')?.value;

        if (!selectedFormat) {
            alert("⚠️ Please select a time format.");
            return;
        }

        localStorage.setItem('timeFormat', selectedFormat);
        showTimeFormatSavedPopup(selectedFormat);
        setTimeout(() => {
            window.location.href = '/benzos.html';
        }, 2000);
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

