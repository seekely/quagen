#!/bin/sh

# Reloads the worker whenever a file changes in source. 
# Useful for development. 
# 
# NOTE: Ideally, this would just use inotifywait instead of a recurring hash, 
# however at this time, this does not work with Windows and WSL2 without 
# going through some silly hoops:
# https://github.com/microsoft/WSL/issues/4739

hash_files() {
    
    RETURN=`find quagen -type f -name *.py -print0 | sort -z | xargs -0 sha1sum | sha1sum`
    echo $RETURN
}

echo "Starting worker with reloader"
HASH_LAST="None"
HASH_NEW=""
PID="None"

while true; do

    HASH_NEW=$( hash_files )
    if [ "$HASH_LAST" != "$HASH_NEW" ]
    then
        echo "Restarting worker due to file modification"
        echo "Old hash: $HASH_LAST New hash: $HASH_NEW"
        HASH_LAST=$HASH_NEW

        if [ "$PID" != "None" ]
        then
            echo "Killing old process $PID"
            kill $PID
        fi
    
        python quagen/worker.py &
        PID=$!
        echo "Launched with PID $PID"

        sleep 1
    fi

done