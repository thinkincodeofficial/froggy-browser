# Publishing Froggy to GitHub

How to get this folder onto GitHub, build the installers and publish the first release, starting from creating the repo.

Run every command in PowerShell 7 from this folder (`code/`). If git says `not a git repository`, you're in the wrong folder.

## 1. Switch to the right account

```powershell
cd "G:\Youtube\Section-11- Projects\Video-52-I Built My Own Browser\code"
ghuser thinkincode
```

Check that it prints `gh: thinkincodeofficial`. Commits and pushes use whichever account is active here.

## 2. Create the repo on GitHub

1. Go to <https://github.com/new>, signed in as `thinkincodeofficial`.
2. Set **Repository name** to `froggy-browser`.
3. Set the description to: `A fast, customizable browser with vertical tabs, split view, floating windows, built-in ad blocking and Chrome extension support.`
4. Choose **Public**, or **Private** if you want to check it first and publish in step 6.
5. Leave **README**, **.gitignore** and **license** all turned off. The repo has to start empty, because this folder already has those files.
6. Click **Create repository**.

## 3. Clean up the local history

Do this once, before the first push. It squashes the existing commits into one clean commit and removes the old tag, which still points at a commit with a co-author line.

```powershell
git tag -d v0.1.0
git reset --soft $(git rev-list --max-parents=0 HEAD)
git add -A
git commit --amend -m "Add Froggy browser source"
```

Check the result:

```powershell
git log --format='%h %an <%ae> %s%n%b'
git tag
```

You should see one commit by `thinkincodeofficial` with no `Co-Authored-By` line, and no tags.

## 4. Push the code

```powershell
git remote -v
git push -u origin main
```

`origin` should be `https://github.com/thinkincodeofficial/froggy-browser.git`. If it isn't, fix it, then push:

```powershell
git remote set-url origin https://github.com/thinkincodeofficial/froggy-browser.git
```

The push doesn't need `--force`, because the repo is empty.

## 5. Test the installer builds

Do this before tagging a release, because the macOS and Linux builds have never been run.

```powershell
gh workflow run build.yml
gh run list --limit 1
gh run watch
```

`gh run watch` asks which run to follow if there's more than one. All three jobs (Windows, macOS, Linux) need to pass. If one fails, see the error with:

```powershell
gh run view --log-failed
```

Fix it, commit, push, and run this step again. The finished installers are attached to the run under **Actions**, so you can download and try them.

## 6. Make the repo public

Skip this if you chose **Public** in step 2.

```powershell
gh repo edit thinkincodeofficial/froggy-browser --visibility public --accept-visibility-change-consequences
```

Check that nothing private is in the repo first, because this exposes the full history.

## 7. Publish the first release

Run this only after step 5 passes.

```powershell
git tag v0.1.0
git push origin v0.1.0
gh run watch
```

Pushing the tag runs the builds again and publishes the installers as a GitHub Release. Check that all four files are there:

```powershell
gh release view v0.1.0
```

You should see:

- `Froggy-Setup-x64.exe`
- `Froggy-mac-universal.dmg`
- `Froggy-linux-x86_64.AppImage`
- `Froggy-linux-amd64.deb`

## 8. Check the public page

1. Open <https://github.com/thinkincodeofficial/froggy-browser> in a private browser window, so you see what viewers see.
2. Click each download button in the README. They only work once the repo is public and the release exists.
3. Check that **Contributors** lists only `thinkincodeofficial`. This can take a little while to update.
4. Put the repo link in the video description.

## Releasing a new version later

1. Change `version` in `package.json`, for example to `0.2.0`.
2. Commit and push:

   ```powershell
   git add -A
   git commit -m "Release v0.2.0"
   git push
   ```

3. Tag it:

   ```powershell
   git tag v0.2.0
   git push origin v0.2.0
   ```

The README's download buttons always point at the latest release, so they don't need changing.

## Troubleshooting

| Problem | Fix |
|---|---|
| `Repository not found` on push | The repo doesn't exist yet, or the wrong account is active. Run `ghuser` to check, and repeat step 2 if needed. |
| `npm ci` fails with `Missing: ... from lock file` | `package-lock.json` is out of date. Delete it and `node_modules`, run `npm install`, commit the new lockfile and push. |
| Push rejected because it would expose your email | Turn off **Block command line pushes that expose my email** in GitHub's email settings, or commit with your `noreply` address. |
| `ghuser` isn't recognised | Open a new PowerShell 7 window. The command isn't available in Windows PowerShell 5.1 or Git Bash. |
| Download buttons return 404 | The repo is still private, or the release hasn't been published. |
