const { ipcRenderer } = require("electron");
const imgContainer = document.getElementById("img-container");

const testVar = document.getElementById("test-var");
// TODO: timer
ipcRenderer.send("start-timer", null);
ipcRenderer.on("timer", (event, arg) => {
	testVar.innerHTML = arg;
});

const loadImage_Queue = (images) => {
	images.some((image) => {
		let identifier = getImageName(image);

		const div = document.createElement("div");
		div.className = "img-wrapper";
		div.id = "img-wrapper-" + identifier;
		div.onmouseenter = () => {
			showDesc(identifier);
		};
		div.onmouseleave = () => {
			hideDesc(identifier);
		};

		// span
		const span = document.createElement("span");
		span.id = "desc-span-" + identifier;
		if (!active) span.className = "skipped";
		else span.className = "normal";
		div.appendChild(span);

		const img = document.createElement("img");
		img.src = image;
		img.id = "image";
		img.alt = `${image}`;
		div.appendChild(img);

		const desc = document.createElement("div");
		desc.className = "img-desc fadeIn";
		desc.style.display = "none";
		desc.id = `desc-${identifier}`;
		desc.innerHTML = `
					<p class="has-tooltip-top has-tooltip-arrow" data-tooltip="Click to copy image path to clipboard" onclick="copyToClipboard('${image.replace(/\\/g, "/")}')" style="cursor: pointer;">${image}</p>
					`;
		div.appendChild(desc);

		const descHover = document.createElement("div");
		const iconApply = document.createElement("span");
		iconApply.className = "has-tooltip-bottom mx-1 has-tooltip-arrow";
		iconApply.dataset.tooltip = "Set as current wallpaper";
		iconApply.innerHTML = `<i class="fas fa-check-circle" onclick="setWallpaper('${image.replace(/\\/g, "/")}')"></i>`;
		descHover.appendChild(iconApply);

		const iconSkip = document.createElement("span");
		iconSkip.className = "has-tooltip-bottom mx-1 has-tooltip-arrow";
		iconSkip.dataset.tooltip = "Skip/Unskip this wallpaper from the list";
		// prettier-ignore
		iconSkip.innerHTML = `<i class="fas ${active ? "fa-minus-circle" : "fa-plus-circle"}" id="${active ? "active" : "inactive"}" onclick="setActiveInactive(this, '${identifier}','${image.replace(/\\/g, "/")}')"></i>`;
		descHover.appendChild(iconSkip);

		const iconDelete = document.createElement("span");
		iconDelete.className = "has-tooltip-bottom mx-1 has-tooltip-arrow";
		iconDelete.dataset.tooltip = "Delete this wallpaper from the list";
		iconDelete.innerHTML = `<i class="fas fa-trash-alt" onclick="deleteFromList(this, '${identifier}','${image.replace(/\\/g, "/")}')"></i>`;
		descHover.appendChild(iconDelete);

		const iconOpen = document.createElement("span");
		iconOpen.className = "has-tooltip-bottom mx-1 has-tooltip-arrow";
		iconOpen.dataset.tooltip = "Open this wallpaper in the default viewer";
		iconOpen.innerHTML = `<i class="fas fa-external-link-alt" onclick="openInExplorer('${image.replace(/\\/g, "/")}')"></i>`;
		descHover.appendChild(iconOpen);

		desc.appendChild(descHover);

		imgContainer.appendChild(div);
	});
};
