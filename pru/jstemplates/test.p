#define PRU_NUM 1
#include "common.p.h"

// Intialize the PRU
LBCO r0, C4, 4, 4;
CLR r0, r0, 4;
SBCO r0, C4, 4, 4;
MOV r0, 288;
MOV r1, 0x022028;
ST32 r0, r1;
MOV r0, 0x100000;
MOV r1, 0x02202C;
ST32 r0, r1;
MOV r2, 1;
SBCO r2, C24, 12, 4;
MOV r20, 0xFFFFFFFF;

l_main_loop:
RAISE_ARM_INTERRUPT;
LBCO r0, C24, 0, 12;

main_loop:
RAISE_ARM_INTERRUPT;
LBCO r0, C24, 0, 12;
QBEQ main_loop, r2, 0;
RESET_COUNTER;
MOV r3, 0;
SBCO r3, C24, 8, 4;
QBEQ EXIT, r2, 255;

l_start_frame:
MOV r6, 32;
MOV r29, r1;

// Reset GPIO one registers
MOV r2, 0;
MOV r3, 0;
MOV r4, 0;
MOV r5, 0;

// Prep GPIO address registers for clear bit (0)
MOV r24, 0x44E07190;
MOV r25, 0x4804C190;
MOV r26, 0x481AC190;
MOV r27, 0x481AE190;

// Set the GPIO mask registers for setting or clearing channels 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47
MOV r20, 0xC8D08480;
MOV r21, 0xC8D08480;
MOV r22, 0xC8D08480;
MOV r23, 0xC8D08480;

// Apply GPIO mask registers to the hardware
SBBO r20, r24, 0, 4;
SBBO r21, r25, 0, 4;
SBBO r22, r26, 0, 4;
SBBO r23, r27, 0, 4;

l_start_frame_32_zeros:
DECREMENT r6;

// Clocks High
MOV r24, GPIO1 | GPIO_SETDATAOUT;
MOV r20, 8192;
SBBO r20, r_gpio0_addr, 0, 4;

// Clocks Low
MOV r24, GPIO1 | GPIO_CLEARDATAOUT;
MOV r20, 8192;
SBBO r20, r_gpio0_addr, 0, 4;
QBNE l_start_frame_32_zeros, r6, 0;

l_start_word_8_ones:
MOV r6, 7;

// Reset GPIO one registers
MOV r2, 0;
MOV r3, 0;
MOV r4, 0;
MOV r5, 0;

// Prep GPIO address registers for set bit (1)
MOV r24, 0x44E07194;
MOV r25, 0x4804C194;
MOV r26, 0x481AC194;
MOV r27, 0x481AE194;

// Set the GPIO mask registers for setting or clearing channels 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47
MOV r20, 0xC8D08480;
MOV r21, 0xC8D08480;
MOV r22, 0xC8D08480;
MOV r23, 0xC8D08480;

// Apply GPIO mask registers to the hardware
SBBO r20, r24, 0, 4;
SBBO r21, r25, 0, 4;
SBBO r22, r26, 0, 4;
SBBO r23, r27, 0, 4;
DECREMENT r6;

// Clocks High
MOV r24, GPIO1 | GPIO_SETDATAOUT;
MOV r20, 8192;
SBBO r20, r_gpio0_addr, 0, 4;

// Clocks Low
MOV r24, GPIO1 | GPIO_CLEARDATAOUT;
MOV r20, 8192;
SBBO r20, r_gpio0_addr, 0, 4;
QBNE l_header_bit_loop, r6, 0;

// Loop over the 24 bits in a word
MOV r6, 24;

l_bit_loop:
DECREMENT r, 6;

// Reset GPIO one registers
MOV r2, 0;
MOV r3, 0;
MOV r4, 0;
MOV r5, 0;

// Load 16 channels of data into data registers
LBBO r10, r0, 96, 64;

// Test if pin (pruChannel=0,global=24) is ONE and store in GPIO zero register
QBBC channel_0_one_skip, r10, r6;
SET r_0_ones, r_0_ones, 0;
channel_0_one_skip:

// Test if pin (pruChannel=1,global=25) is ONE and store in GPIO zero register
QBBC channel_1_one_skip, r11, r6;
SET r_2_ones, r_2_ones, 1;
channel_1_one_skip:

// Test if pin (pruChannel=2,global=26) is ONE and store in GPIO zero register
QBBC channel_2_one_skip, r12, r6;
SET r_0_ones, r_0_ones, 2;
channel_2_one_skip:

