# Booking database

`schema.sql` defines the future synchronized booking database. It is not connected to the public static website yet.

GitHub Pages can serve the website but cannot safely receive, authenticate, store, or synchronize appointment records. The live site currently uses a browser-local prototype. A production booking system requires a private backend such as Cloudflare D1/Worker, Supabase, or a dedicated booking provider, plus protected staff access and email notifications.

Never commit real guest names, emails, phone numbers, appointment records, passwords, API keys, or database credentials to this repository.