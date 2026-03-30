// ============================================
// Auth Module (Login & Register)
// Handles AJAX calls for authentication
// ============================================

// Toast notification system
function showToast(message, type = 'success') {
    const container = $('#toast-container');
    if (container.length === 0) {
        $('body').append('<div id="toast-container" class="toast-container"></div>');
    }

    const icons = {
        success: '✓',
        error: '✕',
        warning: '⚠'
    };

    const toast = $(`
        <div class="toast-custom ${type}">
            <span class="toast-icon">${icons[type] || icons.success}</span>
            <span class="toast-message">${message}</span>
            <button class="toast-close" onclick="$(this).parent().fadeOut(200, function(){ $(this).remove(); })">&times;</button>
        </div>
    `);

    $('#toast-container').append(toast);

    // Auto-remove after 4 seconds
    setTimeout(() => {
        toast.fadeOut(300, function () { $(this).remove(); });
    }, 4000);
}

// Check if user is already logged in, redirect if so
function checkAuth() {
    $.ajax({
        url: '/api/me',
        method: 'GET',
        xhrFields: { withCredentials: true },
        success: function (response) {
            if (response.success && response.data) {
                // User is logged in, redirect based on role
                if (response.data.role === 'admin') {
                    window.location.href = '/admin-dashboard';
                } else {
                    window.location.href = '/student-dashboard';
                }
            }
        },
        error: function () {
            // Not logged in, stay on current page
        }
    });
}

// ---- LOGIN FORM HANDLER ----
$(document).ready(function () {
    // Login form submission
    $('#loginForm').on('submit', function (e) {
        e.preventDefault();

        const email = $('#loginEmail').val().trim();
        const password = $('#loginPassword').val();

        // Client-side validation
        if (!email || !password) {
            showToast('Please fill in all fields.', 'error');
            return;
        }

        const $btn = $(this).find('button[type="submit"]');
        const originalText = $btn.html();
        $btn.html('<span class="spinner-border spinner-border-sm me-2"></span>Signing in...').prop('disabled', true);

        $.ajax({
            url: '/api/login',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ email, password }),
            xhrFields: { withCredentials: true },
            success: function (response) {
                if (response.success) {
                    showToast('Login successful! Redirecting...', 'success');
                    // Store user data in sessionStorage for quick access
                    sessionStorage.setItem('user', JSON.stringify(response.data));
                    setTimeout(() => {
                        if (response.data.role === 'admin') {
                            window.location.href = '/admin-dashboard';
                        } else {
                            window.location.href = '/student-dashboard';
                        }
                    }, 800);
                }
            },
            error: function (xhr) {
                const msg = xhr.responseJSON?.message || 'Login failed. Please try again.';
                showToast(msg, 'error');
                $btn.html(originalText).prop('disabled', false);
            }
        });
    });

    // ---- REGISTER FORM HANDLER ----
    $('#registerForm').on('submit', function (e) {
        e.preventDefault();

        const name = $('#regName').val().trim();
        const email = $('#regEmail').val().trim();
        const password = $('#regPassword').val();
        const confirmPassword = $('#regConfirmPassword').val();

        // Client-side validation
        if (!name || !email || !password || !confirmPassword) {
            showToast('Please fill in all fields.', 'error');
            return;
        }

        if (password.length < 6) {
            showToast('Password must be at least 6 characters.', 'error');
            return;
        }

        if (password !== confirmPassword) {
            showToast('Passwords do not match.', 'error');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            showToast('Please enter a valid email address.', 'error');
            return;
        }

        const $btn = $(this).find('button[type="submit"]');
        const originalText = $btn.html();
        $btn.html('<span class="spinner-border spinner-border-sm me-2"></span>Creating account...').prop('disabled', true);

        $.ajax({
            url: '/api/register',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ name, email, password, confirmPassword }),
            xhrFields: { withCredentials: true },
            success: function (response) {
                if (response.success) {
                    showToast('Account created! Redirecting...', 'success');
                    sessionStorage.setItem('user', JSON.stringify(response.data));
                    setTimeout(() => {
                        window.location.href = '/student-dashboard';
                    }, 800);
                }
            },
            error: function (xhr) {
                const msg = xhr.responseJSON?.message || 'Registration failed. Please try again.';
                showToast(msg, 'error');
                $btn.html(originalText).prop('disabled', false);
            }
        });
    });

    // Toggle password visibility
    $('.toggle-password').on('click', function () {
        const input = $($(this).data('target'));
        const type = input.attr('type') === 'password' ? 'text' : 'password';
        input.attr('type', type);
        $(this).find('i').toggleClass('bi-eye bi-eye-slash');
    });
});
