// modules
const { app, BrowserWindow, ipcMain, Menu, MenuItem, globalShortcut, dialog, Tray, Notification } = require("electron");
const path = require("path");
const wallpaper = require("wallpaper");
// ============================================================
const { loadConfig, saveConfig, resetDefaultApp, albumSettings_Default, runtimeSettings_Default, appSettings_Default, getFilesInFolder, filterImages } = require("./js/handler/files");

let mainWindow = null,
	trayApp = null,
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
		// notify
		new Notification({
			title: "Simple Wallpaper Changer",
			body: "Application is hidden to tray",
			icon: iconPath,
		}).show();

		mainWindow.hide();
	});
	mainWindow.on("unresponsive", onUnresponsiveWindow);

	mainWindow.webContents.on("new-window", function (event, url) {
		event.preventDefault();
	});

	loadSetting();
};

// prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
	app.quit();
} else {
	app.on("second-instance", (event, commandLine, workingDirectory) => {
		// Someone tried to run a second instance, we should focus our window.
		if (mainWindow) {
			if (mainWindow.isMinimized()) mainWindow.restore();

			if (!mainWindow.isVisible()) mainWindow.show();

			mainWindow.focus();
		}
	});

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
}

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

// ========================================================================
// ============================================================
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

		if (appSettings.rescan_every_start) {
			// rescan the album
			albumSettings.forEach((album) => {
				syncAlbum(album.name);
			});
		}

		if (appSettings.auto_rescan) {
			// auto rescan the album
			autoRescan();
		}
	}
};
/**
 * Save settings. If popup is true, will show save success message. Error handled directly in the function and Error dialogbox will be shown regardless of popup value.
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
				checkStopAutoRescan();
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
 * Reset the appSettings to default. Error handled directly in the function.
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
		checkStopAutoRescan();
	}

	return res;
};

// --- IPC ---

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

// ============================================================
// Queue handling
/**
 * Add image to queue in the runtimeSettings and save it.
 * @param {string} q_Item - The path of the image to be added to queue
 */
const addToQueue = (q_Item) => {
	runtimeSettings.currentQueue.puhs(q_Item);
	// update config
	saveSettings("runtime", runtimeSettings);
};

/**
 * Remove image from queue in the runtimeSettings and save it.
 * @param {string} q_Item - The path of the image to be removed from queue
 */
const removeFromQueue = (q_Item) => {
	runtimeSettings.currentQueue.splice(aruntimeSettings.currentQueue.indexOf(q_Item), 1);
	// update config
	saveSettings("runtime", runtimeSettings);
};

/**
 * Remove all images from queue in the runtimeSettings and save it.
 */
const clearQueue = () => {
	runtimeSettings.currentQueue = [];
	// update config
	saveSettings("runtime", runtimeSettings);
};

// --- IPC ---

ipcMain.on("queue-add", (event, args) => {
	addToQueue(args);
});

ipcMain.on("queue-remove", (event, args) => {
	removeFromQueue(args);
});

ipcMain.on("queue-clear", (event, args) => {
	clearQueue();
});

// ============================================================
// Album and the config
/**
 * Add album to albumSettings and save it.
 * @param {object} album - The album object to be added.
 */
const addAlbum = (album) => {
	albumSettings.push(album);
	// update config
	saveSettings("album", albumSettings);
};

/**
 * Update album in the albumSettings and save it.
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

/**
 * Get the album object from the albumSettings. If album parameter is set, will return the queried album object else will return currently set album in the runtimeSettings.
 * @param {string} [album=false] - The album name to be queried.
 * @return {object} - The album object get.
 */
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
/**
 * Delete album from the albumSettings and save it.
 * @param {string} album - The album name to be deleted.
 */
const deleteAlbum = (album) => {
	let pos = -1;

	albumSettings.some((el, i) => {
		if (el.name === album) {
			pos = i;
			return true;
		}
	});

	if (pos !== -1) {
		albumSettings.splice(pos, 1);
		saveSettings("album", albumSettings, false);
		dialog.showMessageBox(mainWindow, {
			title: "Success",
			type: "info",
			buttons: ["Ok"],
			message: "Album deleted successfully",
		});
	} else {
		dialog.showErrorBox("Error", "Album not found");
	}
};
/**
 * Set image as active in the album setting
 * @param {string} album - The album name of the image
 * @param {string} image - The image path to be set as active.
 */
