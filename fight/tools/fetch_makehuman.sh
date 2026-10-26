#!/bin/sh
# Fetches the MakeHuman data build_mh.py needs (CC0): the base mesh, morph
# targets, the default skeleton and its skin weights. ~140 MB, into tools/.mh.
set -e
cd "$(dirname "$0")"
if [ ! -d .mh/.git ]; then
  git clone --depth 1 --filter=blob:none --sparse https://github.com/makehumancommunity/makehuman.git .mh
fi
cd .mh
git sparse-checkout set makehuman/data/3dobjs makehuman/data/targets makehuman/data/rigs
