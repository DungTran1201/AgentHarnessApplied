; Script generated for AI-Chan Windows Installer
; Inno Setup 6.x

#define MyAppName "AI-Chan"
#define MyAppVersion "0.1.2"
#define MyAppPublisher "AI-Chan Team"
#define MyAppURL "https://github.com/DungTran1201/AgentHarnessApplied"
#define MyAppExeName "AI-Chan.exe"

[Setup]
AppId={{B983A7E2-60D4-4E84-88A9-9C5F8F7E1D2A}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={localappdata}\Programs\AI-Chan
DisableProgramGroupPage=yes
PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=dialog
OutputDir=..\..\dist\installer
OutputBaseFilename=AI-Chan-Setup
SetupIconFile=assets\app.ico
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
ArchitecturesInstallIn64BitMode=x64compatible
CloseApplications=yes
CloseApplicationsFilter=*.exe

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"

[Files]
; Main Launcher & Assets
Source: "..\..\dist\bundle\AI-Chan.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "assets\app.ico"; DestDir: "{app}\assets"; Flags: ignoreversion

; Backend Bundle (onedir)
Source: "..\..\dist\bundle\backend\*"; DestDir: "{app}\backend"; Flags: ignoreversion recursesubdirs createallsubdirs

; Frontend Standalone Bundle (Next.js + Node)
Source: "..\..\dist\bundle\frontend\*"; DestDir: "{app}\frontend"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{autoprograms}\{#MyAppName}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\assets\app.ico"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\assets\app.ico"; Tasks: desktopicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent

[Code]
procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
var
  UserDataDir: String;
  ResultCode: Integer;
begin
  if CurUninstallStep = usUninstall then
  begin
    // Attempt clean stop of running services before uninstalling files
    Exec(ExpandConstant('{app}\{#MyAppExeName}'), '--stop', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
  end;

  if CurUninstallStep = usPostUninstall then
  begin
    UserDataDir := ExpandConstant('{localappdata}\AI-Chan');
    if DirExists(UserDataDir) then
    begin
      if MsgBox('Do you want to delete your personal projects, database, and uploaded data from this computer?' + #13#10 + #13#10 +
                'Click "No" to keep your data intact for future use or reinstalling.', mbConfirmation, MB_YESNO) = IDYES then
      begin
        DelTree(UserDataDir, True, True, True);
      end;
    end;
  end;
end;
