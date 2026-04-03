@echo off
REM ========================================
REM BrewPro - Lanceur Next.js PRO
REM ========================================

REM Vérifier si npm est installé
where npm >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo Erreur : npm n'est pas installé.
    pause
    exit /b
)

REM Se placer dans le dossier du script
cd /d "%~dp0"

REM Vérifier si le port 3000 est déjà utilisé
netstat -ano | findstr ":3000" >nul
IF %ERRORLEVEL% EQU 0 (
    echo Attention : Le port 3000 semble déjà utilisé.
    echo Veux-tu tuer le processus qui utilise ce port ? (O/N)
    set /p choix=
    if /i "%choix%"=="O" (
        for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000"') do taskkill /PID %%a /F
        echo Processus tue. Port liberé.
    ) else (
        echo Abandon du lancement.
        pause
        exit /b
    )
)

echo ========================================
echo Lancement de BrewPro...
echo ========================================

REM Lancer le navigateur automatiquement
start "" "http://localhost:3000"

REM Lancer le serveur Next.js
npm run dev

REM Garder la fenêtre ouverte pour voir les logs
pause