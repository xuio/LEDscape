import * as fs from 'fs';
import { BasePruProgram } from "./common";
import { pinIndex } from "../bbbPinData";
import { BaseSetupPruProgram } from "./common";
import {BbbPinInfo} from "../bbbPinData";

export default class Apa102SharedClock extends BaseSetupPruProgram {
	private pruChannelCount: number;
	private clockPin: BbbPinInfo;

	constructor(
		PRU_NUM: number,
		overallChannelCount: number
	) {
		super(PRU_NUM, overallChannelCount);

		this.clockPin = pinIndex.pinsBySpecialName["clock" + PRU_NUM];
		if (! this.clockPin) throw new Error("Cannot determine clock pin for " + PRU_NUM);

		this.pruChannelCount = Math.ceil(overallChannelCount/2);

		// Split the used pins between the PRUs, because we have a shared clock line.
		pinIndex.applyPerPruClockMapping(this.pruChannelCount);

		if (this.pruPins.length != this.pruChannelCount) {
			throw new Error(`Internal Error: Invalid PRU Pin Assignment: Expected ${this.pruChannelCount} pins for PRU ${PRU_NUM}; Found ${this.pruPins.length}.`);
		}

		console.error("Using " + this.pruChannelCount + " channels on PRU" + PRU_NUM);
	}

	protected fileHeader() {
		this.emitComment("//////////////////////////////////////////////////////////////////////////////////////////////");
		this.emitComment("APA102 Shared Clock for PRU" + this.PRU_NUM);
		this.emitComment("Overall Channels: " + this.overallChannelCount);
		this.emitComment("PRU Channels: " + this.pruChannelCount);
		this.emitComment("Clock Pin: " + this.clockPin.name);
		this.emitComment("//////////////////////////////////////////////////////////////////////////////////////////////");
	}

	protected frameCode() {
		var g = this;

		var l_start_frame = "l_start_frame";
		g.emitLabel(l_start_frame);

		g.emitComment('store number of leds in r29');
		g.MOV(g.r_data_len2, g.r_data_len);

		g.DATAS_LOW();

		g.MOV(g.r_bit_num, 32);
		g.pruBlock('32 bits of 0', () => {
			var l_start_bit_loop = "l_start_frame_32_zeros";
			g.emitLabel(l_start_bit_loop);

			g.CLOCK_PULSE(5);

			g.DECREMENT(g.r_bit_num);
			g.QBNE(l_start_bit_loop, g.r_bit_num, 0);
		});

		g.pruBlock(() => {
			var l_word_loop = g.emitLabel("l_start_word_8_ones");

			// first 8 bits will be 0xFF (global brightness always at maximum)
			g.MOV(g.r_bit_num, 7);

			// Raise Data
			g.DATAS_HIGH();

			g.pruBlock(() => {
				var l_header_bit_loop = g.emitLabel("l_header_bit_loop");
				g.DECREMENT(g.r_bit_num);

				g.CLOCK_PULSE(5);

				g.QBNE(l_header_bit_loop, g.r_bit_num, 0);
			});

			// Load all the data.
			g.LOAD_CHANNEL_DATA(g.pruPins[0], 0, g.pruChannelCount);

			// for bit in 24 to 0
			g.emitComment("Loop over the 24 bits in a word");
			g.MOV(g.r_bit_num, 24);

			g.pruBlock(() => {
				var l_bit_loop = "l_bit_loop";
				g.emitLabel(l_bit_loop);
				g.DECREMENT(g.r_bit_num);

				// Send the previous bits (including the last 1 bit for the 8-bit preamble)
				this.CLOCK_HIGH();

				g.groupByBank(g.pruPins, (pins, gpioBank, usedBank) => {
					// Bring all data low for this bank
					this.DATAS_LOW(pins);

					// Clear the mask
					g.RESET_GPIO_MASK();

					// Set mask bits for the high bits
					pins.forEach((pin) => {
						g.TEST_BIT_ONE(pin);
					});

					// Apply the changes
					g.PREP_GPIO_FOR_SET(gpioBank);
					g.APPLY_GPIO_CHANGES();

					if (usedBank == 0) {
						// Clock LOW, AFTER we set the data... this dirties the temp reg.
						this.CLOCK_LOW();
					}
				});


				g.QBNE(l_bit_loop, g.r_bit_num, 0);
			});

			// Clock pulse for final bit
			g.CLOCK_PULSE(5);

			// The RGB streams have been clocked out
			// Move to the next pixel on each row
			g.ADD(g.r_data_addr, g.r_data_addr, 48 * 4);
			g.DECREMENT(g.r_data_len);
			g.QBNE(l_word_loop, g.r_data_len, 0);
		});

		g.pruBlock(() => {
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

			this.DATAS_HIGH();

			g.pruBlock(() => {
				var l_end_bit_loop = g.emitLabel("l_end_bit_loop");
				g.DECREMENT(g.r_bit_num);

				g.CLOCK_PULSE(5);

				g.QBNE(l_end_bit_loop, g.r_bit_num, 0);
			});

			this.DATAS_LOW();
		});
	}

	private DATAS_HIGH(pins = null) {
		this.pruBlock(
			pins ? 'Bank ' + pins[0].gpioBank + ' Data Lines HIGH'
				: 'All Data Lines HIGH',
			() => {
				this.groupByBank(pins || this.pruPins, (pins, gpioBank) =>{
					this.PREP_GPIO_FOR_SET(gpioBank);
					this.PREP_GPIO_MASK_FOR_PINS(pins);
					this.APPLY_GPIO_CHANGES();
				});
			}
		);
	}

	private DATAS_LOW(pins = null) {
		this.pruBlock(
			pins ? 'Bank ' + pins[0].gpioBank + ' Data Lines LOW'
				: 'All Data Lines LOW',
			() => {
				this.groupByBank(pins || this.pruPins, (pins, gpioBank) => {
					this.PREP_GPIO_FOR_CLEAR(gpioBank);
					this.PREP_GPIO_MASK_FOR_PINS(pins);
					this.APPLY_GPIO_CHANGES();
				});
			}
		);
	}

	private CLOCK_HIGH() {
		this.pruBlock(
			"Bring Clock High",
			() => {
				this.PREP_GPIO_FOR_SET(this.clockPin.gpioBank);
				this.PREP_GPIO_MASK_FOR_PINS([this.clockPin]);
				this.APPLY_GPIO_CHANGES();
			}
		);
	}

	private CLOCK_LOW() {
		this.pruBlock(
			"Bring Clock Low",
			() => {
				this.PREP_GPIO_FOR_CLEAR(this.clockPin.gpioBank);
				this.PREP_GPIO_MASK_FOR_PINS([this.clockPin]);
				this.APPLY_GPIO_CHANGES();
			}
		);
	}

	private CLOCK_PULSE(delay = 0) {
		this.pruBlock(
			"Pulse Clock HIGH-LOW",
			() => {
				var reps = Math.ceil(delay/2) || 1;

				this.PREP_GPIO_FOR_SET(this.clockPin.gpioBank);
				this.PREP_GPIO_MASK_FOR_PINS([this.clockPin]);
				for (var i=0; i<reps; i++) {
					this.APPLY_GPIO_CHANGES();
				}

				this.PREP_GPIO_FOR_CLEAR(this.clockPin.gpioBank);
				for (var i=0; i<reps; i++) {
					this.APPLY_GPIO_CHANGES();
				}
			}
		);
	}
}