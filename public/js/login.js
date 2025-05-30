

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
                // Redirect to clonex dashboard page (adjust URL if needed)
                window.location.href = 'clonex.html';
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

        $.ajax({
            url: `${apiBase}/api/auth/register`,
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ name, email, password }),
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
