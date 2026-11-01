#!/bin/sh
# Renders every atlas base layer (4 at a time) and then the finished pictures.
cd "$(dirname "$0")"
R="node render.mjs"
( $R world -62 84 -180 180 11 political & $R sund 40 76 -42 6 34 political & $R east 14 70 -4 112 20 political & $R south -40 22 -48 62 18 political & wait )
( $R west -52 72 -172 -52 12 political & $R morrow -50 -8 108 176 24 political & $R biomes -62 84 -180 180 11 biome & $R theatres -62 84 -180 180 11 theatres & wait )
S="node shoot2.mjs"
$S world proposal-war-atlas-world "&legend=1"
$S sund proposal-war-atlas-sund ""
$S east proposal-war-atlas-east ""
$S south proposal-war-atlas-south ""
$S west proposal-war-atlas-west ""
$S morrow proposal-war-atlas-morrow ""
$S biomes proposal-war-atlas-biomes "&labels=none&legend=1"
$S theatres proposal-war-atlas-theatres ""
echo ALL DONE
