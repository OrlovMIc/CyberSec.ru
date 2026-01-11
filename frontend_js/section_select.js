document.addEventListener('DOMContentLoaded', function() {
const navLinks = document.querySelectorAll('.nav-link');
const sections = document.querySelectorAll('.section');
navLinks.forEach(link => {
link.addEventListener('click', function(e) {
e.preventDefault();
navLinks.forEach(l => l.classList.remove('active'));
this.classList.add('active');
sections.forEach(section => section.classList.remove('active'));
const sectionId = this.getAttribute('data-section');
const targetSection = document.getElementById(sectionId);
if (targetSection) {
targetSection.classList.add('active');
}
});
});
});