const wallpaper = require("wallpaper");
const changeWp = document.getElementById("changeWp");

const setWp = async () => {
	console.log("setWallpaper");
	let wpBefore = (await wallpaper.get()).split("\\").pop();
	const wpArr = [
		`C://Users//ffant/Pictures/Wallpaper/Wallpaper/882391.jpg`,
		"C://Users/ffant/Pictures/Wallpaper/Wallpaper/23708582_p0.jpg",
		"C://Users/ffant/Pictures/Wallpaper/Wallpaper/62512786_p0.png",
	];

	// set wallpaper every 10 seconds
	// setInterval(() => {
	// 	const randomWp = wpArr[Math.floor(Math.random() * wpArr.length)];
	// 	console.log(randomWp);
	// 	wallpaper.set(randomWp);
	// }, 10000);
	let randomWp = "";
	while (true) {
		randomWp = wpArr[Math.floor(Math.random() * wpArr.length)];
		if (wpBefore !== randomWp.split("/").pop()) {
			break;
		}
	}

	console.log(randomWp);
	await wallpaper.set(randomWp);
};

changeWp.addEventListener("click", setWp);
