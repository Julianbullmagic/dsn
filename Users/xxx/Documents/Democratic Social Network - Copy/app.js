// Handle toggle between login and register forms
const toggleLoginBtn = document.getElementById('toggle-login');
const toggleRegisterBtn = document.getElementById('toggle-register');
const loginFormContainer = document.getElementById('login-form-container');
const registerFormContainer = document.getElementById('register-form-container');

toggleLoginBtn.addEventListener('click', () => {
    loginFormContainer.classList.add('active');
    registerFormContainer.classList.remove('active');
});

toggleRegisterBtn.addEventListener('click', () => {
    registerFormContainer.classList.add('active');
    loginFormContainer.classList.remove('active');
});