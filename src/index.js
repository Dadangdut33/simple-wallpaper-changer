// modules
const { app, BrowserWindow, ipcMain, Menu, MenuItem, globalShortcut, dialog, Tray } = require("electron");
const path = require("path");
const wallpaper = require("wallpaper");

// ============================================================
const { loadConfig, saveConfig, resetDefault, resetDefaultApp, defaultConfig } = require("./js/handler/files");

let mainWindow = BrowserWindow,
	trayApp = Tray,
	iconPath = path.join(__dirname, "assets/logo.png"),
	currentConfig = defaultConfig;
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
			saveSettings(currentConfig, false);
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
				saveSettings(currentConfig, false);
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
// Functions
/**
 * Load settings, run on startup.
 */
const loadSetting = () => {
	// load config
	const config = loadConfig();
	if (!config.success) {
		dialog.showErrorBox("Error", config.errMsg);
	} else {
		currentConfig = config.data;
	}
};
/**
 * Save settings. If popup is true, will show save success message. Error handled directly in and Error dialogbox will be shown regardless of popup value.
 * @param {object} setting - The setting object
 * @param {boolean} [popup=true] - Whether to show save success message
 * @return {boolean} - Whether the save is successful or not.
 */
const saveSettings = (setting, popup = true) => {
	const res = saveConfig(setting);
	if (!res.success) {
		dialog.showErrorBox("Error", res.errMsg);
	} else {
		currentConfig = setting;
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
	const res = resetDefaultApp(currentConfig);
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
	}

	return res;
};
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

// TODO:ADD FILL QUEUE

/**
 * Add image to queue in the runtimeSettings section of the config file. Will also update the current configuration file.
 * @param {string} q_Item - The path of the image to be added to queue
 */
const addToQueue = (q_Item) => {
	currentConfig.runtimeSettings.currentQueue.push(q_Item);
	// update config
	saveSettings(currentConfig);
};

/**
 * Remove image from queue in the runtimeSettings section of the config file. Will also update the current configuration file.
 * @param {string} q_Item - The path of the image to be removed from queue
 */
const removeFromQueue = (q_Item) => {
	currentConfig.runtimeSettings.currentQueue.splice(currentConfig.runtimeSettings.currentQueue.indexOf(q_Item), 1);
	// update config
	saveSettings(currentConfig);
};

/**
 * Remove all images from queue in the runtimeSettings section of the config file. Will also update the current configuration file.
 */
const clearQueue = () => {
	currentConfig.runtimeSettings.currentQueue = [];
	// update config
	saveSettings(currentConfig);
};

/**
 * Set current album in the runtimeSettings section of the config file. Will also update the current configuration file.
 * @param {string} album - The name of the album to be set as current
 */
const setCurrentAlbum = (album) => {
	// update config
	currentConfig.runtimeSettings.currentAlbum = album;
	saveSettings(currentConfig);
};

/**
 * Set random value in the runtimeSettings section of the config file. Will also update the current configuration file.
 * @param {boolean} random - The random value to be set
 */
const setRandom = (random) => {
	// update config
	currentConfig.runtimeSettings.currentRandom = random;
	saveSettings(currentConfig);
};

/**
 * Set shuffle value in the runtimeSettings section of the config file. Will also update the current configuration file.
 * @param {boolean} shuffle - The shuffle value to be set
 */
const setShuffle = (shuffle) => {
	// update config
	currentConfig.runtimeSettings.currentShuffleInterval = shuffle;
	saveSettings(currentConfig);
};

/**
 * Add album to profile section of the config file. Will also update the current configuration file.
 * @param {object} album - The album object to be added.
 */
const addAlbum = (album) => {
	// update config
	currentConfig.profile.push(album);
	saveSettings(currentConfig);
};

/**
 * Update album in profile section of the config file. Will also update the current configuration file.
 * @param {object} album - The album object to be updated.
 */
const updateAlbum = (updated) => {
	const oldName = updated[0];
	// update config
	const pos = currentConfig.profile
		.map((e) => {
			return e.album; // album name
		})
		.indexOf(oldName);

	// check runtime value
	if (currentConfig.runtimeSettings.currentAlbum === oldName) {
		currentConfig.runtimeSettings.currentAlbum = updated[1].album; // update the name
	}

	currentConfig.profile[pos] = updated[1]; // updated data
	saveSettings(currentConfig);
};

// delete album....

const getAlbumData = (album = false) => {
	const searchFor = album ? album : currentConfig.runtimeSettings.currentAlbum;

	for (let i = 0; i < currentConfig.profile.length; i++) {
		if (currentConfig.profile[i].album === searchFor) {
			return currentConfig.profile[i];
		}
	}

	// if not found -> should not happen but just in case
	return false;
};

// ======================
// ipcMain
// Timer
let timerStarted = false;
let seconds = 0;
let interval = null;
ipcMain.on("start-timer", (event, args) => {
	if (!timerStarted) {
		clearInterval(interval);
		timerStarted = true;
		seconds = currentConfig.runtimeSettings.currentShuffleInterval;

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
	seconds = currentConfig.runtimeSettings.currentShuffleInterval;
});

// ======================
// Settings
ipcMain.on("save-settings", (event, args) => {
	saveSettings(args);
});

// send sync
ipcMain.on("get-settings", (event, args) => {
	// get / load current
	event.returnValue = currentConfig;
});

ipcMain.on("default-app-settings", (event, args) => {
	const res = resetDefaultAppConfig();
	event.returnValue = res;
});

// ======================
// Queue handling
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
ipcMain.on("album-set", (event, args) => {
	setCurrentAlbum(args);
});

ipcMain.on("add-album", (event, args) => {
	// add album to config
	res = addAlbum(args);
});

ipcMain.on("update-album", (event, args) => {
	// args = [albumName, updatedData]

	// update album in config
	res = updateAlbum(args);
});

ipcMain.on("random-set", (event, args) => {
	setRandom(args);
});

ipcMain.on("shuffle-set", (event, args) => {
	setShuffle(args);
});

ipcMain.on("get-current-album", (event, args) => {
	event.returnValue = currentConfig.runtimeSettings.currentAlbum;
});

ipcMain.on("get-current-album-data", (event, args) => {
	const albumData = getAlbumData(args);
	event.returnValue = albumData;
});

// ======================
// wallpaper
ipcMain.on("change-wallpaper", async (event, args) => {
	// get wallpaper before
	const wpBefore = (await wallpaper.get()).split("\\").pop();
	// get queue item
	const q_Item = currentConfig.runtimeSettings.currentQueue.shift();

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

	if (currentConfig.runtimeSettings.currentRandom) {
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
			dialog.showErrorBox(mainWindow, args[1]);
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
