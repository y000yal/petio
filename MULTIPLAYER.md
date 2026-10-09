# Local multiplayer prototype

Run `npm run social:server` in a terminal and leave it running. The server binds
only to `127.0.0.1:4319`; it is not exposed to your network or the internet.

Launch two independent desktop clients in separate PowerShell terminals:

```powershell
$env:PETIO_PROFILE='alice'; npm start
```

```powershell
$env:PETIO_PROFILE='bob'; npm start
```

Open Settings → Friends & visits in both. Create a profile in each. Create a
group in one, copy its private invite code, and join in the other. The recipient
must enable visits. Send a message with your pet. Your pet disappears at home;
the recipient's own pet stays while your visitor appears with the message.
The recipient can reply and send it home; the owner can recall it from settings
or the tray. Visits end after five minutes or lost presence. During a server
outage visitors close and an away owner returns after twenty seconds of failed
polling. Deferred reminders are delivered when the owner's pet returns.

Server records are stored locally in ignored `.social/server.json`. Desktop
identities live in each profile's `social.json`. Tokens and invite codes are
private credentials; do not share the server data file. No desktop screenshots,
window titles, Windows notifications or reminder contents are transmitted.

This prototype has display-name identities, one group per profile, and one
incoming visitor per desktop. It uses two-second HTTP polling, renders visitors
locally at 24 FPS, and has no new runtime dependencies. It does not yet provide
public account recovery, moderation, TLS hosting, group chat, or offline mail.
Internet deployment needs a hosted authenticated service and secure credential
storage before distributing it to friends. The installer has not been rebuilt
for this prototype.
