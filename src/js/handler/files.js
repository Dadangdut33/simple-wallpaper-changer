const fs = require("fs");
const path = require("path");
const configDir = path.join(__dirname, "..\\..\\config\\");
const configPath = path.join(configDir, "config.json");
const defaultConfig = {
	profile: [
		{
			album: "Default",
			baseFolder: [],
			active_wp: [],
			inactive_wp: [],
			preferred_Random: true,
			preferred_shuffle_interval: 30, // minutes
		},
	],
	runtimeSettings: {
		// runtime settings -> setting each time the app is started
		currentQueue: [], // max 20 shown
		currentAlbum: "Default",
		currentRandom: true,
		currentShuffle: 30, // minutes
	},
	appSettings: {
		start_on_startup: false,
		rescan_every_start: false,
		auto_rescan: false,
		rescan_interval: 12,
	},
};
const { ipcRenderer } = require("electron");

// ============================================================
// Files
const createPathIfNotExist = (path) => {
	if (!fs.existsSync(path)) {
		fs.mkdirSync(path);
	}
};

const getFilesInFolder = (folder) => {
	let files = [],
		success = false;
	errMsg = "";
	try {
		files = fs.readdirSync(folder);
		success = true;
	} catch (error) {
		success = false;
		errMsg = error;
		ipcRenderer.send("dialogbox", ["error", errMsg]);
	}

	return { files, success, errMsg };
};

// Filter image
const filterImages = (files) => {
	const imageExt = ["jpg", "jpeg", "png", "gif", "bmp", "tiff", "tif"];
	const images = files.map((file) => {
		const ext = path.extname(file);
		if (imageExt.includes(ext.substring(1))) {
			return file;
		}
	});
	// remove undefined
	return images.filter((img) => img);
};

// config
const saveConfig = (config) => {
	let success = false,
		errMsg = "";
	createPathIfNotExist(configDir);
	try {
		fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
		success = true;
	} catch (error) {
		success = false;
		errMsg = error;
	}

	return { success, errMsg };
};

const loadConfig = () => {
	let data = {},
		success = false,
		errMsg = "";
	try {
		data = JSON.parse(fs.readFileSync(configPath));
		success = true;
	} catch (error) {
		// check if error file not found
		if (error.code === "ENOENT") {
			// create default config file
			saveConfig(defaultConfig);
			data = defaultConfig;
			success = true;
		} else {
			success = false;
			errMsg = error;
		}
	}
	return { data, success, errMsg };
};

const resetDefault = () => {
	const config = defaultConfig;
	const { success, errMsg } = saveConfig(config);

	return { config, success, errMsg };
};

const resetDefaultApp = (currentConfig) => {
	currentConfig.appSettings.start_on_startup = false;
	currentConfig.appSettings.rescan_every_start = false;
	currentConfig.appSettings.auto_rescan = false;
	currentConfig.appSettings.rescan_interval = 12;

	const { success, errMsg } = saveConfig(currentConfig);

	return { currentConfig, success, errMsg };
};

// ============================================================
// Test
var fnName = function () {
	console.log("🚀 ~ file: files.js ~ line 4 ~ fnName ~ configDir", configDir);
	console.log("🚀 ~ file: files.js ~ line 4 ~ fnName ~ configPath", configPath);

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
	resetDefault,
	resetDefaultApp,
};
