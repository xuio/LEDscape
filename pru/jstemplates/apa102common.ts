import * as fs from 'fs';
import { BasePruProgram } from "./common";
import { pinIndex } from "../bbbPinData";

export default class Apa102 extends BasePruProgram {
	constructor(
		PRU_NUM: number,
		overallChannelCount: number
	) {
		super(PRU_NUM);

		var clockPin = pinIndex.pinsBySpecialName["clock" + PRU_NUM];
		if (! clockPin) throw new Error("Cannot determine clock pin for " + PRU_NUM);

		var pruChannelCount = Math.ceil(overallChannelCount/2);

		// Split the used pins between the PRUs, because we have a shared clock line.
		pinIndex.applyPerPruClockMapping(pruChannelCount);

		var pruPins = pinIndex.pinsByPruAndPin[PRU_NUM];

		if (pruPins.length != pruChannelCount) {
			throw new Error(`Internal Error: Invalid PRU Pin Assignment: Expected ${pruChannelCount} pins for PRU ${PRU_NUM}; Found ${pruPins.length}.`);
		}

		console.error("Using " + pruChannelCount + " channels on PRU" + PRU_NUM);

		var g = this;

		g.emitComment("//////////////////////////////////////////////////////////////////////////////////////////////");
		g.emitComment("APA102 Shared Clock for PRU" + PRU_NUM);
		g.emitComment("Overall Channels: " + overallChannelCount);
		g.emitComment("PRU Channels: " + pruChannelCount);
		g.emitComment("Clock Pin: " + clockPin.name);
		g.emitComment("//////////////////////////////////////////////////////////////////////////////////////////////");

		function DATAS_HIGH(pins = null) {
			g.pruBlock(
				pins ? 'Bank ' + pins[0].gpioBank + ' Data Lines HIGH'
					: 'All Data Lines HIGH',
				() => {
					g.groupByBank(pins || pruPins, function(pins, gpioBank){
						g.PREP_GPIO_FOR_SET(gpioBank);
						g.PREP_GPIO_MASK_FOR_PINS(pins);
						g.APPLY_GPIO_CHANGES();
					});
				}
			);
		}

		function DATAS_LOW(pins = null) {
			g.pruBlock(
				pins ? 'Bank ' + pins[0].gpioBank + ' Data Lines LOW'
					: 'All Data Lines LOW',
				() => {
					g.groupByBank(pins || pruPins, function (pins, gpioBank) {
						g.PREP_GPIO_FOR_CLEAR(gpioBank);
						g.PREP_GPIO_MASK_FOR_PINS(pins);
						g.APPLY_GPIO_CHANGES();
					});
				}
			);
		}

		function CLOCK_HIGH() {
			g.pruBlock(
				"Bring Clock High",
				() => {
					g.PREP_GPIO_FOR_SET(clockPin.gpioBank);
					g.PREP_GPIO_MASK_FOR_PINS([clockPin]);
					g.APPLY_GPIO_CHANGES();
				}
			);
		}

		function CLOCK_LOW() {
			g.pruBlock(
				"Bring Clock Low",
				() => {
					g.PREP_GPIO_FOR_CLEAR(clockPin.gpioBank);
					g.PREP_GPIO_MASK_FOR_PINS([clockPin]);
					g.APPLY_GPIO_CHANGES();
				}
			);
		}

		function CLOCK_PULSE(delay = 0) {
			g.pruBlock(
				"Pulse Clock HIGH-LOW",
				() => {
					var reps = Math.ceil(delay/2) || 1;

					g.PREP_GPIO_FOR_SET(clockPin.gpioBank);
					g.PREP_GPIO_MASK_FOR_PINS([clockPin]);
					for (var i=0; i<reps; i++) {
						g.APPLY_GPIO_CHANGES();
					}

					g.PREP_GPIO_FOR_CLEAR(clockPin.gpioBank);
					for (var i=0; i<reps; i++) {
						g.APPLY_GPIO_CHANGES();
					}
				}
			);
		}


		g.INIT_PRU();
		g.emitLabel("l_main_loop");

		g.RAISE_ARM_INTERRUPT();
		g.LBCO(g.r_data_addr, g.CONST_PRUDRAM, 0, 12);

		var _exit = "EXIT";

		g.emitComment("Wait for the start condition from the main program to indicate");
		g.emitComment("that we have a rendered frame ready to clock out.  This also");
		g.emitComment("handles the exit case if an invalid value is written to the start");
		g.emitComment("start position.");
		var l_main_loop = g.emitLabel("main_loop");

		g.emitComment("Let ledscape know that we're starting the loop again. It waits for this");
		g.emitComment("interrupt before sending another frame");
		g.RAISE_ARM_INTERRUPT();

		g.emitComment("Load the pointer to the buffer from PRU DRAM into r0 and the");
		g.emitComment("length (in bytes-bit words) into r1.");
		g.emitComment("start command into r2");
		g.LBCO(g.r_data_addr, g.CONST_PRUDRAM, 0, 12);

		g.emitComment("Wait for a non-zero command");
		g.QBEQ(l_main_loop, g.r2, 0);

		g.emitComment("Reset the sleep timer");
		g.RESET_COUNTER();

		g.emitComment("Zero out the start command so that they know we have received it");
		g.emitComment("This allows maximum speed frame drawing since they know that they");
		g.emitComment("can now swap the frame buffer pointer and write a new start command.");
		g.MOV(g.r3, 0);
		g.SBCO(g.r3, g.CONST_PRUDRAM, 8, 4);

		g.emitComment("Command of 0xFF is the signal to exit");
		g.QBEQ(_exit, g.r2, 0xFF);


		g.emitComment("send the start frame");

		var l_start_frame = "l_start_frame";
		g.emitLabel(l_start_frame);

		g.emitComment('store number of leds in r29');
		g.MOV(g.r_data_len2, g.r_data_len);

		DATAS_LOW();

		g.MOV(g.r_bit_num, 32);
		g.pruBlock('32 bits of 0', function() {
			var l_start_bit_loop = "l_start_frame_32_zeros";
			g.emitLabel(l_start_bit_loop);

			CLOCK_PULSE(5);

			g.DECREMENT(g.r_bit_num);
			g.QBNE(l_start_bit_loop, g.r_bit_num, 0);
		});

		g.pruBlock(function() {
			var l_word_loop = g.emitLabel("l_start_word_8_ones");

			// first 8 bits will be 0xFF (global brightness always at maximum)
			g.MOV(g.r_bit_num, 7);

			// Raise Data
			DATAS_HIGH();

			g.pruBlock(function() {
				var l_header_bit_loop = g.emitLabel("l_header_bit_loop");
				g.DECREMENT(g.r_bit_num);

				CLOCK_PULSE(5);

				g.QBNE(l_header_bit_loop, g.r_bit_num, 0);
			});

			// Load all the data.
			g.LOAD_CHANNEL_DATA(pruPins[0], 0, pruChannelCount);

			// for bit in 24 to 0
			g.emitComment("Loop over the 24 bits in a word");
			g.MOV(g.r_bit_num, 24);

			g.pruBlock(function() {
				var l_bit_loop = "l_bit_loop";
				g.emitLabel(l_bit_loop);
				g.DECREMENT(g.r_bit_num);

				// Send the previous bits (including the last 1 bit for the 8-bit preamble)
				CLOCK_HIGH();

				g.groupByBank(pruPins, function(pins, gpioBank, usedBank) {
					// Bring all data low for this bank
					DATAS_LOW(pins);

					// Clear the mask
					g.RESET_GPIO_MASK();

					// Set mask bits for the high bits
					pins.forEach(function(pin) {
						g.TEST_BIT_ONE(pin);
					});

					if (usedBank == 0) {
						// Clock LOW
						CLOCK_LOW();
					}

					// Apply the changes
					g.PREP_GPIO_FOR_SET(gpioBank);
					g.APPLY_GPIO_CHANGES();
				});


				g.QBNE(l_bit_loop, g.r_bit_num, 0);
			});

			// Clock pulse for final bit
			CLOCK_PULSE(5);

			// The RGB streams have been clocked out
			// Move to the next pixel on each row
			g.ADD(g.r_data_addr, g.r_data_addr, 48 * 4);
			g.DECREMENT(g.r_data_len);
			g.QBNE(l_word_loop, g.r_data_len, 0);
		});

		g.pruBlock(function() {
			var l_end_frame = "l_end_frame";
			g.emitLabel(l_end_frame);

			// Calculate end frame bits based on LED count (r29)
			// We want a multiple of 8 that is greater than or equal to
			// the number of channels / 2. We implement this expression: (((r29-1)>>4)+1)<<3
			g.MOV(g.r_bit_num, g.r_data_len2);          // r29
			g.SUB(g.r_bit_num, g.r_bit_num, 1); // - 1

			g.LSR(g.r_bit_num, g.r_bit_num, 4); // >> 4
			g.ADD(g.r_bit_num, g.r_bit_num, 1); // + 1

			g.LSL(g.r_bit_num, g.r_bit_num, 3); // << 3

			DATAS_HIGH();

			g.pruBlock(function() {
				var l_end_bit_loop = g.emitLabel("l_end_bit_loop");
				g.DECREMENT(g.r_bit_num);

				CLOCK_PULSE(5);

				g.QBNE(l_end_bit_loop, g.r_bit_num, 0);
			});

			DATAS_LOW();
		});


		// Write out that we are done!
		// Store a non-zero response in the buffer so that they know that we are done
		// aso a quick hack, we write the counter so that we know how
		// long it took to write out.
		g.MOV(g.r8, g.PRU_CONTROL_ADDRESS); // control register
		g.LBBO(g.r2, g.r8, 0xC, 4);
		g.SBCO(g.r2, g.CONST_PRUDRAM, 12, 4);

		// Go back to waiting for the next frame buffer
		g.QBA(l_main_loop);

		g.emitLabel(_exit);
		// Write a 0xFF into the response field so that they know we're done
		g.MOV(g.r2, 0xFF);
		g.SBCO(g.r2, g.CONST_PRUDRAM, 12, 4);

		g.RAISE_ARM_INTERRUPT();

		g.HALT();
	}
}