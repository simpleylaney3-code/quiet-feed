# Quiet feed: setup

This folder is the whole app. You need to do three things: get two Google keys, paste them into `config.js`, and put the folder online.

## 1. Google Cloud (free)
1. Go to console.cloud.google.com and sign in with the Google account you want to use.
2. Create a project (any name, e.g. "quiet-feed").
3. APIs & Services > Library > search **YouTube Data API v3** > Enable.

## 2. API key (loads channels, videos and search)
1. APIs & Services > Credentials > Create credentials > API key.
2. Edit the key: under "API restrictions" pick **YouTube Data API v3**. After you know your site address (step 4), also add it under "Website restrictions".
3. Paste the key into `config.js` as `API_KEY`.

## 3. Sign-in ID (only needed for the Google sign-in and subscription import)
1. APIs & Services > OAuth consent screen > User type **External** > fill in the app name and your email.
2. Leave the publishing status on **Testing**, and under "Test users" add the Google account that has YouTube Premium.
3. Credentials > Create credentials > OAuth client ID > **Web application**.
4. Under "Authorized JavaScript origins" add your site address, for example `https://yourname.github.io` (no path, no trailing slash).
5. Paste the client ID into `config.js` as `CLIENT_ID`.

Google will show an "unverified app" warning when you sign in. That is normal for a personal app: tap Advanced, then continue.

## 4. Put it online (GitHub Pages, free)
1. Create a GitHub account, then a new public repository named `quiet-feed`.
2. Upload every file in this folder (drag them into the repository page).
3. Settings > Pages > Source: **Deploy from a branch** > `main` / root > Save.
4. After a minute your app is at `https://yourname.github.io/quiet-feed/`.

## 5. Install on your iPhone
Open that address in **Safari**, tap Share, then **Add to Home Screen**.

## Notes
- Videos play in YouTube's official player. Premium ad-free playback depends on being signed into YouTube inside that player. Test it on your phone.
- Audio stops when the phone locks or you leave the app. This is a YouTube rule for embedded players.
- Search costs 100 of your 10,000 free daily quota units. Loading your channels costs very little.
- Playlists and your channel list are saved in the browser on that device. The home-screen app and Safari keep separate copies.
- Keep your key private-ish: the website restriction in step 2 stops other sites from using it.
