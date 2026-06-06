terraform {
  required_providers {
    supabase = {
      source  = "supabase/supabase"
      version = "~> 1.0"
    }
  }
}

provider "supabase" {
  access_token = var.supabase_access_token
}

# -------------------------------------------------------
# Auth settings — email + social providers
# -------------------------------------------------------
resource "supabase_settings" "auth" {
  project_ref = var.project_ref

  auth = jsonencode({
    site_url                = "tripcircle://auth/callback"
    additional_redirect_urls = ["tripcircle://auth/callback"]
    disable_signup          = false
    jwt_expiry              = 3600

    external_google_enabled       = var.google_client_id != "" ? true : false
    external_google_client_id     = var.google_client_id
    external_google_secret        = var.google_client_secret

    external_facebook_enabled     = var.facebook_app_id != "" ? true : false
    external_facebook_client_id   = var.facebook_app_id
    external_facebook_secret      = var.facebook_app_secret
  })
}
