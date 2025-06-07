window.addEventListener('DOMContentLoaded', () => {
    const hash = window.location.hash;

    if (hash === '#register') {
        const triggerTab = new bootstrap.Tab(document.querySelector('#register-tab'));
        triggerTab.show();
    } else if (hash === '#forgot') {
        const triggerTab = new bootstrap.Tab(document.querySelector('#forgot-tab'));
        triggerTab.show();
    }
});


$(document).ready(function () {
    const apiBase = location.port === '8080' ? 'http://localhost:3000' : '';
    // Login form submission
    $('#loginForm').submit(function (e) {
        e.preventDefault();
        const email = $('#loginEmail').val().trim();
        const password = $('#loginPassword').val().trim();

        $.ajax({
            url: `${apiBase}/api/auth/login`,
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ email, password }),
            success: function (response) {
                localStorage.setItem('token', response.access_token);
                localStorage.setItem('user', JSON.stringify({
                    name: response.name,
                    email: response.email,
                    benzosType: response.benzosType
                }));
                window.location.href = 'benzos.html';
            },
            error: function (xhr) {
                const msg = xhr.responseJSON?.message || 'Login failed';
                $('#loginError').text(msg).removeClass('d-none');
            }
        });
    });

    // Registration form submission
    $('#registerForm').submit(function (e) {
        e.preventDefault();
        const name = $('#registerName').val().trim();
        const email = $('#registerEmail').val().trim();
        const password = $('#registerPassword').val().trim();
        const confirmPassword = $('#confirmPassword').val().trim();
        const benzosType = $('#benzos').val().trim();

        const isValid = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(password);
        if (!isValid) {
            alert("❌ Password must be at least 8 characters long and include upper, lower case letters and a number.");
            return;
        }

        if (password !== confirmPassword) {
            alert("❌ New password and confirmation do not match.");
            return;
        }

        $.ajax({
            url: `${apiBase}/api/auth/register`,
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ userName: name, email, password , benzosType }),
            success: function () {
                window.location.href = 'activate.html';
            },
            error: function (xhr) {
                const msg = xhr.responseJSON?.message || 'Registration failed';
                $('#authMessage')
                    .removeClass('d-none alert-success')
                    .addClass('alert-danger')
                    .text('❌ ' + msg);
            }
        });
    });

    $('#loginEmail, #loginPassword').on('input', () => {
        $('#loginError').addClass('d-none').text('');
    });

    // Forgot Password form submission (placeholder)
    $('#forgotForm').submit(function (e) {
        e.preventDefault();
        const email = $('#forgotEmail').val().trim();
        alert('If an account exists for ' + email + ', a reset link will be sent (this is a demo).');
    });
});
