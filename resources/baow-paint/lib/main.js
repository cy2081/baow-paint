var buttons = require("sdk/ui/button/action");
var tabs = require("sdk/tabs");
var self = require("sdk/self");
var tabUtils = require("sdk/tabs/utils");
var windowUtils = require("sdk/window/utils");
var addon = require("sdk/addon/window");

var screenShotTab = null;
var button = buttons.ActionButton({
	id: "baow-paint"
	,label: "Baow Paint"
	,icon: {
		16: "./icon1.png"
		,32: "./icon2.png"
		,64: "./icon3.png"
	}
	,onClick: inject
});

function inject() {
	var worker = tabs.activeTab.attach({
		contentScriptFile: [self.data.url("styles.js"), self.data.url("inject.js")]
	});
	worker.port.on("take_screen_shot", function(msg) {
		var img = captureTab();
		if (screenShotTab && screenShotTab.url === self.data.url("screen.html")) {
			updateImage(screenShotTab, img);
			screenShotTab.activate()
		} else {
			screenShotTab = null;
			openTab(img)
		}
	})
}
function updateImage(tab, img) {
	tab.attach({
		contentScript: "document.getElementById('target').src='" + img + "';document.getElementById('download').href='" + img + "'"
	})
}
function openTab(img) {
	tabs.open({
		url: self.data.url("screen.html")
		,onReady: function listener(tab) {
			if (screenShotTab && screenShotTab !== tab) {
				return
			}
			screenShotTab = tab;
			tab.attach({
				contentScriptFile: self.data.url("screenFF.js")
				,contentScript: "document.getElementById('target').src='" + img + "';document.getElementById('download').href='" + img + "'"
			})
		}
		,onClose: function(tab) {
			if (screenShotTab && screenShotTab !== tab) {
				return
			}
			screenShotTab = null
		}
	})
}
function captureTab() {
	var tab = tabUtils.getActiveTab(windowUtils.getMostRecentBrowserWindow())
	,contentWindow = tabUtils.getTabContentWindow(tab);
	var w = contentWindow.innerWidth,
	h = contentWindow.innerHeight,
	x = contentWindow.scrollX,
	y = contentWindow.scrollY;
	var document = addon.window.document,
	canvas = document.createElementNS("http://www.w3.org/1999/xhtml", "canvas");
	document.documentElement.appendChild(canvas);
	canvas.width = w;
	canvas.height = h;
	var ctx = canvas.getContext("2d");
	ctx.drawWindow(contentWindow, x, y, w, h, "#000");
	return canvas.toDataURL()
}

