# USPF Website — Starter Project

Premium public website + private owner content portal built with Next.js, Supabase, Cloudinary and Vercel.

## 1. Requirements
- Node.js 20.9+ (recommended current LTS)
- VS Code
- Supabase project
- Cloudinary account
- Vercel account

## 2. Install and run
```bash
npm install
cp .env.example .env.local
npm run dev
```
Open http://localhost:3000

On Windows PowerShell, copy the environment template with:
```powershell
Copy-Item .env.example .env.local
```

Then fill `.env.local` with your Supabase and Cloudinary credentials. Never commit this file.

## 3. Supabase setup
1. Create a Supabase project.
2. Open SQL Editor and run `supabase/schema.sql`.
3. Run `supabase/migrations/20261104140000_website_management.sql` after the starter schema. This creates the website settings, announcement, homepage slide and approved-administrator tables, and replaces the development-wide admin policies.
4. Apply the remaining files in `supabase/migrations` in filename order. This includes the visual page editor, homepage image controls, editable homepage content, announcement scroll modes and the USPF homepage colour palette.
5. In Authentication, create the approved USPF administrator account(s).
6. For each approved administrator, find their Auth user UUID and explicitly add it to the allowlist in SQL Editor:
   ```sql
   insert into public.website_admins (user_id)
   values ('<approved-auth-user-uuid>')
   on conflict (user_id) do nothing;
   ```
   The allowlist is intentionally empty by default. A signed-in user is not an administrator unless their UUID is inserted by a trusted project owner.
7. Set the same URL and anon key in `.env.local`.
8. Configure Auth URL settings: local URL `http://localhost:3000`; later add your Vercel production URL.

## 4. Cloudinary setup
Add Cloudinary cloud name, API key and API secret to `.env.local`.
The signed-upload endpoint is `/api/cloudinary-signature`. It requires an allowlisted USPF administrator.
Use the signature endpoint from the admin media uploader when implementing the upload UI. Keep the API secret server-side only.

## 5. Vercel deployment
1. Push this folder to a private GitHub repository.
2. Import the repository in Vercel.
3. Add every `.env.local` variable under Vercel Project Settings → Environment Variables.
4. Deploy.
5. Add the production domain to Supabase Auth URL configuration.

## 6. Folder structure
- `src/app/page.tsx` — public homepage built from the supplied USPF design
- `src/app/admin/login` — owner login
- `src/app/admin` — content management starter
- `src/app/admin/website` — theme, announcement and homepage managers
- `supabase/migrations/20261111110000_homepage_content_management.sql` — editable homepage content with approved-administrator policies
- `src/app/api/cloudinary-signature` — secure Cloudinary signature
- `src/lib/supabase` — browser/server Supabase clients
- `supabase/schema.sql` — initial database schema
- `supabase/migrations/20261104140000_website_management.sql` — website tables and production administrator policies

## 7. Important before launch
- Replace demo photography with approved USPF photographs and logo.
- Confirm legal name, registration/legal status, leadership designations, contact details, membership rules and organizational structure.
- Publish only verified achievements, statistics, government representation statuses and official documents.
- Keep the `website_admins` allowlist limited to approved USPF administrators. Do not grant admin access to all authenticated users.
- The homepage editor manages its copy, links and card groups; the homepage manager separately manages hero slides and uploads.
- Add bilingual content fields, spam protection, privacy policy and backups before production.
- Use proper consent and safeguarding practices for identifiable children's images.
