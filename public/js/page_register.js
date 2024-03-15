const usernameInput = document.getElementById('username');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const confirmPasswordInput = document.getElementById('confirmPassword');
const usernameFeedback = document.createElement('div');
const emailFeedback = document.createElement('div');
const passwordFeedback = document.createElement('div');
const confirmPasswordFeedback = document.createElement('div'); // Added this line

// Insert feedback elements into the DOM
usernameInput.parentNode.insertBefore(usernameFeedback, usernameInput.nextSibling);
emailInput.parentNode.insertBefore(emailFeedback, emailInput.nextSibling);
passwordInput.parentNode.insertBefore(passwordFeedback, passwordInput.nextSibling);
confirmPasswordInput.parentNode.insertBefore(confirmPasswordFeedback, confirmPasswordInput.nextSibling); // Added this line

// Debounce function to limit the rate of AJAX requests
function debounce(func, wait, immediate) {
  var timeout;
  return function() {
    var context = this, args = arguments;
    var later = function() {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };
    var callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func.apply(context, args);
  };
};

const updateInputFeedback = (inputElement, feedback, isValid) => {
  const feedbackElement = inputElement.nextElementSibling;
  feedbackElement.textContent = feedback;
  feedbackElement.style.color = isValid ? 'green' : 'red';
  inputElement.style.borderColor = isValid ? 'green' : 'red';
};

const checkUsernameAvailability = debounce(function() {
  if (!usernameInput.value) {
    updateInputFeedback(usernameInput, 'Username is empty', false);
    return;
  }

  fetch(`/register/check-username/${usernameInput.value}`)
    .then(response => response.json())
    .then(data => {
      updateInputFeedback(usernameInput, data.message, data.valid);
    }).catch(error => {
      console.error('Error checking username availability:', error);
    });
}, 250);

const checkEmailAvailability = debounce(function() {
  if (!emailInput.value) {
    // allow empty
    return;
  }
  fetch(`/register/check-email/${emailInput.value}`)
    .then(response => response.json())
    .then(data => {
      updateInputFeedback(emailInput, data.message, data.valid);
    }).catch(error => {
      console.error('Error checking email availability:', error);
    });
}, 250);

// Consolidated password strength and validation
const validatePasswordStrength = function() {
  const length = passwordInput.value.length;
  if (!length) {
    updateInputFeedback(passwordInput, 'Password is empty', false);
    return;
  }
  let feedback = '';
  let color = 'red';
  let isValid = false;
  if (length >= 12) {
    feedback = 'Strong';
    color = 'green';
    isValid = true;
  } else if (length >= 8) {
    feedback = 'Medium';
    color = 'orange';
    isValid = true;
  } else if (length > 0) {
    feedback = 'Weak';
    isValid = false;
  } else {
    feedback = '';
  }
  updateInputFeedback(passwordInput, feedback, isValid);
};

const validateConfirmPassword = () => {
  const isValid = confirmPasswordInput.value === passwordInput.value && confirmPasswordInput.value !== '';
  updateInputFeedback(confirmPasswordInput, isValid ? 'Passwords match' : 'Passwords do not match', isValid);
};

// Event listeners
usernameInput.addEventListener('input', checkUsernameAvailability);
emailInput.addEventListener('input', checkEmailAvailability);
passwordInput.addEventListener('input', validatePasswordStrength);
confirmPasswordInput.addEventListener('input', validateConfirmPassword);

function validateForm() {
  let isValid = true;

  // Trigger validation checks manually
  checkUsernameAvailability();
  checkEmailAvailability();
  validatePasswordStrength();
  validateConfirmPassword();

  // Wait a brief moment for async validations to complete (e.g., username and email availability)
  setTimeout(() => {
    const inputs = [usernameInput, emailInput, passwordInput, confirmPasswordInput];
    inputs.forEach(input => {
      if (input.style.borderColor === 'red') {
        isValid = false;
      }
    });

    if (isValid) {
      document.getElementById("registerForm").submit();
    }
  }, 300); // Adjust timeout as necessary based on your async validation response times

  return isValid;
}

function onRecaptchaSuccess(token) {
  if (validateForm()) { // Ensure validateForm now returns a boolean indicating pass/fail
    document.getElementById("registerForm").submit();
  } else {
    grecaptcha.reset(); // Resets the reCAPTCHA widget if validation fails
  }
}

window.onSubmit = function(token) {
    validateForm(); // Adjust this call to your form validation logic
};

var script = document.createElement('script');
script.src = 'https://www.google.com/recaptcha/api.js';
script.async = true;
script.defer = true;
document.head.appendChild(script);
