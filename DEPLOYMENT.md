# Deployment Instructions

Follow these steps to deploy the database schema and host the web application.

---

## Part 1: Database Setup (Supabase)

1. **Log in to Supabase CLI:**
   ```bash
   npx supabase login
   ```
2. **Link to your Supabase Project:**
   ```bash
   # Replace with your actual Project Reference ID (e.g., gwqkvyvroodmhmpblmox)
   npx supabase link --project-ref gwqkvyvroodmhmpblmox
   ```
   *Enter your database password when prompted.*
3. **Deploy the database schema:**
   ```bash
   npx supabase db push
   ```

---

## Part 2: Web App Deployment (Vercel)

### Step 1: Commit and Push to Git
Commit the project adjustments to your remote Git repository:
```bash
git add .
git commit -m "chore: cleanup unnecessary files and prepare for deployment"
git push origin main
```

### Step 2: Import into Vercel
1. Log in to [Vercel](https://vercel.com/) and click **Add New** > **Project**.
2. Import your Git repository.
3. Keep default settings (Vercel automatically detects the Vite/Nitro setup).

### Step 3: Add Database Environment Variables
Under the **Environment Variables** section on Vercel, copy and paste the following keys and values from your new Supabase Project (**Project Settings** > **API**):

| Environment Variable Key | Description / Source |
| :--- | :--- |
| `SUPABASE_URL` | Project URL from Supabase API settings |
| `SUPABASE_PUBLISHABLE_KEY` | Public `anon` key from Supabase API settings |
| `VITE_SUPABASE_URL` | Same as `SUPABASE_URL` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Same as `SUPABASE_PUBLISHABLE_KEY` |
| `VITE_SUPABASE_PROJECT_ID` | `gwqkvyvroodmhmpblmox` (Your Supabase Project Ref) |
| `SUPABASE_SERVICE_ROLE_KEY` | `service_role` (Secret API Key) |
| `LOVABLE_API_KEY` | *(Optional: add only if you are using Lovable's AI APIs)* |

### Step 4: Deploy
Click **Deploy**. Vercel will build and launch your application!
