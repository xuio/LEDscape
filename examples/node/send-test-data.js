var OpcUdpClient = require('./lib/opc-udp');

var config = {
	host: "192.168.7.2",
	port: 7890,
	strips: 48,
	pixels: 64,

	single: true,
	sync: true
};

["-h", "--help", "-?"].forEach(function(helpArg) {
	if (process.argv.indexOf(helpArg) >= 0) {
		console.info("Usage: node send-test-data.js <args>");
		console.info("Available arguments:");

		Object.getOwnPropertyNames(config).forEach(function(configKey) {
			console.info(
				"\t--" + configKey + " <" + typeof(config[configKey]) + ">"
			);
		});
		process.exit(0);
	}
});

process.argv.forEach(function(arg, i) {
	Object.getOwnPropertyNames(config).forEach(function(configKey){
		if (arg == "--" + configKey) {
			var value = process.argv[i + 1];
			if (value === "true" || value === "false") {
				config[configKey] = (value === "true");
			} else if (isNaN(value)) {
				config[configKey] = value;
			} else {
				config[configKey] = parseFloat(value);
			}
		}
	});
});

console.info("Starting test data sender with config:");
console.info(config);

var client = new OpcUdpClient(
	config.host,
	config.port,
	config.strips,
	config.pixels
);

function FpsCalc() {
	var lastTick = null;
	var lastDuration = null;
	var lastDurations = [];
	var lastPrintAt = 0;

	var obj = {
		tick: function() {
			var now = (new Date).getTime();

			if (lastTick != null) {
				lastDuration = now - lastTick;
			}

			lastTick = now;

			if (lastDurations.length >= 60) {
				lastDurations.splice(0, 1);
			}
			lastDurations.push(lastDuration);
		},
		printAtIntervalMs: function(intervalMs) {
			var now = (new Date).getTime();
			if (now - lastPrintAt > intervalMs) {
				lastPrintAt = now;
				console.info("FPS: ", Math.round(this.fps));
			}
		}
	};

	Object.defineProperty(obj, "fps", {
		configurable: true,
		enumerable: true,
		get: function(){
			if (lastDurations.length == 0) return null;

			return 1000 / (lastDurations.reduce(function(a,b){ return a + b; }) / lastDurations.length);
		}
	});

	return obj;
}


var fps = new FpsCalc();
function normalCos(t) {
	return Math.cos(t * Math.PI*2)/2 + .5;
}


function draw() {
	fps.tick();

	fps.printAtIntervalMs(1000);

	var timeFraction = (((new Date).getTime()) % 5000) / 5000;

	for (var s= 0, i=0; s<client.stripCount; s++) {
		for (var p=0; p<client.pixelsPerStrip; p++, i++) {
			client.setPixelHsb(i, .3, 1, normalCos((p % client.pixelsPerStrip) + timeFraction));
		}
	}

	if (config.single) {
		client.sendAllChannels(! config.sync).then(function(){
			setTimeout(draw, 0);
		});
	} else {
		client.sendAllDataOnChannel0().then(function(){
			setTimeout(draw, 0);
		});
	}
}

draw();