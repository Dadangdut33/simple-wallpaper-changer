// open link in browser (not in electron app)
document.body.addEventListener("click", (event) => {
	if (event.target.tagName.toLowerCase() === "a") {
		if (event.target.id !== "normal") {
			event.preventDefault();
			require("electron").shell.openExternal(event.target.href);
		}
	}
});
