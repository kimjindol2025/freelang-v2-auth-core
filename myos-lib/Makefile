# MyOS_Lib - Zero-Dependency Build System

CC = gcc
CFLAGS = -fPIC -Wall -Wextra -O2 -nostdlib -fno-builtin -fno-stack-protector
LDFLAGS = -nostdlib

INCLUDE_DIR = include
SRC_DIR = src
ARCH_DIR = arch/x86_64
TEST_DIR = tests
BUILD_DIR = build
BIN_DIR = build/bin

.PHONY: all clean test build dirs

all: build test

dirs:
	@mkdir -p $(BUILD_DIR) $(BIN_DIR)

build: dirs $(BIN_DIR)/test_memory

$(BUILD_DIR)/syscall.o: $(ARCH_DIR)/syscall.c
	$(CC) $(CFLAGS) -I$(INCLUDE_DIR) -c $< -o $@

$(BUILD_DIR)/memory.o: $(SRC_DIR)/memory.c
	$(CC) $(CFLAGS) -I$(INCLUDE_DIR) -c $< -o $@

$(BUILD_DIR)/test_memory.o: $(TEST_DIR)/test_memory.c
	$(CC) $(CFLAGS) -I$(INCLUDE_DIR) -c $< -o $@

$(BIN_DIR)/test_memory: $(BUILD_DIR)/syscall.o $(BUILD_DIR)/memory.o $(BUILD_DIR)/test_memory.o
	$(CC) $(LDFLAGS) -o $@ $^

test: $(BIN_DIR)/test_memory
	@echo "╔════════════════════════════════════════╗"
	@echo "║  MyOS_Lib Phase 8.1 Memory Tests      ║"
	@echo "╚════════════════════════════════════════╝"
	@echo ""
	@$(BIN_DIR)/test_memory
	@echo ""

clean:
	@rm -rf $(BUILD_DIR)
	@echo "Cleaned: build directory removed"
