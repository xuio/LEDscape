var fs = require('fs');

module.exports = function(
	baseDir,
	PRU_NUM,
	overallChannelCount
) {
	var rawPruCode = "";
	var pruChannelCount = Math.floor(overallChannelCount/2);

	// Split the pins to use between the PRUs, with no need for clocks
	applySingleDataPinMapping(pruChannelCount);

	// Pull in the common code.
	eval(fs.readFileSync(baseDir + '/common.js').toString());

	console.error("Using " + pruChannelCount + " channels on PRU" + PRU_NUM);

	emitComment("//////////////////////////////////////////////////////////////////////////////////////////////////////");
	emitComment("WS281x Mapping for PRU" + PRU_NUM);
	emitComment("Overall Channels: " + overallChannelCount);
	emitComment("PRU Channels: " + pruChannelCount);
	emitComment("//////////////////////////////////////////////////////////////////////////////////////////////////////");

	INIT_PRU();
	RESET_COUNTER();

	var _exit = "EXIT";

	emitComment("Wait for the start condition from the main program to indicate");
	emitComment("that we have a rendered frame ready to clock out.  This also");
	emitComment("handles the exit case if an invalid value is written to the start");
	emitComment("start position.");
	var l_main_loop = emitLabel("main_loop");
	SLEEPNS(7000, "frame_break");

	emitComment("Let ledscape know that we're starting the loop again. It waits for this");
	emitComment("interrupt before sending another frame");
	RAISE_ARM_INTERRUPT();

	emitComment("Load the pointer to the buffer from PRU DRAM into r0 and the");
	emitComment("length (in bytes-bit words) into r1.");
	emitComment("start command into r2");
	LBCO(r_data_addr, CONST_PRUDRAM, 0, 12);

	emitComment("Wait for a non-zero command");
	QBEQ(l_main_loop, r2, 0);

	emitComment("Zero out the start command so that they know we have received it");
	emitComment("This allows maximum speed frame drawing since they know that they");
	emitComment("can now swap the frame buffer pointer and write a new start command.");
	MOV(r3, 0);
	SBCO(r3, CONST_PRUDRAM, 8, 4);

	emitComment("Command of 0xFF is the signal to exit");
	QBEQ(_exit, r2, 0xFF);

	emitComment("Reset the sleep timer");

	RESET_COUNTER();

	pruBlock(function() {
		var l_word_loop = emitLabel("l_word_loop");

		// Load all the data.
		LOAD_CHANNEL_DATA(pruPins[0], 0, pruChannelCount);

		// for bit in 24 to 0
		emitComment("Loop over the 24 bits in a word");
		MOV(r_bit_num, 24);

		// Bit timings from http://wp.josh.com/2014/05/13/ws2812-neopixels-are-not-so-finicky-once-you-get-to-know-them/
		var ZERO_PULSE_NS	=	200; // 200 - 350 - 500
		var ONE_PULSE_NS	=	500; // 550 - 700 - 5,500
		var INTERBIT_NS	= 400;   // 450 - 600 - 6,000
		var INTERFRAME_NS = 6000;

		pruBlock(function() {
			var l_bit_loop = "l_bit_loop";
			emitLabel(l_bit_loop);
			DECREMENT(r_bit_num);

			WAITNS(ZERO_PULSE_NS + ONE_PULSE_NS + INTERBIT_NS, "interbit_wait");

			// Reset the counter
			RESET_COUNTER();
			r_bit_regs.forEach(function(reg){
				MOV(reg, 0);
			});
			PINS_HIGH(pruPins);

			groupByBank(pruPins, function(pins, gpioBank, usedBankIndex, usedBankCount) {
				// Load the timer and decide when we need to lower
				//MOV(r_temp_addr, PRU_CONTROL_ADDRESS);
				//LBBO(r_temp2, r_temp_addr, 0xC, 4);
				//ADD(r_temp2, r_temp2, ZERO_PULSE_NS / 5);

				// Bring all pins high for this bank


				// Clear the mask
				// RESET_GPIO_MASK();

				// Set mask bits for the ZERO bits
				pins.forEach(function(pin) {
					TEST_BIT_ZERO(pin, r_bit_regs[gpioBank]);
				});

				// Wait for lower
				//var wait_loop = emitLabel("bank" + gpioBank + "_zero_wait_loop");
				//MOV(r_temp_addr, PRU_CONTROL_ADDRESS);
				//LBBO(r_temp_addr, r_temp_addr, 0xC, 4);
				//QBGT(wait_loop, r_temp_addr, r_temp2);
				//
				//// Apply the changes
				//PREP_GPIO_FOR_CLEAR(gpioBank);
				//APPLY_GPIO_CHANGES();

			});

			WAITNS(ZERO_PULSE_NS, "zero_bits_wait");
			groupByBank(pruPins, function(pins, gpioBank, usedBankIndex, usedBankCount) {
				PREP_GPIO_FOR_CLEAR(gpioBank);
				APPLY_GPIO_CHANGES(r_bit_regs[gpioBank]);
			});

			WAITNS(ZERO_PULSE_NS+ONE_PULSE_NS, "one_bits_wait");
			//SLEEPNS(ONE_PULSE_NS, "one_bits_wait");
			PINS_LOW(pruPins);

			QBNE(l_bit_loop, r_bit_num, 0);
		});

		// The RGB streams have been clocked out
		// Move to the next pixel on each row
		ADD(r_data_addr, r_data_addr, 48 * 4);
		DECREMENT(r_data_len);
		QBNE(l_word_loop, r_data_len, 0);
	});

	// Write out that we are done!
	// Store a non-zero response in the buffer so that they know that we are done
	// aso a quick hack, we write the counter so that we know how
	// long it took to write out.
	MOV(r8, PRU_CONTROL_ADDRESS); // control register
	LBBO(r2, r8, 0xC, 4);
	SBCO(r2, CONST_PRUDRAM, 12, 4);

	// Go back to waiting for the next frame buffer
	RESET_COUNTER();
	QBA(l_main_loop);

	emitLabel(_exit);
	// Write a 0xFF into the response field so that they know we're done
	MOV(r2, 0xFF);
	SBCO(r2, CONST_PRUDRAM, 12, 4);

	RAISE_ARM_INTERRUPT();
	HALT();

	return {
		pruCode: rawPruCode,
		usedPins: pruPins
	}
};