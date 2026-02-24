# Omni AesthetiX - Deployment Guide

This document outlines the steps to deploy Omni AesthetiX to a production environment (Vercel) and configure the necessary services.

## Environment Variables

The following environment variables must be configured in your Vercel project settings:

| Variable | Description | Source |
|----------|-------------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase Project URL | Supabase Dashboard > Settings > API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase Project Anon Key | Supabase Dashboard > Settings > API |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase Service Role Key (Server-side) | Supabase Dashboard > Settings > API |
| `HUGGINGFACE_API_KEY` | API Key for AI Vision Inference | Hugging Face Settings > Tokens |

## Production Readiness Checklist

### 1. Database Indexing
Ensure you have run the indexing script located at `supabase/migrations/20260222_indexing.sql` in the Supabase SQL Editor to maintain high performance at scale.

### 2. Authentication Configuration
- Configure **Site URL** in Supabase Auth settings to match your production domain (e.g., `https://omni-aesthetix.vercel.app`).
- Add the production domain to **Redirect URLs**.

### 3. AI Inference (Hugging Face)
Verify that your Hugging Face API key has access to the `Qwen/Qwen2-VL-7B-Instruct` model. If the API is busy, the built-in `ErrorBoundary` will gracefully handle the timeout.

## Deployment Steps (Vercel)

1. **Connect Repository**: Import your repository into Vercel.
2. **Configure Build Settings**:
   - Framework Preset: `Next.js`
   - Build Command: `npm run build`
   - Output Directory: `.next`
3. **Add Environment Variables**: Copy and paste the variables from the table above.
4. **Deploy**: Click "Deploy". Vercel will automatically build and serve the application.

## Troubleshooting

- **Build Errors**: Ensure all `use client` directives are present in interactive components.
- **AI Analysis Fails**: Check if the `HUGGINGFACE_API_KEY` is correct and has not exceeded its quota.
- **Permission Denied**: Ensure RLS (Row Level Security) policies in Supabase are correctly configured for your user roles.

---
*Omni AesthetiX AI Intelligence System - Production Ready.*
