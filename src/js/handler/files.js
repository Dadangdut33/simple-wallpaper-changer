const fs = require("fs");
const path = require("path");
const configDir = path.join(__dirname, "..\\..\\config\\");
const albumSettingsPath = path.join(configDir, "album.json");
const runtimeSettingsPath = path.join(configDir, "runtimeSettings.json");
const appSettingsPath = path.join(configDir, "appSettings.json");

const albumSettings_Default = [
	{
		name: "Default",
		baseFolder: "",
		active_wp: [],
		inactive_wp: [],
	},
];

const runtimeSettings_Default = {
	currentQueue: [], // max 20 shown
	currentAlbum: ["Default"],
	currentRandom: true,
	currentShuffleInterval: 30, // minutes
	currentNightMode: false,
	currentNightModeAlbum: [],
	currentNightModeStart: "18:00",
	currentNightModeEnd: "06:00",
};

const appSettings_Default = {
	start_on_startup: false,
	rescan_every_start: false,
	auto_rescan: false,
	rescan_interval: 12,
	maxQueueSize: 13,
};

const dataPath_Dict = {
	album: albumSettingsPath,
	runtime: runtimeSettingsPath,
	app: appSettingsPath,
};

const dataDefault_Dict = {
	album: albumSettings_Default,
	runtime: runtimeSettings_Default,
	app: appSettings_Default,
};

const { ipcRenderer: ipcInFiles } = require("electron");

// ============================================================
// Files
const createPathIfNotExist = (path) => {
	if (!fs.existsSync(path)) {
		fs.mkdirSync(path);
	}
};

const getFilesInFolder = (folder) => {
	let files = [],
		success = false,
		errMsg = "";
	try {
		// readdir and add the basefolder
		files = fs.readdirSync(folder).map((file) => {
			return path.join(folder, file).replace(/\\/g, "/");
		});
		success = true;
	} catch (error) {
		success = false;
		errMsg = error;
		ipcInFiles.send("dialogbox", ["error", errMsg]);
	}

	return { files, success, errMsg };
};

// Filter image
const filterImages = (item) => {
	const imageExt = ["jpg", "jpeg", "png", "gif", "bmp", "tiff", "tif"];
	const images = item.files.filter((file) => {
		const ext = path.extname(file);
		return imageExt.includes(ext.substring(1));
	});

	return images;
};

// config
const saveConfig = (type, config) => {
	let success = false,
		errMsg = "";

	// check if directory exists. If not create it
	createPathIfNotExist(configDir);

	try {
		fs.writeFileSync(dataPath_Dict[type], JSON.stringify(config, null, 2), "utf8");
		success = true;
	} catch (error) {
		success = false;
		errMsg = error;
	}

	return { success, errMsg };
};

const loadConfig = (type) => {
	let data = {},
		success = false,
		errMsg = "";

	try {
		data = JSON.parse(fs.readFileSync(dataPath_Dict[type], "utf8"));
		success = true;
	} catch (error) {
		// check if error file not found
		if (error.code === "ENOENT") {
			// create default config file
			saveConfig(type, dataDefault_Dict[type]);
			data = dataDefault_Dict[type];
			success = true;
		} else {
			success = false;
			errMsg = error;
		}
	}
	return { data, success, errMsg };
};

const resetDefaultApp = () => {
	const { success, errMsg } = saveConfig("app", appSettings_Default);

	return { appSettings_Default, success, errMsg };
};

// ============================================================
// Test
var fnName = function () {
	// console.log("🚀 ~ file: files.js ~ line 4 ~ fnName ~ configDir", configDir);
	// console.log("🚀 ~ file: files.js ~ line 4 ~ fnName ~ configPath", albumSettingsPath);

	// const wp = getFilesInFolder("C:\\\\Users\\ffant\\Pictures\\Wallpaper\\test\\");
	// console.log("🚀 ~ file: files.js ~ fnName ~ wp", wp);
	// const imgOnly = filterImages(wp.files);
	// console.log("🚀 ~ file: files.js ~ fnName ~ imgOnly", imgOnly);

	// create empty config
	// let x = saveConfig(defaultConfig);
	// console.log("🚀 ~ file: files.js ~ fnName ~ x ", x )

	// load config
	// let y = loadConfig();
	// console.log("🚀 ~ file: files.js ~ fnName ~ y ", y);

	// reset config
	// let z = resetDefault();

	// load config test
	let dataAlbum = loadConfig("album");
	console.log("🚀 ~ file: files.js ~ fnName ~ data ", dataAlbum.data);
	console.log("🚀 ~ file: files.js ~ fnName ~ success ", dataAlbum.success);
	console.log("🚀 ~ file: files.js ~ fnName ~ errMsg ", dataAlbum.errMsg);

	let dataRuntime = loadConfig("runtime");
	console.log("🚀 ~ file: files.js ~ fnName ~ data ", dataRuntime.data);
	console.log("🚀 ~ file: files.js ~ fnName ~ success ", dataRuntime.success);
	console.log("🚀 ~ file: files.js ~ fnName ~ errMsg ", dataRuntime.errMsg);

	let dataApp = loadConfig("app");
	console.log("🚀 ~ file: files.js ~ fnName ~ data ", dataApp.data);
	console.log("🚀 ~ file: files.js ~ fnName ~ success ", dataApp.success);
	console.log("🚀 ~ file: files.js ~ fnName ~ errMsg ", dataApp.errMsg);
};

if (typeof require !== "undefined" && require.main === module) {
	fnName();
}

module.exports = {
	createPathIfNotExist,
	getFilesInFolder,
	filterImages,
	saveConfig,
	loadConfig,
	resetDefaultApp,
	albumSettings_Default,
	runtimeSettings_Default,
	appSettings_Default,
};
