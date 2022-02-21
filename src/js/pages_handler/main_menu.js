const { ipcRenderer } = require("electron");
const imgContainer = document.getElementById("img-container");
let currentRuntimeSetting = ipcRenderer.sendSync("get-settings", "runtime");
let allAlbumData = ipcRenderer.sendSync("get-settings", "album");

const divAlbumSetActive = document.getElementById("album-set-active");
const divAlbumSetNightmode = document.getElementById("album-set-nightmode");

const queueInterval_El = document.getElementById("queue-interval");
const randomizeQueue_El = document.getElementById("randomize-queue");
const nightStart_El = document.getElementById("night-start");
const nightEnd_El = document.getElementById("night-end");
const enableNightMode_El = document.getElementById("enable-nightmode");

const btnStartQueue_El = document.getElementById("btn-start-queue");
const btnPauseQueue_El = document.getElementById("btn-pause-queue");
const btnStopQueue_El = document.getElementById("btn-stop-queue");
const btnResetQueue_El = document.getElementById("btn-reset-queue");
const btnRefillQueue_El = document.getElementById("btn-refill-queue");

// ============================================================
// Page open
// ============================================================
// Load data
const fillAlbumData = (data, data_type) => {
	for (let album of data) {
		const labelEl = document.createElement("label");
		labelEl.className = "checkbox mr-2";
		const inputEl = document.createElement("input");
		inputEl.type = "checkbox";

		if (data_type === "active-inactive") {
			inputEl.onclick = () => {
				ipcRenderer.send("set-active-album", album.name);
			};
			// check if active or not
			if (currentRuntimeSetting.currentAlbum.includes(album.name)) {
				inputEl.checked = true;
			}
		} else {
			// night mode
			inputEl.onclick = () => {
				ipcRenderer.send("set-nightmode-album", album.name);
			};
			// check if active or not
			if (currentRuntimeSetting.currentNightModeAlbum.includes(album.name)) {
				inputEl.checked = true;
			}
		}

		labelEl.appendChild(inputEl);
		labelEl.appendChild(document.createTextNode(" " + album.name + " "));

		if (data_type === "active-inactive") divAlbumSetActive.appendChild(labelEl);
		else divAlbumSetNightmode.appendChild(labelEl);
	}
};

fillAlbumData(allAlbumData, "active-inactive");
fillAlbumData(allAlbumData, "nightmode");

const formatTimerWithHours = (time) => {
	let hours = Math.floor(time / 3600);
	let minutes = Math.floor((time - hours * 3600) / 60);
	let seconds = time - hours * 3600 - minutes * 60;

	if (hours < 10) hours = `0${hours}`.slice(-2);
	if (minutes < 10) minutes = `0${minutes}`.slice(-2);
	if (seconds < 10) seconds = `0${seconds}`.slice(-2);

	return `${hours}:${minutes}:${seconds}`;
};

const loadData = () => {
	queueInterval_El.value = currentRuntimeSetting.currentShuffleInterval;
	randomizeQueue_El.checked = currentRuntimeSetting.currentRandom;
	bulmaCalendar.attach(nightStart_El, {
		type: "time",
		validateLabel: "Ok",
		showClearButton: false,
		startTime: currentRuntimeSetting.currentNightModeStart,
	});
	bulmaCalendar.attach(nightEnd_El, {
		type: "time",
		validateLabel: "Ok",
		showClearButton: false,
		startTime: currentRuntimeSetting.currentNightModeEnd,
	});
	enableNightMode_El.checked = currentRuntimeSetting.currentNightMode;
};

loadData();

// ============================================================
// EVENTS
// prevent keyboard input to queueInterval
queueInterval_El.onkeydown = (e) => {
	e.preventDefault();
};

queueInterval_El.onchange = () => {
	ipcRenderer.send("set-shuffle-interval", queueInterval_El.value);
};

randomizeQueue_El.onchange = () => {
	ipcRenderer.send("set-random", randomizeQueue_El.checked);
};

nightStart_El.bulmaCalendar.on("select", (datepicker) => {
	ipcRenderer.send("set-nightmode-start", datepicker.data.value());
});

nightEnd_El.bulmaCalendar.on("select", (datepicker) => {
	ipcRenderer.send("set-nightmode-end", datepicker.data.value());
});

enableNightMode_El.onchange = () => {
	ipcRenderer.send("set-nightmode", enableNightMode_El.checked);
};

const setAlbumActive = (e) => {
	const albumName = e.value;
	ipcRenderer.send("set-active-album", albumName);
};

const setNightModeAlbum = (e) => {
	const albumName = e.value;
	ipcRenderer.send("set-nightmode-album", albumName);
};

// ============================================================
// timer
const timerQueue = document.getElementById("timer-queue");
ipcRenderer.send("start-timer", null);
ipcRenderer.on("timer", (event, arg) => {
	timerQueue.innerHTML = formatTimerWithHours(arg);
});

// ============================================================
// Queue
const fillQueue = () => {
	showToast("Refilling queue... *Queue will be empty if album is empty.");

	ipcRenderer.send("fill-queue");

	currentRuntimeSetting = ipcRenderer.sendSync("get-settings", "runtime");

	setTimeout(() => {
		closeToast();
	}, 3500);
};

btnRefillQueue_El.onclick = () => {
	fillQueue();
};

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
