// ========== NOTIFICATION SYSTEM ==========
function showNotification(message, type = 'info') {
    const colors = {
        success: '#10b881',
        error: '#ef4444',
        warning: '#f59e0b',
        info: '#4169ff'
    };
    
    const notification = $(`
        <div class="notification-toast" style="
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(255, 255, 255, 0.9);
            backdrop-filter: blur(10px);
            color: #1a1a1a;
            padding: 16px 24px;
            border-radius: 12px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.1);
            display: flex;
            align-items: center;
            gap: 12px;
            z-index: 99999;
            border-left: 5px solid ${colors[type]};
            animation: slideInRight 0.3s ease-out;
            font-family: 'Inter', sans-serif;
        ">
            <span style="font-size: 1.2rem;">${type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️'}</span>
            <span style="font-weight: 500;">${message}</span>
        </div>
    `);
    
    if (!$('#notification-styles').length) {
        $('<style id="notification-styles">@keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }</style>').appendTo('head');
    }
    
    $('body').append(notification);
    
    setTimeout(() => {
        notification.fadeOut(300, function() { $(this).remove(); });
    }, 3000);
}

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
                const msg = xhr.responseJSON?.message || 'The credentials you entered do not match.';
                $('#loginError').text(msg).removeClass('d-none');
                showNotification(msg, 'error');
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
            showNotification("Password must be at least 8 characters long and include upper, lower case letters and a number.", "error");
            return;
        }

        if (password !== confirmPassword) {
            showNotification("Passwords do not match.", "error");
            return;
        }

        $.ajax({
            url: `${apiBase}/api/auth/register`,
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ userName: name, email, password , benzosType }),
            success: function (data) {
                console.log('Registration successful:', data);
                showNotification('Account created successfully! Switching to login...', 'success');
                setTimeout(() => {
                    const triggerTab = new bootstrap.Tab(document.querySelector('#login-tab'));
                    triggerTab.show();
                }, 2000);
            },
            error: function (xhr) {
                const msg = xhr.responseJSON?.message || 'Registration failed';
                showNotification(msg, 'error');
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
