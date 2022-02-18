// modules
const { app, BrowserWindow, ipcMain, Menu, MenuItem, globalShortcut, dialog, Tray } = require("electron");
const path = require("path");
const wallpaper = require("wallpaper");

// ============================================================
const { loadConfig } = require("./js/handler/files");

let mainWindow = BrowserWindow,
	trayApp = Tray,
	iconPath = path.join(__dirname, "assets/logo.png"),
	currentImageQueue = [],
	currentAlbum = "",
	currentRandom = true,
	currentShuffleInterval = true,
	currentConfig = {};
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

	loadSettingStartup();
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
			app.exit();
		},
	})
);

// Menu.setApplicationMenu(menu);

function onUnresponsiveWindow(e) {
	const window = BrowserWindow.getFocusedWindow();
	dialog.showMessageBox(window, {
		title: "Application is not responding",
		buttons: ["Dismiss"],
		type: "warning",
		message: "Application is not responding…",
	});
}

// tray
const createTray = () => {
	trayApp = new Tray(iconPath);

	// added menu to tray
	const contextMenu = Menu.buildFromTemplate([
		{
			label: "Quit",
			click: () => {
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
const loadSettingStartup = () => {
	// load config
	const config = loadConfig();
	if (!config.success) {
		dialog.showErrorBox("Error", config.errMsg);
	} else {
		currentImageQueue = config.data.runtimeSettings.currentQueue;
		currentAlbum = config.data.runtimeSettings.currentAlbum;
		currentRandom = config.data.runtimeSettings.currentRandom;
		currentShuffleInterval = config.data.runtimeSettings.currentShuffleInterval;

		currentConfig = config.data;
	}
};

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

const addToQueue = (q_Item) => {
	currentImageQueue.push(q_Item);
};

const removeFromQueue = (q_Item) => {
	currentImageQueue.splice(currentImageQueue.indexOf(q_Item), 1);
};

const clearQueue = () => {
	currentImageQueue = [];
};

const setCurrentAlbum = (album) => {
	currentAlbum = album;
};

const setRandom = (random) => {
	currentRandom = random;
};

const setShuffle = (shuffle) => {
	currentShuffleInterval = shuffle;
};

const getAlbumData = () => {
	for (let i = 0; i < currentConfig.profile.length; i++) {
		if (currentConfig.profile[i].album === currentAlbum) {
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
let seconds = currentShuffleInterval;
let interval = null;
ipcMain.on("start-timer", (event, args) => {
	if (!timerStarted) {
		clearInterval(interval);
		timerStarted = true;

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
	seconds = currentShuffleInterval;
});

// ======================
// Runtime settings
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

// Album and the config
ipcMain.on("album-set", (event, args) => {
	setCurrentAlbum(args);
});

ipcMain.on("random-set", (event, args) => {
	setRandom(args);
});

ipcMain.on("shuffle-set", (event, args) => {
	setShuffle(args);
});

// ======================
// wallpaper
ipcMain.on("change-wallpaper", async (event, args) => {
	// get wallpaper before
	const wpBefore = (await wallpaper.get()).split("\\").pop();
	// get queue item
	const q_Item = currentImageQueue.shift();

	// change wallpaper
	if (q_Item) {
		const result = await changeWallpaper(q_Item.path);
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

	if (currentRandom) {
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
				message: args[1],
				type: "info",
				buttons: ["OK"],
			});
			break;
		case "yesno":
			res = dialog.showMessageBoxSync(mainWindow, {
				title: "Confirmation",
				message: args[1],
				type: "question",
				buttons: ["Yes", "No"],
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
