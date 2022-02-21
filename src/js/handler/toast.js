// Toast
const toast = document.getElementById("toast");
const toast_text = document.getElementById("toast-text");
const toast_close = document.getElementById("toast-close");
let toastCloseTimeout = null;
const closeToast = () => {
	toast.classList.add("slide-out");
	clearTimeout(toastCloseTimeout);

	// timeout 0.45 seconds then add style display none
	toastCloseTimeout = setTimeout(() => {
		toast.style.display = "none";
	}, 450);
};

const showToast = (msg) => {
	toast.classList.remove("slide-out");
	toast.style.display = "block";
	toast_text.innerText = msg;
};

toast_close.addEventListener("click", closeToast);
