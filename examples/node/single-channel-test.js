var OpcUdpClient = require('./lib/opc-udp');

var config = {
	host: "192.168.7.2",
	port: 7890,
	strips: 48,
	pixels: 64,
	sync: true
};

process.argv.forEach(function(arg,i) {
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

	var obj = {
		tick: function() {
			var now = (new Date).getTime();

			if (lastTick != null) {
				lastDuration = now - lastTick;
			}

			lastTick = now;
		}
	};

	Object.defineProperty(obj, "fps", {
		configurable: true,
		enumerable: true,
		get: function(){
			return lastDuration == null ? null : 1000 / lastDuration;
		}
	});

	return obj;
}


var fps = new FpsCalc();
function draw() {
	fps.tick();

	console.info("FPS", fps.fps);

	var timeFraction = (((new Date).getTime()) % 5000) / 5000;

	for (var s= 0, i=0; s<client.stripCount; s++) {
		for (var p=0; p<client.pixelsPerStrip; p++, i++) {
			client.setPixelHsb(i, (p % client.pixelsPerStrip) + timeFraction, 1, .5);
		}
	}

	client.sendAllChannels(! config.sync).then(function(){
		setTimeout(draw, 0);
	});
}

draw();