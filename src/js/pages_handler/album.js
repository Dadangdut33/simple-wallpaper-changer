// prevent any input in base-folder
document.getElementById("base-folder").addEventListener("keydown", function (e) {
	e.preventDefault();
});

const { ipcRenderer } = require("electron");
const intrinsicScale = require("intrinsic-scale");
const appSetting = ipcRenderer.sendSync("get-settings", "app");

const albumSelect_El = document.getElementById("album-select");
const albumName_El = document.getElementById("album-name");
const baseFolder_El = document.getElementById("base-folder");
const imgContainer = document.getElementById("img-container");
const loadBar = document.getElementById("loadbar");

// top
const albumSave_El = document.getElementById("save");
const albumCancel_El = document.getElementById("cancel");
const clearBaseFolder_El = document.getElementById("clear-base-folder");
const albumDelete_El = document.getElementById("delete");

// bottom
const albumImgTotal_El = document.getElementById("album-images-total");
const albumTotal_El = document.getElementById("album-total");
const btnLoadImg = document.getElementById("load-images");
const btnSyncFolder = document.getElementById("sync-folder");
const btnAddImg = document.getElementById("add-images");
const btnDeleteAllImages = document.getElementById("delete-all-images");

let selectedAlbum_Name = "",
	selectedAlbumData = {},
	allAlbum = [];

const fillData = (selectedAlbumData) => {
	albumName_El.value = selectedAlbumData.name;
	baseFolder_El.value = selectedAlbumData.baseFolder;
};

const updateAlbumLength = () => {
	albumTotal_El.innerHTML = selectedAlbumData.active_wp.length + selectedAlbumData.inactive_wp.length;
};

const listUpdate = (albumList, getRuntime = true, selected = "") => {
	albumSelect_El.innerHTML = "";

	albumList.forEach((album) => {
		const option = document.createElement("option");
		option.value = album.name;
		option.innerText = album.name;
		albumSelect_El.appendChild(option);
	});

	const lastOpt = document.createElement("option");
	lastOpt.value = "Add more";
	lastOpt.innerText = "Add more";
	albumSelect_El.appendChild(lastOpt);

	// get current album // if getRunTime else stays on the same album
	if (getRuntime) {
		selectedAlbum_Name = ipcRenderer.sendSync("get-current-album")[0];
		selectedAlbumData = ipcRenderer.sendSync("get-current-album-data", selectedAlbum_Name);

		// set selected album as the current album and fill the data
		albumSelect_El.value = selectedAlbum_Name ? selectedAlbum_Name : "Add more";
		if (!selectedAlbumData) {
			selectedAlbumData = {
				name: "",
				baseFolder: "",
			};
		}
		updateAlbumLength();
		fillData(selectedAlbumData);
	} else {
		if (selected !== "") albumSelect_El.value = selected;
	}
};

const loadImage = (images, active = true) => {
	showToast("Loading images... Please wait as this might take a while depending on your computer's performance and the amount of images in the album.");
	loadBar.style.display = "block";
	images.some((image) => {
		let identifier = getImageName(image);

		const div = document.createElement("div");
		div.className = "img-wrapper";
		div.id = "img-wrapper-" + identifier;
		div.onmouseenter = () => {
			showDesc(identifier);
		};
		div.onmouseleave = () => {
			hideDesc(identifier);
		};

		// span
		const span = document.createElement("span");
		span.id = "desc-span-" + identifier;
		if (!active) span.className = "skipped";
		else span.className = "normal";
		div.appendChild(span);

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

		const iconSkip = document.createElement("span");
		iconSkip.className = "has-tooltip-bottom mx-1 has-tooltip-arrow";
		iconSkip.dataset.tooltip = "Skip/Unskip this wallpaper from the list";
		// prettier-ignore
		iconSkip.innerHTML = `<i class="fas ${active ? "fa-minus-circle" : "fa-plus-circle"}" id="${active ? "active" : "inactive"}" onclick="setActiveInactive(this, '${identifier}','${image.replace(/\\/g, "/")}')"></i>`;
		descHover.appendChild(iconSkip);

		// add to queue
		const iconAddToQueue = document.createElement("span");
		iconAddToQueue.className = "has-tooltip-bottom mx-1 has-tooltip-arrow";
		iconAddToQueue.dataset.tooltip = "Add image to current queue";
		iconAddToQueue.innerHTML = `<i class="fas fa-folder-plus" onclick="addToQueue('${image.replace(/\\/g, "/")}')"></i>`;
		descHover.appendChild(iconAddToQueue);

		const iconDelete = document.createElement("span");
		iconDelete.className = "has-tooltip-bottom mx-1 has-tooltip-arrow";
		iconDelete.dataset.tooltip = "Delete this wallpaper from the list";
		iconDelete.innerHTML = `<i class="fas fa-trash-alt" onclick="deleteFromList(this, '${identifier}','${image.replace(/\\/g, "/")}')"></i>`;
		descHover.appendChild(iconDelete);

		const iconOpen = document.createElement("span");
		iconOpen.className = "has-tooltip-bottom mx-1 has-tooltip-arrow";
		iconOpen.dataset.tooltip = "Open this wallpaper in the default viewer";
		iconOpen.innerHTML = `<i class="fas fa-external-link-alt" onclick="openInExplorer('${image.replace(/\\/g, "/")}')"></i>`;
		descHover.appendChild(iconOpen);

		desc.appendChild(descHover);

		imgContainer.appendChild(div);
	});

	let timeoutTime = images.length > 20 ? 7000 : 2000;
	// delay 5 seconds to
	setTimeout(() => {
		loadBar.style.display = "none";
		closeToast();
	}, timeoutTime);
};

