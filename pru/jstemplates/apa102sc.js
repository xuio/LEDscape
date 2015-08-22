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

	console.error("Using " + pruChannelCount + " channels on PRU" + PRU_NUM);

	// Pull in the common code.
	// TODO: Eval is dirty. Come up with a better way.
	eval(fs.readFileSync(baseDir + '/common.js').toString());

	function CLOCK_HIGH() {
		emitComment("Clocks High");

		MOV(r_gpio0_addr, "GPIO"+clockPin.gpioBank + " | GPIO_SETDATAOUT");
		MOV(r_gpio0_mask, (1 << clockPin.gpioBit));
		SBBO(r_gpio0_mask, "r_gpio0_addr", 0, 4);
	}
	function CLOCK_LOW() {
		emitComment("Clocks Low");

		MOV(r_gpio0_addr, "GPIO"+clockPin.gpioBank + " | GPIO_CLEARDATAOUT");
		MOV(r_gpio0_mask, (1 << clockPin.gpioBit));
		SBBO(r_gpio0_mask, "r_gpio0_addr", 0, 4);
	}
	function CLOCK_PULSE() {
		emitComment("Pulse Clock HIGH-LOW");

		MOV(r_gpio0_addr, "GPIO"+clockPin.gpioBank + " | GPIO_SETDATAOUT");
		MOV(r_gpio0_mask, (1 << clockPin.gpioBit));
		SBBO(r_gpio0_mask, "r_gpio0_addr", 0, 4);

		MOV(r_gpio0_addr, "GPIO"+clockPin.gpioBank + " | GPIO_CLEARDATAOUT");
		SBBO(r_gpio0_mask, "r_gpio0_addr", 0, 4);
	}
	function APPLY_DATA_MASKS() {
		PREP_GPIO_MASK_FOR_PINS(pruPins);
	}

	INIT_PRU();
	emitLabel("l_main_loop");

	emitInstr("RAISE_ARM_INTERRUPT");
	LBCO(r_data_addr, CONST_PRUDRAM, 0, 12);

	var _exit = "EXIT";

	// Wait for the start condition from the main program to indicate
	// that we have a rendered frame ready to clock out.  This also
	// handles the exit case if an invalid value is written to the start
	// start position.
	var l_main_loop = emitLabel("main_loop");

	// Let ledscape know that we're starting the loop again. It waits for this
	// interrupt before sending another frame
	emitInstr("RAISE_ARM_INTERRUPT");

	// Load the pointer to the buffer from PRU DRAM into r0 and the
	// length (in bytes-bit words) into r1.
	// start command into r2
	LBCO(r_data_addr, CONST_PRUDRAM, 0, 12);

	// Wait for a non-zero command
	QBEQ(l_main_loop, r2, 0);

	// Reset the sleep timer
	emitInstr("RESET_COUNTER");

	// Zero out the start command so that they know we have received it
	// This allows maximum speed frame drawing since they know that they
	// can now swap the frame buffer pointer and write a new start command.
	MOV(r3, 0);
	SBCO(r3, CONST_PRUDRAM, 8, 4);

	// Command of 0xFF is the signal to exit
	QBEQ(_exit, r2, 0xFF);

	// send the start frame
	{
		var l_start_frame = "l_start_frame";
		emitLabel(l_start_frame);
		MOV(r_bit_num, 32);

		// store number of leds in r29
		MOV(r29, r_data_len);

		RESET_GPIO_ONES();

		// Lower data
		PREP_GPIO_ADDRS_FOR_CLEAR();
		APPLY_DATA_MASKS();
		GPIO_APPLY_MASK_TO_ADDR();


		{ // 32 bits of 0
			var l_start_bit_loop = "l_start_frame_32_zeros";
			emitLabel(l_start_bit_loop);
			emitInstr("DECREMENT", [r_bit_num]);

			// Clocks HIGH
			CLOCK_HIGH();
			CLOCK_LOW();

			QBNE(l_start_bit_loop, r_bit_num, 0);
		}

		{
			var l_word_loop = emitLabel("l_start_word_8_ones");

			// first 8 bits will be 0xFF (global brightness always at maximum)
			MOV(r_bit_num, 7);

			RESET_GPIO_ONES();

			// Raise Data
			PREP_GPIO_ADDRS_FOR_SET();
			APPLY_DATA_MASKS();
			GPIO_APPLY_MASK_TO_ADDR();

			{
				var l_header_bit_loop = emitLabel("l_header_bit_loop");
				DECREMENT(r_bit_num);

				CLOCK_HIGH();
				CLOCK_LOW();

				QBNE(l_header_bit_loop, r_bit_num, 0);
			}

			// for bit in 24 to 0
			emitComment("Loop over the 24 bits in a word");
			MOV(r_bit_num, 24);

			{
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
				PREP_GPIO_ADDRS_FOR_CLEAR();
				APPLY_DATA_MASKS();
				GPIO_APPLY_MASK_TO_ADDR();

				// Data 1s HIGH
				PREP_GPIO_ADDRS_FOR_SET();
				GPIO_APPLY_ONES_TO_ADDR();

				// Clock LOW
				CLOCK_LOW();

				// Bits sent
				///////////////////////////////////////////////////////////////////////

				QBNE(l_bit_loop, r_bit_num, 0);
			}

			// Clock pulse for final bit
			CLOCK_HIGH();
			CLOCK_LOW();

			// The RGB streams have been clocked out
			// Move to the next pixel on each row
			ADD(r_data_addr, r_data_addr, 48 * 4);
			DECREMENT(r_data_len);
			QBNE(l_word_loop, r_data_len, 0);
		}

		{
			var l_end_frame = "l_end_frame";
			emitLabel(l_end_frame);

			// send end frame bits
			MOV(r_bit_num, r29);
			LSR(r_bit_num, r_bit_num, 1);
			ADD(r_bit_num, r_bit_num, 1);

			RESET_GPIO_ONES();
			// numleds / 2 bits of 1

			// raise data
			PREP_GPIO_ADDRS_FOR_SET();
			APPLY_DATA_MASKS();
			GPIO_APPLY_MASK_TO_ADDR();

			{
				var l_end_bit_loop = emitLabel("l_end_bit_loop");
				DECREMENT(r_bit_num);

				CLOCK_HIGH();
				CLOCK_LOW();

				QBNE(l_end_bit_loop, r_bit_num, 0);
			}

			PREP_GPIO_ADDRS_FOR_CLEAR();
			APPLY_DATA_MASKS();
			GPIO_APPLY_MASK_TO_ADDR();
		}


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

		return {
			pruCode: rawPruCode,
			usedPins: pruPins.concat([ clockPin ])
		}
	}
};