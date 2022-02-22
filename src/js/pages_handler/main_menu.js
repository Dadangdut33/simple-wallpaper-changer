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
const btnForceNext_El = document.getElementById("btn-force-next");
const btnRefillQueue_El = document.getElementById("btn-refill-queue");
const btnClearQueue_El = document.getElementById("btn-clear-queue");

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
let addedElements = [];

const loadImage_Queue = (images) => {
	images.some((image) => {
		let identifier = getImageName(image);

		// if identifier already in addedElements then add random 32 length string
		if (addedElements.includes(identifier)) {
			identifier = identifier + Math.random().toString(36).substring(2, 32);
		}

		addedElements.push(identifier);

		const div = document.createElement("div");
		div.className = "img-wrapper";
		div.id = "img-wrapper-" + identifier;
		div.onmouseenter = () => {
			showDesc(identifier);
		};
		div.onmouseleave = () => {
			hideDesc(identifier);
		};

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

		const iconDelete = document.createElement("span");
		iconDelete.className = "has-tooltip-bottom mx-1 has-tooltip-arrow";
		iconDelete.dataset.tooltip = "Delete this wallpaper from the queue";
		iconDelete.innerHTML = `<i class="fas fa-trash-alt" onclick="deleteFromQueue('${identifier}','${image.replace(/\\/g, "/")}')"></i>`;
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

const deleteFromQueue = (identifier, path) => {
	ipcRenderer.send("delete-image-from-queue", path);

	const queue_El = document.getElementById("img-wrapper-" + identifier);

	// remove from the list
	queue_El.remove();
	addedElements = addedElements.filter((el) => el !== identifier);

	// add 1 queue
	const newToQ = ipcRenderer.sendSync("fill-queue-once", path);
	if (newToQ.length > 0) {
		loadImage_Queue(newToQ);
	}

	// update selected album data
	currentRuntimeSetting = ipcRenderer.sendSync("get-settings", "runtime");

	showToast("Image deleted from the queue successfully");

	setTimeout(() => {
		closeToast();
	}, 3000);
};

// Queue
const fillQueue = (startup = false) => {
	// ask confirmation first
	if (!startup) {
		const res = ipcRenderer.sendSync("dialogbox", ["yesno", "Are you sure you want to refill the queue item?"]);
		if (res == 1) return; // no
	}

	imgContainer.innerHTML = "";

	showToast("Refilling queue... *Queue will be empty if album is empty.");

	ipcRenderer.send("fill-queue");

	currentRuntimeSetting = ipcRenderer.sendSync("get-settings", "runtime");
	addedElements = [];
	if (currentRuntimeSetting.currentQueue.length > 0) {
		loadImage_Queue(currentRuntimeSetting.currentQueue);
	}

	setTimeout(() => {
		closeToast();
	}, 3500);
};

btnRefillQueue_El.onclick = () => {
	fillQueue();
};

const pauseQueue = () => {
	showToast("Queue paused");

	ipcRenderer.send("pause-queue-timer");

	setTimeout(() => {
		closeToast();
	}, 3500);
};

btnPauseQueue_El.onclick = () => {
	pauseQueue();
};

const startQueue = () => {
	showToast("Queue started");

	ipcRenderer.send("start-queue-timer");

	setTimeout(() => {
		closeToast();
	}, 3500);
};

btnStartQueue_El.onclick = () => {
	startQueue();
};

const stopQueue = () => {
	showToast("Queue stopped");

	ipcRenderer.send("stop-queue-timer");

	// update current runtime
	currentRuntimeSetting = ipcRenderer.sendSync("get-settings", "runtime");
	timerQueue.innerHTML = "Next wallpaper in: " + formatTimerWithHours(currentRuntimeSetting.currentShuffleInterval * 60);

	setTimeout(() => {
		closeToast();
	}, 3500);
};

btnStopQueue_El.onclick = () => {
	stopQueue();
};

const resetQueueTimer = () => {
	showToast("Queue timer reseted");

	ipcRenderer.send("reset-queue-timer");

	setTimeout(() => {
		closeToast();
	}, 3500);
};

btnResetQueue_El.onclick = () => {
	resetQueueTimer();
};

const forceNext = () => {
	showToast("Wallpaper changed");
	try {
		const identifier = addedElements.shift();
		const queue_El = document.getElementById("img-wrapper-" + identifier);

		// remove from the list
		queue_El.remove();
	} catch (error) {}

	const newToQ = ipcRenderer.sendSync("change-wallpaper"); // get newly added image to queue
	if (newToQ.length > 0) {
		loadImage_Queue(newToQ);
	}

	// update selected album data
	currentRuntimeSetting = ipcRenderer.sendSync("get-settings", "runtime");

	setTimeout(() => {
		closeToast();
	}, 3500);
};

btnForceNext_El.onclick = () => {
	forceNext();
};

const clearQueue = () => {
	const res = ipcRenderer.sendSync("dialogbox", ["yesno", "Are you sure you want to clear the queue?"]);
	if (res == 1) return; // no

	showToast("Queue cleared");

	ipcRenderer.send("clear-queue");

	// update selected album data
	currentRuntimeSetting = ipcRenderer.sendSync("get-settings", "runtime");

	// remove all image elements
	imgContainer.innerHTML = "";
	addedElements = [];

	setTimeout(() => {
		closeToast();
	}, 3500);
};

btnClearQueue_El.onclick = () => {
	clearQueue();
};

// ============================================================
// STARTUP
const timerQueue = document.getElementById("timer-queue");
ipcRenderer.send("start-queue-timer");
ipcRenderer.on("timer", (event, arg) => {
	timerQueue.innerHTML = "Next wallpaper in: " + formatTimerWithHours(arg);
});

if (currentRuntimeSetting.currentQueue.length > 0) loadImage_Queue(currentRuntimeSetting.currentQueue);

// ============================================================
// from main
ipcRenderer.on("queue-shifted", (event, arg) => {
	// show toast
	showToast("Wallpaper changed");

	try {
		const identifier = addedElements.shift();
		const queue_El = document.getElementById("img-wrapper-" + identifier);

		// remove from the list
		queue_El.remove();
	} catch (error) {} // ignore

	const shiftedItem = arg;

	// update current runtime
	currentRuntimeSetting = ipcRenderer.sendSync("get-settings", "runtime");

	// update queue
	loadImage_Queue(shiftedItem);

	setTimeout(() => {
		closeToast();
	}, 3500);
});
