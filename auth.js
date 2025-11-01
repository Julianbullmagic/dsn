document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            const messageDiv = document.getElementById('login-message');

            try {
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });

                const data = await response.json();

                if (response.ok) {
                    localStorage.setItem('user', JSON.stringify(data.user));
                    localStorage.setItem('token', data.token);
                    messageDiv.innerHTML = '<p style="color: green;">Login successful! Redirecting...</p>';
                    setTimeout(() => {
                        window.location.href = '/';
                    }, 800);
                } else {
                    messageDiv.innerHTML = `<p style="color: red;">${data.error || 'Login failed'}</p>`;
                }
            } catch (err) {
                console.error('Login error', err);
                messageDiv.innerHTML = '<p style="color: red;">Login failed. Please try again.</p>';
            }
        });
    }

    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const username = document.getElementById('username').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirm-password').value;
            const messageDiv = document.getElementById('register-message');

            if (password !== confirmPassword) {
                messageDiv.innerHTML = '<p style="color: red;">Passwords do not match</p>';
                return;
            }

            try {
                const response = await fetch('/api/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, email, password })
                });

                const data = await response.json();

                if (response.ok) {
                    messageDiv.innerHTML = '<p style="color: green;">Registration successful! Check your email for verification.</p>';
                    registerForm.reset();
                } else {
                    messageDiv.innerHTML = `<p style="color: red;">${data.error || 'Registration failed'}</p>`;
                }
            } catch (err) {
                console.error('Registration error', err);
                messageDiv.innerHTML = '<p style="color: red;">Registration failed. Please try again.</p>';
            }
        });
    }
});


