
  # Creator Influencer Registration App

  This is a code bundle for Creator Influencer Registration App. The original project is available at https://www.figma.com/design/WxP5p9czan03WugQWLx0i3/KOL-Influencer-Registration-App.

  ## Running the code

  Run `npm i` to install the dependencies.

  Run `npm run dev` to start the development server.

  ## Supabase Storage (Facebook profile images)

  When users register with Facebook, their profile picture is uploaded to Supabase Storage so it can be displayed reliably (Facebook’s image URLs often return 404 in the browser). Create a bucket named **`profile-images`** and make it **public**:

  - In Supabase Dashboard: **Storage** → **New bucket** → name: `profile-images` → enable **Public bucket**.
  - If the bucket is missing, the app falls back to Facebook’s URL (which may 404); profile images will still work for users who upload a custom image later.
  