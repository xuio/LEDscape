import * as fs from 'fs';
import {BasePruProgram} from "./common";
import {pinIndex} from "../bbbPinData";
import {BaseSetupPruProgram} from "./common";

export default class WS281xProgram extends BaseSetupPruProgram {
	private pruChannelCount;

	constructor(
		PRU_NUM: number,
		overallChannelCount: number
	) {
		super(PRU_NUM, overallChannelCount);
		this.pruChannelCount = Math.floor(overallChannelCount/2);
		pinIndex.applySingleDataPinMapping(this.pruChannelCount);
		console.error("Using " + this.pruChannelCount + " channels on PRU" + PRU_NUM);
	}

	protected fileHeader() {
		this.emitComment("//////////////////////////////////////////////////////////////////////////////////////////////////////");
		this.emitComment("WS281x Mapping for PRU" + this.PRU_NUM);
		this.emitComment("Overall Channels: " + this.overallChannelCount);
		this.emitComment("PRU Channels: " + this.pruChannelCount);
		this.emitComment("//////////////////////////////////////////////////////////////////////////////////////////////////////");
	}

	protected frameCode() {
		var g = this;

		// Bit timings from http://wp.josh.com/2014/05/13/ws2812-neopixels-are-not-so-finicky-once-you-get-to-know-them/
		var ZERO_PULSE_NS  = 180; // 200 - 350 - 500
		var ONE_PULSE_NS   = 500; // 550 - 700 - 5,500
		var INTERBIT_NS    = 400;   // 450 - 600 - 6,000
		var INTERFRAME_NS  = 6000;

		g.pruBlock(() => {
			var l_word_loop = g.emitLabel("l_word_loop");

			// Load all the data.
			g.LOAD_CHANNEL_DATA(g.pruPins[0], 0, this.pruChannelCount);

			// Store the data register in the unused bits of the data registers so it can be used for one of the
			// GPIO banks
			g.MOV(g.r_data0.b3, g.r_data_addr.b0);
			g.MOV(g.r_data1.b3, g.r_data_addr.b1);
			g.MOV(g.r_data2.b3, g.r_data_addr.b2);
			g.MOV(g.r_data3.b3, g.r_data_addr.b3);

			// for bit in 24 to 0
			g.emitComment("Loop over the 24 bits in a word");
			g.MOV(g.r_bit_num, 24);

			g.pruBlock(() => {
				var l_bit_loop = "l_bit_loop";
				g.emitLabel(l_bit_loop);
				g.DECREMENT(g.r_bit_num);

				g.r_bit_regs.forEach((reg) =>{
					g.MOV(reg, 0);
				});

				g.groupByBank(g.pruPins, (pins, gpioBank, usedBankIndex, usedBankCount) => {
					// Set mask bits for the ZERO bits
					pins.forEach((pin) => {
						g.TEST_BIT_ZERO(pin, g.r_bit_regs[gpioBank]);
					});
				});

				g.WAITNS_REL(ONE_PULSE_NS, "one_bits_wait");

				g.PINS_LOW(g.pruPins);

				g.WAITNS_REL(INTERBIT_NS, "interbit_wait");
				g.PINS_HIGH(g.pruPins);
				//g.SET(g.r_bit_regs[0], g.r_bit_regs[0], 26);

				g.WAITNS_REL(ZERO_PULSE_NS, "zero_bits_wait");
				g.groupByBank(g.pruPins, (pins, gpioBank, usedBankIndex, usedBankCount) => {
					g.PREP_GPIO_FOR_CLEAR(gpioBank);
					g.APPLY_GPIO_CHANGES(g.r_bit_regs[gpioBank]);
				});

				// Reset counter uses temp1, so we must do not while writing data
				g.RESET_COUNTER();

				g.QBNE(l_bit_loop, g.r_bit_num, 0);
			});


			// Restore the data pointers from the data registers.
			g.MOV(g.r_data_addr.b0, g.r_data0.b3);
			g.MOV(g.r_data_addr.b1, g.r_data1.b3);
			g.MOV(g.r_data_addr.b2, g.r_data2.b3);
			g.MOV(g.r_data_addr.b3, g.r_data3.b3);

			// The RGB streams have been clocked out
			// Move to the next pixel on each row
			g.ADD(g.r_data_addr, g.r_data_addr, 48 * 4);
			g.DECREMENT(g.r_data_len);
			g.QBNE(l_word_loop, g.r_data_len, 0);
		});

		g.WAITNS_REL(ONE_PULSE_NS, "one_bits_wait_end");
		g.PINS_LOW(g.pruPins);

		g.SLEEPNS(INTERFRAME_NS, "interframe_wait");
	}
}