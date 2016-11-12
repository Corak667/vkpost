@echo off
set ext=*.avi;*.mp4;*.wmv;*.asf;*.mpg;*.mpeg;*.mpe;*.m4v;*.flv;*.mov;*.vob;*.ogm;*.mkv;*.rmvb;*.rm;*.webm;*.ts
set mainpath=%cd%
set iojs=%mainpath%\iojs\iojs.exe
set nodejs=%mainpath%\nodejs\node.exe
set script=%mainpath%\scripts\vkpost.js
set groupid=
set token=0
set tokenparam=-k %token%
if %token% EQU 0 set tokenparam=
if not exist vkvideo_log.txt echo Log Start>vkvideo_log.txt
for %%G in (%ext%) do (
"%iojs%" "%script%" --file "%%G" -g %groupid% %tokenparam% --no-encode-progress>temp.txt 
type temp.txt 
copy /b vkvideo_log.txt+temp.txt vkvideo_log.txt)
pause
