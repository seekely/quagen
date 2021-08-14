#!/bin/sh

# Rebuilds the javascript whenever a file changes in source. 
# Useful for development. 
# 
# NOTE: Ideally, this would just be `npm run autobuild` of a recurring hash, 
# however at this time, this does not work with Windows and WSL2 without 
# going through some silly hoops:
# https://github.com/microsoft/WSL/issues/4739

hash_files() {
    
    RETURN=`find src/quagen/ui -type f \( -iname "*.js" -o -iname "*.svelte" \) -print0 | sort -z | xargs -0 sha1sum | sha1sum`
    echo $RETURN
}

echo "Starting builder with reloader"
HASH_LAST="None"
HASH_NEW=""
PID="None"

while true; do

    HASH_NEW=$( hash_files )
    if [ "$HASH_LAST" != "$HASH_NEW" ]
    then
        echo "Rebuilding javascript due to file modification"
        echo "Old hash: $HASH_LAST New hash: $HASH_NEW"
        HASH_LAST=$HASH_NEW
    
        npm run build

        sleep 1
    fi

done