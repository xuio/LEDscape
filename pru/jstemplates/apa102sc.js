var fs = require('fs');

module.exports = function(
	baseDir,
	PRU_NUM,
	overallChannelCount
) {
	var rawPruCode = "";

	var clockPin = global.pinsByMappedChannelIndex["clock" + PRU_NUM];
	if (! clockPin) throw new Error("Cannot determine clock pin for " + PRU_NUM);

	var pruChannelCount = Math.ceil(overallChannelCount/2);

	// Split the used pins between the PRUs, because we have a shared clock line.
	applyPerPruClockMapping(pruChannelCount);

	var pruPins = global.pinsByPruNum[PRU_NUM].filter(function(_,i){ return i < pruChannelCount; });

	// Pull in the common code.
	eval(fs.readFileSync(baseDir + '/common.js').toString());

	console.error("Using " + pruChannelCount + " channels on PRU" + PRU_NUM);

	emitComment("//////////////////////////////////////////////////////////////////////////////////////////////////////");
	emitComment("APA102 Shared Clock for PRU" + PRU_NUM);
	emitComment("Overall Channels: " + overallChannelCount);
	emitComment("PRU Channels: " + pruChannelCount);
	emitComment("Clock Pin: " + clockPin.name);
	emitComment("//////////////////////////////////////////////////////////////////////////////////////////////////////");

	function DATAS_HIGH(pins) {
		if (pins) {
			emitComment('Bank ' + pins[0].gpioBank + ' Data Lines HIGH');
		} else {
			emitComment('All Data Lines HIGH');
		}

		pruBlock(function(){
			groupByBank(pins || pruPins, function(pins, gpioBank){
				PREP_GPIO_FOR_SET(gpioBank);
				PREP_GPIO_MASK_FOR_PINS(pins);
				APPLY_GPIO_CHANGES();
			});
		});
	}

	function DATAS_LOW(pins) {
		if (pins) {
			emitComment('Bank ' + pins[0].gpioBank + ' Data Lines LOW');
		} else {
			emitComment('All Data Lines LOW');
		}

		pruBlock(function() {
			groupByBank(pins || pruPins, function (pins, gpioBank) {
				PREP_GPIO_FOR_CLEAR(gpioBank);
				PREP_GPIO_MASK_FOR_PINS(pins);
				APPLY_GPIO_CHANGES();
			});
		});
	}

	function CLOCK_HIGH() {
		emitComment("Bring Clock High");

		pruBlock(function() {
			PREP_GPIO_FOR_SET(clockPin.gpioBank);
			PREP_GPIO_MASK_FOR_PINS([clockPin]);
			APPLY_GPIO_CHANGES();
		});
	}

	function CLOCK_LOW() {
		emitComment("Bring Clock Low");

		pruBlock(function() {
			PREP_GPIO_FOR_CLEAR(clockPin.gpioBank);
			PREP_GPIO_MASK_FOR_PINS([clockPin]);
			APPLY_GPIO_CHANGES();
		});
	}

	function CLOCK_PULSE(delay) {
		emitComment("Pulse Clock HIGH-LOW");

		var reps = Math.ceil(delay/2) || 1;

		pruBlock(function() {
			PREP_GPIO_FOR_SET(clockPin.gpioBank);
			PREP_GPIO_MASK_FOR_PINS([clockPin]);
			for (var i=0; i<reps; i++) {
				APPLY_GPIO_CHANGES();
			}

			PREP_GPIO_FOR_CLEAR(clockPin.gpioBank);
			for (var i=0; i<reps; i++) {
				APPLY_GPIO_CHANGES();
			}
		});
	}


	INIT_PRU();
	emitLabel("l_main_loop");

	emitInstr("RAISE_ARM_INTERRUPT");
	LBCO(r_data_addr, CONST_PRUDRAM, 0, 12);

	var _exit = "EXIT";

	emitComment("Wait for the start condition from the main program to indicate");
	emitComment("that we have a rendered frame ready to clock out.  This also");
	emitComment("handles the exit case if an invalid value is written to the start");
	emitComment("start position.");
	var l_main_loop = emitLabel("main_loop");

	emitComment("Let ledscape know that we're starting the loop again. It waits for this");
	emitComment("interrupt before sending another frame");
	emitInstr("RAISE_ARM_INTERRUPT");

	emitComment("Load the pointer to the buffer from PRU DRAM into r0 and the");
	emitComment("length (in bytes-bit words) into r1.");
	emitComment("start command into r2");
	LBCO(r_data_addr, CONST_PRUDRAM, 0, 12);

	emitComment("Wait for a non-zero command");
	QBEQ(l_main_loop, r2, 0);

	emitComment("Reset the sleep timer");
	emitInstr("RESET_COUNTER");

	emitComment("Zero out the start command so that they know we have received it");
	emitComment("This allows maximum speed frame drawing since they know that they");
	emitComment("can now swap the frame buffer pointer and write a new start command.");
	MOV(r3, 0);
	SBCO(r3, CONST_PRUDRAM, 8, 4);

	emitComment("Command of 0xFF is the signal to exit");
	QBEQ(_exit, r2, 0xFF);

	emitComment("send the start frame");
	pruBlock(function() {
		var l_start_frame = "l_start_frame";
		emitLabel(l_start_frame);
		MOV(r_bit_num, 32);

		emitComment('store number of leds in r29');
		MOV(r_data_len2, r_data_len);

		DATAS_LOW();

		pruBlock(function() {
			emitComment('32 bits of 0');
			var l_start_bit_loop = "l_start_frame_32_zeros";
			emitLabel(l_start_bit_loop);
			emitInstr("DECREMENT", [r_bit_num]);

			CLOCK_PULSE(5);

			QBNE(l_start_bit_loop, r_bit_num, 0);
		});

		pruBlock(function() {
			var l_word_loop = emitLabel("l_start_word_8_ones");

			// first 8 bits will be 0xFF (global brightness always at maximum)
			MOV(r_bit_num, 7);

			// Raise Data
			DATAS_HIGH();

			pruBlock(function() {
				var l_header_bit_loop = emitLabel("l_header_bit_loop");
				DECREMENT(r_bit_num);

				CLOCK_PULSE(5);

				QBNE(l_header_bit_loop, r_bit_num, 0);
			});

			// Load all the data.
			LOAD_CHANNEL_DATA(pruPins[0], 0, pruChannelCount);

			// for bit in 24 to 0
			emitComment("Loop over the 24 bits in a word");
			MOV(r_bit_num, 24);

			pruBlock(function() {
				var l_bit_loop = "l_bit_loop";
				emitLabel(l_bit_loop);
				DECREMENT(r_bit_num);

				// Send the previous bits (including the last 1 bit for the 8-bit preamble)
				CLOCK_HIGH();

				groupByBank(pruPins, function(pins, gpioBank, usedBank) {
					// Bring all data low for this bank
					DATAS_LOW(pins);

					// Clear the mask
					RESET_GPIO_MASK();

					// Set mask bits for the high bits
					pins.forEach(function(pin) {
						TEST_BIT_ONE(pin);
					});

					if (usedBank == 0) {
						// Clock LOW
						CLOCK_LOW();
					}

					// Apply the changes
					PREP_GPIO_FOR_SET(gpioBank);
					APPLY_GPIO_CHANGES();
				});


				QBNE(l_bit_loop, r_bit_num, 0);
			});

			// Clock pulse for final bit
			CLOCK_PULSE(5);

			// The RGB streams have been clocked out
			// Move to the next pixel on each row
			ADD(r_data_addr, r_data_addr, 48 * 4);
			DECREMENT(r_data_len);
			QBNE(l_word_loop, r_data_len, 0);
		});

		pruBlock(function() {
			var l_end_frame = "l_end_frame";
			emitLabel(l_end_frame);

			// Calculate end frame bits based on LED count (r29)
			// We want a multiple of 8 that is greater than or equal to
			// the number of channels / 2. We implement this expression: (((r29-1)>>4)+1)<<3
			MOV(r_bit_num, r_data_len2);          // r29
			SUB(r_bit_num, r_bit_num, 1); // - 1

			LSR(r_bit_num, r_bit_num, 4); // >> 4
			ADD(r_bit_num, r_bit_num, 1); // + 1

			LSL(r_bit_num, r_bit_num, 3); // << 3

			DATAS_HIGH();

			pruBlock(function() {
				var l_end_bit_loop = emitLabel("l_end_bit_loop");
				DECREMENT(r_bit_num);

				CLOCK_PULSE(5);

				QBNE(l_end_bit_loop, r_bit_num, 0);
			});

			DATAS_LOW();
		});


		// Write out that we are done!
		// Store a non-zero response in the buffer so that they know that we are done
		// aso a quick hack, we write the counter so that we know how
		// long it took to write out.
		MOV(r8, PRU_CONTROL_ADDRESS); // control register
		LBBO(r2, r8, 0xC, 4);
		SBCO(r2, CONST_PRUDRAM, 12, 4);

		// Go back to waiting for the next frame buffer
		QBA(l_main_loop);

		emitLabel(_exit);
		// Write a 0xFF into the response field so that they know we're done
		MOV(r2, 0xFF);
		SBCO(r2, CONST_PRUDRAM, 12, 4);

		emitInstr("RAISE_ARM_INTERRUPT");

		HALT();
	});

	return {
		pruCode: rawPruCode,
		usedPins: pruPins.concat([ clockPin ])
	}
};