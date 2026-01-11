const menuToggle = document.getElementById('menuToggle');
const closeBtn = document.getElementById('closeBtn');
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');
const mainContent = document.getElementById('mainContent');
var openstatus = false;
menuToggle.addEventListener('click', function() {
if (openstatus==false) {
sidebar.classList.add('open');
overlay.classList.add('active');
mainContent.classList.add('shifted');
openstatus = true;
} else {
sidebar.classList.remove('open');
overlay.classList.remove('active');
mainContent.classList.remove('shifted');
openstatus = false;
}
});

overlay.addEventListener('click', function() {
sidebar.classList.remove('open');
overlay.classList.remove('active');
mainContent.classList.remove('shifted');
});