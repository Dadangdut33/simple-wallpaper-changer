// open link in browser (not in electron app)
document.body.addEventListener("click", (event) => {
	if (event.target.tagName.toLowerCase() === "a" || event.target.tagName.toLowerCase() === "span" || event.target.tagName.toLowerCase() === "img") {
		if (event.target.id === "ext") {
			event.preventDefault();
			let target = event.target.href ? event.target.href : event.target.parentElement.href;
			require("electron").shell.openExternal(target);
		}
	}
});
