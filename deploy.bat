@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

set SERVER_IP=121.89.202.27
set SERVER_USER=root
set SSH_KEY=C:\Users\haora\.ssh\next_app_key
set SERVER_DIR=/root/next-accounting-app
set ARCHIVE_NAME=next-accounting-app.tar.gz

echo ==========================================
echo Start deployment to server %SERVER_IP%
echo ==========================================

if not exist "%SSH_KEY%" (
    echo Error: SSH key file not found: %SSH_KEY%
    exit /b 1
)

if not exist "package.json" (
    echo Error: Please run this script in project root directory
    exit /b 1
)

echo Step 1/4: Creating code archive...
tar --exclude=.env --exclude=node_modules --exclude=.next --exclude=.git --exclude=*.log --exclude=next-accounting-app.tar.gz -czf %ARCHIVE_NAME% .

if %errorlevel% neq 0 (
    echo Error: Failed to create archive
    exit /b 1
)

echo Archive created successfully: %ARCHIVE_NAME%

echo Step 2/4: Uploading archive to server...
scp -i "%SSH_KEY%" -o StrictHostKeyChecking=no %ARCHIVE_NAME% %SERVER_USER%@%SERVER_IP%:/root/

if %errorlevel% neq 0 (
    echo Error: Failed to upload archive
    exit /b 1
)

echo Upload successful

echo Step 3/4: Executing deployment on server...
ssh -i "%SSH_KEY%" -o StrictHostKeyChecking=no %SERVER_USER%@%SERVER_IP% "bash %SERVER_DIR%/deploy-server.sh"

if %errorlevel% neq 0 (
    echo Error: Server deployment failed
    exit /b 1
)

echo Step 4/4: Cleaning up local files...
del /f %ARCHIVE_NAME%

echo ==========================================
echo Deployment completed!
echo ==========================================

endlocal
