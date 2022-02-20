// modules
const { app, BrowserWindow, ipcMain, Menu, MenuItem, globalShortcut, dialog, Tray } = require("electron");
const path = require("path");
const wallpaper = require("wallpaper");

// ============================================================
const { loadConfig, saveConfig, resetDefaultApp, albumSettings_Default, runtimeSettings_Default, appSettings_Default } = require("./js/handler/files");

let mainWindow = BrowserWindow,
	trayApp = Tray,
	iconPath = path.join(__dirname, "assets/logo.png"),
	albumSettings = albumSettings_Default,
	runtimeSettings = runtimeSettings_Default,
	appSettings = appSettings_Default;
// ============================================================
// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require("electron-squirrel-startup")) {
	// eslint-disable-line global-require
	app.quit();
}

const createWindow = () => {
	// Create the browser window.
	mainWindow = new BrowserWindow({
		width: 1200,
		height: 800,
		webPreferences: {
			nodeIntegration: true,
			contextIsolation: false,
		},
		icon: iconPath,
	});

	// and load the index.html of the app.
	mainWindow.loadFile(path.join(__dirname, "index.html"));

	// Open the DevTools.
	mainWindow.webContents.openDevTools();

	// tray
	createTray();

	// events
	mainWindow.on("close", (event) => {
		event.preventDefault();
		mainWindow.hide();
	});
	mainWindow.on("unresponsive", onUnresponsiveWindow);

	loadSetting();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
	if (process.platform !== "darwin") {
		app.quit();
	}
});

app.on("activate", () => {
	// On OS X it's common to re-create a window in the app when the
	// dock icon is clicked and there are no other windows open.
	if (BrowserWindow.getAllWindows().length === 0) {
		createWindow();
	}
});

// ============================================================
// Menubar of the app
const menu = new Menu();
menu.append(
	new MenuItem({
		label: "Quit",
		click: () => {
			saveSettings("runtime", runtimeSettings, false);
			app.exit();
		},
	})
);
// Menu.setApplicationMenu(menu);

/**
 * Run when the app is unresponsive
 * @param {object} e - The event object
 */
function onUnresponsiveWindow(e) {
	const window = BrowserWindow.getFocusedWindow();
	dialog.showMessageBox(window, {
		title: "Application is not responding",
		buttons: ["Dismiss"],
		type: "warning",
		message: "Application is not responding…",
	});
}
/**
 * Create a tray icon
 */
const createTray = () => {
	trayApp = new Tray(iconPath);

	// added menu to tray
	const contextMenu = Menu.buildFromTemplate([
		{
			label: "Quit",
			click: () => {
				saveSettings("runtime", runtimeSettings, false);
				app.exit(0);
			},
		},
	]);
	trayApp.setToolTip(`Simple Wallpaper Changer - v${app.getVersion()}`);
	trayApp.setContextMenu(contextMenu);

	trayApp.on("click", () => {
		mainWindow.show();
	});
};

// ============================================================
// ======================
// Timer
let timerStarted = false;
let seconds = 0;
let interval = null;
ipcMain.on("start-timer", (event, args) => {
	if (!timerStarted) {
		clearInterval(interval);
		timerStarted = true;
		seconds = runtimeSettings.currentShuffleInterval;

		interval = setInterval(() => {
			seconds--;
			event.sender.send("timer", seconds);

			// TODO: SET WALLPAPER WHEN 0 THEN RESET IT
		}, 1000);
		// interval every 1 seconds
	}
});

ipcMain.on("stop-timer", (event, args) => {
	// stop or pause the timer
	clearInterval(interval);
	timerStarted = false;
});

ipcMain.on("reset-timer", (event, args) => {
	// reset the timer
	clearInterval(interval);
	timerStarted = false;
	seconds = runtimeSettings.currentShuffleInterval;
});

// ======================
// Settings
/**
 * Load settings, run on startup.
 */
const loadSetting = () => {
	// load config
	const configAlbum = loadConfig("album");
	const configRuntime = loadConfig("runtime");
	const configApp = loadConfig("app");

	if (!configAlbum.success) {
		dialog.showErrorBox("Error", configAlbum.errMsg);
	} else {
		albumSettings = configAlbum.data;
	}

	if (!configRuntime.success) {
		dialog.showErrorBox("Error", configRuntime.errMsg);
	} else {
		runtimeSettings = configRuntime.data;
	}

	if (!configApp.success) {
		dialog.showErrorBox("Error", configApp.errMsg);
	} else {
		appSettings = configApp.data;
	}
};
/**
 * Save settings. If popup is true, will show save success message. Error handled directly in and Error dialogbox will be shown regardless of popup value.
 * @param {string} type - The type of the settings to be saved.
 * @param {object} setting - The setting object
 * @param {boolean} [popup=true] - Whether to show save success message
 * @return {boolean} - Whether the save is successful or not.
 */
