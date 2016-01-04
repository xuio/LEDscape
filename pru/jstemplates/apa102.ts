import * as fs from 'fs';
import { BasePruProgram } from "./common";
import { pinIndex } from "../bbbPinData";
import {BbbPinInfo} from "../bbbPinData";
import {BaseSetupPruProgram} from "./common";

export default class Apa102InterlacedClock extends BaseSetupPruProgram {
	private overallPinCount: number;
	private pruPinCount: number;
	private pruChannelCount: number;

	private clockPins: BbbPinInfo[];
	private dataPins: BbbPinInfo[];

	constructor(
		PRU_NUM:number,
		overallChannelCount: number
	) {
		super(PRU_NUM, overallChannelCount = Math.min(24, overallChannelCount));

		this.overallPinCount = overallChannelCount * 2;
		this.pruPinCount = Math.floor(this.overallPinCount / 2);
		this.pruChannelCount = Math.floor(this.pruPinCount / 2);

		pinIndex.applyInterlacedClockPinMapping(this.pruPinCount);

		this.clockPins = pinIndex.pinsByPruAndPin[PRU_NUM]
			.filter(pin => pin.clockChannelIndex >= 0);

		this.dataPins = pinIndex.pinsByPruAndPin[PRU_NUM]
			.filter(pin => pin.dataChannelIndex >= 0);

		console.error("Using " + this.pruChannelCount + " channels on PRU" + PRU_NUM);
	}


	private DATAS_HIGH(pins?: BbbPinInfo[]) {
		this.PINS_HIGH(
			pins || this.dataPins,
			(
				pins ? "" : "All "
			) + "Data"
		);
	}

	private DATAS_LOW(pins?: BbbPinInfo[]) {
		this.PINS_LOW(
			pins || this.dataPins,
			(
				pins ? "" : "All "
			) + "Data"
		);
	}

	private CLOCKS_HIGH(pins?: BbbPinInfo[]) {
		this.PINS_HIGH(
			pins || this.clockPins,
			(pins ? "" : "All ") + "Clock"
		);
	}

	private CLOCKS_LOW(pins?: BbbPinInfo[]) {
		this.PINS_LOW(
			pins || this.clockPins,
			(pins ? "" : "All ") + "Clock"
		);
	}

	private CLOCKS_PULSE(pins?: BbbPinInfo[]) {
		this.PINS_HIGH_LOW(
			pins || this.clockPins,
			(pins ? "" : "All ") + "Clock"
		);
	}

	protected fileHeader() {
		this.emitComment("//////////////////////////////////////////////////////////////////////////////////////////////");
		this.emitComment("APA102 Interlaced Clock for PRU" + this.PRU_NUM);
		this.emitComment("Overall Pins Used: " + this.overallPinCount + " (" + this.overallChannelCount + " channels)");
		this.emitComment("PRU Pins Used: " + this.pruPinCount + " (" + this.pruChannelCount + " channels)");
		this.emitComment("//////////////////////////////////////////////////////////////////////////////////////////////");
	}

	protected frameCode() {
		var g = this;

		g.emitComment('store number of leds in r29');
		g.MOV(g.r_data_len2, g.r_data_len);

		g.DATAS_LOW();

		g.MOV(g.r_bit_num, 32);
		g.pruBlock(
			() => {
				g.emitComment('32 bits of 0');
				var l_start_bit_loop = "l_start_frame_32_zeros";
				g.emitLabel(l_start_bit_loop);
				g.emitInstr("DECREMENT", [g.r_bit_num]);

				g.CLOCKS_PULSE();

				g.QBNE(l_start_bit_loop, g.r_bit_num, 0);
			}
		);

		g.pruBlock(
			() => {
				var l_word_loop = g.emitLabel("l_start_word_8_ones");

				// first 8 bits will be 0xFF (global brightness always at maximum)
				g.MOV(g.r_bit_num, 7);

				// Raise Data
				g.DATAS_HIGH();

				g.pruBlock(
					() => {
						var l_header_bit_loop = g.emitLabel("l_header_bit_loop");
						g.DECREMENT(g.r_bit_num);

						g.CLOCKS_PULSE();

						g.QBNE(l_header_bit_loop, g.r_bit_num, 0);
					}
				);

				// Load all the data.
				g.LOAD_CHANNEL_DATA(g.dataPins[0], 0, g.pruChannelCount);

				// for bit in 24 to 0
				g.emitComment("Loop over the 24 bits in a word");
				g.MOV(g.r_bit_num, 24);

				g.pruBlock(
					() => {
						var l_bit_loop = "l_bit_loop";
						g.emitLabel(l_bit_loop);
						g.DECREMENT(g.r_bit_num);

						// Send the previous bits (starting with the last 1 bit for the 8-bit preamble)
						g.CLOCKS_HIGH();

						g.groupByBank(
							g.dataPins, (pins, gpioBank) => {
								// Bring all data low for this bank
								g.DATAS_LOW(pins);

								// Clear the mask
								g.RESET_GPIO_MASK();

								// Set mask bits for the high bits
								pins.forEach(
									(pin) => {
										g.TEST_BIT_ONE(pin);
									}
								);

								// Apply the changes
								g.PREP_GPIO_FOR_SET(gpioBank);
								g.APPLY_GPIO_CHANGES();
							}
						);

						// Clock LOW
						g.CLOCKS_LOW();

						g.QBNE(l_bit_loop, g.r_bit_num, 0);
					}
				);

				// Clock pulse for final bit
				g.CLOCKS_PULSE();

				// The RGB streams have been clocked out
				// Move to the next pixel on each row
				g.ADD(g.r_data_addr, g.r_data_addr, 48 * 4);
				g.DECREMENT(g.r_data_len);
				g.QBNE(l_word_loop, g.r_data_len, 0);
			}
		);

		g.pruBlock(
			() => {
				var l_end_frame = "l_end_frame";
				g.emitLabel(l_end_frame);

				// Calculate end frame bits based on LED count (r_data_len2)
				// We want a multiple of 8 that is greater than or equal to
				// the number of channels / 2. We implement this expression: (((r29-1)>>4)+1)<<3
				g.MOV(g.r_bit_num, g.r_data_len2); // r_data_len2
				g.SUB(g.r_bit_num, g.r_bit_num, 1); // - 1

				g.LSR(g.r_bit_num, g.r_bit_num, 4); // >> 4
				g.ADD(g.r_bit_num, g.r_bit_num, 1); // + 1

				g.LSL(g.r_bit_num, g.r_bit_num, 3); // << 3

				g.DATAS_HIGH();

				g.pruBlock(
					() => {
						var l_end_bit_loop = g.emitLabel("l_end_bit_loop");
						g.DECREMENT(g.r_bit_num);

						g.CLOCKS_PULSE();

						g.QBNE(l_end_bit_loop, g.r_bit_num, 0);
					}
				);

				g.DATAS_LOW();
			}
		);
	}
}