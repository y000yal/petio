# Self-signed Windows builds

Run `npm run dist:self-signed` on Windows. The first run creates a three-year
RSA/SHA-256 code-signing certificate named **Petio Development** in the current
user's Personal certificate store. Later builds reuse its thumbprint from
`.signing/thumbprint.txt`. The private key is non-exportable and stays with this
Windows user account; no private key or password is bundled in Petio.

The signed installer and public `.cer` certificate are written to
`release/self-signed/`. The usual `npm run dist` build is unchanged.
Keep access to this Windows account for future builds using the same identity.

This is a development identity, not a verified public publisher. Other computers
can still show untrusted-publisher or SmartScreen warnings, and signing does not
resolve antivirus detections. The build does not install certificates into any
Trusted Root store. Share the installer; the `.cer` contains only the public
certificate and is provided for inspection or explicitly managed testing.
