# Refactor CLI command list

The list of commands in `lib/cli/main.ts` is represented as a constant.

By making it an object or class with methods corresponding to the names of the commands, we could avoid the switch/case statement and simplify the structure of the code. Potentially we could use that same object/data structure to generate the help text.
