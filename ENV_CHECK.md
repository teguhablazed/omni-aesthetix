# Environment Variables Audit - Omni AesthetiX

The following variables must be configured in the Vercel Dashboard for the production environment:

| Variable Name | Description | Source/Usage |
|---------------|-------------|--------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase Project URL | Database Sync |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Anonymous Key | Client-side API calls |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role Key | Server-side admin tasks |
| `HUGGINGFACE_API_KEY` | Hugging Face Inference API Key | AI Vision, Insights, Engagement |
| `GEMINI_API_KEY` | Google Gemini API Key | Future AI Enhancements |

> [!IMPORTANT]
> Ensure all keys are kept confidential and not exposed in the frontend unless prefixed with `NEXT_PUBLIC_`.
