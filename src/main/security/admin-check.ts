export interface AdminCheckResult {
  isAdmin: boolean;
  platform: NodeJS.Platform;
  instructions?: string;
}

interface AdminCheckOptions {
  isElevated?: boolean;
}

const MACOS_INSTRUCTIONS =
  'To run TalkTerm with admin privileges, open Terminal and run:\n\nsudo /Applications/TalkTerm.app/Contents/MacOS/TalkTerm';

const WINDOWS_INSTRUCTIONS =
  'Right-click TalkTerm → Run as administrator\n\nOr search for TalkTerm, right-click, and select "Run as administrator".';

const LINUX_INSTRUCTIONS =
  'To run TalkTerm with admin privileges, open a terminal and run:\n\nsudo talkterm';

function getInstructionsForPlatform(platform: NodeJS.Platform): string {
  switch (platform) {
    case 'darwin':
      return MACOS_INSTRUCTIONS;
    case 'win32':
      return WINDOWS_INSTRUCTIONS;
    case 'linux':
      return LINUX_INSTRUCTIONS;
    default:
      return LINUX_INSTRUCTIONS;
  }
}

function checkUnixAdmin(): boolean {
  if (typeof process.getuid === 'function') {
    return process.getuid() === 0;
  }
  return false;
}

export function checkAdminPrivileges(options?: AdminCheckOptions): AdminCheckResult {
  const platform = process.platform;

  let isAdmin: boolean;

  if (platform === 'win32') {
    isAdmin = options?.isElevated === true;
  } else {
    isAdmin = checkUnixAdmin();
  }

  return {
    isAdmin,
    platform,
    ...(isAdmin ? {} : { instructions: getInstructionsForPlatform(platform) }),
  };
}
