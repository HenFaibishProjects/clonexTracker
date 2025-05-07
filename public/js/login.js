

$(document).ready(function () {
    // Login form submission
    $('#loginForm').submit(function (e) {
        e.preventDefault();
        const email = $('#loginEmail').val().trim();
        const password = $('#loginPassword').val().trim();

        $.ajax({
            url: '/auth/login',
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
            url: '/auth/signup',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ name, email, password }),
            success: function (response) {
                alert('Registration successful! You can now log in.');
                $('#registerForm')[0].reset();
                // Optionally, switch to the login tab:
                var loginTab = new bootstrap.Tab(document.getElementById('login-tab'));
                loginTab.show();
                $('#loginForm')[0].reset();
                $('#loginError').addClass('d-none').text('');
            },
            error: function (xhr) {
                alert('Registration failed: ' + xhr.responseJSON.message);
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
