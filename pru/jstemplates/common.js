if (typeof PRU_NUM === "undefined") throw new Error("PRU_NUM must be defined");
if (typeof pruPins === "undefined") throw new Error("pruPins must be defined");

var rawPruCode = "";

function emitLine(s) { rawPruCode += (s === undefined ? "" : s) + "\n"; };
var labelCounter = 0;
function emitLabel(s, skipNewLine) {
	if (!s) {
		s = "_label_" + (++labelCounter);
	}
	if (! skipNewLine) {
		emitLine();
	}
	emitLine(s + ":");
	return s;
}


// Generic instructions
function emitInstr(name, args) {
	var s = name;
	if (args) {
		for (var i = 0; i < args.length; i++) {
			if (i > 0) s+= ", ";
			else s += " ";
			if (isNaN(args[i])) {
				s += args[i];
			} else {
				s += toNumericLiteral(args[i]);
			}
		}
	}
	s += ";";
	emitLine(s);
}

function emitComment(s) {
	emitLine();
	emitLine("// " + s);
}

function toNumericLiteral(n) {
	n = parseInt(n);
	if (n < 65536) {
		return n + "";
	} else {
		return toHexLiteral(n);
	}
}

function toHexLiteral(n) {
	if (n < 0) {
		n = 0xFFFFFFFF + n + 1;
	}
	var s =  n.toString(16).toUpperCase();
	while (s.length % 2 != 0) {
		s = "0" + s;
	}
	return "0x" + s;
}

function ADC()  { emitInstr("ADC", arguments);  }
function ADD()  { emitInstr("ADD", arguments);  }
function SUB()  { emitInstr("SUB", arguments);  }
function SUC()  { emitInstr("SUC", arguments);  }
function RSB()  { emitInstr("RSB", arguments);  }
function RSC()  { emitInstr("RSC", arguments);  }
function LSL()  { emitInstr("LSL", arguments);  }
function LSR()  { emitInstr("LSR", arguments);  }
function AND()  { emitInstr("AND", arguments);  }
function OR()   { emitInstr("OR", arguments);   }
function XOR()  { emitInstr("XOR", arguments);  }
function NOT()  { emitInstr("NOT", arguments);  }
function MIN()  { emitInstr("MIN", arguments);  }
function MAX()  { emitInstr("MAX", arguments);  }
function CLR()  { emitInstr("CLR", arguments);  }
function SET()  { emitInstr("SET", arguments);  }
function SCAN() { emitInstr("SCAN", arguments); }
function LMBD() { emitInstr("LMBD", arguments); }
function MOV()  { emitInstr("MOV", arguments);  }
function LDI()  { emitInstr("LDI", arguments);  }
function LBBO() { emitInstr("LBBO", arguments); }
function SBBO() { emitInstr("SBBO", arguments); }
function LBCO() { emitInstr("LBCO", arguments); }
function SBCO() { emitInstr("SBCO", arguments); }
function LFC()  { emitInstr("LFC", arguments);  }
function STC()  { emitInstr("STC", arguments);  }
function ZERO() { emitInstr("ZERO", arguments); }
function MVIB() { emitInstr("MVIB", arguments); }
function MVIW() { emitInstr("MVIW", arguments); }
function MVID() { emitInstr("MVID", arguments); }
function JMP()  { emitInstr("JMP", arguments);  }
function JAL()  { emitInstr("JAL", arguments);  }
function CALL() { emitInstr("CALL", arguments); }
function RET()  { emitInstr("RET", arguments);  }
function QBGT() { emitInstr("QBGT", arguments); }
function QBGE() { emitInstr("QBGE", arguments); }
function QBLT() { emitInstr("QBLT", arguments); }
function QBLE() { emitInstr("QBLE", arguments); }
function QBEQ() { emitInstr("QBEQ", arguments); }
function QBNE() { emitInstr("QBNE", arguments); }
function QBA()  { emitInstr("QBA", arguments);  }
function QBBS() { emitInstr("QBBS", arguments); }
function QBBC() { emitInstr("QBBC", arguments); }
function WBS()  { emitInstr("WBS", arguments);  }
function WBC()  { emitInstr("WBC", arguments);  }
function HALT() { emitInstr("HALT", arguments); }
function SLP()  { emitInstr("SLP", arguments);  }


function ST32() { emitInstr("ST32", arguments); }
function NOP() { MOV(r0, r0); }
function DECREMENT() { emitInstr("DECREMENT", arguments); }

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