// ================================================================
// page open
// ================================================================
// get all album first
allAlbum = ipcRenderer.sendSync("get-settings", "album");
listUpdate(allAlbum);

// ================================================================
// handler
// ================================================================
const hideBtnBtm = () => {
	albumImgTotal_El.style.display = "none";
	btnLoadImg.style.display = "none";
	btnSyncFolder.style.display = "none";
	btnAddImg.style.display = "none";
	btnDeleteAllImages.style.display = "none";
};

const showBtnBtm = () => {
	albumImgTotal_El.style.display = "block";
	updateAlbumLength();
	btnLoadImg.style.display = "block";
	btnSyncFolder.style.display = "block";
	btnAddImg.style.display = "block";
	btnDeleteAllImages.style.display = "block";
};

const saveChanges = () => {
	// show loadbar
	showToast("Saving changes...");
	loadBar.style.display = "block";

	const albumName = albumName_El.value.trim();
	const baseFolder = baseFolder_El.value.trim();

	if (albumName.length === 0) {
		ipcRenderer.send("dialogbox", ["error", "Album name cannot be empty!"]);
		setTimeout(() => {
			loadBar.style.display = "none";
			closeToast();
		}, 500);
		return;
	}

	// invalid albumName
	if (albumName.toLowerCase() === "add more") {
		ipcRenderer.send("dialogbox", ["error", "Invalid album name provided!"]);
		setTimeout(() => {
			loadBar.style.display = "none";
			closeToast();
		}, 500);
		return;
	}

	if (baseFolder.length === 0) {
		const confirmation = ipcRenderer.sendSync("dialogbox", ["warning", "Base folder is empty, continue?"]);
		if (confirmation === 1) {
			setTimeout(() => {
				loadBar.style.display = "none";
				closeToast();
			}, 500);

			showToast("Cancelled!");

			setTimeout(() => {
				closeToast();
			}, 500);
			return;
		} // no
	}

	if (selectedAlbum_Name === "Add more") {
		let active_wp = [];

		// check if albumName already exist in allAlbum
		if (allAlbum.some((album) => album.name.toLowerCase() === albumName.toLowerCase())) {
			ipcRenderer.send("dialogbox", ["error", "Album with the same name already exist!"]);
			setTimeout(() => {
				loadBar.style.display = "none";
				closeToast();
			}, 500);
			return;
		}

		if (baseFolder.length > 0) {
			active_wp = getFilesInFolder(baseFolder);
			active_wp = filterImages(active_wp);
		}

		// add
		const albumData = {
			name: albumName,
			baseFolder: baseFolder,
			active_wp: active_wp,
			inactive_wp: [],
		};
		ipcRenderer.send("add-album", albumData);

		selectedAlbum_Name = albumName;
		selectedAlbumData = albumData;

		showBtnBtm();
	} else {
		// get current album data first
		let currentAlbumData = ipcRenderer.sendSync("get-current-album-data", selectedAlbumData.name);
		let new_active_wp = [];

		// check if name is edited but it already exist in the album
		if (selectedAlbumData.name !== albumName) {
			if (allAlbum.some((album) => album.name.toLowerCase() === albumName.toLowerCase())) {
				ipcRenderer.send("dialogbox", ["error", "Album with the same name already exist!"]);
				setTimeout(() => {
					loadBar.style.display = "none";
					closeToast();
				}, 500);
				return;
			}
		}

		currentAlbumData.name = albumName;

		// check if basefolder is edited
		if (currentAlbumData.baseFolder !== baseFolder) {
			currentAlbumData.baseFolder = baseFolder;

			// if it is not empty
			if (baseFolder.length > 0) {
				new_active_wp = getFilesInFolder(baseFolder);
				new_active_wp = filterImages(new_active_wp);

				// add new active wp to current active wp but make sure no duplicate
				const newArr = [...currentAlbumData.active_wp, ...new_active_wp];
				currentAlbumData.active_wp = [...new Set(newArr)];

				// remove active wp that is currently in inactive_wp
				currentAlbumData.active_wp = currentAlbumData.active_wp.filter((active_wp) => {
					return !currentAlbumData.inactive_wp.includes(active_wp);
				});
			}
		}

		ipcRenderer.send("update-album", [selectedAlbumData.name, currentAlbumData]); // [albumName, updatedData]

		// update selected album data
		selectedAlbum_Name = albumName;
		selectedAlbumData = currentAlbumData;
	}
	updateAlbumLength();

	// update select
	allAlbum = ipcRenderer.sendSync("get-settings", "album");
	listUpdate(allAlbum, false, selectedAlbum_Name);

	// close loadbar
	setTimeout(() => {
		loadBar.style.display = "none";
		closeToast();
	}, 500);
};

