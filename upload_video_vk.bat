@echo off
set path=%~dp0iojs
iojs "%~dp0scripts\vkpost.js" --file "%1" -g 31257429
