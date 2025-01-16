const menuIcon = document.querySelector("#menu-icon");
const navbar = document.querySelector(".navbar");

// activate navbar button, on & off
menuIcon.onclick = () => {
    menuIcon.classList.toggle("bx-x");
    navbar.classList.toggle("active");
}