const checkChanges = () => {
	if (selectedAlbum_Name !== "Add more") {
		if (selectedAlbumData.name !== albumName_El.value || selectedAlbumData.baseFolder !== baseFolder_El.value) {
			const res = ipcRenderer.sendSync("dialogbox", ["yesno", "You have unsaved changes. Do you want to save them?"]);
			if (res === 0) saveChanges();
		}
	} else if (albumName_El.value.length > 0 || baseFolder_El.value.value > 0) {
		const res = ipcRenderer.sendSync("dialogbox", ["yesno", "You have unsaved changes. Do you want to save them?"]);
		if (res === 0) saveChanges();
	}
};

const pageSwitchingHandler = () => {
	checkChanges();

	return true;
};

const selectAlbumHandler = () => {
	checkChanges();

	const album = albumSelect_El.value;
	selectedAlbum_Name = album;
	btnLoadImg.style.display = "block";
	if (album === "Add more") {
		selectedAlbumData = {};
		albumName_El.value = "";
		baseFolder_El.value = "";

		hideBtnBtm();
		document.getElementById("img-container").innerHTML = "";
	} else {
		selectedAlbumData = ipcRenderer.sendSync("get-current-album-data", selectedAlbum_Name);
		fillData(selectedAlbumData);

		showBtnBtm();
		document.getElementById("img-container").innerHTML = "";
	}
};

const pathDialog = () => {
	const baseFolder = document.getElementById("base-folder").value;

	const res = ipcRenderer.sendSync("dialogbox", ["openDirectory", baseFolder]);

	if (res) document.getElementById("base-folder").value = res;
};

// save
albumSave_El.addEventListener("click", () => {
	saveChanges();
});

// cancel
const cancelAlbum = () => {
	const confirmation = ipcRenderer.sendSync("dialogbox", ["warning", "You will lose all changes made, continue?"]);
	if (confirmation === 1) return;

	if (selectedAlbum_Name !== "Add more") {
		fillData(selectedAlbumData);
	} else {
		albumName_El.value = "";
		baseFolder_El.value = "";
	}
};

albumCancel_El.addEventListener("click", () => cancelAlbum());

// delete
const clearBaseFolder = () => {
	baseFolder_El.value = "";
};

clearBaseFolder_El.addEventListener("click", () => clearBaseFolder());

