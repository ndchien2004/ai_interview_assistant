# Cloudinary Auth Artwork Setup

Use this when you want the login/register pages to show a doodle artwork from Cloudinary.

## Fast path: display one uploaded image

1. Open Cloudinary Console.
2. Upload your doodle image in Media Library.
3. Open the uploaded asset and copy its `Secure URL`.
4. Paste that URL into `frontend/.env.local`:

```env
NEXT_PUBLIC_AUTH_ART_IMAGE_URL=https://res.cloudinary.com/<cloud_name>/image/upload/...
```

5. Restart the frontend dev server.

This does not need an API key because the app is only rendering a public image URL.

## Optional: credentials for backend uploads later

Only put these in the root `.env`, never in `frontend/.env.local`:

```env
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
CLOUDINARY_URL=cloudinary://<api_key>:<api_secret>@<cloud_name>
```

`CLOUDINARY_API_SECRET` is a backend secret. Do not commit it and do not expose it with a `NEXT_PUBLIC_` prefix.

## Where to find credentials

Cloudinary Console -> Settings -> API Keys.

You can copy the `CLOUDINARY_URL` format from Cloudinary and paste it into the root `.env`.