const saveSettings = (type, setting, popup = true) => {
	const res = saveConfig(type, setting);
	if (!res.success) {
		dialog.showErrorBox("Error", res.errMsg);
	} else {
		switch (type) {
			case "album":
				albumSettings = setting;
				break;
			case "runtime":
				runtimeSettings = setting;
				break;
			case "app":
				appSettings = setting;
				break;
			default:
				break;
		}
		if (popup) {
			// show success message
			dialog.showMessageBox(mainWindow, {
				title: "Success",
				type: "info",
				buttons: ["Ok"],
				message: "Settings saved successfully",
			});
		}
	}

	return res.success;
};

/**
 * Reset the appconfig section of the config file to default. Error handled directly in the function.
 * @return {object} - The current configuration with the appconfig section reseted to default
 * @return {boolean} - Whether the reset is successful or not.
 * @return {string} - The error message if the reset is not successful.
 */
const resetDefaultAppConfig = () => {
	const res = resetDefaultApp();
	if (!res.success) {
		dialog.showErrorBox("Error", res.errMsg);
	} else {
		// show success
		dialog.showMessageBox(mainWindow, {
			title: "Success",
			type: "info",
			buttons: ["Ok"],
			message: "Reset default app config successfully",
		});
		appSettings = res.appSettings_Default;
	}

	return res;
};

ipcMain.on("save-settings", (event, args) => {
	saveSettings(args[0], args[1]);
});

// send sync
ipcMain.on("get-settings", (event, args) => {
	const settingGet = {
		album: albumSettings,
		runtime: runtimeSettings,
		app: appSettings,
	};

	event.returnValue = settingGet[args];
});

ipcMain.on("default-app-settings", (event, args) => {
	const res = resetDefaultAppConfig();
	event.returnValue = res;
});

// ======================
// Queue handling
// TODO:ADD FILL QUEUE
/**
 * Add image to queue in the runtimeSettings section of the config file. Will also update the current configuration file.
 * @param {string} q_Item - The path of the image to be added to queue
 */
const addToQueue = (q_Item) => {
	runtimeSettings.currentQueue.puhs(q_Item);
	// update config
	saveSettings("runtime", runtimeSettings);
};

/**
 * Remove image from queue in the runtimeSettings section of the config file. Will also update the current configuration file.
 * @param {string} q_Item - The path of the image to be removed from queue
 */
const removeFromQueue = (q_Item) => {
	runtimeSettings.currentQueue.splice(aruntimeSettings.currentQueue.indexOf(q_Item), 1);
	// update config
	saveSettings("runtime", runtimeSettings);
};

/**
 * Remove all images from queue in the runtimeSettings section of the config file. Will also update the current configuration file.
 */
const clearQueue = () => {
	runtimeSettings.currentQueue = [];
	// update config
	saveSettings("runtime", runtimeSettings);
};

ipcMain.on("queue-add", (event, args) => {
	addToQueue(args);
});

ipcMain.on("queue-remove", (event, args) => {
	removeFromQueue(args);
});

ipcMain.on("queue-clear", (event, args) => {
	clearQueue();
});

// ======================
// Album and the config
/**
 * Add album to profile section of the config file. Will also update the current configuration file.
 * @param {object} album - The album object to be added.
 */
const addAlbum = (album) => {
	albumSettings.push(album);
	// update config
	saveSettings("album", albumSettings);
};

/**
 * Update album in profile section of the config file. Will also update the current configuration file.
 * @param {object} album - The album object to be updated.
 */
const updateAlbum = (updated) => {
	const oldName = updated[0];
	// update config
	const pos = albumSettings
		.map((e) => {
			return e.name; // album name
		})
		.indexOf(oldName);

	// check runtime value
	if (runtimeSettings.currentAlbum === oldName) {
		runtimeSettings.currentAlbum = updated[1].name; // update the name
	}

	albumSettings[pos] = updated[1]; // updated data
	saveSettings("album", albumSettings);
};

// TODO: delete album....

const getAlbumData = (album = false) => {
	const searchFor = album ? album : runtimeSettings.currentAlbum;

	for (let i = 0; i < albumSettings.length; i++) {
		if (albumSettings[i].name === searchFor) {
			return albumSettings[i];
		}
	}

	// if not found -> should not happen but just in case
	return false;
};

ipcMain.on("album-set", (event, args) => {
	setCurrentAlbum(args);
});

ipcMain.on("add-album", (event, args) => {
	// add album to config
	res = addAlbum(args);
});

ipcMain.on("update-album", (event, args) => {
	// update album in config
	res = updateAlbum(args); // args = [albumName, updatedData]
});

// ======================
// runtime

/**
 * Set current album in the runtimeSettings section of the config file. Will also update the current configuration file.
 * @param {string} album - The name of the album to be set as current
 */
const setCurrentAlbum = (album) => {
	runtimeSettings.currentAlbum = album;
	// update config
	saveSettings("runtime", runtimeSettings);
};

