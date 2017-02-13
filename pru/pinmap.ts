import { pinData, pinIndex } from './bbbPinData'
import { printPinTable } from './pinTable'
import * as shell from 'shelljs'
import { ExecOutputReturnValue } from "shelljs";
import stripJsonComments = require('strip-json-comments')
import {PinMappingData} from "./bbbPinData";
import {BasePruProgram} from "./jstemplates/common";
import {GeneratedPruProgram} from "./jstemplates/common";

var XXH = require('xxhashjs');

function writeSync(fname, data) {
	var fd = fs.openSync(fname, "w");
	fs.writeSync(fd, data);
	fs.closeSync(fd);
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Program Commands
var Commands = {
	"tables": function(){
		printPinTable("GPIO: BANK_BIT", pin => pin.gpioNum ? pin.gpioName : "");
		printPinTable("GPIO: Global Number", pin => pin.gpioNum || "");
		printPinTable("Mapped Channel Index", pin => pin.mappedChannelIndex != undefined ? pin.mappedChannelIndex : "");

		printPinTable("Unused Channels", pin => (pin.mappedChannelIndex == undefined && pin.gpioNum != undefined) ? pin.gpioName : "");

		console.info("PRU0 Pins: " + pinIndex.pinData.filter(d => d.r30pru == 0).length);
		console.info("PRU1 Pins: " + pinIndex.pinData.filter(d => d.r30pru == 1).length);

		printPinTable("NAME", pin => pin.name);
	},

	"pinout": function(){
		printPinTable("Internal Channel Index", pin => pin.mappedChannelIndex != undefined ? pin.mappedChannelIndex : "" );
	},

	"mapping-data": function() {
		console.info('\t"mappedPinNumberToPinDesignator": {');
		pinData
			.filter((pin) => pin.mappedChannelIndex !== undefined)
			.sort((a, b) => a.mappedChannelIndex - b.mappedChannelIndex)
			.forEach((pin) => {
				console.info('\t\t"' + pin.mappedChannelIndex + '": "' + pin.headerName + '", // GPIO' + pin.gpioName + ', ' + pin.name);
			}, {});
		console.info("\t}");
	},

	"pru-setup": function(options) {
		var tempDir = shell.tempdir() + "/ledscape";
		if (typeof(options.tempDir) === "string") {
			tempDir = options.tempDir;
		}

		var modeName = options.mode;
		if (typeof(modeName) !== "string") {
			usage("--mode requires an argument");
		}

		var channelCount = options["channel-count"] | 0;
		if (!(channelCount > 0 && channelCount <= 48)) {
			usage("--channel-count must be an integer between 1 and 48")
		}

		process.stderr.write("tempDir: " + tempDir + "\n");
		shell.mkdir('-p', tempDir);
		shell.cp("-f", __dirname + "/jstemplates/common.p.h", tempDir);

		function buildProgram(pruNum) {
			var asmGenerationResult = generatePruProgram(modeName, pruNum, channelCount);

			function pathOf(name) { return tempDir + "/" + name; }

			var programName = modeName + "-" + mappingFilename.match(/.*?([^\/\.]+)(\..+)?/)[1] + "-pru" + pruNum;
			var asmCodeHash = XXH(asmGenerationResult.pruCode, 0x243F6A88).toString(16);

			var asmFileName = programName + ".p";
			var binFileName = programName + ".bin";
			var hashFileName = programName + ".xxh";

			if (!shell.test("-e", pathOf(hashFileName)) || shell.cat(pathOf(hashFileName)) != asmCodeHash) {
				(<any>asmGenerationResult.pruCode).to(pathOf(asmFileName));

				execOrDie(
					"Compiling " + pathOf(asmFileName),
					"cd '" + tempDir + "'; " + __dirname + "/../am335x/pasm/pasm -V3 -b " + asmFileName
				);

				asmCodeHash.to(pathOf(hashFileName));
			} else {
				console.error("Existing PRU Code Matches hash for " + pathOf(asmFileName));
			}

			return {
				binFile: pathOf(binFileName),
				usedPins: asmGenerationResult.usedPins
			}
		}

		var pru0Result = buildProgram(0);
		var pru1Result = buildProgram(1);

		var usedPins = pru0Result.usedPins.concat(pru1Result.usedPins);

		if (pinMapping.dtbName) {
			const capemgrDirectory = [
				"/sys/devices/bone_capemgr",
				"/sys/devices/platform/bone_capemgr",
				"/sys/devices/bone_capemgr.0",
				"/sys/devices/bone_capemgr.1",
				"/sys/devices/bone_capemgr.2",
				"/sys/devices/bone_capemgr.3",
				"/sys/devices/bone_capemgr.4",
				"/sys/devices/bone_capemgr.5",
				"/sys/devices/bone_capemgr.6",
				"/sys/devices/bone_capemgr.7",
				"/sys/devices/bone_capemgr.8",
				"/sys/devices/bone_capemgr.9"
			].filter(name => shell.test("-d", name))[0];

			if (capemgrDirectory) {
				const dtboSourceFilename = "../dts/" + pinMapping.dtbName + "-00A0.dtbo";
				const dtboDestFilename = "/lib/firmware/" + pinMapping.dtbName + "-00A0.dtbo";

				if (shell.test("-e", dtboSourceFilename)) {
					if (shell.cp(dtboSourceFilename, dtboDestFilename)) {
						console.info("Copied " + dtboSourceFilename + " to " + dtboDestFilename);

						if ((pinMapping.dtbName as any).to(capemgrDirectory + "/slots")) {
							console.info("Enabled device tree overlay " + pinMapping.dtbName);
						} else {
							console.error("Failed to load device tree overlay " + pinMapping.dtbName);
							process.exit(-1);
						}
					} else {
						console.error("Failed to copy " + dtboSourceFilename + " to " + dtboDestFilename);
						process.exit(-1);
					}
				} else {
					console.error("Device tree file not found: " + dtboSourceFilename);
					process.exit(-1);
				}
			} else {
				console.error("No bone_capemgr found... Skipping pin setup.");
			}
		} else {
			if (shell.test("-d", '/sys/class/gpio')) {
				usedPins.forEach(
					function (pin) {
						process.stderr.write("Pin " + pin.mappedChannelIndex + " (" + pin.headerName + "):");

						try {
							writeSync("/sys/class/gpio/export", pin.gpioNum);
							process.stderr.write("\n  export OK;");
						} catch (e) {
							process.stderr.write("\n  export FAIL: echo " + pin.gpioNum + " > /sys/class/gpio/export");
							process.stderr.write("\n    " + e);
						}

						try {
							writeSync("/sys/class/gpio/gpio" + pin.gpioNum + "/direction", "out");
							process.stderr.write("\n  direction OK;");
						} catch (e) {
							process.stderr.write("\n  direction FAIL: echo out > /sys/class/gpio/gpio" + pin.gpioNum + "/direction");
							process.stderr.write("\n    " + e);
						}

						try {
							writeSync("/sys/class/gpio/gpio" + pin.gpioNum + "/value", 0);
							process.stderr.write("\n  value OK;");
						} catch (e) {
							process.stderr.write("\n  value FAIL: echo 0 > /sys/class/gpio/gpio" + pin.gpioNum + "/value");
							process.stderr.write("\n    " + e);
						}

						process.stderr.write("\n");
					}
				);
			} else {
				console.error("No /sys/class/gpio... Skipping pin setup.");
			}
		}

		console.info("PRU0:", pru0Result.binFile);
		console.info("PRU1:", pru1Result.binFile);
	}
};

function execOrDie(
	description,
	commandStr
) {
	var result = <ExecOutputReturnValue> shell.exec(commandStr, { silent: true });
	if (result.code !== 0) {
		console.error("FAILED: " + description + " (" + result.code + "): " + commandStr);
		console.error(result.output.split("\n").join("\n  "));
		shell.exit(-1);
	}
	else {
		console.error("SUCCESS: " + description +": " + commandStr);
		return result;
	}
}

function generatePruProgram(
	modeName: string,
	pruNum: number,
	globalChannelCount: number
): GeneratedPruProgram {
	var ProgramClass = require("./jstemplates/" + modeName).default;
	var instance: BasePruProgram = new ProgramClass(
		pruNum,
		globalChannelCount
	);

	return instance.generate();
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Bootstrap

var mappingFilename = "original-ledscape";

function usage(error?: string) {
	if (error) {
		console.error(error);
		console.info();
	}

	console.info("Usage: " + process.execPath + " [--mapping mappingFile] [tables | pru-headers]");
	process.exit(error ? -1 : 0);
}

var commandFunc = Commands.pinout;
var optionMap = {};
var lastOptName = null;
var parsedArgs = [];

process.argv.forEach(function(arg, i) {
	function parseArg(a) {
		if (a === "true") return true;
		if (a === "false") return false;
		if (a === "null") return null;
		if (!isNaN(a)) return 1 * a;
		return a;
	}

	if (arg === "-h" || arg === "-?") {
		usage();
	}

	else if (arg in Commands) {
		commandFunc = Commands[arg];
	}

	else if (arg.substring(0, 2) == "--") {
		lastOptName = arg.substring(2);
		optionMap[lastOptName] = true;
	}

	else if (arg.substring(0, 1) == "-") {
		lastOptName = arg.substring(1);
		optionMap[lastOptName] = true;
	}

	else {
		if (lastOptName !== null) {
			optionMap[lastOptName] = parseArg(arg);
		} else {
			parsedArgs.push(parseArg(arg));
		}
		lastOptName = null;
	}
});

if ("mapping" in optionMap) {
	if (optionMap["mapping"] === true) {
		usage("--mapping requires an argument");
	} else {
		mappingFilename = optionMap["mapping"];
	}
}

var fs = require('fs');
var path = require('path');

// Look for the mapping file in various places... allow the name of the mapping with or without an extension and
// allow references to the mappings in the relative directory mappings/
var validPaths = [
	mappingFilename,
	mappingFilename + ".json",
	path.dirname(require.main.filename) + "/mappings/" + mappingFilename,
	path.dirname(require.main.filename) + "/mappings/" + mappingFilename + ".json"
].filter(fs.existsSync);

if (validPaths.length == 0) {
	usage("Could not find mapping: " + mappingFilename);
}

var pinMapping: PinMappingData;
try {
	pinMapping = JSON.parse(stripJsonComments(fs.readFileSync(validPaths[0], "utf8")));
} catch (e) {
	console.error(e);
	usage("Failed to parse mapping at " + validPaths[0] + "\n");
}

process.stderr.write("Mapping: " + mappingFilename + " (" + pinMapping.name + ")\n");

if (pinMapping.mappedPinNumberToPinDesignator) {
	pinIndex.applyMappingData(pinMapping);
}
else {
	usage("Invalid mapping file format. No mappedPinNumberToPinDesignator field found.");
}

// Call the desired command
commandFunc.call(this, optionMap, parsedArgs);