const { ipcRenderer } = require("electron");
const intrinsicScale = require("intrinsic-scale");

let currentRuntimeSetting = ipcRenderer.sendSync("get-settings", "runtime");
let allAlbumData = ipcRenderer.sendSync("get-settings", "album");
const appSetting = ipcRenderer.sendSync("get-settings", "app");

const imgContainer = document.getElementById("img-container");
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

// monitor
const autoDetectMonitor_El = document.getElementById("auto-detect-monitor");
const enableMultiMonitor_El = document.getElementById("enable-multi-monitor");
const monitorAlignVertical_El = document.getElementById("monitor-align-vertical");
const monitorAlignHorizontal_El = document.getElementById("monitor-align-horizontal");
const monitorResolutions_El = document.getElementById("monitor-resolutions");

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

const loadDataOnOpen = () => {
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
	enableMultiMonitor_El.checked = currentRuntimeSetting.currentMultipleMonitorSettings.enabled;
	if (currentRuntimeSetting.currentMultipleMonitorSettings.align === "vertical") {
		monitorAlignVertical_El.checked = true;
	} else {
		monitorAlignHorizontal_El.checked = true;
	}
	monitorResolutions_El.value = currentRuntimeSetting.currentMultipleMonitorSettings.resolutions.map((res) => res.join("x")).join(";");
};

