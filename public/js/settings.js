const baseUrl = location.port === '8080'
    ? 'http://localhost:3000/api/'
    : '/api/clonex';
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
            photo: changePhoto,
            password: checkValuesOnPassword,
            phone: checkValuesOnPhone
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

    function changePhoto () {
    }

    function checkValuesOnPhone () {
    }

    function checkValuesOnPassword () {
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

    function saveSettings() {
        console.log('Save settings');
        // You'll add your save logic here
        alert('Settings saved! (Add your save logic here)');
    }


    // Update radio button styling when selected
    document.querySelectorAll('input[name="time-format"]').forEach(radio => {
        radio.addEventListener('change', function () {
            document.querySelectorAll('.radio-option').forEach(option => {
                option.classList.remove('selected');
            });
            this.closest('.radio-option').classList.add('selected');
        });
    });

    // Initialize selected state
    document.querySelector('input[name="time-format"]:checked').closest('.radio-option').classList.add('selected');

    // File upload preview
    document.getElementById('photo-upload').addEventListener('change', function (e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function (e) {
                const photoContainer = document.querySelector('.current-photo');
                photoContainer.innerHTML = `<img src="${e.target.result}" alt="Profile Photo">`;
            };
            reader.readAsDataURL(file);
        }


    });
}