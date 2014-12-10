#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <stdint.h>

#define DATA_SIZE 50*1024*1024

void main() {
	srand(1);

	uint8_t* data = malloc(DATA_SIZE);

	printf("Starting stress test with %d MB of data\n", DATA_SIZE/(1024*1024));

	while (1) {
		data[rand()%DATA_SIZE] = data[rand()%DATA_SIZE];
	}
}