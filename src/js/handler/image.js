const shell = require("electron").shell;
const { clipboard } = require("electron");
const { ipcRenderer: ipcRendererImage } = require("electron/renderer");
const showDesc = (identifier) => {
	const desc = document.getElementById("desc-" + identifier);

	if (desc.style.display === "none") {
		desc.style.display = "flex";
	}
};

const hideDesc = (identifier) => {
	const desc = document.getElementById("desc-" + identifier);
	let timeOut = null;
	if (desc.style.display === "flex") {
		// add fadeout then display none after animation is done
		clearTimeout(timeOut);
		desc.classList.add("fadeOut");
		// prettier-ignore
		timeOut = setTimeout(() => { // lgtm [js/useless-assignment-to-local]
			desc.style.display = "none";
			desc.classList.remove("fadeOut");
		}, 180);
	}
};

const setWallpaper = async (path) => {
	ipcRendererImage.send("change-wallpaper-withargs", path);

	showToast("Wallpaper set successfully");

	setTimeout(() => {
		closeToast();
	}, 1500);
};

const openInExplorer = (path) => {
	shell.openPath(path);
};

const copyToClipboard = (path) => {
	showToast("Copied to clipboard");
	clipboard.writeText(path);

	setTimeout(() => {
		closeToast();
	}, 1000);
};

const setActiveInactive = (el_this, identifier, path) => {
	if (el_this.id === "active") {
		ipcRenderer.send("set-img-inactive", [selectedAlbum_Name, path]);
		el_this.id = "inactive";
		el_this.className = "fas fa-plus-circle";
		document.getElementById("desc-span-" + identifier).className = "skipped";
	} else {
		ipcRenderer.send("set-img-active", [selectedAlbum_Name, path]);
		el_this.id = "active";
		el_this.className = "fas fa-minus-circle";
		document.getElementById("desc-span-" + identifier).className = "";
	}

	// update selected album data
	selectedAlbumData = ipcRenderer.sendSync("get-current-album-data", selectedAlbum_Name);
};

const addToQueue = (path) => {
	ipcRenderer.send("queue-add", path);

	showToast("Image added to the queue successfully");

	setTimeout(() => {
		closeToast();
	}, 1000);
};

const deleteFromList = (el_this, identifier, path) => {
	const activeOrNot = document.getElementById("desc-span-" + identifier).className === "skipped" ? false : true;

	ipcRenderer.send("delete-img", [selectedAlbum_Name, path, activeOrNot]);

	// remove from the list
	document.getElementById("img-wrapper-" + identifier).remove();

	// update selected album data
	selectedAlbumData = ipcRenderer.sendSync("get-current-album-data", selectedAlbum_Name);

	showToast("Image deleted from the album successfully");

	setTimeout(() => {
		closeToast();
	}, 1000);
};

const getImageName = (path) => {
	return path.split("/").pop();
};
