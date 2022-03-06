module.exports = {
	packagerConfig: {
		icon: "./src/assets/logo.ico",
		name: "simple-wallpaper-changer",
	},
	makers: [
		{
			name: "@electron-forge/maker-squirrel",
			config: {
				name: "simple-wallpaper-changer",
				authors: "Dadangdut33",
				iconUrl: "https://raw.githubusercontent.com/Dadangdut33/simple-wallpaper-changer/master/src/assets/logo.png",
			},
		},
		{
			name: "@electron-forge/maker-zip",
			platforms: ["darwin"],
		},
		{
			name: "@electron-forge/maker-deb", // haven't tested yet cause i'm on windows
			config: {
				options: {
					bin: "simple-wallpaper-changer",
					name: "simple-wallpaper-changer",
					maintainer: "Dadangdut33",
					homepage: "https://github.com/Dadangdut33/simple-wallpaper-changer",
				},
			},
		},
		{
			name: "@electron-forge/maker-rpm",
			config: {
				options: {
					bin: "simple-wallpaper-changer",
					name: "simple-wallpaper-changer",
					maintainer: "Dadangdut33",
					homepage: "https://github.com/Dadangdut33/simple-wallpaper-changer",
				},
			},
		},
	],
};