var r0  = 'r0';
var r1  = 'r1';
var r2  = 'r2';
var r3  = 'r3';
var r4  = 'r4';
var r5  = 'r5';
var r6  = 'r6';
var r7  = 'r7';
var r8  = 'r8';
var r9  = 'r9';
var r10 = 'r10';
var r11 = 'r11';
var r12 = 'r12';
var r13 = 'r13';
var r14 = 'r14';
var r15 = 'r15';
var r16 = 'r16';
var r17 = 'r17';
var r18 = 'r18';
var r19 = 'r19';
var r20 = 'r20';
var r21 = 'r21';
var r22 = 'r22';
var r23 = 'r23';
var r24 = 'r24';
var r25 = 'r25';
var r26 = 'r26';
var r27 = 'r27';
var r28 = 'r28';
var r29 = 'r29';
var r30 = 'r30';
var r31 = 'r31';

var C0  = 'C0';
var C1  = 'C1';
var C2  = 'C2';
var C3  = 'C3';
var C4  = 'C4';
var C5  = 'C5';
var C6  = 'C6';
var C7  = 'C7';
var C8  = 'C8';
var C9  = 'C9';
var C10 = 'C10';
var C11 = 'C11';
var C12 = 'C12';
var C13 = 'C13';
var C14 = 'C14';
var C15 = 'C15';
var C16 = 'C16';
var C17 = 'C17';
var C18 = 'C18';
var C19 = 'C19';
var C20 = 'C20';
var C21 = 'C21';
var C22 = 'C22';
var C23 = 'C23';
var C24 = 'C24';
var C25 = 'C25';
var C26 = 'C26';
var C27 = 'C27';
var C28 = 'C28';
var C29 = 'C29';
var C30 = 'C30';
var C31 = 'C31';

var r_data_addr     = r0;
var r_data_len      = r1;

var r_bit_num       = r6;
var r_sleep_counter = r7;
var r_temp_addr     = r8;
var r_temp1         = r9;

var r_gpio0_zeros   = r2;
var r_gpio1_zeros   = r3;
var r_gpio2_zeros   = r4;
var r_gpio3_zeros   = r5;

var r_gpio0_ones    = r2;
var r_gpio1_ones    = r3;
var r_gpio2_ones    = r4;
var r_gpio3_ones    = r5;

var r_data0         = r10;
var r_data1         = r11;
var r_data2         = r12;
var r_data3         = r13;
var r_data4         = r14;
var r_data5         = r15;
var r_data6         = r16;
var r_data7         = r17;
var r_data8         = r18;
var r_data9         = r19;
var r_data10        = r20;
var r_data11        = r21;
var r_data12        = r22;
var r_data13        = r23;
var r_data14        = r24;
var r_data15        = r25;
var r_datas         = [r_data0, r_data1, r_data2, r_data3, r_data4, r_data5, r_data6, r_data7, r_data8, r_data9, r_data10, r_data11, r_data12, r_data13, r_data14, r_data15];

var r_gpio0_mask    = r20;
var r_gpio1_mask    = r21;
var r_gpio2_mask    = r22;
var r_gpio3_mask    = r23;
var gpio_masks    = [r_gpio0_mask, r_gpio1_mask,  r_gpio2_mask, r_gpio3_mask];

var r_gpio0_addr    = r24;
var r_gpio1_addr    = r25;
var r_gpio2_addr    = r26;
var r_gpio3_addr    = r27;

var PRU0_PRU1_INTERRUPT = 17;
var PRU1_PRU0_INTERRUPT = 18;
var PRU0_ARM_INTERRUPT  = 19;
var PRU1_ARM_INTERRUPT  = 20;
var ARM_PRU0_INTERRUPT  = 21;
var ARM_PRU1_INTERRUPT  = 22;

var CONST_PRUDRAM       = C24;
var CONST_SHAREDRAM     = C28;
var CONST_L3RAM         = C30;
var CONST_DDR           = C31;

// Address for the Constant table Programmable Pointer Register 0(CTPPR_0)
var CTBIR_0 = '0x22020';
// Address for the Constant table Programmable Pointer Register 0(CTPPR_0)
var CTBIR_1 = '0x22024';

// Address for the Constant table Programmable Pointer Register 0(CTPPR_0)
var CTPPR_0 = '0x22028';
// Address for the Constant table Programmable Pointer Register 1(CTPPR_1)
var CTPPR_1 = '0x2202C';

