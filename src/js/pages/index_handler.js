const { ipcRenderer } = require("electron");
const wallpaper = require("wallpaper");
const fs = require("fs");
const changeWp = document.getElementById("changeWp");
const loadWp = document.getElementById("loadWp");
const imgContainer = document.getElementById("img-container");

// TEST
const baseFolder = "C:\\\\Users\\ffant\\Pictures\\Wallpaper\\test\\";

// the general idea
// 1. First user can set a folder with images to load/sync the wallpaper list
// 2. user can also add image individually to a list
// 3. there can be multiple list

// saving the data ?
// might be using json

const testVar = document.getElementById("test-var");
// timer
ipcRenderer.send("start-timer", null);
ipcRenderer.on("timer", (event, arg) => {
	testVar.innerHTML = arg;
});

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

const getFilesInFolder = (folder) => {
	console.log("getFilesInFolder");
	console.log(folder);
	const files = fs.readdirSync(folder);
	console.log(files);
	return files;
};

const setWp = async () => {
	const testWp = getFilesInFolder(baseFolder);
	let wpBefore = (await wallpaper.get()).split("\\").pop();

	// set wallpaper every 10 seconds
	// setInterval(() => {
	// 	const randomWp = wpArr[Math.floor(Math.random() * wpArr.length)];
	// 	console.log(randomWp);
	// 	wallpaper.set(randomWp);
	// }, 10000);
	let randomWp = "";
	while (true) {
		randomWp = baseFolder + testWp[Math.floor(Math.random() * testWp.length)];
		if (wpBefore !== randomWp.split("\\").pop()) {
			break;
		}
	}

	console.log(randomWp);
	await wallpaper.set(randomWp);
};

const loadWallpaper = async () => {
	const testWp = getFilesInFolder(baseFolder);

	// loop through all files in folder
	let counter = 5;
	for (let wp of testWp) {
		const div = document.createElement("div");
		div.className = "img-wrapper";
		// TODO
		// Check if already skipped or not
		// SPAN IF SKIPPED, CONTAINS SKIPPED CLASS
		const span = document.createElement("span");
		span.className = "skipped";
		div.appendChild(span);

		// onclick for each button

		const img = document.createElement("img");
		img.src = baseFolder + wp;
		img.id = "image";
		img.alt = `${wp}`;
		div.appendChild(img);

		const desc = document.createElement("div");
		desc.className = "img-desc fadeIn";
		desc.style.display = "none";
		desc.id = `desc-${counter}`;
		desc.innerHTML = `<p>${wp}</p>`;
		div.appendChild(desc);

		const descHover = document.createElement("div");
		const iconApply = document.createElement("span");
		iconApply.className = "has-tooltip-bottom mx-1";
		iconApply.dataset.tooltip = "Set as current wallpaper";
		// BtnApply.onclick = `wallpaper.set("${baseFolder + wp}")`;
		iconApply.innerHTML = `<i class="fas fa-check-circle"></i>`;
		descHover.appendChild(iconApply);

		const iconSkip = document.createElement("span");
		iconSkip.className = "has-tooltip-bottom mx-1";
		iconSkip.dataset.tooltip = "Skip this wallpaper from the list";
		iconSkip.innerHTML = `<i class="fas fa-minus-circle"></i>`;
		descHover.appendChild(iconSkip);

		const iconDelete = document.createElement("span");
		iconDelete.className = "has-tooltip-bottom mx-1";
		iconDelete.dataset.tooltip = "Delete this wallpaper from the list";
		iconDelete.innerHTML = `<i class="fas fa-trash-alt"></i>`;
		descHover.appendChild(iconDelete);

		desc.appendChild(descHover);

		let x = counter;
		div.addEventListener("mouseenter", () => {
			showDesc(x);
		});

		div.addEventListener("mouseleave", () => {
			hideDesc(x);
		});
		imgContainer.appendChild(div);

		counter++;
	}
};

changeWp.addEventListener("click", setWp);
loadWp.addEventListener("click", loadWallpaper);
