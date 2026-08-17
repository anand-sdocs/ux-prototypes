// Marketing landing page — no backend. Nav toggle, scroll-reveal, and a
// simulated "request a demo" submission are the only interactive bits.

const navToggle = document.getElementById('nav-toggle');
const nav = document.getElementById('nav');
navToggle?.addEventListener('click', () => nav.classList.toggle('open'));

document.querySelectorAll('.nav-links a').forEach(link => {
  link.addEventListener('click', () => nav.classList.remove('open'));
});

const revealTargets = document.querySelectorAll('.reveal');
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('in-view');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.15 });
revealTargets.forEach(el => observer.observe(el));

const demoForm = document.getElementById('demo-form');
demoForm?.addEventListener('submit', (e) => {
  e.preventDefault();
  const note = document.getElementById('demo-form-note');
  note.textContent = "Thanks — that's simulated for this prototype, but in production you'd hear from us within a day.";
  demoForm.reset();
});
