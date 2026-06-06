output "project_ref" {
  value = var.project_ref
}

output "supabase_url" {
  value = "https://${var.project_ref}.supabase.co"
}

output "supabase_anon_key_location" {
  value = "Get from: Supabase Dashboard → Project Settings → API → anon public key"
}
