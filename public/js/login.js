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

function hideForgotPassword() {
    // First deactivate all tab panes
    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.remove('show', 'active');
    });

    // Activate the login tab pane
    document.getElementById('login').classList.add('show', 'active');

    // Optional: also update nav-link active state if you care
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });

    // Set the login tab link as active
    document.getElementById('login-tab').classList.add('active');
}

function showForgotPassword() {
    // First deactivate all tab panes
    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.remove('show', 'active');
    });

    // Activate the forgot password tab pane
    document.getElementById('forgot').classList.add('show', 'active');

    // Optional: also update nav-link active state if you care
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
}

$(document).ready(function () {
    const hash = window.location.hash;
    if (hash === '#register') {
        const triggerTab = new bootstrap.Tab(document.querySelector('#register-tab'));
        triggerTab.show();
    } else if (hash === '#forgot') {
        const triggerTab = new bootstrap.Tab(document.querySelector('#forgot-tab'));
        triggerTab.show();
    }
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
                console.log("XHR object:", xhr);
                const msg = xhr.responseJSON?.message || 'Login failed';
                $('#loginError').text(msg).removeClass('d-none');
                console.log("Error message displayed in #loginError.");
                alert('❌ The credentials you entered don\'t match what\'s stored in the system.');
                console.log("Alert should have been shown.");
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
            success: function (data) {
                console.log('Registration successful:', data);
                // Show the custom modal (not Bootstrap modal)
                document.getElementById('successModal').classList.add('active');
            },
            error: function (xhr) {
                const msg = xhr.responseJSON?.message || 'Registration failed';
                const authMessage = document.getElementById('authMessage');
                authMessage.className = 'alert-message error';
                authMessage.innerHTML = '<span>❌</span><span>' + msg + '</span>';
            }
        });
    });

    $('#loginEmail, #loginPassword').on('input', () => {
        $('#loginError').addClass('d-none').text('');
    });

    $('#forgotForm').submit(function (e) {
        e.preventDefault();

        const email = $('#forgotEmail').val().trim();
        if (!email) {
            alert('Please enter your email address.');
            return;
        }

        $.ajax({
            url: `${apiBase}/api/auth/request-reset-password`,
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ email }),
            success: function () {
                $('#forgotForm')[0].reset();
                window.location.href = `afterChangePw.html?email=${encodeURIComponent(email)}`;
            },
            error: function () {
                alert('❌ Failed to send password reset. Please try again.');
            }
        });
    });
});