const setImageActive = (album, image) => {
	// remove the image from inactive_wp
	const pos_Album = albumSettings.findIndex((el) => el.name === album);
	const pos_Image = albumSettings[pos_Album].inactive_wp.findIndex((el) => el === image);
	albumSettings[pos_Album].inactive_wp.splice(pos_Image, 1);

	// add it to active_wp
	albumSettings[pos_Album].active_wp.push(image);

	// save setting
	saveSettings("album", albumSettings, false);
};
/**
 * Set image as inactive in the album setting
 * @param {string} album - The album name of the image
 * @param {string} image - The image path to be set as inactive.
 */
const setImageInactive = (album, image) => {
	// remove the image from active_wp
	const pos_Album = albumSettings.findIndex((el) => el.name === album);
	const pos_Image = albumSettings[pos_Album].active_wp.findIndex((el) => el === image);
	albumSettings[pos_Album].active_wp.splice(pos_Image, 1);

	// add it to inactive_wp
	albumSettings[pos_Album].inactive_wp.push(image);

	// save setting
	saveSettings("album", albumSettings, false);
};
/**
 * Delete image from the album setting
 * @param {string} album - The album name of the image
 * @param {string} image - The image path to be deleted.
 * @param {boolean} [active] - If true, will delete from active_wp, else will delete from inactive_wp.
 * @param {boolean} [withPopup] - If true, will show a popup to show success result.
 */
const deleteImage = (album, image, active, withPopup = true) => {
	// remove the image from active_wp
	const pos_Album = albumSettings.findIndex((el) => el.name === album);
	if (active) {
		const pos_Image = albumSettings[pos_Album].active_wp.findIndex((el) => el === image);
		albumSettings[pos_Album].active_wp.splice(pos_Image, 1);
	} else {
		const pos_Image = albumSettings[pos_Album].inactive_wp.findIndex((el) => el === image);
		albumSettings[pos_Album].inactive_wp.splice(pos_Image, 1);
	}

	// save setting
	saveSettings("album", albumSettings, false);

	if (withPopup) {
		// dialogbox show success
		dialog.showMessageBox(mainWindow, {
			title: "Success",
			type: "info",
			buttons: ["Ok"],
			message: "Image deleted successfully",
		});
	}
};

const deleteAllImages = (album) => {
	// remove the image from active_wp
	const pos_Album = albumSettings.findIndex((el) => el.name === album);
	albumSettings[pos_Album].active_wp = [];
	albumSettings[pos_Album].inactive_wp = [];

	// save setting
	saveSettings("album", albumSettings, false);

	// popup success
	return true;
};

/**
 * Add image to the album setting
 * @param {string} album - The album name of the image
 * @param {boolean} [withPopup] - If true, will show a popup to show success result.
 */
const addImages = (album, withPopup = true) => {
	const pos_Album = albumSettings.findIndex((el) => el.name === album);
	let files = dialog.showOpenDialogSync(mainWindow, {
		title: "Add images",
		properties: ["openFile", "multiSelections"],
		filters: [
			{
				name: "Images",
				extensions: ["jpg", "jpeg", "png", "gif", "bmp", "tiff", "tif"],
			},
		],
	});

	if (files) {
		files = files.map((file) => {
			// make sure it is not already in the active_wp or inactive_wp
			if (albumSettings[pos_Album].active_wp.indexOf(file.replace(/\\/g, "/")) === -1 && albumSettings[pos_Album].inactive_wp.indexOf(file.replace(/\\/g, "/")) === -1) {
				return file.replace(/\\/g, "/");
			}
		});

		files.forEach((file) => {
			if (file) {
				albumSettings[pos_Album].active_wp.push(file);
			}
		});

		saveSettings("album", albumSettings, false);

		if (withPopup) {
			// dialogbox show success
			dialog.showMessageBox(mainWindow, {
				title: "Success",
				type: "info",
				buttons: ["Ok"],
				message: "Images added successfully",
			});
		}
	}

	return files;
};
/**
 * Sync the album settings with the base image folder that is set.
 * @param {string} album - The album name of the image
 * @returns {boolean} - If true, sync was successful.
 */
