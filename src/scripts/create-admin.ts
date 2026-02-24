import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

// Load env variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function createSuperUser() {
    const email = 'admin@omniaesthetix.id';
    const password = 'Password123!'; // User can change this later

    console.log(`--- Attempting to create user: ${email} ---`);

    // 1. Create User in Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true
    });

    if (authError) {
        if (authError.message.includes('already registered')) {
            console.log("User already exists in Auth. Proceeding to profile check...");
            // Try to get the user ID if they exist
            const { data: listData } = await supabase.auth.admin.listUsers();
            const existingUser = listData?.users.find(u => u.email === email);
            if (existingUser) {
                await createProfile(existingUser.id);
            }
        } else {
            console.error("Error creating auth user:", authError.message);
            return;
        }
    } else if (authData.user) {
        console.log("Auth user created successfully!");
        await createProfile(authData.user.id);
    }
}

async function createProfile(userId: string) {
    // 2. Create Profile in public.profiles
    const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
            id: userId,
            full_name: 'Omni Admin',
            role: 'admin'
        });

    if (profileError) {
        console.error("Error creating profile:", profileError.message);
    } else {
        console.log("--- SUCCESS! ---");
        console.log("Email: admin@omniaesthetix.id");
        console.log("Password: Password123!");
        console.log("-----------------");
    }
}

createSuperUser();
