#!/bin/bash
# Script de apertura directa para macOS
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
open "$DIR/index.html"