const syncAlbum = (album) => {
	const pos_Album = albumSettings.findIndex((el) => el.name === album);

	// scan album for images
	if (albumSettings[pos_Album].baseFolder.length > 0) {
		let new_active_wp = getFilesInFolder(albumSettings[pos_Album].baseFolder);
		new_active_wp = filterImages(new_active_wp);

		// add new active wp to current active wp but make sure no duplicate
		const newArr = [...albumSettings[pos_Album].active_wp, ...new_active_wp];
		albumSettings[pos_Album].active_wp = [...new Set(newArr)];

		// remove active wp that is currently in inactive_wp
		albumSettings[pos_Album].active_wp = albumSettings[pos_Album].active_wp.filter((active_wp) => {
			return !albumSettings[pos_Album].inactive_wp.includes(active_wp);
		});

		// save
		saveSettings("album", albumSettings, false);

		// show success
		dialog.showMessageBox(mainWindow, {
			title: "Success",
			type: "info",
			buttons: ["Ok"],
			message: "Album synced successfully",
		});

		return true;
	} else {
		dialog.showErrorBox("Error", "Please set the base folder first");
		return false;
	}
};

// --- IPC ---

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

ipcMain.on("delete-album", (event, args) => {
	// delete album from config
	deleteAlbum(args);
});

ipcMain.on("set-img-inactive", (event, args) => {
	setImageInactive(args[0], args[1]);
});

ipcMain.on("set-img-active", (event, args) => {
	setImageActive(args[0], args[1]);
});

ipcMain.on("delete-img", (event, args) => {
	deleteImage(args[0], args[1], args[2], false);
});

ipcMain.on("delete-all-images", (event, args) => {
	const resGet = deleteAllImages(args);
	event.returnValue = resGet;
});

ipcMain.on("add-images", (event, args) => {
	const returnVal = addImages(args, false);
	event.returnValue = returnVal;
});

ipcMain.on("sync-album", (event, args) => {
	const returnVal = syncAlbum(args);
	event.returnValue = returnVal;
});

// ============================================================
// runtime
/**
 * Set current album in the runtimeSettings and save it.
 * @param {string} album - The name of the album to be set as current
 */
const setCurrentAlbum = (album) => {
	runtimeSettings.currentAlbum = album;
	// update config
	saveSettings("runtime", runtimeSettings);
};

/**
 * Set random value in the runtimeSettings and save it.
 * @param {boolean} random - The random value to be set
 */
const setRandom = (random) => {
	runtimeSettings.currentRandom = random;
	// update config
	saveSettings("runtime", runtimeSettings, false);
};

/**
 * Set shuffle value in the runtimeSettings and save it.
 * @param {int} shuffle - The shuffle interval value to be set
 */
const setShuffleInterval = (shuffle) => {
	runtimeSettings.currentShuffleInterval = shuffle;
	// update config
	saveSettings("runtime", runtimeSettings, false);
};

/**
 * Set the startNightMode time in the runtimeSettings and save it.
 * @param {string} startNightMode - The startNightMode time to be set
 */
const setStartNightMode = (startTime) => {
	runtimeSettings.currentNightModeStart = startTime;
	// update config
	saveSettings("runtime", runtimeSettings, false);
};

/**
 * Set the endNightMode time in the runtimeSettings and save it.
 * @param {string} endNightMode - The endNightMode time to be set
 */
const setEndNightMode = (endTime) => {
	runtimeSettings.currentNightModeEnd = endTime;
	// update config
	saveSettings("runtime", runtimeSettings, false);
};

/**
 * Set night mode on/off
 * @param {boolean} nightMode - The night mode value to be set
 */
const setNightMode = (nightMode) => {
	runtimeSettings.currentNightMode = nightMode;
	// update config
	saveSettings("runtime", runtimeSettings, false);
};

