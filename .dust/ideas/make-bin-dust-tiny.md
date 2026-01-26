# Make bin/dust tiny

`./bin/dust` is the entry point into the CLI. It's excluded from coverage reporting, so it's a place for bugs to hide.

It should be as tiny as possible, i.e. import a function and call it.
