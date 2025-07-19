# RegIQ - Regulatory Intelligence Platform

RegIQ is a comprehensive regulatory intelligence platform that helps organizations stay informed about regulatory changes and compliance requirements.

## Project info

**URL**: https://lovable.dev/projects/17967fd3-c5a0-4356-a144-f39563d94aba

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/17967fd3-c5a0-4356-a144-f39563d94aba) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

## Environment Variables for Local Development

Create a `.env.local` file in the project root with:

```env
VITE_SUPABASE_URL=https://piyikxxgoekawboitrzz.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpeWlreHhnb2VrYXdib2l0cnp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI5MDM2MjUsImV4cCI6MjA2ODQ3OTYyNX0.YfgCG-BorBSfyXk4MdIxko9AHT4-ef0MfO24rCpjy94
VITE_SUPABASE_REDIRECT_URL=http://localhost:5173/auth/callback
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Supabase (Authentication, Database, Edge Functions)
- React Router v6
- TanStack Query

## Authentication Features

RegIQ includes a complete authentication system accessible at `/login`:

- **Email/Password Sign-in**: Traditional authentication
- **Magic Link**: Passwordless login via email  
- **Password Reset**: Secure password recovery
- **Route Protection**: Automatic redirection for unauthenticated users

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/17967fd3-c5a0-4356-a144-f39563d94aba) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)
