// State
let currentTourStep = 1;
let selectedMethod = null;
let isDocumentSigned = false;
let otpResendInterval = null;
let otpSecondsRemaining = 30;

const recipientEmail = 'anarasimhan@sdocs.com';
const recipientPhone = '(•••) •••-0148';

// Cards / screens
const cards = {
  consent: document.getElementById('consent-card'),
  email: document.getElementById('email-verify-card'),
  sms: document.getElementById('sms-verify-card'),
  oidc: document.getElementById('oidc-verify-card'),
  jumioIntro: document.getElementById('jumio-intro-card'),
  jumioSelfie: document.getElementById('jumio-selfie-card'),
  jumioId: document.getElementById('jumio-id-card'),
  jumioProcessing: document.getElementById('jumio-processing-card'),
  verified: document.getElementById('verified-success-card'),
};

const signingView = document.getElementById('signing-view');
const otpModal = document.getElementById('otp-modal');
const verifyStatusBadge = document.getElementById('verify-status-badge');

// Prototype-only control: simulates whichever single method the sender configured
const senderMethodSelect = document.getElementById('sender-method-select');

// OTP elements
const otpBoxes = document.querySelectorAll('.otp-box');
const otpDestination = document.getElementById('otp-destination');
const otpResendTimer = document.getElementById('otp-resend-timer');

// Tour elements
const tourWidget = document.getElementById('tour-widget');
const tourMinimizeBtn = document.getElementById('tour-minimize-btn');
const tourStepTitle = document.getElementById('tour-step-title');
const tourStepDesc = document.getElementById('tour-step-desc');
const tourPrevBtn = document.getElementById('tour-prev-btn');
const tourNextBtn = document.getElementById('tour-next-btn');
const stepDots = document.querySelectorAll('.step-dot');

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('email-verify-address').textContent = recipientEmail;
  document.getElementById('sms-verify-number').textContent = recipientPhone;

  setupEventListeners();
  checkUrlParams();
  updateTourUI();
});

function setupEventListeners() {
  // Consent — routes straight to whichever single method the toolbar has configured,
  // matching how a signer only ever sees the one method their sender enabled.
  document.getElementById('btn-cancel').addEventListener('click', () => alert('Signing cancelled.'));
  document.getElementById('btn-confirm-consent').addEventListener('click', () => {
    routeToMethodScreen(senderMethodSelect.value);
    setTourStep(2);
  });

  // Email flow
  document.getElementById('btn-email-back').addEventListener('click', () => showCard('consent'));
  document.getElementById('btn-email-send').addEventListener('click', () => openOtpModal(recipientEmail));

  // SMS flow
  document.getElementById('btn-sms-back').addEventListener('click', () => showCard('consent'));
  document.getElementById('btn-sms-send').addEventListener('click', () => openOtpModal(recipientPhone));

  // OIDC flow
  document.getElementById('btn-oidc-back').addEventListener('click', () => showCard('consent'));
  document.getElementById('btn-oidc-continue').addEventListener('click', () => {
    window.location.href = 'okta-login.html?email=' + encodeURIComponent(recipientEmail);
  });

  // Jumio flow
  document.getElementById('btn-jumio-back').addEventListener('click', () => showCard('consent'));
  document.getElementById('btn-jumio-start').addEventListener('click', () => showCard('jumioSelfie'));
  document.getElementById('btn-selfie-back').addEventListener('click', () => showCard('jumioIntro'));
  document.getElementById('btn-selfie-capture').addEventListener('click', () => capturePhoto('selfie', () => showCard('jumioId')));
  document.getElementById('btn-id-back').addEventListener('click', () => showCard('jumioSelfie'));
  document.getElementById('btn-id-capture').addEventListener('click', () => capturePhoto('id', startJumioProcessing));

  // OTP modal
  document.getElementById('otp-close-x').addEventListener('click', closeOtpModal);
  otpModal.addEventListener('click', (e) => { if (e.target === otpModal) closeOtpModal(); });
  document.getElementById('otp-resend').addEventListener('click', (e) => { e.preventDefault(); startOtpResendTimer(); });
  document.getElementById('btn-otp-verify').addEventListener('click', verifyOtp);
  setupOtpBoxNavigation();

  // Verified success
  document.getElementById('btn-try-another').addEventListener('click', () => {
    resetVerificationState();
    showCard('consent');
    setTourStep(1);
  });
  document.getElementById('btn-goto-document').addEventListener('click', () => {
    showSigningView();
    setTourStep(3);
  });

  // Signing view
  document.getElementById('sig-field-trigger').addEventListener('click', toggleSignature);
  document.getElementById('btn-signing-finish').addEventListener('click', () => {
    if (!isDocumentSigned) {
      alert('Please sign the document before clicking Finish.');
      const sigField = document.getElementById('sig-field-trigger');
      sigField.classList.add('tour-pulse-highlight');
      setTimeout(() => sigField.classList.remove('tour-pulse-highlight'), 2000);
    } else {
      alert('Document signed successfully! In a real scenario, this completes the session.');
    }
  });

  // Tour controls
  tourMinimizeBtn.addEventListener('click', () => tourWidget.classList.toggle('minimized'));
  tourPrevBtn.addEventListener('click', handleTourPrev);
  tourNextBtn.addEventListener('click', handleTourNext);
  stepDots.forEach(dot => {
    dot.addEventListener('click', (e) => setTourStep(parseInt(e.target.getAttribute('data-step'), 10)));
  });
}

