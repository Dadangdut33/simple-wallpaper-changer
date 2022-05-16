document.getElementById("autoRescanInterval").addEventListener("change", function () {
	if (this.value < 1) {
		this.value = 1;
	} else if (this.value > 24) {
		this.value = 24;
	}
});

const { ipcRenderer } = require("electron");
let loadedSetting = ipcRenderer.sendSync("get-settings", "app");

const addDark = () => {
	let head = document.head;
	let link = document.createElement("link");

	link.type = "text/css";
	link.rel = "stylesheet";
	link.href = "../style/bulma-dark.css";

	head.appendChild(link);
};

const removeDark = () => {
	let head = document.head;
	let link = document.querySelector("link[href='../style/bulma-dark.css']");

	head.removeChild(link);
};

const updateFields = (currentSetting) => {
	document.getElementById("startupVal").checked = currentSetting.start_on_startup;
	document.getElementById("rescanEveryStart").checked = currentSetting.rescan_every_start;
	document.getElementById("autoRescan").checked = currentSetting.auto_rescan;
	document.getElementById("autoRescanInterval").value = currentSetting.rescan_interval;
	document.getElementById("maxQueueSize").value = currentSetting.maxQueueSize;
	document.getElementById("checkForUpdate").checked = currentSetting.check_update_on_start;
	document.getElementById("appTheme").checked = currentSetting.app_theme === "dark" ? true : false;
};

updateFields(loadedSetting);

const saveUpdate = () => {
	const appSettings = {
		start_on_startup: document.getElementById("startupVal").checked,
		rescan_every_start: document.getElementById("rescanEveryStart").checked,
		auto_rescan: document.getElementById("autoRescan").checked,
		check_update_on_start: document.getElementById("checkForUpdate").checked,
		rescan_interval: parseInt(document.getElementById("autoRescanInterval").value),
		maxQueueSize: parseInt(document.getElementById("maxQueueSize").value),
		app_theme: document.getElementById("appTheme").checked ? "dark" : "light",
	};

	if (appSettings.app_theme !== loadedSetting.app_theme) {
		if (appSettings.app_theme === "light") {
			console.log("removing dark");
			removeDark();
		} else {
			console.log("adding dark");
			addDark();
		}
	}

	// update setting
	ipcRenderer.send("save-settings", ["app", appSettings]);

	// update loaded settings
	loadedSetting = appSettings;
};

const checkChanges = () => {
	// check if any changes is made
	if (
		document.getElementById("startupVal").checked != loadedSetting.start_on_startup ||
		document.getElementById("rescanEveryStart").checked != loadedSetting.rescan_every_start ||
		document.getElementById("autoRescan").checked != loadedSetting.auto_rescan ||
		document.getElementById("autoRescanInterval").value != loadedSetting.rescan_interval ||
		document.getElementById("maxQueueSize").value != loadedSetting.maxQueueSize ||
		document.getElementById("checkForUpdate").checked != loadedSetting.check_update_on_start
	) {
		// send message box to ask user if they want to save changes
		const yesNo = ipcRenderer.sendSync("dialogbox", ["yesno", "You have unsaved changes. Do you want to save them?"]);
		if (yesNo === 1) return;
		saveUpdate();
	}

	return true;
};

document.getElementById("save").addEventListener("click", () => {
	const yesNo = ipcRenderer.sendSync("dialogbox", ["yesno", "Are you sure you want to save these settings?"]);
	if (yesNo === 1) return; // no
	saveUpdate();
});

document.getElementById("cancel").addEventListener("click", () => {
	const yesNo = ipcRenderer.sendSync("dialogbox", ["yesno", "Are you sure you want to cancel and reset changes made?"]);
	if (yesNo === 1) return; // no

	updateFields(loadedSetting);

	// toast
	showToast("Canceled setting changes");

	setTimeout(() => {
		closeToast();
	}, 1500);
});

document.getElementById("default").addEventListener("click", () => {
	const yesNo = ipcRenderer.sendSync("dialogbox", ["yesno", "Are you sure you want to reset to default?"]);
	if (yesNo === 1) return; // no

	const res = ipcRenderer.sendSync("default-app-settings");
	loadedSetting = res.appSettings_Default;

	updateFields(res.appSettings_Default);
});

// ============================================================
// theme
if (loadedSetting.app_theme === "dark") {
	addDark();
}