// Test if pin (pruChannel=3,global=27) is ONE and store in GPIO zero register
QBBC channel_3_one_skip, r13, r6;
SET r_0_ones, r_0_ones, 3;
channel_3_one_skip:

// Test if pin (pruChannel=4,global=28) is ONE and store in GPIO zero register
QBBC channel_4_one_skip, r14, r6;
SET r_1_ones, r_1_ones, 4;
channel_4_one_skip:

// Test if pin (pruChannel=5,global=29) is ONE and store in GPIO zero register
QBBC channel_5_one_skip, r15, r6;
SET r_0_ones, r_0_ones, 5;
channel_5_one_skip:

// Test if pin (pruChannel=6,global=30) is ONE and store in GPIO zero register
QBBC channel_6_one_skip, r16, r6;
SET r_2_ones, r_2_ones, 6;
channel_6_one_skip:

// Test if pin (pruChannel=7,global=31) is ONE and store in GPIO zero register
QBBC channel_7_one_skip, r17, r6;
SET r_2_ones, r_2_ones, 7;
channel_7_one_skip:

// Test if pin (pruChannel=8,global=32) is ONE and store in GPIO zero register
QBBC channel_8_one_skip, r18, r6;
SET r_0_ones, r_0_ones, 8;
channel_8_one_skip:

// Test if pin (pruChannel=9,global=33) is ONE and store in GPIO zero register
QBBC channel_9_one_skip, r19, r6;
SET r_0_ones, r_0_ones, 9;
channel_9_one_skip:

// Test if pin (pruChannel=10,global=34) is ONE and store in GPIO zero register
QBBC channel_10_one_skip, r20, r6;
SET r_3_ones, r_3_ones, 10;
channel_10_one_skip:

// Test if pin (pruChannel=11,global=35) is ONE and store in GPIO zero register
QBBC channel_11_one_skip, r21, r6;
SET r_3_ones, r_3_ones, 11;
channel_11_one_skip:

// Test if pin (pruChannel=12,global=36) is ONE and store in GPIO zero register
QBBC channel_12_one_skip, r22, r6;
SET r_3_ones, r_3_ones, 12;
channel_12_one_skip:

// Test if pin (pruChannel=13,global=37) is ONE and store in GPIO zero register
QBBC channel_13_one_skip, r23, r6;
SET r_3_ones, r_3_ones, 13;
channel_13_one_skip:

// Test if pin (pruChannel=14,global=38) is ONE and store in GPIO zero register
QBBC channel_14_one_skip, r24, r6;
SET r_3_ones, r_3_ones, 14;
channel_14_one_skip:

// Test if pin (pruChannel=15,global=39) is ONE and store in GPIO zero register
QBBC channel_15_one_skip, r25, r6;
SET r_3_ones, r_3_ones, 15;
channel_15_one_skip:

// Load 8 channels of data into data registers
LBBO r10, r0, 160, 32;

// Test if pin (pruChannel=16,global=40) is ONE and store in GPIO zero register
QBBC channel_16_one_skip, r10, r6;
SET r_0_ones, r_0_ones, 16;
channel_16_one_skip:

// Test if pin (pruChannel=17,global=41) is ONE and store in GPIO zero register
QBBC channel_17_one_skip, r11, r6;
SET r_1_ones, r_1_ones, 17;
channel_17_one_skip:

// Test if pin (pruChannel=18,global=42) is ONE and store in GPIO zero register
QBBC channel_18_one_skip, r12, r6;
SET r_1_ones, r_1_ones, 18;
channel_18_one_skip:

// Test if pin (pruChannel=19,global=43) is ONE and store in GPIO zero register
QBBC channel_19_one_skip, r13, r6;
SET r_1_ones, r_1_ones, 19;
channel_19_one_skip:

// Test if pin (pruChannel=20,global=44) is ONE and store in GPIO zero register
QBBC channel_20_one_skip, r14, r6;
SET r_1_ones, r_1_ones, 20;
channel_20_one_skip:

// Test if pin (pruChannel=21,global=45) is ONE and store in GPIO zero register
QBBC channel_21_one_skip, r15, r6;
SET r_0_ones, r_0_ones, 21;
channel_21_one_skip:

// Test if pin (pruChannel=22,global=46) is ONE and store in GPIO zero register
QBBC channel_22_one_skip, r16, r6;
SET r_1_ones, r_1_ones, 22;
channel_22_one_skip:

