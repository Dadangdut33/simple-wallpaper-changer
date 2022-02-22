module.exports = {
	packagerConfig: {
		icon: "./src/assets/logo.ico",
	},
	makers: [
		{
			name: "@electron-forge/maker-squirrel",
			config: {
				name: "simple_wallpaper_changer",
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
					bin: "simple_wallpaper_changer",
					maintainer: "Dadangdut33",
					homepage: "https://dadangdut33.codes",
				},
			},
		},
		{
			name: "@electron-forge/maker-rpm",
			config: {},
		},
	],
};
