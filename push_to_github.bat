@echo off
chcp 65001 >nul
echo ===================================================
echo   PANDORA CONTENT STUDIO - GITHUB AUTO PUSH
echo ===================================================

echo [1/3] Kiem tra ket noi GitHub CLI...
gh auth status
if %errorlevel% neq 0 (
    echo [ERROR] Ban chua dang nhap GitHub CLI. Vui long chay: gh auth login
    pause
    exit /b %errorlevel%
)

echo [2/3] Xoa remote origin cu neu co...
git remote remove origin >nul 2>&1

echo [3/3] Dang tao repo tren GitHub va push code len...
gh repo create pandora-content-studio --public --source=. --remote=origin --push

echo.
echo ===================================================
echo   HOAN TAT! Link Repo cua ban:
echo   https://github.com/nguyenquocminhtrading-design/pandora-content-studio
echo ===================================================
pause
