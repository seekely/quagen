#!/bin/sh

# Reloads the worker whenever a file changes in source. 
# Useful for development.

while true; do
    echo "Starting worker with reloader"
    python quagen/worker.py &
    PID=$!
    echo "Launched with PID $PID"
    inotifywait -r quagen -e modify -e create --exclude '\.pyc'
    kill $PID
    echo "Restarting worker due to file modification"
done