const setAlbumActive = (albumName) => {
	// check already exist or not, if exist then get rid of it. if not then add to it.
	if (runtimeSettings.currentAlbum.includes(albumName)) {
		runtimeSettings.currentAlbum = runtimeSettings.currentAlbum.filter((el) => el !== albumName);
	} else {
		runtimeSettings.currentAlbum.push(albumName);
	}
	// save
	saveSettings("runtime", runtimeSettings, false);
};

const setNightModeAlbum = (albumName) => {
	// check already exist or not, if exist then get rid of it. if not then add to it.
	if (runtimeSettings.currentNightModeAlbum.includes(albumName)) {
		runtimeSettings.currentNightModeAlbum = runtimeSettings.currentNightModeAlbum.filter((el) => el !== albumName);
	} else {
		runtimeSettings.currentNightModeAlbum.push(albumName);
	}

	// save
	saveSettings("runtime", runtimeSettings, false);
};

const fillQueue = (onlyAddOne = false) => {
	// first combine all active wp in all albums
	let all_Wp = [];

	// -------------------------
	// Getting time
	// get current time first
	const currentDate = new Date();

	// get only the date
	const currentDateOnly = `${currentDate.getFullYear()}-${currentDate.getMonth() + 1 < 10 ? "0" + parseInt(currentDate.getMonth() + 1) : parseInt(currentDate.getMonth() + 1)}-${
		currentDate.getDate() < 10 ? "0" + currentDate.getDate() : currentDate.getDate()
	}`;

	// get accurate current time because for some reason the time is off because of timezone ? maybe
	const currentDateWithTime = `${currentDate.getFullYear()}-${currentDate.getMonth() + 1 < 10 ? "0" + parseInt(currentDate.getMonth() + 1) : parseInt(currentDate.getMonth() + 1)}-${
		currentDate.getDate() < 10 ? "0" + currentDate.getDate() : currentDate.getDate()
	}T${currentDate.getHours < 10 ? "0" + currentDate.getHours() : currentDate.getHours()}:${currentDate.getMinutes() < 10 ? "0" + currentDate.getMinutes() : currentDate.getMinutes()}:${
		currentDate.getSeconds() < 10 ? "0" + currentDate.getSeconds() : currentDate.getSeconds()
	}.000Z`;

	// parse them all to date
	const currentDateAccurate = new Date(currentDateWithTime);
	const startDate = new Date(`${currentDateOnly}T${runtimeSettings.currentNightModeStart}:00.000Z`);
	const endDate = new Date(`${currentDateOnly}T${runtimeSettings.currentNightModeEnd}:00.000Z`);

	// if end time is < start time, meaning next day period
	if (startDate > endDate) {
		// add 1 day to endDate
		endDate.setDate(endDate.getDate() + 1);
	}
	// -------------------------

	// check if in period
	if (runtimeSettings.currentNightMode) {
		// check if in night mode period
		if (currentDateAccurate >= startDate && currentDateAccurate <= endDate) {
			// in night mode period use nightmode album for the list
			albumSettings.forEach((album) => {
				if (runtimeSettings.currentNightModeAlbum.includes(album.name)) {
					all_Wp = [...all_Wp, ...album.active_wp];
				}
			});
		} else {
			// not in night mode period use the usual album for the list
			albumSettings.forEach((album) => {
				if (runtimeSettings.currentAlbum.includes(album.name)) {
					all_Wp = [...all_Wp, ...album.active_wp];
				}
			});
		}
	} else {
		// not in night mode period use the usual album for the list
		albumSettings.forEach((album) => {
			if (runtimeSettings.currentAlbum.includes(album.name)) {
				all_Wp = [...all_Wp, ...album.active_wp];
			}
		});
	}

	// fill queue by going randomly through the list
	if (!onlyAddOne) {
		runtimeSettings.currentQueue = [];

		let itemBefore = "",
			newItem = "";
		for (let i = 0; i < 20; i++) {
			// make sure it's not the same as the last one but only if there is more than 1 item
			if (all_Wp.length > 1) {
				while (itemBefore === newItem) {
					newItem = all_Wp[Math.floor(Math.random() * all_Wp.length)];
					runtimeSettings.currentQueue.push(newItem);
				}
				itemBefore = newItem;
			}
		}
	} else {
		runtimeSettings.currentQueue.push(all_Wp[Math.floor(Math.random() * all_Wp.length)]);
	}

	saveSettings("runtime", runtimeSettings, false);
};