var sp           = r0;
var lr           = r23;
var STACK_TOP    = (0x2000 - 4);
var STACK_BOTTOM = (0x2000 - 0x200);


/** Mappings of the GPIO devices */
var GPIO0 = 0x44E07000;
var GPIO1 = 0x4804c000;
var GPIO2 = 0x481AC000;
var GPIO3 = 0x481AE000;

/** Offsets for the clear and set registers in the devices */
var GPIO_CLEARDATAOUT = 0x190;
var GPIO_SETDATAOUT = 0x194;

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

var PRU_CONTROL_ADDRESS = PRU_NUM === 0 ? '0x22000' : '0x24000';
var PRU_ARM_INTERRUPT = PRU_NUM === 0 ? PRU0_ARM_INTERRUPT : PRU1_ARM_INTERRUPT;

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function INIT_PRU() {
	emitLine("#define PRU_NUM " + PRU_NUM);
	emitLine('#include "common.p.h"');
	emitComment("Intialize the PRU");

	// Enable OCP master port
	// clear the STANDBY_INIT bit in the SYSCFG register,
	// otherwise the PRU will not be able to write outside the
	// PRU memory space and to the BeagleBon's pins.
	LBCO(r0, C4, 4, 4);
	CLR(r0, r0, 4);
	SBCO(r0, C4, 4, 4);

	// Configure the programmable pointer register for PRU0 by setting
	// c28_pointer[15:0] field to 0x0120.  This will make C28 point to
	// 0x00012000 (PRU shared RAM).
	MOV(r0, '0x00000120');
	MOV(r1, CTPPR_0);
	ST32(r0, r1);

	// Configure the programmable pointer register for PRU0 by setting
	// c31_pointer[15:0] field to 0x0010.  This will make C31 point to
	// 0x80001000 (DDR memory).
	MOV(r0, '0x00100000');
	MOV(r1, CTPPR_1);
	ST32(r0, r1);

	// Write a 0x1 into the response field so that they know we have started
	MOV(r2, 1);
	SBCO(r2, CONST_PRUDRAM, 12, 4);
	MOV(r20, '0xFFFFFFFF');
}

function PREP_GPIO_ADDRS_FOR_CLEAR() {
	emitComment("Prep GPIO address registers for clear bit (0)");
	MOV(r_gpio0_addr, GPIO0 | GPIO_CLEARDATAOUT);
	MOV(r_gpio1_addr, GPIO1 | GPIO_CLEARDATAOUT);
	MOV(r_gpio2_addr, GPIO2 | GPIO_CLEARDATAOUT);
	MOV(r_gpio3_addr, GPIO3 | GPIO_CLEARDATAOUT);
}

function PREP_GPIO_ADDRS_FOR_SET() {
	emitComment("Prep GPIO address registers for set bit (1)");

	MOV(r_gpio0_addr, GPIO0 | GPIO_SETDATAOUT);
	MOV(r_gpio1_addr, GPIO1 | GPIO_SETDATAOUT);
	MOV(r_gpio2_addr, GPIO2 | GPIO_SETDATAOUT);
	MOV(r_gpio3_addr, GPIO3 | GPIO_SETDATAOUT);
}

function PREP_GPIO_MASKS(masks) {
	emitComment("Load masks into GPIO mask registers");

	MOV(r_gpio0_mask, masks[0]);
	MOV(r_gpio1_mask, masks[1]);
	MOV(r_gpio2_mask, masks[2]);
	MOV(r_gpio3_mask, masks[3]);
}

function GPIO_APPLY_MASK_TO_ADDR() {
	emitComment("Apply GPIO mask registers to the hardware");

	SBBO(r_gpio0_mask, r_gpio0_addr, 0, 4);
	SBBO(r_gpio1_mask, r_gpio1_addr, 0, 4);
	SBBO(r_gpio2_mask, r_gpio2_addr, 0, 4);
	SBBO(r_gpio3_mask, r_gpio3_addr, 0, 4);
}

function GPIO_APPLY_ZEROS_TO_ADDR() {
	emitComment("Apply GPIO zero registers to the hardware");

	SBBO(r_gpio0_zeros, r_gpio0_addr, 0, 4);
	SBBO(r_gpio1_zeros, r_gpio1_addr, 0, 4);
	SBBO(r_gpio2_zeros, r_gpio2_addr, 0, 4);
	SBBO(r_gpio3_zeros, r_gpio3_addr, 0, 4);
}