// Handle return from mock Okta login page
function checkUrlParams() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('verified') === 'oidc') {
    senderMethodSelect.value = 'oidc';
    window.history.replaceState({}, document.title, window.location.pathname);
    showVerifiedSuccess('oidc');
    setTourStep(2);
  }
}

// Screen switching
function showCard(name) {
  Object.values(cards).forEach(c => c.classList.remove('active'));
  signingView.classList.remove('active');
  cards[name].classList.add('active');
}

function routeToMethodScreen(method) {
  if (method === 'email') showCard('email');
  else if (method === 'sms') showCard('sms');
  else if (method === 'oidc') showCard('oidc');
  else if (method === 'jumio') showCard('jumioIntro');
}

function resetVerificationState() {
  selectedMethod = null;
  verifyStatusBadge.textContent = 'Identity Not Verified';
  verifyStatusBadge.classList.remove('verified');
}

// OTP modal
function openOtpModal(destination) {
  otpDestination.textContent = destination;
  otpModal.classList.add('open');
  otpBoxes.forEach(b => b.value = '');
  setTimeout(() => otpBoxes[0].focus(), 150);
  startOtpResendTimer();
}

function closeOtpModal() {
  otpModal.classList.remove('open');
  clearInterval(otpResendInterval);
}

function setupOtpBoxNavigation() {
  otpBoxes.forEach((box, index) => {
    box.addEventListener('input', () => {
      box.value = box.value.replace(/[^0-9]/g, '');
      if (box.value && index < otpBoxes.length - 1) {
        otpBoxes[index + 1].focus();
      }
    });
    box.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !box.value && index > 0) {
        otpBoxes[index - 1].focus();
      }
    });
  });
}

function startOtpResendTimer() {
  clearInterval(otpResendInterval);
  otpSecondsRemaining = 30;
  otpResendTimer.textContent = '00:' + String(otpSecondsRemaining).padStart(3, '0');
  otpResendInterval = setInterval(() => {
    otpSecondsRemaining--;
    otpResendTimer.textContent = '00:' + String(otpSecondsRemaining).padStart(3, '0');
    if (otpSecondsRemaining <= 0) clearInterval(otpResendInterval);
  }, 1000);
}

function verifyOtp() {
  const code = Array.from(otpBoxes).map(b => b.value).join('');
  if (code.length < 6) {
    otpBoxes.forEach(b => { if (!b.value) b.classList.add('tour-pulse-highlight'); });
    setTimeout(() => otpBoxes.forEach(b => b.classList.remove('tour-pulse-highlight')), 1200);
    return;
  }
  closeOtpModal();
  showVerifiedSuccess(senderMethodSelect.value);
}

// Camera capture mock
function capturePhoto(kind, onDone) {
  const flash = document.getElementById(kind + '-flash');
  const check = document.getElementById(kind + '-check');
  flash.classList.add('flashing');
  setTimeout(() => flash.classList.remove('flashing'), 350);
  setTimeout(() => {
    check.classList.add('show');
    setTimeout(() => {
      check.classList.remove('show');
      onDone();
    }, 700);
  }, 250);
}

function startJumioProcessing() {
  showCard('jumioProcessing');
  setTimeout(() => showVerifiedSuccess('jumio'), 2200);
}