loadDataOnOpen();

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

		const canvas = document.createElement("canvas");
		canvas.id = "image";
		canvas.alt = `${image}`;
		canvas.style.width = "100%";
		canvas.style.height = "170px";
		const ctx = canvas.getContext("2d");
		const img = new Image();
		img.src = image;

		img.onload = () => {
			const { x, y, width, height } = intrinsicScale.cover(canvas.width, canvas.height, img.width, img.height);

			// y = 0 -> to match image when being merged
			ctx.drawImage(img, x, 0, width, height);
		};
		div.appendChild(canvas);

		const desc = document.createElement("div");
		desc.className = "img-desc fadeIn";
		desc.style.display = "none";
		desc.id = `desc-${identifier}`;
		desc.innerHTML = `
					<p class="has-tooltip-top has-tooltip-arrow" data-tooltip="Click to copy image path to clipboard" 
					onclick="copyToClipboard('${image.replace(/\\/g, "/")}')" style="cursor: pointer;">${image}</p>
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

	// check amount of image in queue
	console.log(currentRuntimeSetting.currentQueue.length, appSetting.maxQueueSize);
	if (currentRuntimeSetting.currentQueue.length <= appSetting.maxQueueSize) {
		// add 1 queue
		const newToQ = ipcRenderer.sendSync("fill-queue-once", path);
		if (newToQ.length > 0) {
			loadImage_Queue(newToQ);
		}
		// update selected album data
		currentRuntimeSetting = ipcRenderer.sendSync("get-settings", "runtime");
	} else {
		// update selected album data
		currentRuntimeSetting = ipcRenderer.sendSync("get-settings", "runtime");

		// save
		ipcRenderer.send("save-settings", ["runtime", currentRuntimeSetting, "nopopup"]);
	}

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

	currentRuntimeSetting = ipcRenderer.sendSync("get-settings", "runtime");
	timerQueue.innerHTML = "Next wallpaper in: " + formatTimerWithHours(currentRuntimeSetting.currentShuffleInterval * 60);

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

	ipcRenderer.send("queue-clear");

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
// monitor
const enableDisableMultiMonitor = () => {
	const val = enableMultiMonitor_El.checked;

	ipcRenderer.send("set-multi-monitor", val);
};

const setMonitorAlignment = (alignment) => {
	ipcRenderer.send("set-monitor-alignment", alignment);
};

const setMonitorResolution = (resolution) => {
	ipcRenderer.send("set-monitor-resolution", resolution);
};

const autoDetectMonitor = () => {
	const monitor = ipcRenderer.sendSync("get-monitor");
	if (monitor.length > 0) {
		// check vertical / horizontal by the bounds, if found x with minus value, then it's horizontal, else vertical
		let horizontal = false;
		for (let i = 0; i < monitor.length; i++) {
			if (monitor[i].bounds.x < 0) {
				horizontal = true;
				break;
			}
		}

		if (horizontal) {
			setMonitorAlignment("horizontal");
			monitorAlignHorizontal_El.checked = true;
			monitorAlignVertical_El.checked = false;
		} else {
			setMonitorAlignment("vertical");
			monitorAlignHorizontal_El.checked = false;
			monitorAlignVertical_El.checked = true;
		}

		// set resolution
		const resArr = [];
		for (let i = 0; i < monitor.length; i++) {
			resArr.push(monitor[i].size.width + "x" + monitor[i].size.height);
		}

		const res_arr_save = resArr.map((el) => el.split("x"));
		setMonitorResolution(res_arr_save);

		const resStr = resArr.join(";");
		monitorResolutions_El.value = resStr;

		showToast("Successfully set auto detected monitor settings");
		// hide toast after 1.5 sec
		setTimeout(() => {
			closeToast();
		}, 1500);
	}
};

//user is "finished typing," do something
const doneTyping = () => {
	// verify input
	if (monitorResolutions_El.value) {
		// if input is there
		// separate all the monitor first by splitting ;
		const res = monitorResolutions_El.value.split(";");
		// then separate each monitor by splitting x
		const res_arr = res.map((el) => el.split("x"));

		// check if the input is valid
		if (res_arr.length > 0) {
			// if there is at least one monitor
			// check if the input is valid
			if (res_arr.every((el) => el.length == 2)) {
				// check if input is a valid number
				if (res_arr.every((el) => !isNaN(el[0]) && !isNaN(el[1]))) {
					// if all is valid
					// set the monitor resolution
					setMonitorResolution(res_arr);

					showToast("Saved successfully");
					// hide toast after 1.5 sec
					setTimeout(() => {
						closeToast();
					}, 1500);
				} else {
					showToast("Invalid monitor resolution (Not a correct number value)");
					// hide toast after 1.5 sec
					setTimeout(() => {
						closeToast();
					}, 1500);
				}
			} else {
				// if there is at least one invalid monitor
				showToast("There is at least one invalid monitor resolution (missing a width/height)");

				// hide toast after 1.5 sec
				setTimeout(() => {
					closeToast();
				}, 1500);
			}
		} else {
			setMonitorResolution(res_arr);

			showToast("Cleared successfully");

			// hide toast after 1.5 sec
			setTimeout(() => {
				closeToast();
			}, 1500);
		}
	}
};

let typingTimer = null; //timer identifier
let doneTypingInterval = 1000; //time in ms (2.5 seconds)

//on keyup, start the countdown
monitorResolutions_El.addEventListener("keyup", () => {
	clearTimeout(typingTimer);
	if (monitorResolutions_El.value) {
		typingTimer = setTimeout(doneTyping, doneTypingInterval);
	}
});

enableMultiMonitor_El.onchange = () => {
	enableDisableMultiMonitor();
};

monitorAlignHorizontal_El.onchange = () => {
	setMonitorAlignment("horizontal");
};

monitorAlignVertical_El.onchange = () => {
	setMonitorAlignment("vertical");
};

autoDetectMonitor_El.onclick = () => {
	autoDetectMonitor();
};

// ============================================================
// STARTUP
const timerQueue = document.getElementById("timer-queue");
timerQueue.innerHTML = "Next wallpaper in: " + formatTimerWithHours(ipcRenderer.sendSync("get-current-timer"));
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

ipcRenderer.on("queue-refilled-from-main", (event, arg) => {
	console.log("refilled from main");
	// show toast
	showToast("Queue refilled");

	// update current runtime
	currentRuntimeSetting = ipcRenderer.sendSync("get-settings", "runtime");

	// empty current imagees
	imgContainer.innerHTML = "";

	// update queue
	addedElements = [];
	loadImage_Queue(currentRuntimeSetting.currentQueue);

	setTimeout(() => {
		closeToast();
	}, 3500);
});
