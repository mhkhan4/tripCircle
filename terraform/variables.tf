variable "supabase_access_token" {
  description = "Supabase personal access token (from account settings)"
  type        = string
  sensitive   = true
}

variable "project_ref" {
  description = "Supabase project reference ID"
  type        = string
  default     = "ocbognmktqxquvxjvbkl"
}

variable "google_client_id" {
  description = "Google OAuth client ID (from Google Cloud Console)"
  type        = string
  default     = ""
}

variable "google_client_secret" {
  description = "Google OAuth client secret"
  type        = string
  sensitive   = true
  default     = ""
}

variable "facebook_app_id" {
  description = "Facebook App ID (from Meta Developer Console)"
  type        = string
  default     = ""
}

variable "facebook_app_secret" {
  description = "Facebook App Secret"
  type        = string
  sensitive   = true
  default     = ""
}