// Verified success
const methodLabels = {
  email: 'Email',
  sms: 'SMS / Text Message',
  oidc: 'Single Sign-On (Okta)',
  jumio: 'ID + Selfie Verification (Jumio)',
};

function showVerifiedSuccess(method) {
  selectedMethod = method;
  document.getElementById('verified-method-note').textContent = 'Verified via ' + methodLabels[method] + '.';
  showCard('verified');
  verifyStatusBadge.textContent = 'Identity Verified';
  verifyStatusBadge.classList.add('verified');
}

// Signing view
function showSigningView() {
  Object.values(cards).forEach(c => c.classList.remove('active'));
  signingView.classList.add('active');
  document.getElementById('signing-verified-pill').innerHTML =
    '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg> Verified via ' + methodLabels[selectedMethod];
}

function toggleSignature() {
  isDocumentSigned = !isDocumentSigned;
  const sigField = document.getElementById('sig-field-trigger');
  const fill = document.getElementById('signing-progress-fill');
  const text = document.getElementById('signing-progress-text');
  if (isDocumentSigned) {
    sigField.classList.add('signed');
    fill.style.width = '100%';
    text.textContent = '100%';
  } else {
    sigField.classList.remove('signed');
    fill.style.width = '0%';
    text.textContent = '0%';
  }
}

// Tour Guide logic (3 steps: Consent -> Verify -> Signing)
function setTourStep(step) {
  currentTourStep = step;
  updateTourUI();
}

function handleTourPrev() {
  if (currentTourStep > 1) setTourStep(currentTourStep - 1);
}

function handleTourNext() {
  if (currentTourStep === 1) {
    routeToMethodScreen(senderMethodSelect.value);
    setTourStep(2);
  } else if (currentTourStep === 2) {
    // Auto-progress the current in-flight verification method to completion
    const method = senderMethodSelect.value;
    if (method === 'email') { openOtpModal(recipientEmail); autoFillOtp(); verifyOtp(); }
    else if (method === 'sms') { openOtpModal(recipientPhone); autoFillOtp(); verifyOtp(); }
    else if (method === 'oidc') { showVerifiedSuccess('oidc'); }
    else if (method === 'jumio') { showVerifiedSuccess('jumio'); }
    setTourStep(3);
  } else if (currentTourStep === 3) {
    if (!signingView.classList.contains('active')) {
      if (!cards.verified.classList.contains('active')) showVerifiedSuccess(senderMethodSelect.value);
      showSigningView();
    }
  }
}

function autoFillOtp() {
  const digits = ['1', '2', '3', '4', '5', '6'];
  otpBoxes.forEach((b, i) => b.value = digits[i]);
}

function updateTourUI() {
  stepDots.forEach((dot, index) => {
    dot.classList.toggle('active', index + 1 === currentTourStep);
  });
  tourPrevBtn.disabled = currentTourStep === 1;

  switch (currentTourStep) {
    case 1:
      tourStepTitle.textContent = 'Step 1: Signer Consent Screen';
      tourStepDesc.innerHTML = `
        Welcome to the e-signature identity verification prototype. The signer starts with the usual consent screen.
        In production, the signer only ever sees the <strong>one</strong> verification method their sender configured for them &mdash;
        use the <strong>"Prototype Control"</strong> bar at the top to preview each of the four supported methods.
        <br><br>
        <strong>Action:</strong> Click <strong>"Confirm"</strong> to proceed to identity verification.
      `;
      showCard('consent');
      break;

    case 2:
      tourStepTitle.textContent = 'Step 2: Verifying Identity';
      tourStepDesc.innerHTML = `
        The signer now sees the single verification method the sender enabled for this recipient:
        <br><br>
        &bull; <strong>Email/SMS</strong>: a 6-digit one-time code<br>
        &bull; <strong>SSO</strong>: redirect to Okta and back<br>
        &bull; <strong>Jumio</strong>: selfie + ID capture, then automated verification
        <br><br>
        <strong>Action:</strong> Complete the on-screen steps to verify.
      `;
      break;

    case 3:
      tourStepTitle.textContent = 'Step 3: Verified & Signing';
      tourStepDesc.innerHTML = `
        Once verified, the signer proceeds into the document with a "Verified via&hellip;" badge shown in the header, then signs as usual.
        <br><br>
        <strong>Action:</strong> Click <strong>"Continue to Document"</strong>, sign the field, then <strong>"Finish"</strong>.
      `;
      break;
  }
}