const deleteAlbum = () => {
	// check if album is selected
	if (selectedAlbum_Name === "Add more") {
		ipcRenderer.send("dialogbox", ["error", "Please select an album to delete"]);
		return;
	}

	// check if there is only 1 album
	if (allAlbum.length === 1) {
		ipcRenderer.send("dialogbox", ["error", "You must have atleast 1 album"]);
		return;
	}

	const confirmation = ipcRenderer.sendSync("dialogbox", ["warning", "You will lose all data of this album, continue?"]);
	if (confirmation === 1) return;

	// check selected album is in the runtime
	const runTimeAlbum = ipcRenderer.sendSync("get-current-album");
	if (runTimeAlbum.includes(selectedAlbum_Name)) {
		ipcRenderer.send("dialogbox", ["error", "You can't delete an album that is currently in use"]);
		return;
	}

	ipcRenderer.send("delete-album", selectedAlbum_Name);
	baseFolder_El.value = "";
	imgContainer.innerHTML = "";
	allAlbum = ipcRenderer.sendSync("get-settings", "album");
	listUpdate(allAlbum);
};

albumDelete_El.addEventListener("click", () => deleteAlbum());

// ================================================================
// btn bottom
// ================================================================
const btnLoadImgClick = () => {
	if (selectedAlbum_Name === "Add more") {
		return;
	}

	btnLoadImg.style.display = "none";

	loadImage(selectedAlbumData.active_wp);
	loadImage(selectedAlbumData.inactive_wp, false);
};
btnLoadImg.addEventListener("click", () => btnLoadImgClick());

// ----------------
const btnSyncFolderClick = () => {
	if (selectedAlbum_Name === "Add more") {
		return;
	}

	const res = ipcRenderer.sendSync("sync-album", selectedAlbum_Name);

	if (res) {
		// get new album data
		const newlySyncedAlbumData = ipcRenderer.sendSync("get-current-album-data", selectedAlbum_Name);

		// filter the only new data
		const newData = newlySyncedAlbumData.active_wp.filter((img) => !selectedAlbumData.active_wp.includes(img));

		// update current data
		selectedAlbumData = newlySyncedAlbumData;

		updateAlbumLength();

		// load the new data
		loadImage(newData);
	}
};
btnSyncFolder.addEventListener("click", () => btnSyncFolderClick());

// ----------------
const btnAddImgClick = () => {
	if (selectedAlbum_Name === "Add more") {
		return;
	}

	let images = ipcRenderer.sendSync("add-images", selectedAlbum_Name);

	// remove the undefined
	if (images) {
		images = images.filter((img) => img !== undefined);

		if (images.length > 0) {
			selectedAlbumData = ipcRenderer.sendSync("get-current-album-data", selectedAlbum_Name);
			updateAlbumLength();
			loadImage(images);
		}

		showToast("Images added");

		// hide toast
		setTimeout(() => {
			closeToast();
		}, 1000);
	}
};
btnAddImg.addEventListener("click", () => btnAddImgClick());

// ----------------
const btnDeleteAllImagesClick = () => {
	if (selectedAlbum_Name === "Add more") {
		return;
	}

	const confirmation = ipcRenderer.sendSync("dialogbox", ["warning", "You will lose all images of this album, continue?"]);
	if (confirmation === 1) return;

	const res = ipcRenderer.sendSync("delete-all-images", selectedAlbum_Name);
	if (res) {
		selectedAlbumData = ipcRenderer.sendSync("get-current-album-data", selectedAlbum_Name);
		updateAlbumLength();
		document.getElementById("img-container").innerHTML = "";
		showToast("All images deleted successfully");

		// hide toast
		setTimeout(() => {
			closeToast();
		}, 3000);
	}
};
btnDeleteAllImages.addEventListener("click", () => btnDeleteAllImagesClick());

// ================================================================
// update data from ipcmain
// ================================================================
ipcRenderer.on("update-album-data", (event, arg) => {
	allAlbum = ipcRenderer.sendSync("get-settings", "album");
	// check selected album name
	if (selectedAlbum_Name === "Add more") {
		// if add more, don't update the selected data in the page
		listUpdate(allAlbum, false, selectedAlbum_Name);
	} else {
		listUpdate(allAlbum);
	}

	showToast("Album has been updated by the app. Reload album image if needed.");
});

// ============================================================
// theme
if (appSetting.app_theme === "dark") {
	let head = document.head;
	let link = document.createElement("link");

	link.type = "text/css";
	link.rel = "stylesheet";
	link.href = "../style/bulma-dark.css";

	head.appendChild(link);
}