/**
 * Set random value in the runtimeSettings section of the config file. Will also update the current configuration file.
 * @param {boolean} random - The random value to be set
 */
const setRandom = (random) => {
	runtimeSettings.currentRandom = random;
	// update config
	saveSettings("runtime", runtimeSettings);
};

/**
 * Set shuffle value in the runtimeSettings section of the config file. Will also update the current configuration file.
 * @param {boolean} shuffle - The shuffle value to be set
 */
const setShuffle = (shuffle) => {
	runtimeSettings.currentShuffleInterval = shuffle;
	// update config
	saveSettings("runtime", runtimeSettings);
};

ipcMain.on("get-current-album", (event, args) => {
	event.returnValue = runtimeSettings.currentAlbum;
});

ipcMain.on("get-current-album-data", (event, args) => {
	const albumData = getAlbumData(args);
	event.returnValue = albumData;
});

ipcMain.on("random-set", (event, args) => {
	setRandom(args);
});

ipcMain.on("shuffle-set", (event, args) => {
	setShuffle(args);
});

// ======================
// wallpaper
/**
 * Change wallpaper
 * @param {string} imagePath - The path of the image to be set as wallpaper
 * @return {boolean} - Whether the change is successful or not.
 * @return {string} - The error message if the change is not successful.
 */
const changeWallpaper = async (imagePath) => {
	let success = false,
		message = "";
	try {
		await wallpaper.set(imagePath);
		success = true;
	} catch (error) {
		message = error;
	}

	return { success, message };
};

ipcMain.on("change-wallpaper", async (event, args) => {
	// get wallpaper before
	const wpBefore = (await wallpaper.get()).split("\\").pop();
	// get queue item
	const q_Item = albumSettings.runtimeSettings.currentQueue.shift();

	// change wallpaper
	if (q_Item) {
		const result = await changeWallpaper(q_Item);
		if (!result.success) {
			dialog.showErrorBox("Error", result.message);

			return;
		}
	} else {
		dialog.showErrorBox("Error", "Queue is empty");
		return;
	}

	let newWpToAdd = "";
	const albumData = getAlbumData();

	if (!albumData) {
		dialog.showErrorBox("Error", "Album data not found!");
		return;
	}

	if (albumSettings.runtimeSettings.currentRandom) {
		if (albumData.active_wp.length > 1) {
			// if there are more than 1 images in the album
			// make sure it's not the same as the last one
			// that's why we first check if the length is > 1
			while (true) {
				newWpToAdd = albumData.active_wp[Math.floor(Math.random() * albumData.active_wp.length)];
				if (newWpToAdd.split("\\").pop() !== wpBefore) {
					break;
				}
			}
		} else {
			newWpToAdd = albumData.active_wp[Math.floor(Math.random() * albumData.active_wp.length)];
		}
	} else {
		// not random meaning we must get the current index of the image and then get the next one
		// But, the wpBefore is only the image name with no full path
		// meaning that we must check each active wp for string that equals to it and then get the next one
		let currentIndex = 0;
		for (let i = 0; i < albumData.active_wp.length; i++) {
			if (albumData.active_wp[i].split("\\").pop() === wpBefore) {
				currentIndex = i;
				break;
			}
		}
		newWpToAdd = albumData.active_wp[currentIndex + 1];
	}

	// add the new wp to the queue
	addToQueue(newWpToAdd);
});

// ======================
// Dialogbox
ipcMain.on("dialogbox", (event, args) => {
	let res = null;
	switch (args[0]) {
		case "error":
			dialog.showErrorBox("Error", args[1]);
			res = "Error box closed";
			break;
		case "info":
			res = dialog.showMessageBoxSync(mainWindow, {
				title: "Info",
				type: "info",
				buttons: ["OK"],
				message: args[1],
			});
			break;
		case "yesno":
			res = dialog.showMessageBoxSync(mainWindow, {
				title: "Confirmation",
				type: "question",
				buttons: ["Yes", "No"],
				message: args[1],
			});
			break;
		case "success":
			res = dialog.showMessageBoxSync(mainWindow, {
				title: "Success",
				type: "info",
				buttons: ["OK"],
				message: args[1],
			});
			break;
		case "warning":
			res = dialog.showMessageBoxSync(mainWindow, {
				title: "Warning",
				type: "warning",
				buttons: ["Yes", "No"],
				message: args[1],
			});
			break;
		case "openDirectory":
			res = dialog.showOpenDialogSync(mainWindow, {
				properties: ["openDirectory"],
			});
			break;
		case "openFile":
			res = dialog.showOpenDialogSync(mainWindow, {
				properties: ["openFile"],
			});
			break;
		default:
			res = "Invalid messagebox options!";
			break;
	}

	event.returnValue = res;
});

// ======================
// Get Version
const version = app.getVersion();
ipcMain.on("get-version", (event, args) => {
	event.returnValue = version;
});
