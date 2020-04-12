#!/bin/bash
#
# Setup dependencies for running the Quagen web processes

# Python deps 
pip install --no-cache-dir -r requirements.txt
if [ -f "requirements-dev.txt" ]; then 
    pip install --no-cache-dir -r requirements-dev.txt;
fi
