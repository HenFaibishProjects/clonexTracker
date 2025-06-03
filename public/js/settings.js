if (document.readyState === 'loading') {

    window.addEventListener('DOMContentLoaded', () => {
        const user = JSON.parse(localStorage.getItem('user'));
        console.log("---------------------------");
        console.log(user.name);
        if (user?.name) {
            document.getElementById('userName').value = user.name;
        }

        if (user?.email) {
            document.getElementById('primary-email').value = user.email;
        }
    });


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