const deleteImageFromQueue = (imagePath) => {
	runtimeSettings.currentQueue = runtimeSettings.currentQueue.filter((el) => el !== imagePath);

	// save
	saveSettings("runtime", runtimeSettings, false);
};

// --- IPC ---

ipcMain.on("get-current-album", (event, args) => {
	event.returnValue = runtimeSettings.currentAlbum;
});

ipcMain.on("get-current-album-data", (event, args) => {
	const albumData = getAlbumData(args);
	event.returnValue = albumData;
});

ipcMain.on("set-random", (event, args) => {
	setRandom(args);
});

ipcMain.on("set-shuffle-interval", (event, args) => {
	setShuffleInterval(args);
});

ipcMain.on("set-nightmode", (event, args) => {
	setNightMode(args);
});

ipcMain.on("set-nightmode-start", (event, args) => {
	setStartNightMode(args);
});

ipcMain.on("set-nightmode-end", (event, args) => {
	setEndNightMode(args);
});

ipcMain.on("set-active-album", (event, args) => {
	setAlbumActive(args);
});

ipcMain.on("set-nightmode-album", (event, args) => {
	setNightModeAlbum(args);
});

ipcMain.on("fill-queue", (event, args) => {
	fillQueue();
});

ipcMain.on("fill-queue-once", (event, args) => {
	fillQueue(true);
});

ipcMain.on("delete-image-from-queue", (event, args) => {
	deleteImageFromQueue(args);
});

// ============================================================
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

// --- IPC ---

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

// ============================================================
// Timer
let timerStarted = false;
let seconds = 0;
let interval = null;
ipcMain.on("start-queue-timer", (event, args) => {
	if (!timerStarted) {
		clearInterval(interval);
		timerStarted = true;

		// check wether it is already in progress or not
		seconds = seconds === 0 ? runtimeSettings.currentShuffleInterval * 60 : seconds;

		interval = setInterval(() => {
			seconds--;
			event.sender.send("timer", seconds);

			// TODO: SET WALLPAPER WHEN 0 THEN RESET IT
		}, 1000);
		// interval every 1 seconds
	}
});

ipcMain.on("stop-queue-timer", (event, args) => {
	// stop or pause the timer
	clearInterval(interval);
	timerStarted = false;
	seconds = runtimeSettings.currentShuffleInterval * 60;
});

ipcMain.on("reset-queue-timer", (event, args) => {
	// reset the timer
	seconds = runtimeSettings.currentShuffleInterval * 60;
});

ipcMain.on("pause-queue-timer", (event, args) => {
	// pause the timer
	clearInterval(interval);
	timerStarted = false;
});

// ============================================================
// scan interval
let scan_interval = null;
let time_scan_interval = null;

const autoRescan = () => {
	clearInterval(scan_interval);
	// rescan interval times it to be hour
	time_scan_interval = appSettings.rescan_interval * 60 * 60 * 1000;

	scan_interval = setInterval(() => {
		albumSettings.forEach((album) => {
			syncAlbum(album.name);
		});
	}, time_scan_interval);
};

const checkStopAutoRescan = () => {
	if (!appSettings.auto_rescan) {
		clearInterval(scan_interval);
	}
};

// ============================================================
// Dialogboxes to call from ipcRenderer
ipcMain.on("dialogbox", (event, args) => {
	let res = null;
	try {
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
	} catch (error) {
		dialog.showErrorBox("Error", error);
		res = `Unexpected error: ${error}`;
	}

	event.returnValue = res;
});

// ============================================================
// Get Version
ipcMain.on("get-version", (event, args) => {
	event.returnValue = app.getVersion();
});