// Test if pin (pruChannel=23,global=47) is ONE and store in GPIO zero register
QBBC channel_23_one_skip, r17, r6;
SET r_0_ones, r_0_ones, 23;
channel_23_one_skip:

// Clocks High
MOV r24, GPIO1 | GPIO_SETDATAOUT;
MOV r20, 8192;
SBBO r20, r_gpio0_addr, 0, 4;

// Prep GPIO address registers for clear bit (0)
MOV r24, 0x44E07190;
MOV r25, 0x4804C190;
MOV r26, 0x481AC190;
MOV r27, 0x481AE190;

// Set the GPIO mask registers for setting or clearing channels 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47
MOV r20, 0xC8D08480;
MOV r21, 0xC8D08480;
MOV r22, 0xC8D08480;
MOV r23, 0xC8D08480;

// Apply GPIO mask registers to the hardware
SBBO r20, r24, 0, 4;
SBBO r21, r25, 0, 4;
SBBO r22, r26, 0, 4;
SBBO r23, r27, 0, 4;

// Prep GPIO address registers for set bit (1)
MOV r24, 0x44E07194;
MOV r25, 0x4804C194;
MOV r26, 0x481AC194;
MOV r27, 0x481AE194;

// Apply GPIO one registers to the hardware
SBBO r2, r24, 0, 4;
SBBO r3, r25, 0, 4;
SBBO r4, r26, 0, 4;
SBBO r5, r27, 0, 4;

// Clocks Low
MOV r24, GPIO1 | GPIO_CLEARDATAOUT;
MOV r20, 8192;
SBBO r20, r_gpio0_addr, 0, 4;
QBNE l_bit_loop, r6, 0;

// Clocks High
MOV r24, GPIO1 | GPIO_SETDATAOUT;
MOV r20, 8192;
SBBO r20, r_gpio0_addr, 0, 4;

// Clocks Low
MOV r24, GPIO1 | GPIO_CLEARDATAOUT;
MOV r20, 8192;
SBBO r20, r_gpio0_addr, 0, 4;
ADD r0, r0, 192;
DECREMENT r1;
QBNE l_start_word_8_ones, r1, 0;

l_end_frame:
MOV r6, r29;
LSR r6, r6, 1;
ADD r6, r6, 1;

// Reset GPIO one registers
MOV r2, 0;
MOV r3, 0;
MOV r4, 0;
MOV r5, 0;

// Prep GPIO address registers for set bit (1)
MOV r24, 0x44E07194;
MOV r25, 0x4804C194;
MOV r26, 0x481AC194;
MOV r27, 0x481AE194;

// Set the GPIO mask registers for setting or clearing channels 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47
MOV r20, 0xC8D08480;
MOV r21, 0xC8D08480;
MOV r22, 0xC8D08480;
MOV r23, 0xC8D08480;

// Apply GPIO mask registers to the hardware
SBBO r20, r24, 0, 4;
SBBO r21, r25, 0, 4;
SBBO r22, r26, 0, 4;
SBBO r23, r27, 0, 4;

l_end_bit_loop:
DECREMENT r6;

// Clocks High
MOV r24, GPIO1 | GPIO_SETDATAOUT;
MOV r20, 8192;
SBBO r20, r_gpio0_addr, 0, 4;

// Clocks Low
MOV r24, GPIO1 | GPIO_CLEARDATAOUT;
MOV r20, 8192;
SBBO r20, r_gpio0_addr, 0, 4;
QBNE l_end_bit_loop, r6, 0;

// Prep GPIO address registers for clear bit (0)
MOV r24, 0x44E07190;
MOV r25, 0x4804C190;
MOV r26, 0x481AC190;
MOV r27, 0x481AE190;

// Set the GPIO mask registers for setting or clearing channels 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47
MOV r20, 0xC8D08480;
MOV r21, 0xC8D08480;
MOV r22, 0xC8D08480;
MOV r23, 0xC8D08480;

// Apply GPIO mask registers to the hardware
SBBO r20, r24, 0, 4;
SBBO r21, r25, 0, 4;
SBBO r22, r26, 0, 4;
SBBO r23, r27, 0, 4;
MOV r8, 0x024000;
LBBO r2, r8, 12, 4;
SBCO r2, C24, 12, 4;
QBA main_loop;

EXIT:
MOV r2, 255;
SBCO r2, C24, 12, 4;
RAISE_ARM_INTERRUPT;
HALT;

