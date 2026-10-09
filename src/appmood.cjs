// Turns "which app is in front" (process name + window title, both lower-case) into a mood category the pet can comment on.
// Pure and offline: nothing here stores or sends the title.
const has = (text, words) => words.some(w => text.includes(w));

const byTitle = [
  ['claude', t => has(t, ['claude'])],
  ['agent', t => has(t, ['chatgpt', 'gemini', 'copilot', 'codex', 'perplexity', 'windsurf', 'aider', 'deepseek', 'grok', 'mistral'])],
  ['video', t => has(t, ['youtube', 'netflix', 'prime video', 'disney+', 'hotstar', 'twitch', 'vimeo', 'crunchyroll', 'hulu', 'hbo max', 'movies', ' episode ', 'watch '])],
  ['meeting', t => has(t, ['meet.google', 'google meet', 'zoom meeting', 'meeting', 'huddle'])],
  ['social', t => has(t, ['twitter', ' / x', 'reddit', 'instagram', 'facebook', 'linkedin', 'tiktok'])],
  ['mail', t => has(t, ['gmail', 'inbox', 'outlook'])],
  ['docs', t => has(t, ['google docs', 'google sheets', 'google slides', 'notion', 'figma'])],
  ['music', t => has(t, ['youtube music', 'spotify', 'soundcloud'])]
];

const byApp = [
  ['claude', ['claude']],
  ['cursor', ['cursor']],
  ['agent', ['windsurf', 'codex', 'chatgpt']],
  ['editor', ['code', 'devenv', 'idea64', 'pycharm64', 'webstorm64', 'phpstorm64', 'sublime_text', 'notepad++', 'zed', 'atom', 'androidstudio64']],
  ['terminal', ['windowsterminal', 'wt', 'cmd', 'powershell', 'pwsh', 'alacritty', 'wezterm', 'mintty', 'conhost', 'warp']],
  ['video', ['vlc', 'mpv', 'potplayermini64', 'potplayer', 'wmplayer', 'mpc-hc64', 'movies', 'netflix']],
  ['music', ['spotify', 'musicbee', 'itunes', 'foobar2000', 'applemusic']],
  ['meeting', ['zoom', 'webex', 'ms-teams', 'teams']],
  ['chat', ['discord', 'slack', 'whatsapp', 'telegram', 'signal', 'skype']],
  ['mail', ['outlook', 'thunderbird', 'olk']],
  ['docs', ['winword', 'excel', 'powerpnt', 'notion', 'obsidian', 'onenote', 'acrobat', 'acrord32', 'sumatrapdf']],
  ['design', ['figma', 'photoshop', 'illustrator', 'canva', 'blender', 'xd', 'afterfx', 'premiere', 'resolve', 'krita', 'gimp']],
  ['game', ['steam', 'epicgameslauncher', 'riotclientservices', 'valorant', 'minecraft', 'javaw']],
  ['files', ['explorer']],
  ['browser', ['chrome', 'msedge', 'firefox', 'brave', 'opera', 'vivaldi', 'arc', 'zen']]
];

// ownPid: Petio's own windows never count. Returns a category string or null.
function classify(info, ownPid) {
  if (!info || info.pid === ownPid) return null;
  const name = (info.name || '').replace(/\.exe$/, ''), title = info.title || '';
  const isBrowser = byApp.find(([k]) => k === 'browser')[1].includes(name);
  if (isBrowser || name === 'code' || name === 'cursor' || has(name, ['terminal', 'powershell', 'cmd', 'wt'])) {
    for (const [cat, test] of byTitle) if (test(title)) return cat;
  }
  for (const [cat, names] of byApp) if (names.includes(name)) return cat;
  if (info.fullscreen) return 'game';
  return null;
}

module.exports = { classify };
