const baseUrl = location.port === '8080'
    ? 'http://localhost:3000/api/'
    : '/api/clonex';

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
            window.location.href = 'index.html';
        }, 200);
    } catch (err) {
        alert("❌ " + err.message);
    }
}

if (document.readyState === 'loading') {

    window.addEventListener('DOMContentLoaded', () => {
        const user = JSON.parse(localStorage.getItem('user'));
        console.log(user.name);
        if (user?.name) {
            document.getElementById('userName').value = user.name;
        }

        if (user?.email) {
            document.getElementById('primary-email').value = user.email;
        }
    });

    function showSavedPopup(details) {
        const modal = document.getElementById("settingsModal");
        const msg = document.getElementById("modalMessage");
        msg.innerHTML = `${details}<br><br>Going to Clonex screen...`;
        modal.style.display = "flex";
    }

    function showUnSavedPopup(details) {
        const modal = document.getElementById("settingsModal");
        const msg = document.getElementById("modalMessage");
        msg.innerHTML = `${details}<br><br>Going to Clonex screen...`;
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

                showSavedPopup('✅ Name updated! Going to Clonex screen...');
                setTimeout(() => {
                    window.location.href = '/clonex.html';
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
        window.location.href = `${window.location.origin}/clonex.html`;
    }

    function cancelSettings() {
        window.location.href = `${window.location.origin}/clonex.html`;
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

}