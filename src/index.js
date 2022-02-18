const { app, BrowserWindow, ipcMain, Menu, MenuItem, globalShortcut, dialog, Tray } = require("electron");
const path = require("path");
let mainWindow = null,
	trayApp = null,
	iconPath = path.join(__dirname, "assets/logo.png"),
	currentImageQueue = [];
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
// ipcMain
let timerStarted = false;
let seconds = 0;
ipcMain.on("start-timer", (event, arg) => {
	let interval = null;
	if (!timerStarted) {
		clearInterval(interval);
		timerStarted = true;

		interval = setInterval(() => {
			seconds++;
			event.sender.send("timer", seconds);
		}, 1000);
		// interval every 1 seconds
	}
});

ipcMain.on("dialogbox", (event, arg) => {
	if (arg[0] === "error") {
		dialog.showErrorBox("Unexpected Error!", arg[1]);
	}
});

ipcMain.on("get-version", (event, arg) => {
	event.returnValue = app.getVersion();
});
