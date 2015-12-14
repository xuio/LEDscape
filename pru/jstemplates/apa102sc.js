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
	var pruPins = global.pinsByPruNum[PRU_NUM].filter(function(_,i){ return i < pruChannelCount; });

	// Pull in the common code.
	// TODO: Eval is dirty. Come up with a better way.
	eval(fs.readFileSync(baseDir + '/common.js').toString());

	console.error("Using " + pruChannelCount + " channels on PRU" + PRU_NUM);

	emitComment("//////////////////////////////////////////////////////////////////////////////////////////////////////");
	emitComment("APA102 Shared Clock for PRU" + PRU_NUM);
	emitComment("Overall Channels: " + overallChannelCount);
	emitComment("PRU Channels: " + pruChannelCount);
	emitComment("Clock Pin: " + clockPin.name);
	emitComment("//////////////////////////////////////////////////////////////////////////////////////////////////////");

	function DATAS_HIGH() {
		emitComment('All Data Lines HIGH');
		PREP_GPIO_ADDRS_FOR_SET();
		APPLY_DATA_MASKS();
		GPIO_APPLY_MASK_TO_ADDR();
	}

	function DATAS_LOW() {
		emitComment('All Data Lines LOW');
		PREP_GPIO_ADDRS_FOR_CLEAR();
		APPLY_DATA_MASKS();
		GPIO_APPLY_MASK_TO_ADDR();
	}

	function CLOCK_HIGH() {
		emitComment("Bring Clock High");

		MOV(r_gpio0_addr, "GPIO"+clockPin.gpioBank + " | GPIO_SETDATAOUT");
		MOV(r_gpio0_mask, (1 << clockPin.gpioBit));
		SBBO(r_gpio0_mask, r_gpio0_addr, 0, 4);
	}
	function CLOCK_LOW() {
		emitComment("Bring Clock Low");

		MOV(r_gpio0_addr, "GPIO"+clockPin.gpioBank + " | GPIO_CLEARDATAOUT");
		MOV(r_gpio0_mask, (1 << clockPin.gpioBit));
		SBBO(r_gpio0_mask, r_gpio0_addr, 0, 4);
	}
	function CLOCK_PULSE() {
		emitComment("Pulse Clock HIGH-LOW");

		MOV(r_gpio0_addr, "GPIO"+clockPin.gpioBank + " | GPIO_SETDATAOUT");
		MOV(r_gpio0_mask, (1 << clockPin.gpioBit));
		SBBO(r_gpio0_mask, r_gpio0_addr, 0, 4);

		MOV(r_gpio0_addr, "GPIO"+clockPin.gpioBank + " | GPIO_CLEARDATAOUT");
		SBBO(r_gpio0_mask, r_gpio0_addr, 0, 4);
	}
	function APPLY_DATA_MASKS() {
		PREP_GPIO_MASK_FOR_PINS(pruPins);
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
		MOV(r29, r_data_len);

		RESET_GPIO_ONES();

		emitComment('Lower data');
		PREP_GPIO_ADDRS_FOR_CLEAR();
		APPLY_DATA_MASKS();
		GPIO_APPLY_MASK_TO_ADDR();


		pruBlock(function() {
			emitComment('32 bits of 0');
			var l_start_bit_loop = "l_start_frame_32_zeros";
			emitLabel(l_start_bit_loop);
			emitInstr("DECREMENT", [r_bit_num]);

			CLOCK_PULSE();

			QBNE(l_start_bit_loop, r_bit_num, 0);
		});

		pruBlock(function() {
			var l_word_loop = emitLabel("l_start_word_8_ones");

			// first 8 bits will be 0xFF (global brightness always at maximum)
			MOV(r_bit_num, 7);

			RESET_GPIO_ONES();

			// Raise Data
			DATAS_HIGH();

			pruBlock(function() {
				var l_header_bit_loop = emitLabel("l_header_bit_loop");
				DECREMENT(r_bit_num);

				CLOCK_PULSE();

				QBNE(l_header_bit_loop, r_bit_num, 0);
			});

			// for bit in 24 to 0
			emitComment("Loop over the 24 bits in a word");
			MOV(r_bit_num, 24);

			pruBlock(function() {
				var l_bit_loop = "l_bit_loop";
				emitLabel(l_bit_loop);
				DECREMENT(r_bit_num);

				// Zero out the registers
				RESET_GPIO_ONES();

				///////////////////////////////////////////////////////////////////////
				// Load data and test bits

				TEST_BITS_ONE(pruChannelCount);

				// Data loaded
				///////////////////////////////////////////////////////////////////////

				///////////////////////////////////////////////////////////////////////
				// Send the bits

				// Clock HIGH
				CLOCK_HIGH();

				// set all data LOW
				DATAS_LOW();

				// Data 1s HIGH
				PREP_GPIO_ADDRS_FOR_SET();
				GPIO_APPLY_ONES_TO_ADDR();

				// Clock LOW
				CLOCK_LOW();

				// Bits sent
				///////////////////////////////////////////////////////////////////////

				QBNE(l_bit_loop, r_bit_num, 0);
			});

			// Clock pulse for final bit
			CLOCK_PULSE();

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
			MOV(r_bit_num, r29);          // r29
			SUB(r_bit_num, r_bit_num, 1); // - 1

			LSR(r_bit_num, r_bit_num, 4); // >> 4
			ADD(r_bit_num, r_bit_num, 1); // + 1

			LSL(r_bit_num, r_bit_num, 3); // << 3

			RESET_GPIO_ONES();
			DATAS_HIGH();

			pruBlock(function() {
				var l_end_bit_loop = emitLabel("l_end_bit_loop");
				DECREMENT(r_bit_num);

				CLOCK_PULSE();

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