@echo off
rem 판매 현황 화면이 보내는 질의를 배포 없이 점검합니다 (읽기 전용).
rem 사용: inspection\verify-queries.cmd salesmodel
if "%1"=="" (echo 사용법: inspection\verify-queries.cmd ^<커넥터 이름^> & exit /b 1)
if not exist inspection\results mkdir inspection\results
for %%F in (20-totals 21-members-affiliate 22-members-corporation 23-members-division 24-members-location 25-members-year 26-members-quarter) do (
  echo === %%F ===
  call npx rayfin connector invoke %1 executeQuery --file inspection\%%F.query.json --output-file inspection\results\%%F.json
)
echo.
echo 끝났습니다. 위에 오류가 있었다면 그 부분을 그대로 알려 주세요.
