@echo off
set ext=*.7z
set mainpath=%cd%
set iojs=%mainpath%\iojs\iojs.exe
set nodejs=%mainpath%\nodejs\node.exe
set script=%mainpath%\scripts\vkdoc.js
set groupid=
set token=0
set tokenparam=-k %token%
if %token% EQU 0 set tokenparam=
for %%G in (%ext%) do (
"%iojs%" "%script%" --file "%%G" -g %groupid% %tokenparam% --no-encode-progress>temp.txt 
type temp.txt 
if not exist vkdocs_log.txt echo Log Start>vkdocs_log.txt
copy /b vkdocs_log.txt+temp.txt vkdocs_log.txt)
pause
