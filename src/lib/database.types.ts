// FunHive Database Types for Supabase
// Generated from database/schema-fix.sql

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      activities: {
        Row: {
          id: string
          name: string
          description: string | null
          category: string | null
          subcategory: string | null
          image_url: string | null
          url: string | null
          phone: string | null
          hours: string | null
          price_range: string | null
          is_free: boolean
          age_range: string | null
          min_age: number | null
          max_age: number | null
          address: string | null
          city: string | null
          state: string | null
          zip_code: string | null
          location: unknown | null // PostGIS geometry
          geohash: string | null
          source: string | null
          scraper_name: string | null
          scraped_at: string | null
          created_at: string
          updated_at: string
          review_count: number
          average_rating: number
          is_sponsored: boolean
          sponsor_expires_at: string | null
          reported: boolean
        }
        Insert: {
          id: string
          name: string
          description?: string | null
          category?: string | null
          subcategory?: string | null
          image_url?: string | null
          url?: string | null
          phone?: string | null
          hours?: string | null
          price_range?: string | null
          is_free?: boolean
          age_range?: string | null
          min_age?: number | null
          max_age?: number | null
          address?: string | null
          city?: string | null
          state?: string | null
          zip_code?: string | null
          location?: unknown | null
          geohash?: string | null
          source?: string | null
          scraper_name?: string | null
          scraped_at?: string | null
          created_at?: string
          updated_at?: string
          review_count?: number
          average_rating?: number
          is_sponsored?: boolean
          sponsor_expires_at?: string | null
          reported?: boolean
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          category?: string | null
          subcategory?: string | null
          image_url?: string | null
          url?: string | null
          phone?: string | null
          hours?: string | null
          price_range?: string | null
          is_free?: boolean
          age_range?: string | null
          min_age?: number | null
          max_age?: number | null
          address?: string | null
          city?: string | null
          state?: string | null
          zip_code?: string | null
          location?: unknown | null
          geohash?: string | null
          source?: string | null
          scraper_name?: string | null
          scraped_at?: string | null
          created_at?: string
          updated_at?: string
          review_count?: number
          average_rating?: number
          is_sponsored?: boolean
          sponsor_expires_at?: string | null
          reported?: boolean
          county?: string | null
          latitude?: number | null
          longitude?: number | null
        }
        Relationships: []
      }
      events: {
        Row: {
          id: string
          name: string
          event_date: string | null
          date: string | null
          end_date: string | null
          description: string | null
          url: string | null
          image_url: string | null
          venue: string | null
          category: string | null
          city: string | null
          state: string | null
          zip_code: string | null
          address: string | null
          location: unknown | null // PostGIS geometry
          geohash: string | null
          activity_id: string | null
          source_url: string | null
          scraper_name: string | null
          platform: string | null
          scraped_at: string | null
          created_at: string
          updated_at: string
          review_count: number
          average_rating: number
          is_sponsored: boolean
          sponsor_expires_at: string | null
          reported: boolean
          start_time: string | null
          end_time: string | null
          age_range: string | null
        }
        Insert: {
          id: string
          name: string
          event_date?: string | null
          date?: string | null
          end_date?: string | null
          description?: string | null
          url?: string | null
          image_url?: string | null
          venue?: string | null
          category?: string | null
          city?: string | null
          state?: string | null
          zip_code?: string | null
          address?: string | null
          location?: unknown | null
          geohash?: string | null
          activity_id?: string | null
          source_url?: string | null
          scraper_name?: string | null
          platform?: string | null
          scraped_at?: string | null
          created_at?: string
          updated_at?: string
          review_count?: number
          average_rating?: number
          is_sponsored?: boolean
          sponsor_expires_at?: string | null
          reported?: boolean
          start_time?: string | null
          end_time?: string | null
          age_range?: string | null
        }
        Update: {
          id?: string
          name?: string
          event_date?: string | null
          date?: string | null
          end_date?: string | null
          description?: string | null
          url?: string | null
          image_url?: string | null
          venue?: string | null
          category?: string | null
          city?: string | null
          state?: string | null
          zip_code?: string | null
          address?: string | null
          location?: unknown | null
          geohash?: string | null
          activity_id?: string | null
          source_url?: string | null
          scraper_name?: string | null
          platform?: string | null
          scraped_at?: string | null
          created_at?: string
          updated_at?: string
          review_count?: number
          average_rating?: number
          is_sponsored?: boolean
          sponsor_expires_at?: string | null
          reported?: boolean
          start_time?: string | null
          end_time?: string | null
          age_range?: string | null
        }
        Relationships: []
      }
      event_series: {
        Row: {
          id: string
          name: string
          description: string | null
          activity_id: string | null
          created_at: string
          updated_at: string
          review_count: number
          average_rating: number
        }
        Insert: {
          id: string
          name: string
          description?: string | null
          activity_id?: string | null
          created_at?: string
          updated_at?: string
          review_count?: number
          average_rating?: number
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          activity_id?: string | null
          created_at?: string
          updated_at?: string
          review_count?: number
          average_rating?: number
        }
        Relationships: []
      }
      reviews: {
        Row: {
          id: string
          user_id: string
          event_id: string | null
          activity_id: string | null
          event_series_id: string | null
          rating: number
          text: string | null
          created_at: string
          updated_at: string
          helpful_count: number
        }
        Insert: {
          id?: string
          user_id: string
          event_id?: string | null
          activity_id?: string | null
          event_series_id?: string | null
          rating: number
          text?: string | null
          created_at?: string
          updated_at?: string
          helpful_count?: number
        }
        Update: {
          id?: string
          user_id?: string
          event_id?: string | null
          activity_id?: string | null
          event_series_id?: string | null
          rating?: number
          text?: string | null
          created_at?: string
          updated_at?: string
          helpful_count?: number
        }
        Relationships: []
      }
      helpful_votes: {
        Row: {
          id: string
          user_id: string
          review_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          review_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          review_id?: string
          created_at?: string
        }
        Relationships: []
      }
      user_favorites: {
        Row: {
          id: string
          user_id: string
          event_id: string | null
          activity_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          event_id?: string | null
          activity_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          event_id?: string | null
          activity_id?: string | null
          created_at?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          user_id: string
          display_name: string | null
          home_location: unknown | null
          home_city: string | null
          home_state: string | null
          home_zip: string | null
          search_radius_miles: number
          preferred_categories: string[] | null
          preferred_age_range: string | null
          email_digest: boolean
          is_premium: boolean
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          premium_expires_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          display_name?: string | null
          home_location?: unknown | null
          home_city?: string | null
          home_state?: string | null
          home_zip?: string | null
          search_radius_miles?: number
          preferred_categories?: string[] | null
          preferred_age_range?: string | null
          email_digest?: boolean
          is_premium?: boolean
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          premium_expires_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          display_name?: string | null
          home_location?: unknown | null
          home_city?: string | null
          home_state?: string | null
          home_zip?: string | null
          search_radius_miles?: number
          preferred_categories?: string[] | null
          preferred_age_range?: string | null
          email_digest?: boolean
          is_premium?: boolean
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          premium_expires_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      scraper_logs: {
        Row: {
          id: string
          scraper_name: string
          status: string
          events_found: number
          events_saved: number
          events_skipped: number
          error_message: string | null
          duration_ms: number | null
          run_at: string
        }
        Insert: {
          id?: string
          scraper_name: string
          status: string
          events_found?: number
          events_saved?: number
          events_skipped?: number
          error_message?: string | null
          duration_ms?: number | null
          run_at?: string
        }
        Update: {
          id?: string
          scraper_name?: string
          status?: string
          events_found?: number
          events_saved?: number
          events_skipped?: number
          error_message?: string | null
          duration_ms?: number | null
          run_at?: string
        }
        Relationships: []
      }
      click_events: {
        Row: {
          id: string
          interaction_type: string
          event_id: string | null
          activity_id: string | null
          search_query: string | null
          search_location: string | null
          category: string | null
          age_range: string | null
          date_filter: string | null
          radius_miles: number | null
          user_lat: number | null
          user_lng: number | null
          session_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          interaction_type: string
          event_id?: string | null
          activity_id?: string | null
          search_query?: string | null
          search_location?: string | null
          category?: string | null
          age_range?: string | null
          date_filter?: string | null
          radius_miles?: number | null
          user_lat?: number | null
          user_lng?: number | null
          session_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          interaction_type?: string
          event_id?: string | null
          activity_id?: string | null
          search_query?: string | null
          search_location?: string | null
          category?: string | null
          age_range?: string | null
          date_filter?: string | null
          radius_miles?: number | null
          user_lat?: number | null
          user_lng?: number | null
          session_id?: string | null
          created_at?: string
        }
        Relationships: []
      }
    }
    Functions: {
      nearby_events: {
        Args: {
          lng: number
          lat: number
          radius_miles?: number
          max_results?: number
        }
        Returns: Database['public']['Tables']['events']['Row'][]
      }
      nearby_activities: {
        Args: {
          lng: number
          lat: number
          radius_miles?: number
          max_results?: number
        }
        Returns: Database['public']['Tables']['activities']['Row'][]
      }
    }
    Views: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
