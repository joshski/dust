# Print all goals in `agent understand goals`

Currently `bin/dust agent understand goals` just tells the agent to run `bin/dust list goals`. It would be more efficient to print all goals directly in the command output, saving a round-trip.

Options:
- Have `agent understand goals` call the list command and include the output
- Make the template dynamically include the goals list
- Keep the current approach if we want agents to learn the list command
