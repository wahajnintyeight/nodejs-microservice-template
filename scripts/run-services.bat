@echo off

echo Starting microservices...

set args=

:parse_args
if "%~1"=="" goto :run
set args=%args% %1
shift
goto :parse_args

:run
node "%~dp0\run-services.js" %args% 