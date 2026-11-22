# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **src/app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Run the backend on the STB

Copy `compose.yaml`, `backend/Dockerfile`, `backend/build-stb.sh`, `backend/nginx.conf`, and the `backend/pb_migrations/` and `backend/pb_hooks/` directories to their matching paths under `/mnt/storage/intakely` on the ARM64 STB. From that directory, build PocketBase and start the two services. The build script downloads and verifies the pinned release on the STB host and extracts it inside Docker with networking disabled.

```sh
sudo docker compose config --quiet
sh backend/build-stb.sh && sudo docker compose up -d --no-build --force-recreate
sudo docker compose ps
curl -fsS http://127.0.0.1/api/health
```

The gateway publishes health, signup, password authentication, onboarding, and private diary routes. Expect HTTP 200 and the message `API is healthy.`. Check the same endpoint outside the STB using the public HTTPS URL.

```sh
curl -fsS https://jensenhuang.stei.fun/api/health
```

The STB's systemd `cloudflared` service forwards requests to host port 80. If Cloudflare returns error 1033, check the tunnel connector with `sudo systemctl is-active cloudflared` and confirm the tunnel is Healthy in Cloudflare. PocketBase data lives in the Compose named volume. Use `sudo docker compose down` to stop the stack and preserve its data.

If the `intakely-pocketbase:latest` image is already present on the STB, start it with `sudo docker compose up -d --no-build`. Rebuild when the PocketBase image contents change.

After deployment, verify onboarding and the Diary API with two fictional accounts. From the laptop, run the smoke check below. It leaves two test accounts and their completed setups in PocketBase and removes its test meal.

```powershell
node backend/smoke-diary.mjs https://jensenhuang.stei.fun
```

Then start Expo as above and open the app in Android Expo Go. Sign up with a fictional account, complete onboarding, and save a manual meal in Diary. Sign out and sign in again. Confirm that the app opens Diary and the entry is still there. Try both setup paths with separate accounts. Deploy the updated backend before testing the new mobile login flow so it can read the account's setup status.

The adult estimate uses [Mifflin–St Jeor resting energy expenditure](https://pubmed.ncbi.nlm.nih.gov/2305711/) with app defaults for activity and goal. The activity factors are 1.2, 1.375, 1.55, and 1.725. The starting goal adjustment is +200 kcal for bulking, −200 kcal for cutting, and 0 for maintenance. Users can edit the result and the default macro split of 30% protein, 45% carbs, and 25% fat. Initial targets take effect today in WIB, which matches the current Diary calendar. The app uses the public STB URL by default, with `EXPO_PUBLIC_API_URL` available for a different origin.

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **example** directory and create a blank **src/app** directory where you can start developing.

### Other setup steps

- To set up ESLint for linting, run `npx expo lint`, or follow our guide on ["Using ESLint and Prettier"](https://docs.expo.dev/guides/using-eslint/)
- If you'd like to set up unit testing, follow our guide on ["Unit Testing with Jest"](https://docs.expo.dev/develop/unit-testing/)
- Learn more about the TypeScript setup in this template in our guide on ["Using TypeScript"](https://docs.expo.dev/guides/typescript/)

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
