const showDesc = (id) => {
	const desc = document.getElementById("desc-" + id);

	if (desc.style.display === "none") {
		desc.style.display = "flex";
	}
};

const hideDesc = (id) => {
	const desc = document.getElementById("desc-" + id);
	let timeOut = null;
	if (desc.style.display === "flex") {
		// add fadeout then display none after animation is done
		clearTimeout(timeOut);
		desc.classList.add("fadeOut");
		timeOut = setTimeout(() => {
			desc.style.display = "none";
			desc.classList.remove("fadeOut");
		}, 180);
	}
};