function GPIO_APPLY_ONES_TO_ADDR() {
	emitComment("Apply GPIO one registers to the hardware");

	SBBO(r_gpio0_ones, r_gpio0_addr, 0, 4);
	SBBO(r_gpio1_ones, r_gpio1_addr, 0, 4);
	SBBO(r_gpio2_ones, r_gpio2_addr, 0, 4);
	SBBO(r_gpio3_ones, r_gpio3_addr, 0, 4);
}

/**
 * Zeros the registers used to store which bits should be zero for each GPIO bank
 */
function RESET_GPIO_ZEROS() {
	emitComment("Reset GPIO zero registers");

	MOV(r_gpio0_zeros, 0);
	MOV(r_gpio1_zeros, 0);
	MOV(r_gpio2_zeros, 0);
	MOV(r_gpio3_zeros, 0);
}

/**
 * Zeros the registers used to store which bits should be one for each GPIO bank
 */
function RESET_GPIO_ONES() {
	emitComment("Reset GPIO one registers");

	MOV(r_gpio0_ones, 0);
	MOV(r_gpio1_ones, 0);
	MOV(r_gpio2_ones, 0);
	MOV(r_gpio3_ones, 0);
}

/**
 * Checks if the bit indexed by the r_bit_num register in the regN register is a zero, and if so, sets the bit in the
 * corresponding _zeros register. CHANNEL_BANK_NAME and CHANNEL_BIT are used to lookup the bank and bit num.
 *
 * @param regN The data register to check. Generally one of the r_dataN registers.
 * @param channelIndex Which channel this check is for. Used to determine GPIO bank and bit.
 */
function TEST_BIT_ZERO(regN, channelIndex) {
	var label_name = "channel_" + channelIndex + "_zero_skip";
	var pin = pruPins[channelIndex];
	var zeros_register = "r_gpio" + pin.gpioBank + "_zeros";

	emitComment("Test if pin (pruChannel=" + pin.pruChannel + ",global="+pin.mappedChannelIndex+") is ZERO and store in GPIO zero register");
	QBBS(label_name, regN, r_bit_num);
	SET(zeros_register, zeros_register, channelIndex);
	emitLabel(label_name, true);
}

/**
 * Checks if the bit indexed by the r_bit_num register in the regN register is a one, and if so, sets the bit in the
 * corresponding _ones register. CHANNEL_BANK_NAME and CHANNEL_BIT are used to lookup the bank and bit num.
 *
 * @param regN The data register to check. Generally one of the r_dataN registers.
 * @param channelIndex Which channel this check is for. Used to determine GPIO bank and bit.
 */
function TEST_BIT_ONE(regN, channelIndex) {
	var label_name = "channel_" + channelIndex + "_one_skip";
	var pin = pruPins[channelIndex];
	var ones_register = "r_gpio" + pin.gpioBank+"_ones";

	emitComment("Test if pin (pruChannel=" + pin.pruChannel + ",global="+pin.mappedChannelIndex+") is ONE and store in GPIO zero register");
	QBBC(label_name, regN, r_bit_num);
	SET(ones_register, ones_register, channelIndex);
	emitLabel(label_name, true);
}

function TEST_BITS_ONE(channelCount) {
	for (var channelIndex=0, regIndex=16; channelIndex<channelCount; channelIndex++, regIndex++) {
		if (regIndex > 15) {
			regIndex = 0;
			LOAD_CHANNEL_DATA(channelIndex, Math.min(channelCount - channelIndex, 16));
		}

		TEST_BIT_ONE(r_datas[regIndex], channelIndex);
	}
}

function LOAD_CHANNEL_DATA(firstChannel, channelCount) {
	emitComment("Load " + channelCount + " channels of data into data registers");

	LBBO(
		r_data0,
		r_data_addr,
		pruPins[0].mappedChannelIndex*4+firstChannel*4,
		channelCount*4
	);
}

function PREP_GPIO_MASK_FOR_PINS(pins) {
	emitComment("Set the GPIO mask registers for setting or clearing channels " + pins.map(function(pin){ return pin.mappedChannelIndex; }).join(", "));

	var masks = [0, 0, 0, 0];
	pins.forEach(function(pin) {
		masks[pin.gpioBank] |= 1 << pin.gpioBit;
	});

	masks.forEach(function(mask, bankIndex) {
		MOV(gpio_masks[bankIndex], toHexLiteral(masks[0]));
	});
}