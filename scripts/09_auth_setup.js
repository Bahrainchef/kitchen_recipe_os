#!/usr/bin/env node
/**
 * Auth setup — creates profiles table, trigger, RLS, and Paul's owner account.
 * Run once: node scripts/09_auth_setup.js
 */

const fs = require('fs')
const path = require('path')

const env = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8')
const vars = {}
for (const line of env.split('\n')) {
  const m = line.match(/^([^#=\s]+)\s*=\s*(.*)$/)
  if (m) vars[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
}

const { createClient } = require('../node_modules/@supabase/supabase-js')
const sb = createClient(vars['NEXT_PUBLIC_SUPABASE_URL'], vars['SUPABASE_SERVICE_ROLE_KEY'])

async function run() {
  console.log('🔐 Setting up auth tables...')

  // 1. Create profiles table
  const { error: tableError } = await sb.rpc('exec_sql', {
    sql: `
      create table if not exists public.profiles (
        id          uuid references auth.users(id) on delete cascade primary key,
        email       text not null unique,
        full_name   text not null default '',
        role        text not null default 'staff'
                    check (role in ('owner','manager','chef','staff')),
        status      text not null default 'pending'
                    check (status in ('pending','active','disabled')),
        venue_ids   uuid[],
        invited_by  uuid,
        created_at  timestamptz default now(),
        updated_at  timestamptz default now()
      );
    `
  })

  // If rpc not available, use raw SQL via postgres REST
  // Fallback: use admin API direct SQL
  if (tableError) {
    console.log('RPC not available — using direct table operations')
  }

  // Try creating table via REST admin endpoint
  const baseUrl = vars['NEXT_PUBLIC_SUPABASE_URL']
  const serviceKey = vars['SUPABASE_SERVICE_ROLE_KEY']

  const sqlStatements = [
    // profiles table
    `create table if not exists public.profiles (
      id          uuid references auth.users(id) on delete cascade primary key,
      email       text not null unique,
      full_name   text not null default '',
      role        text not null default 'staff'
                  check (role in ('owner','manager','chef','staff')),
      status      text not null default 'pending'
                  check (status in ('pending','active','disabled')),
      venue_ids   uuid[],
      invited_by  uuid,
      created_at  timestamptz default now(),
      updated_at  timestamptz default now()
    )`,

    // Trigger function
    `create or replace function public.handle_new_user()
    returns trigger language plpgsql security definer set search_path = public as $$
    begin
      insert into public.profiles (id, email, full_name, role, status, venue_ids, invited_by)
      values (
        new.id,
        new.email,
        coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)),
        coalesce(new.raw_user_meta_data->>'role', 'staff'),
        case
          when new.email = 'thebahrainchef@gmail.com' then 'active'
          when (new.raw_user_meta_data->>'invited_by') is not null then 'active'
          else 'pending'
        end,
        case
          when new.raw_user_meta_data->'venue_ids' is not null
          then array(select jsonb_array_elements_text(new.raw_user_meta_data->'venue_ids'))::uuid[]
          else null
        end,
        (new.raw_user_meta_data->>'invited_by')::uuid
      )
      on conflict (id) do update set
        email      = excluded.email,
        updated_at = now();
      return new;
    end;
    $$`,

    // Attach trigger
    `drop trigger if exists on_auth_user_created on auth.users`,
    `create trigger on_auth_user_created
      after insert on auth.users
      for each row execute function public.handle_new_user()`,

    // RLS
    `alter table public.profiles enable row level security`,

    // Own profile read
    `do $$ begin
      if not exists (
        select 1 from pg_policies where tablename='profiles' and policyname='own_profile_read'
      ) then
        create policy own_profile_read on public.profiles
          for select using (auth.uid() = id);
      end if;
    end $$`,

    // Owner read all
    `do $$ begin
      if not exists (
        select 1 from pg_policies where tablename='profiles' and policyname='owner_read_all'
      ) then
        create policy owner_read_all on public.profiles
          for select using (
            exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'owner')
          );
      end if;
    end $$`,

    // Owner update all
    `do $$ begin
      if not exists (
        select 1 from pg_policies where tablename='profiles' and policyname='owner_update_all'
      ) then
        create policy owner_update_all on public.profiles
          for update using (
            exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'owner')
          );
      end if;
    end $$`,
  ]

  for (const sql of sqlStatements) {
    const res = await fetch(`${baseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sql }),
    })
    if (!res.ok) {
      // Try the pg endpoint
      const res2 = await fetch(`${baseUrl}/pg/query`, {
        method: 'POST',
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: sql }),
      })
      if (!res2.ok) {
        const text = await res2.text().catch(() => '')
        console.warn('  SQL may need to be run manually via Supabase SQL editor:', text.slice(0, 120))
      }
    }
  }

  // 2. Create or locate Paul's auth user
  console.log("👤 Setting up Paul's owner account...")
  const { data: listData } = await sb.auth.admin.listUsers()
  const paulUser = listData?.users?.find(u => u.email === 'thebahrainchef@gmail.com')

  let paulId = paulUser?.id

  if (!paulUser) {
    console.log("   Creating Paul's auth account...")
    const { data: created, error: createErr } = await sb.auth.admin.createUser({
      email: 'thebahrainchef@gmail.com',
      email_confirm: true,
      user_metadata: { full_name: 'Paul Britton', role: 'owner', invited_by: null },
    })
    if (createErr) {
      console.error('   Failed to create user:', createErr.message)
    } else {
      paulId = created.user.id
      console.log('   Created auth user:', paulId)
    }
  } else {
    console.log('   Auth user exists:', paulUser.id)
  }

  // 3. Upsert Paul's profile
  if (paulId) {
    const { error: profileErr } = await sb
      .from('profiles')
      .upsert({
        id: paulId,
        email: 'thebahrainchef@gmail.com',
        full_name: 'Paul Britton',
        role: 'owner',
        status: 'active',
      }, { onConflict: 'id' })

    if (profileErr) {
      console.error('   Profile upsert error:', profileErr.message)
      console.log("   → Run this SQL manually in Supabase:\n")
      console.log(`   INSERT INTO public.profiles (id, email, full_name, role, status)`)
      console.log(`   VALUES ('${paulId}', 'thebahrainchef@gmail.com', 'Paul Britton', 'owner', 'active')`)
      console.log(`   ON CONFLICT (id) DO UPDATE SET role='owner', status='active';`)
    } else {
      console.log("   ✓ Paul's profile set to owner/active")
    }
  }

  console.log('\n✅ Auth setup complete!')
  console.log('\nNext steps:')
  console.log('1. In Supabase Dashboard → Auth → URL Configuration:')
  console.log('   Site URL: https://bahrainchef.com')
  console.log('   Redirect URLs: https://bahrainchef.com/auth/callback')
  console.log('               http://localhost:3000/auth/callback')
  console.log("2. Paul should click 'Forgot password?' on the login page to set his password.")
  console.log('   (A reset email will be sent to thebahrainchef@gmail.com)')
  console.log('\nIf the profiles table could not be created automatically, run this SQL')
  console.log('in Supabase Dashboard → SQL Editor:')
  console.log('\n--- COPY FROM HERE ---')
  console.log(sqlStatements.join(';\n\n') + ';')
  console.log('--- TO HERE ---\n')
}

run().catch(e => { console.error(e); process.exit(1) })
