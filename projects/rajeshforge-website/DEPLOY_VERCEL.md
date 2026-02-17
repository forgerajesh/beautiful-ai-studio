# Deploy RajeshForge Website on Vercel (5 Minutes)

## 1) Import repository
1. Open: https://vercel.com/new
2. Import `forgerajesh/rajeshforge-website`
3. Framework preset: **Other** (static site)
4. Root directory: `.`
5. Build command: *(leave empty)*
6. Output directory: *(leave empty)*
7. Click **Deploy**

## 2) Add custom domain
1. Vercel Project → **Settings** → **Domains**
2. Add:
   - `rajeshforge.com`
   - `www.rajeshforge.com`

## 3) DNS records (at your domain provider)
Use records shown by Vercel. Typical setup:
- `A` record: `@` → `76.76.21.21`
- `CNAME`: `www` → `cname.vercel-dns.com`

## 4) Final settings
- Enable redirect: `www.rajeshforge.com` → `rajeshforge.com`
- SSL should auto-issue (Let's Encrypt)

## 5) Post-deploy checks
- Home page loads over HTTPS
- All menu links work
- Contact page works
- Mobile layout looks correct

---
If you share Vercel project invite, I can validate and finish domain routing instantly.
