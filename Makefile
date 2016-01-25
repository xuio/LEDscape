#########
#
# The top level targets link in the two .o files for now.
#
TARGETS += opc-server

LEDSCAPE_OBJS = ledscape.o pru.o util.o lib/cesanta/frozen.o lib/cesanta/mongoose.o
LEDSCAPE_LIB := libledscape.a

all: pasm $(TARGETS) pru-js ledscape.service

# Used to include npm-install, but now they're checked in
pru-js: typescript-compile

export CROSS_COMPILE:=

CFLAGS += \
	-std=c99 \
	-W \
	-Wall \
	-D_BSD_SOURCE \
	-Wp,-MMD,$(dir $@).$(notdir $@).d \
	-Wp,-MT,$@ \
	-I. \
	-O2 \
	-lm \
	-mtune=cortex-a8 \
	-march=armv7-a \
	-Wunused-parameter \
	-DNS_ENABLE_IPV6 \
	-Wunknown-pragmas \
	-Wsign-compare

LDFLAGS += \

LDLIBS += \
	-lpthread \

COMPILE.o = $(CROSS_COMPILE)gcc $(CFLAGS) -c -o $@ $<
COMPILE.a = $(CROSS_COMPILE)ar crv $@ $^
COMPILE.link = $(CROSS_COMPILE)gcc $(LDFLAGS) -o $@ $^ $(LDLIBS)


#####
#
# The TI "app_loader" is the userspace library for talking to
# the PRU and mapping memory between it and the ARM.
#
APP_LOADER_DIR ?= ./am335x/app_loader
APP_LOADER_LIB := $(APP_LOADER_DIR)/lib/libprussdrv.a
CFLAGS += -I$(APP_LOADER_DIR)/include
LDLIBS += $(APP_LOADER_LIB) -lm

PASM_DIR = ./am335x/pasm


npm-install:
	cd pru; npm install

typescript-compile:
	cd pru; echo "Compiling Typescript..."; node_modules/typescript/bin/tsc --diagnostics

%.o: %.c
	$(COMPILE.o)


libledscape.a: $(LEDSCAPE_OBJS)
	$(RM) $@
	$(COMPILE.a)

$(foreach O,$(TARGETS),$(eval $O: $O.o $(LEDSCAPE_OBJS) $(APP_LOADER_LIB)))

$(TARGETS):
	$(COMPILE.link)

ledscape.service: ledscape.service.in
	sed 's%LEDSCAPE_PATH%'`pwd`'%' ledscape.service.in > ledscape.service

.PHONY: clean

clean:
	rm -rf \
		*.o \
		*.i \
		.*.o.d \
		*~ \
		$(INCDIR_APP_LOADER)/*~ \
		$(TARGETS) \
		*.bin \
		lib/cesanta/.*.o.d \
		lib/cesanta/*.i \
		lib/cesanta/*.o \
		pru/generated \
		pru/bin \
		ledscape.service \
		pru/*.js \
		pru/*.js.map \
		pru/jstemplates/*.js \
        pru/jstemplates/*.js.map \
		pru/tmp
	cd am335x/app_loader/interface && $(MAKE) clean
	cd am335x/pasm && $(MAKE) clean

###########
#
# The correct way to reserve the GPIO pins on the BBB is with the
# capemgr and a Device Tree file.  But it doesn't work.
#
SLOT_FILE=/sys/devices/bone_capemgr.8/slots
dts: LEDscape.dts
	@SLOT="`grep LEDSCAPE $(SLOT_FILE) | cut -d: -f1`"; \
	if [ ! -z "$$SLOT" ]; then \
		echo "Removing slot $$SLOT"; \
		echo -$$SLOT > $(SLOT_FILE); \
	fi
	dtc -O dtb -o /lib/firmware/BB-LEDSCAPE-00A0.dtbo -b 0 -@ LEDscape.dts
	echo BB-LEDSCAPE > $(SLOT_FILE)


###########
#
# PRU Libraries and PRU assembler are build from their own trees.
#
$(APP_LOADER_LIB):
	$(MAKE) -C $(APP_LOADER_DIR)/interface

pasm:
	$(MAKE) -C $(PASM_DIR)

# Include all of the generated dependency files
-include .*.o.d
