if (typeof PRU_NUM === "undefined") throw new Error("PRU_NUM must be defined");
var pruPins = global.pinsByPruNum[PRU_NUM];

var rawPruCode = "";
var pruWhitespace = [];

function emitLine(s) { rawPruCode += (s === undefined ? "" : (pruWhitespace.join("") + s)) + "\n"; }
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

function pruBlock(code) {
	pruWhitespace.push("  ");
	try {
		return code();
	} finally {
		pruWhitespace.pop();
	}
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

function ADC(dest, a, b)  { emitInstr("ADC", arguments);  }
function ADD(dest, a, b)  { emitInstr("ADD", arguments);  }
function SUB(dest, a, b)  { emitInstr("SUB", arguments);  }
function SUC(dest, a, b)  { emitInstr("SUC", arguments);  }
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
function QBBS(label, reg, bit) { emitInstr("QBBS", arguments); }
function QBBC(label, reg, bit) { emitInstr("QBBC", arguments); }
function WBS()  { emitInstr("WBS", arguments);  }
function WBC()  { emitInstr("WBC", arguments);  }
function HALT() { emitInstr("HALT", arguments); }
function SLP()  { emitInstr("SLP", arguments);  }


function ST32() { emitInstr("ST32", arguments); }
function NOP() { MOV(r0, r0); }
function DECREMENT() { emitInstr("DECREMENT", arguments); }

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
var r0  = { toString: function() { return 'r0' }, b0: "r0.b0", b1: "r0.b1", b2: "r0.b2", b3: "r0.b3", w0: "r0.w0", w1: "r0.w1"};
var r1  = { toString: function() { return 'r1' }, b0: "r1.b0", b1: "r1.b1", b2: "r1.b2", b3: "r1.b3", w0: "r1.w0", w1: "r1.w1" };
var r2  = { toString: function() { return 'r2' }, b0: "r2.b0", b1: "r2.b1", b2: "r2.b2", b3: "r2.b3", w0: "r2.w0", w1: "r2.w1" };
var r3  = { toString: function() { return 'r3' }, b0: "r3.b0", b1: "r3.b1", b2: "r3.b2", b3: "r3.b3", w0: "r3.w0", w1: "r3.w1" };
var r4  = { toString: function() { return 'r4' }, b0: "r4.b0", b1: "r4.b1", b2: "r4.b2", b3: "r4.b3", w0: "r4.w0", w1: "r4.w1" };
var r5  = { toString: function() { return 'r5' }, b0: "r5.b0", b1: "r5.b1", b2: "r5.b2", b3: "r5.b3", w0: "r5.w0", w1: "r5.w1" };
var r6  = { toString: function() { return 'r6' }, b0: "r6.b0", b1: "r6.b1", b2: "r6.b2", b3: "r6.b3", w0: "r6.w0", w1: "r6.w1" };
var r7  = { toString: function() { return 'r7' }, b0: "r7.b0", b1: "r7.b1", b2: "r7.b2", b3: "r7.b3", w0: "r7.w0", w1: "r7.w1" };
var r8  = { toString: function() { return 'r8' }, b0: "r8.b0", b1: "r8.b1", b2: "r8.b2", b3: "r8.b3", w0: "r8.w0", w1: "r8.w1" };
var r9  = { toString: function() { return 'r9' }, b0: "r9.b0", b1: "r9.b1", b2: "r9.b2", b3: "r9.b3", w0: "r9.w0", w1: "r9.w1" };
var r10 = { toString: function() { return 'r10' }, b0: "r10.b0", b1: "r10.b1", b2: "r10.b2", b3: "r10.b3", w0: "r10.w0", w1: "r10.w1" };
var r11 = { toString: function() { return 'r11' }, b0: "r11.b0", b1: "r11.b1", b2: "r11.b2", b3: "r11.b3", w0: "r11.w0", w1: "r11.w1" };
var r12 = { toString: function() { return 'r12' }, b0: "r12.b0", b1: "r12.b1", b2: "r12.b2", b3: "r12.b3", w0: "r12.w0", w1: "r12.w1" };
var r13 = { toString: function() { return 'r13' }, b0: "r13.b0", b1: "r13.b1", b2: "r13.b2", b3: "r13.b3", w0: "r13.w0", w1: "r13.w1" };
var r14 = { toString: function() { return 'r14' }, b0: "r14.b0", b1: "r14.b1", b2: "r14.b2", b3: "r14.b3", w0: "r14.w0", w1: "r14.w1" };
var r15 = { toString: function() { return 'r15' }, b0: "r15.b0", b1: "r15.b1", b2: "r15.b2", b3: "r15.b3", w0: "r15.w0", w1: "r15.w1" };
var r16 = { toString: function() { return 'r16' }, b0: "r16.b0", b1: "r16.b1", b2: "r16.b2", b3: "r16.b3", w0: "r16.w0", w1: "r16.w1" };
var r17 = { toString: function() { return 'r17' }, b0: "r17.b0", b1: "r17.b1", b2: "r17.b2", b3: "r17.b3", w0: "r17.w0", w1: "r17.w1" };
var r18 = { toString: function() { return 'r18' }, b0: "r18.b0", b1: "r18.b1", b2: "r18.b2", b3: "r18.b3", w0: "r18.w0", w1: "r18.w1" };
var r19 = { toString: function() { return 'r19' }, b0: "r19.b0", b1: "r19.b1", b2: "r19.b2", b3: "r19.b3", w0: "r19.w0", w1: "r19.w1" };
var r20 = { toString: function() { return 'r20' }, b0: "r20.b0", b1: "r20.b1", b2: "r20.b2", b3: "r20.b3", w0: "r20.w0", w1: "r20.w1" };
var r21 = { toString: function() { return 'r21' }, b0: "r21.b0", b1: "r21.b1", b2: "r21.b2", b3: "r21.b3", w0: "r21.w0", w1: "r21.w1" };
var r22 = { toString: function() { return 'r22' }, b0: "r22.b0", b1: "r22.b1", b2: "r22.b2", b3: "r22.b3", w0: "r22.w0", w1: "r22.w1" };
var r23 = { toString: function() { return 'r23' }, b0: "r23.b0", b1: "r23.b1", b2: "r23.b2", b3: "r23.b3", w0: "r23.w0", w1: "r23.w1" };
var r24 = { toString: function() { return 'r24' }, b0: "r24.b0", b1: "r24.b1", b2: "r24.b2", b3: "r24.b3", w0: "r24.w0", w1: "r24.w1" };
var r25 = { toString: function() { return 'r25' }, b0: "r25.b0", b1: "r25.b1", b2: "r25.b2", b3: "r25.b3", w0: "r25.w0", w1: "r25.w1" };
var r26 = { toString: function() { return 'r26' }, b0: "r26.b0", b1: "r26.b1", b2: "r26.b2", b3: "r26.b3", w0: "r26.w0", w1: "r26.w1" };
var r27 = { toString: function() { return 'r27' }, b0: "r27.b0", b1: "r27.b1", b2: "r27.b2", b3: "r27.b3", w0: "r27.w0", w1: "r27.w1" };
var r28 = { toString: function() { return 'r28' }, b0: "r28.b0", b1: "r28.b1", b2: "r28.b2", b3: "r28.b3", w0: "r28.w0", w1: "r28.w1" };
var r29 = { toString: function() { return 'r29' }, b0: "r29.b0", b1: "r29.b1", b2: "r29.b2", b3: "r29.b3", w0: "r29.w0", w1: "r29.w1" };
var r30 = { toString: function() { return 'r30' }, b0: "r30.b0", b1: "r30.b1", b2: "r30.b2", b3: "r30.b3", w0: "r30.w0", w1: "r30.w1" };
var r31 = { toString: function() { return 'r31' }, b0: "r31.b0", b1: "r31.b1", b2: "r31.b2", b3: "r31.b3", w0: "r31.w0", w1: "r31.w1" };

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


///////////////////////////////////////////////////////////////////////////////////
// Temp and Control Registers
var r_data_addr     = r0;
var r_data_len      = r1;
var r_bit_num       = r2.w0;
var r_sleep_counter = r2.w1;
var r_temp_addr     = r3;
var r_temp1         = r4;
var r_data_len2     = r29.w0;
///////////////////////////////////////////////////////////////////////////////////

var r_data0         = r5;
var r_data1         = r6;
var r_data2         = r7;
var r_data3         = r8;
var r_data4         = r9;
var r_data5         = r10;
var r_data6         = r11;
var r_data7         = r12;
var r_data8         = r13;
var r_data9         = r14;
var r_data10        = r15;
var r_data11        = r16;
var r_data12        = r17;
var r_data13        = r18;
var r_data14        = r19;
var r_data15        = r20;
var r_data16        = r21;
var r_data17        = r22;
var r_data18        = r23;
var r_data19        = r24;
var r_data20        = r25;
var r_data21        = r26;
var r_data22        = r27;
var r_data23        = r28;

var r_datas         = [
 r_data0, r_data1,  r_data2,  r_data3,  r_data4,  r_data5,  r_data6,  r_data7,  r_data8,  r_data9,  r_data10, r_data11,
r_data12, r_data13, r_data14, r_data15, r_data16, r_data17, r_data18, r_data19, r_data20, r_data21, r_data22, r_data23
];

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
var GPIO_ADDRS = [GPIO0, GPIO1, GPIO2, GPIO3];

/** Offsets for the clear and set registers in the devices */
var GPIO_CLEARDATAOUT = 0x190;
var GPIO_SETDATAOUT = 0x194;

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

var PRU_CONTROL_ADDRESS = PRU_NUM === 0 ? '0x22000' : '0x24000';
var PRU_ARM_INTERRUPT = PRU_NUM === 0 ? PRU0_ARM_INTERRUPT : PRU1_ARM_INTERRUPT;

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function INIT_PRU() {
	emitLine("#define PRU" + PRU_NUM);
	emitLine('#include "common.p.h"');
	emitComment("Intialize the PRU");

	emitLine("START:");

	emitComment('Enable OCP master port');
	emitComment('clear the STANDBY_INIT bit in the SYSCFG register,');
	emitComment('otherwise the PRU will not be able to write outside the');
	emitComment('PRU memory space and to the BeagleBone\'s pins.');
	LBCO(r0, C4, 4, 4);
	CLR(r0, r0, 4);
	SBCO(r0, C4, 4, 4);

	emitComment('Configure the programmable pointer register for PRU0 by setting');
	emitComment('c28_pointer[15:0] field to 0x0120.  This will make C28 point to');
	emitComment('0x00012000 (PRU shared RAM).');
	MOV(r0, '0x00000120');
	MOV(r1, CTPPR_0);
	ST32(r0, r1);

	emitComment('Configure the programmable pointer register for PRU0 by setting');
	emitComment('c31_pointer[15:0] field to 0x0010.  This will make C31 point to');
	emitComment('0x80001000 (DDR memory).');
	MOV(r0, '0x00100000');
	MOV(r1, CTPPR_1);
	ST32(r0, r1);

	emitComment('Write a 0x1 into the response field so that they know we have started');
	MOV(r2, 1);
	SBCO(r2, CONST_PRUDRAM, 12, 4);
	MOV(r20, '0xFFFFFFFF');
}

var lastGpioPrepBank = -1;

function PREP_GPIO_FOR_CLEAR(gpioBank) {
	emitComment("Prep GPIO address register for CLEAR on GPIO bank " + gpioBank);
	MOV(r_temp_addr, GPIO_ADDRS[gpioBank] | GPIO_CLEARDATAOUT);
	lastGpioPrepBank = gpioBank;
}

function PREP_GPIO_FOR_SET(gpioBank) {
	emitComment("Prep GPIO address register for SET on GPIO bank " + gpioBank);
	MOV(r_temp_addr, GPIO_ADDRS[gpioBank] | GPIO_SETDATAOUT);
	lastGpioPrepBank = gpioBank;
}

function APPLY_GPIO_CHANGES() {
	emitComment("Apply GPIO bank " + lastGpioPrepBank + " changes");
	SBBO(r_temp1, r_temp_addr, 0, 4);
}

/**
 * Zeros the registers used to store which bits should be one for each GPIO bank
 */
function RESET_GPIO_MASK() {
	emitComment("Reset GPIO one registers");
	MOV(r_temp1, 0);
}

/**
 * Checks if the bit indexed by the r_bit_num register in the regN register is a zero, and if so, sets the bit in the
 * corresponding _zeros register. CHANNEL_BANK_NAME and CHANNEL_BIT are used to lookup the bank and bit num.
 *
 * @param pin The pin whose bit should be tested
 */
function TEST_BIT_ZERO(pin) {
	var label_name = "channel_" + pin.pruDataChannel + "_zero_skip";

	emitComment("Test if pin (pruDataChannel=" + pin.pruDataChannel + ", global="+pin.dataChannelIndex+") is ZERO and SET bit " + pin.gpioBit + " in GPIO" + pin.gpioBank + " register");
	QBBS(label_name, r_datas[pin.pruDataChannel], r_bit_num);
	SET(r_temp1, r_temp1, pin.gpioBit);
	emitLabel(label_name, true);
}

/**
 * Checks if the bit indexed by the r_bit_num register in the regN register is a one, and if so, sets the bit in the
 * corresponding _ones register. CHANNEL_BANK_NAME and CHANNEL_BIT are used to lookup the bank and bit num.
 *
 * @param pin The pin whose bit should be tested
 */
function TEST_BIT_ONE(pin) {
	var label_name = "channel_" + pin.pruDataChannel + "_one_skip";

	emitComment("Test if pin (pruDataChannel=" + pin.pruDataChannel + ", global="+pin.dataChannelIndex+") is ONE and SET bit " + pin.gpioBit + " in GPIO" + pin.gpioBank + " register");
	QBBC(label_name, r_datas[pin.pruDataChannel], r_bit_num);
	SET(r_temp1, r_temp1, pin.gpioBit);
	emitLabel(label_name, true);
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
	emitComment("Set the GPIO (bank " + pins[0].gpioBank + ") mask register for setting or clearing channels " + pins.map(function(pin){ return pin.mappedChannelIndex; }).join(", "));

	var mask = 0;
	var bank = -1;

	pins.forEach(function(pin) {
		if (bank != -1 && bank != pin.gpioBank) {
			throw new Error("Cannot load mask for multiple GPIO banks: " + pins);
		} else {
			bank = pin.gpioBank;
		}

		mask |= 1 << pin.gpioBit;
	});

	MOV(r_temp1, toHexLiteral(mask));
}

function groupByBank(
	allPins,
	callback
) {
	var pinsByBank = [[], [], [], []];
	allPins.forEach(function(pin) {
		pinsByBank[pin.gpioBank].push(pin);
	});

	var multipleBanksUsed = pinsByBank.filter(function(bankPins) { return bankPins.length > 0 }).length > 1;

	pinsByBank.forEach(function(pins, bankIndex){
		if (pins.length > 0) {
			if (multipleBanksUsed) {
				emitComment("Bank " + bankIndex);
				pruBlock(function () {
					callback(pins, bankIndex);
				});
			} else {
				callback(pins, bankIndex);
			}
		}
	});
}


function PINS_HIGH(pins, pinsLabel) {
	emitComment((pinsLabel || "") + ' Pins HIGH: ' + pins.map(function (pin) {
			return pin.gpioFullName
		}).join(", "));

	pruBlock(function() {
		groupByBank(pins, function (pins, gpioBank) {
			PREP_GPIO_FOR_SET(gpioBank);
			PREP_GPIO_MASK_FOR_PINS(pins);
			APPLY_GPIO_CHANGES();
		});
	});
}

function PINS_LOW(pins, pinsLabel) {
	emitComment((pinsLabel || "") + ' Pins LOW: ' + pins.map(function (pin) {
			return pin.gpioFullName
		}).join(", "));

	pruBlock(function() {
		groupByBank(pins, function (pins, gpioBank) {
			PREP_GPIO_FOR_CLEAR(gpioBank);
			PREP_GPIO_MASK_FOR_PINS(pins);
			APPLY_GPIO_CHANGES();
		});
	});
}

function PINS_HIGH_LOW(pins, pinsLabel) {
	emitComment((pinsLabel || "") + ' Pins HIGH-LOW pulse: ' + pins.map(function (pin) {
			return pin.gpioFullName
		}).join(", "));

	pruBlock(function() {
		groupByBank(pins, function (pins, gpioBank) {
			PREP_GPIO_MASK_FOR_PINS(pins);

			PREP_GPIO_FOR_SET(gpioBank);
			APPLY_GPIO_CHANGES();

			PREP_GPIO_FOR_CLEAR(gpioBank);
			APPLY_GPIO_CHANGES();
		});
	});
}