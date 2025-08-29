@echo off
REM 백엔드 설치 (새 창)
cd ./apps/messi/api
start cmd /k "poetry install"
cd ../../..

REM 프론트엔드 설치 (새 창)
cd ./apps/messi/ui   
start cmd /k "pnpm i"
cd ../../..






