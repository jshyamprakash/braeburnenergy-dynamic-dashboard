#!/usr/bin/env python3
"""
Convert PRODUCTION_READY_POC.md to client-friendly version
Removes code blocks while preserving structure and methodology
"""

import re

def is_file_tree_line(line):
    """Check if line is part of a file tree structure"""
    tree_chars = ['├', '└', '│', '┌', '┐', '┘', '─']
    return any(char in line for char in tree_chars)

def is_code_block_start(line):
    """Check if line starts a code block"""
    return line.strip().startswith('```')

def main():
    input_file = "docs/PRODUCTION_READY_POC.md"
    output_file = "docs/PRODUCTION_READY_POC_CLIENT.md"

    with open(input_file, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    result = []
    in_code_block = False
    code_block_lang = None
    skip_next_blank = False

    i = 0
    while i < len(lines):
        line = lines[i]

        # Handle code block start
        if is_code_block_start(line):
            if not in_code_block:
                # Starting code block
                in_code_block = True
                # Extract language from ```language
                code_block_lang = line.strip()[3:].strip()

                # Replace with placeholder
                result.append("\n*[Implementation details available in technical documentation]*\n\n")
                skip_next_blank = True
            else:
                # Ending code block
                in_code_block = False
                code_block_lang = None
            i += 1
            continue

        # Skip lines inside code blocks
        if in_code_block:
            i += 1
            continue

        # Skip blank line after placeholder
        if skip_next_blank and line.strip() == '':
            skip_next_blank = False
            i += 1
            continue

        # Keep file tree structures
        if is_file_tree_line(line):
            result.append(line)
            i += 1
            continue

        # Keep all other lines
        result.append(line)
        i += 1

    # Write output
    with open(output_file, 'w', encoding='utf-8') as f:
        f.writelines(result)

    # Calculate statistics
    original_lines = len(lines)
    output_lines = len(result)
    removed_lines = original_lines - output_lines

    print(f"✓ Created {output_file}")
    print(f"✓ Original: {original_lines} lines")
    print(f"✓ Output: {output_lines} lines")
    print(f"✓ Removed: {removed_lines} lines ({removed_lines * 100 // original_lines}%)")
    print(f"✓ All code examples replaced with placeholders")
    print(f"✓ File structure and methodology preserved")

if __name__ == "__main__":
    main()
