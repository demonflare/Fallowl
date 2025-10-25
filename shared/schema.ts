import { pgTable, text, serial, integer, boolean, timestamp, jsonb, decimal, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  auth0Id: text("auth0_id").unique(),
  username: text("username").notNull().unique(),
  email: text("email").notNull(),
  password: text("password").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  phone: text("phone"),
  avatar: text("avatar"),
  role: text("role").notNull().default("user"),
  customRoles: jsonb("custom_roles").default([]), // Array of custom role IDs
  permissions: jsonb("permissions").default({}), // Object with permission overrides
  status: text("status").notNull().default("active"), // active, suspended, inactive, pending
  accountType: text("account_type").default("standard"), // standard, trial, premium, enterprise
  subscriptionPlan: text("subscription_plan").default("free"), // free, basic, pro, enterprise
  subscriptionStatus: text("subscription_status").default("active"), // active, trialing, expired, overdue, cancelled
  trialExpiresAt: timestamp("trial_expires_at"),
  lastPaymentDate: timestamp("last_payment_date"),
  nextBillingDate: timestamp("next_billing_date"),
  usageStats: jsonb("usage_stats").default({}), // Call minutes, SMS count, storage used
  tags: text("tags").array().default([]), // Array of tags like "VIP", "High Usage"
  internalNotes: text("internal_notes"),
  accountManager: text("account_manager"),
  teamOwner: integer("team_owner_id"),
  twoFactorEnabled: boolean("two_factor_enabled").default(false),
  twoFactorSecret: text("two_factor_secret"),
  loginAttempts: integer("login_attempts").default(0),
  lockedUntil: timestamp("locked_until"),
  lastLoginIp: text("last_login_ip"),
  lastLoginLocation: text("last_login_location"),
  lastLoginDevice: text("last_login_device"),
  emailVerified: boolean("email_verified").default(false),
  emailVerificationToken: text("email_verification_token"),
  passwordResetToken: text("password_reset_token"),
  passwordResetExpires: timestamp("password_reset_expires"),
  gdprConsent: boolean("gdpr_consent").default(false),
  gdprConsentDate: timestamp("gdpr_consent_date"),
  marketingConsent: boolean("marketing_consent").default(false),
  apiKeys: jsonb("api_keys").default([]), // Array of API key objects
  connectedIntegrations: jsonb("connected_integrations").default([]), // Array of integration objects
  
  // Per-user Twilio credentials for making calls/SMS
  twilioAccountSid: text("twilio_account_sid"),
  twilioAuthToken: text("twilio_auth_token"),
  twilioApiKeySid: text("twilio_api_key_sid"),
  twilioApiKeySecret: text("twilio_api_key_secret"),
  twilioPhoneNumber: text("twilio_phone_number"),
  twilioTwimlAppSid: text("twilio_twiml_app_sid"),
  twilioConfigured: boolean("twilio_configured").default(false),
  
  // Custom fields and metadata
  customFields: jsonb("custom_fields").default({}),
  
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Contact Lists for smart organization
export const contactLists = pgTable("contact_lists", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  color: text("color").default("#3B82F6"), // Hex color for visual identification
  icon: text("icon").default("Users"), // Lucide icon name
  
  // List Types and Categories
  type: text("type").default("custom"), // custom, smart, system, imported
  category: text("category").default("general"), // general, sales, marketing, support, event
  
  // Smart List Criteria (for auto-updating lists)
  smartCriteria: jsonb("smart_criteria").default({}), // Filters and conditions
  isSmartList: boolean("is_smart_list").default(false),
  
  // Access Control
  visibility: text("visibility").default("private"), // private, team, public
  sharedWith: jsonb("shared_with").default([]), // Array of user IDs
  permissions: jsonb("permissions").default({}), // View, edit, delete permissions
  
  // Statistics
  contactCount: integer("contact_count").default(0),
  activeContactCount: integer("active_contact_count").default(0),
  lastContactAdded: timestamp("last_contact_added"),
  
  // Organization and Tags
  tags: text("tags").array().default([]),
  priority: text("priority").default("medium"), // high, medium, low
  status: text("status").default("active"), // active, archived, temp
  
  // Usage and Analytics
  usageCount: integer("usage_count").default(0), // How often this list is used
  lastUsed: timestamp("last_used"),
  
  // Settings
  autoUpdate: boolean("auto_update").default(false), // For smart lists
  settings: jsonb("settings").default({}), // List-specific settings
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userIdIdx: index("contact_lists_user_id_idx").on(table.userId),
  typeIdx: index("contact_lists_type_idx").on(table.type),
  statusIdx: index("contact_lists_status_idx").on(table.status),
  createdAtIdx: index("contact_lists_created_at_idx").on(table.createdAt),
}));

// Junction table for many-to-many relationship between contacts and lists
export const contactListMemberships = pgTable("contact_list_memberships", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  contactId: integer("contact_id").references(() => contacts.id).notNull(),
  listId: integer("list_id").references(() => contactLists.id).notNull(),
  
  // Membership Details
  addedBy: integer("added_by").references(() => users.id),
  addedAt: timestamp("added_at").defaultNow(),
  
  // Status and Metadata
  status: text("status").default("active"), // active, removed, suspended
  priority: text("priority").default("normal"), // high, normal, low
  notes: text("notes"), // Notes about why contact is in this list
  
  // Tagging within list
  listTags: text("list_tags").array().default([]), // Tags specific to this list membership
  
  // Automation
  autoAdded: boolean("auto_added").default(false), // Was contact auto-added by smart criteria
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userIdIdx: index("contact_list_memberships_user_id_idx").on(table.userId),
  contactIdIdx: index("contact_list_memberships_contact_id_idx").on(table.contactId),
  listIdIdx: index("contact_list_memberships_list_id_idx").on(table.listId),
  contactListIdx: index("contact_list_memberships_contact_list_idx").on(table.contactId, table.listId),
}));

export const contacts = pgTable("contacts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  alternatePhone: text("alternate_phone"),
  company: text("company"),
  industry: text("industry"),
  revenue: text("revenue"),
  employeeSize: text("employee_size"),
  jobTitle: text("job_title"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  country: text("country").default("US"),
  timezone: text("timezone"),
  birthdate: timestamp("birthdate"),
  tags: text("tags").array().default([]),
  notes: text("notes"),
  priority: text("priority").default("medium"), // high, medium, low
  leadStatus: text("lead_status").default("new"), // new, contacted, qualified, converted, lost
  leadSource: text("lead_source"), // website, referral, social, ads, cold_call
  disposition: text("disposition"), // answered, human, voicemail, machine, busy, no-answer, failed, callback-requested, interested, not-interested, qualified, wrong-number, disconnected, dnc-requested, dnc-skipped
  callAttempts: integer("call_attempts").default(0), // Track number of times contact has been called
  lastCallAttempt: timestamp("last_call_attempt"), // Track when last call attempt was made
  assignedTo: text("assigned_to"),
  nextFollowUpAt: timestamp("next_follow_up_at"),
  meetingDate: timestamp("meeting_date"),
  meetingTime: text("meeting_time"),
  meetingTimezone: text("meeting_timezone"),
  socialProfiles: jsonb("social_profiles").default({}), // LinkedIn, Company LinkedIn, Website URLs
  customFields: jsonb("custom_fields").default({}), // Flexible additional fields
  communicationPreferences: jsonb("communication_preferences").default({}), // email, sms, call preferences
  lastContactedAt: timestamp("last_contacted_at"),
  avatar: text("avatar"),
  isActive: boolean("is_active").default(true),
  doNotCall: boolean("do_not_call").default(false),
  doNotEmail: boolean("do_not_email").default(false),
  doNotSms: boolean("do_not_sms").default(false),
  
  // List associations - track primary list for quick access
  primaryListId: integer("primary_list_id").references(() => contactLists.id),
  listCount: integer("list_count").default(0), // Number of lists this contact belongs to
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userIdIdx: index("contacts_user_id_idx").on(table.userId),
  phoneIdx: index("contacts_phone_idx").on(table.phone),
  emailIdx: index("contacts_email_idx").on(table.email),
  createdAtIdx: index("contacts_created_at_idx").on(table.createdAt),
  lastContactedAtIdx: index("contacts_last_contacted_at_idx").on(table.lastContactedAt),
  leadStatusIdx: index("contacts_lead_status_idx").on(table.leadStatus),
  dispositionIdx: index("contacts_disposition_idx").on(table.disposition),
  userPhoneIdx: index("contacts_user_phone_idx").on(table.userId, table.phone),
}));

export const calls = pgTable("calls", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  contactId: integer("contact_id").references(() => contacts.id),
  phone: text("phone").notNull(),
  type: text("type").notNull(), // incoming, outgoing, missed
  status: text("status").notNull(), // queued, initiated, ringing, in-progress, completed, busy, failed, no-answer, canceled, call-dropped
  duration: integer("duration").default(0), // in seconds
  recordingUrl: text("recording_url"),
  
  // Enhanced call details
  callQuality: integer("call_quality"), // 1-5 rating
  cost: decimal("cost", { precision: 10, scale: 4 }), // Call cost
  carrier: text("carrier"), // Phone carrier information
  location: text("location"), // Caller location (city, state)
  deviceType: text("device_type"), // mobile, landline, voip
  sipCallId: text("sip_call_id"), // SIP call identifier
  conferenceId: text("conference_id"), // Conference call identifier
  transferredFrom: text("transferred_from"), // Transfer source number
  transferredTo: text("transferred_to"), // Transfer destination number
  dialAttempts: integer("dial_attempts").default(1), // Number of dial attempts
  hangupReason: text("hangup_reason"), // Reason for call termination
  userAgent: text("user_agent"), // SIP user agent string
  
  // Parallel Dialer Enhanced Metrics
  ringDuration: integer("ring_duration"), // Time from initiated to answered (seconds)
  connectionTime: timestamp("connection_time"), // Exact timestamp when call connected
  answeredBy: text("answered_by"), // human, machine, machine_start, machine_end_beep, machine_end_silence, machine_end_other, fax, unknown (AMD result)
  amdComment: text("amd_comment"), // AMD detection details/confidence
  disposition: text("disposition"), // Auto-assigned: answered, voicemail, machine_detected, busy, no_answer, failed, canceled, call_dropped, callback
  isParallelDialer: boolean("is_parallel_dialer").default(false), // Track if from parallel dialer
  lineId: text("line_id"), // Parallel dialer line identifier
  droppedReason: text("dropped_reason"), // Why call was dropped (if secondary call)
  
  // Smart categorization
  tags: text("tags").array().default([]), // Call tags (urgent, follow-up, etc)
  priority: text("priority").default("normal"), // high, normal, low
  sentiment: text("sentiment"), // positive, negative, neutral
  callPurpose: text("call_purpose"), // sales, support, follow-up, cold-call
  outcome: text("outcome"), // successful, needs-followup, no-interest, voicemail, human, machine
  
  // AI and automation
  transcript: text("transcript"), // Call transcript
  summary: text("summary"), // AI-generated call summary
  actionItems: jsonb("action_items").default([]), // Follow-up actions
  keywords: text("keywords").array().default([]), // Extracted keywords
  
  // Follow-up and scheduling
  followUpRequired: boolean("follow_up_required").default(false),
  followUpDate: timestamp("follow_up_date"),
  followUpNotes: text("follow_up_notes"),
  
  // Technical details
  codec: text("codec"), // Audio codec used
  bitrate: integer("bitrate"), // Audio bitrate
  jitter: integer("jitter"), // Network jitter (ms)
  packetLoss: decimal("packet_loss", { precision: 5, scale: 2 }), // Packet loss percentage
  
  // Custom fields and metadata
  customFields: jsonb("custom_fields").default({}), // Additional custom data
  metadata: jsonb("metadata").default({}), // Technical metadata
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userIdIdx: index("calls_user_id_idx").on(table.userId),
  phoneIdx: index("calls_phone_idx").on(table.phone),
  contactIdIdx: index("calls_contact_id_idx").on(table.contactId),
  statusIdx: index("calls_status_idx").on(table.status),
  typeIdx: index("calls_type_idx").on(table.type),
  createdAtIdx: index("calls_created_at_idx").on(table.createdAt),
  sipCallIdIdx: index("calls_sip_call_id_idx").on(table.sipCallId),
  userStatusIdx: index("calls_user_status_idx").on(table.userId, table.status),
  userCreatedAtIdx: index("calls_user_created_at_idx").on(table.userId, table.createdAt),
}));

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  contactId: integer("contact_id").references(() => contacts.id),
  phone: text("phone").notNull(),
  content: text("content").notNull(),
  type: text("type").notNull(), // sent, received
  status: text("status").notNull(), // delivered, pending, failed, read
  
  // Enhanced messaging features
  threadId: text("thread_id"), // Group messages into conversations
  messageType: text("message_type").default("text"), // text, image, file, voice, location
  attachments: jsonb("attachments").default([]), // Array of attachment objects
  mediaUrl: text("media_url"), // For images/files
  mediaType: text("media_type"), // image/jpeg, application/pdf, etc.
  fileSize: integer("file_size"), // File size in bytes
  fileName: text("file_name"), // Original filename
  
  // Twilio Integration
  twilioMessageSid: text("twilio_message_sid").unique(),
  twilioAccountSid: text("twilio_account_sid"),
  twilioFromNumber: text("twilio_from_number"),
  twilioToNumber: text("twilio_to_number"),
  twilioStatus: text("twilio_status"), // queued, sent, delivered, failed
  twilioErrorCode: text("twilio_error_code"),
  twilioErrorMessage: text("twilio_error_message"),
  
  // Analytics and tracking
  isRead: boolean("is_read").default(false),
  readAt: timestamp("read_at"),
  deliveredAt: timestamp("delivered_at"),
  sentAt: timestamp("sent_at"),
  
  // Smart features
  priority: text("priority").default("normal"), // high, normal, low
  tags: text("tags").array().default([]), // Array of tags
  isStarred: boolean("is_starred").default(false),
  isArchived: boolean("is_archived").default(false),
  
  // AI and automation
  sentiment: text("sentiment"), // positive, negative, neutral
  aiSummary: text("ai_summary"), // AI-generated summary
  autoReplyTriggered: boolean("auto_reply_triggered").default(false),
  keywordMatches: text("keyword_matches").array().default([]),
  
  // Business features
  campaignId: text("campaign_id"), // Marketing campaign ID
  templateId: text("template_id"), // Message template used
  scheduledAt: timestamp("scheduled_at"), // For scheduled messages
  isScheduled: boolean("is_scheduled").default(false),
  
  // Technical metadata
  messageDirection: text("message_direction"), // inbound, outbound
  messageSource: text("message_source"), // manual, automated, api, campaign
  retryCount: integer("retry_count").default(0),
  lastRetryAt: timestamp("last_retry_at"),
  
  // Custom fields
  customFields: jsonb("custom_fields").default({}),
  metadata: jsonb("metadata").default({}),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userIdIdx: index("messages_user_id_idx").on(table.userId),
  phoneIdx: index("messages_phone_idx").on(table.phone),
  contactIdIdx: index("messages_contact_id_idx").on(table.contactId),
  threadIdIdx: index("messages_thread_id_idx").on(table.threadId),
  createdAtIdx: index("messages_created_at_idx").on(table.createdAt),
  statusIdx: index("messages_status_idx").on(table.status),
  userPhoneIdx: index("messages_user_phone_idx").on(table.userId, table.phone),
  userCreatedAtIdx: index("messages_user_created_at_idx").on(table.userId, table.createdAt),
}));

// SMS Templates for quick messaging
export const smsTemplates = pgTable("sms_templates", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  content: text("content").notNull(),
  category: text("category").default("general"), // sales, support, follow-up, marketing
  variables: text("variables").array().default([]), // {{name}}, {{company}}, etc.
  isActive: boolean("is_active").default(true),
  usageCount: integer("usage_count").default(0),
  tags: text("tags").array().default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// SMS Campaigns for bulk messaging
export const smsCampaigns = pgTable("sms_campaigns", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  templateId: integer("template_id").references(() => smsTemplates.id),
  status: text("status").default("draft"), // draft, scheduled, sending, completed, paused
  targetContacts: jsonb("target_contacts").default([]), // Array of contact IDs
  sendAt: timestamp("send_at"),
  completedAt: timestamp("completed_at"),
  
  // Analytics
  totalRecipients: integer("total_recipients").default(0),
  sentCount: integer("sent_count").default(0),
  deliveredCount: integer("delivered_count").default(0),
  failedCount: integer("failed_count").default(0),
  responseCount: integer("response_count").default(0),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Conversation threads for better organization
export const conversationThreads = pgTable("conversation_threads", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  threadId: text("thread_id").unique().notNull(),
  contactId: integer("contact_id").references(() => contacts.id),
  subject: text("subject"),
  lastMessageAt: timestamp("last_message_at"),
  messageCount: integer("message_count").default(0),
  isArchived: boolean("is_archived").default(false),
  priority: text("priority").default("normal"),
  assignedTo: integer("assigned_to").references(() => users.id),
  tags: text("tags").array().default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const recordings = pgTable("recordings", {
  id: serial("id").primaryKey(),
  
  // Twilio Integration - Unique identifiers to prevent duplicates
  twilioRecordingSid: text("twilio_recording_sid").unique().notNull(), // Twilio's unique recording identifier
  twilioCallSid: text("twilio_call_sid"), // Associated Twilio call SID
  twilioAccountSid: text("twilio_account_sid"), // Twilio account identifier
  
  // Relationships
  callId: integer("call_id").references(() => calls.id),
  contactId: integer("contact_id").references(() => contacts.id),
  userId: integer("user_id").references(() => users.id), // Who made/received the call
  
  // Basic Information
  phone: text("phone").notNull(),
  direction: text("direction").notNull(), // inbound, outbound
  duration: integer("duration").notNull(), // Duration in seconds
  fileSize: integer("file_size"), // File size in bytes
  
  // URLs and Storage
  twilioUrl: text("twilio_url"), // Original Twilio recording URL
  localFilePath: text("local_file_path"), // Local server storage path
  publicUrl: text("public_url"), // Public access URL
  downloadUrl: text("download_url"), // Direct download URL
  bunnycdnUrl: text("bunnycdn_url"), // BunnyCDN CDN URL for the recording
  bunnycdnFileName: text("bunnycdn_file_name"), // Filename stored on BunnyCDN
  
  // Audio Technical Details
  audioCodec: text("audio_codec").default("mp3"), // mp3, wav, etc.
  sampleRate: integer("sample_rate"), // Sample rate in Hz
  bitrate: integer("bitrate"), // Bitrate in kbps
  channels: integer("channels").default(1), // Mono/Stereo
  encoding: text("encoding"), // Audio encoding format
  
  // Quality and Status
  status: text("status").notNull().default("processing"), // processing, ready, error, downloading, transcribing
  quality: text("quality").default("standard"), // standard, high, premium
  recordingSource: text("recording_source"), // conference, call, dial-verb
  
  // Advanced Features
  transcript: text("transcript"), // Full call transcript
  transcriptionStatus: text("transcription_status").default("pending"), // pending, processing, completed, failed
  transcriptionAccuracy: decimal("transcription_accuracy", { precision: 5, scale: 2 }), // 0-100%
  
  // AI Analysis
  summary: text("summary"), // AI-generated call summary
  sentiment: text("sentiment"), // positive, negative, neutral
  sentimentScore: decimal("sentiment_score", { precision: 5, scale: 2 }), // -1 to 1
  keywords: text("keywords").array().default([]), // Extracted keywords
  topics: text("topics").array().default([]), // Discussion topics
  actionItems: jsonb("action_items").default([]), // Follow-up actions
  
  // Compliance and Security
  isEncrypted: boolean("is_encrypted").default(false),
  encryptionKey: text("encryption_key"), // Encryption key reference
  retentionDays: integer("retention_days").default(365), // Days to keep recording
  complianceFlags: text("compliance_flags").array().default([]), // GDPR, HIPAA, etc.
  
  // Categorization and Organization
  tags: text("tags").array().default([]), // Custom tags
  category: text("category"), // sales, support, cold-call, follow-up
  priority: text("priority").default("normal"), // high, normal, low
  isStarred: boolean("is_starred").default(false),
  isArchived: boolean("is_archived").default(false),
  
  // Analytics and Metrics
  playCount: integer("play_count").default(0),
  downloadCount: integer("download_count").default(0),
  shareCount: integer("share_count").default(0),
  lastPlayedAt: timestamp("last_played_at"),
  lastDownloadedAt: timestamp("last_downloaded_at"),
  
  // Call Context
  callDirection: text("call_direction"), // inbound, outbound
  callerName: text("caller_name"),
  callerLocation: text("caller_location"),
  callResult: text("call_result"), // answered, busy, no-answer, failed
  
  // Storage Management
  storageProvider: text("storage_provider").default("local"), // local, s3, gcs, azure
  backupStatus: text("backup_status").default("pending"), // pending, backed-up, failed
  lastBackupAt: timestamp("last_backup_at"),
  
  // Performance Metrics
  downloadSpeed: decimal("download_speed", { precision: 10, scale: 2 }), // MB/s
  processingTime: integer("processing_time"), // Time to process in seconds
  
  // Custom Fields and Metadata
  customFields: jsonb("custom_fields").default({}), // Additional custom data
  metadata: jsonb("metadata").default({}), // Technical metadata from Twilio
  
  // Timestamps
  recordingStartTime: timestamp("recording_start_time"),
  recordingEndTime: timestamp("recording_end_time"),
  downloadedAt: timestamp("downloaded_at"), // When downloaded from Twilio
  processedAt: timestamp("processed_at"), // When processing completed
  bunnycdnUploadedAt: timestamp("bunnycdn_uploaded_at"), // When uploaded to BunnyCDN
  twilioDeletedAt: timestamp("twilio_deleted_at"), // When deleted from Twilio storage
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userIdIdx: index("recordings_user_id_idx").on(table.userId),
  twilioCallSidIdx: index("recordings_twilio_call_sid_idx").on(table.twilioCallSid),
  statusIdx: index("recordings_status_idx").on(table.status),
  createdAtIdx: index("recordings_created_at_idx").on(table.createdAt),
  callIdIdx: index("recordings_call_id_idx").on(table.callId),
  contactIdIdx: index("recordings_contact_id_idx").on(table.contactId),
  userCreatedAtIdx: index("recordings_user_created_at_idx").on(table.userId, table.createdAt),
}));

export const voicemails = pgTable("voicemails", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  contactId: integer("contact_id").references(() => contacts.id),
  phone: text("phone").notNull(),
  duration: integer("duration").notNull(),
  fileUrl: text("file_url").notNull(),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const callNotes = pgTable("call_notes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  callId: integer("call_id").references(() => calls.id),
  contactId: integer("contact_id").references(() => contacts.id),
  phone: text("phone").notNull(),
  notes: text("notes").notNull(),
  tags: text("tags").array().default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userIdIdx: index("call_notes_user_id_idx").on(table.userId),
  callIdIdx: index("call_notes_call_id_idx").on(table.callId),
  contactIdIdx: index("call_notes_contact_id_idx").on(table.contactId),
  createdAtIdx: index("call_notes_created_at_idx").on(table.createdAt),
}));

export const roles = pgTable("roles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  permissions: jsonb("permissions").notNull().default({}),
  isCustom: boolean("is_custom").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const loginHistory = pgTable("login_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  ipAddress: text("ip_address").notNull(),
  location: text("location"),
  device: text("device"),
  userAgent: text("user_agent"),
  success: boolean("success").notNull(),
  failureReason: text("failure_reason"),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const userActivity = pgTable("user_activity", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  action: text("action").notNull(), // login, logout, call_made, sms_sent, etc.
  resource: text("resource"), // what was affected
  resourceId: integer("resource_id"), // ID of the affected resource
  metadata: jsonb("metadata").default({}), // additional data
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const subscriptionPlans = pgTable("subscription_plans", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  price: integer("price").notNull(), // in cents
  billingCycle: text("billing_cycle").notNull(), // monthly, yearly
  features: jsonb("features").notNull().default([]),
  limits: jsonb("limits").notNull().default({}),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  invoiceNumber: text("invoice_number").notNull().unique(),
  amount: integer("amount").notNull(), // in cents
  status: text("status").notNull(), // paid, pending, overdue, cancelled
  billingPeriodStart: timestamp("billing_period_start"),
  billingPeriodEnd: timestamp("billing_period_end"),
  dueDate: timestamp("due_date"),
  paidAt: timestamp("paid_at"),
  paymentMethod: text("payment_method"),
  stripeInvoiceId: text("stripe_invoice_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Lead Management Tables
export const leadSources = pgTable("lead_sources", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(), // website, referral, social, ads, cold_call, event, email, webinar, etc.
  description: text("description"),
  color: text("color").default("#3B82F6"),
  icon: text("icon").default("user-plus"),
  conversionRate: decimal("conversion_rate", { precision: 5, scale: 2 }).default("0.00"),
  cost: decimal("cost", { precision: 10, scale: 2 }).default("0.00"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const leadStatuses = pgTable("lead_statuses", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  stage: text("stage").notNull(), // new, contacted, qualified, proposal, negotiation, closed-won, closed-lost
  description: text("description"),
  color: text("color").default("#10B981"),
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const leadCampaigns = pgTable("lead_campaigns", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type").notNull(), // email, sms, call, social, ads, webinar, event
  status: text("status").default("active"), // active, paused, completed, draft
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  budget: decimal("budget", { precision: 10, scale: 2 }).default("0.00"),
  spent: decimal("spent", { precision: 10, scale: 2 }).default("0.00"),
  targetAudience: jsonb("target_audience").default({}),
  goals: jsonb("goals").default({}),
  metrics: jsonb("metrics").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  contactId: integer("contact_id").references(() => contacts.id),
  
  // Basic Information
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email"),
  phone: text("phone").notNull(),
  company: text("company"),
  jobTitle: text("job_title"),
  
  // Lead Details
  leadSourceId: integer("lead_source_id").references(() => leadSources.id),
  leadStatusId: integer("lead_status_id").references(() => leadStatuses.id),
  campaignId: integer("campaign_id").references(() => leadCampaigns.id),
  
  // Scoring & Qualification
  leadScore: integer("lead_score").default(0), // 0-100
  qualificationScore: integer("qualification_score").default(0), // 0-100
  priority: text("priority").default("medium"), // high, medium, low
  temperature: text("temperature").default("cold"), // hot, warm, cold
  
  // Financial Information
  estimatedValue: decimal("estimated_value", { precision: 10, scale: 2 }).default("0.00"),
  actualValue: decimal("actual_value", { precision: 10, scale: 2 }).default("0.00"),
  probability: integer("probability").default(0), // 0-100%
  
  // Lifecycle Information
  firstContactDate: timestamp("first_contact_date"),
  lastContactDate: timestamp("last_contact_date"),
  nextFollowUpDate: timestamp("next_follow_up_date"),
  closedDate: timestamp("closed_date"),
  
  // Assignment & Ownership
  assignedTo: integer("assigned_to").references(() => users.id),
  assignedDate: timestamp("assigned_date"),
  teamId: integer("team_id"),
  
  // Engagement Tracking
  totalCalls: integer("total_calls").default(0),
  totalEmails: integer("total_emails").default(0),
  totalSms: integer("total_sms").default(0),
  totalMeetings: integer("total_meetings").default(0),
  lastEngagementType: text("last_engagement_type"),
  lastEngagementDate: timestamp("last_engagement_date"),
  
  // Demographic & Firmographic
  industry: text("industry"),
  companySize: text("company_size"), // 1-10, 11-50, 51-200, 201-1000, 1000+
  annualRevenue: text("annual_revenue"),
  location: text("location"),
  timezone: text("timezone"),
  
  // Behavioral Data
  websiteVisits: integer("website_visits").default(0),
  emailOpens: integer("email_opens").default(0),
  emailClicks: integer("email_clicks").default(0),
  contentDownloads: integer("content_downloads").default(0),
  socialEngagement: integer("social_engagement").default(0),
  
  // Sales Process
  salesStage: text("sales_stage"), // awareness, interest, consideration, intent, evaluation, purchase
  decisionMaker: boolean("decision_maker").default(false),
  budgetConfirmed: boolean("budget_confirmed").default(false),
  timelineConfirmed: boolean("timeline_confirmed").default(false),
  painPointsIdentified: boolean("pain_points_identified").default(false),
  
  // Communication Preferences
  preferredChannel: text("preferred_channel"), // email, phone, sms, linkedin
  bestTimeToCall: text("best_time_to_call"),
  doNotCall: boolean("do_not_call").default(false),
  doNotEmail: boolean("do_not_email").default(false),
  doNotSms: boolean("do_not_sms").default(false),
  
  // Additional Data
  notes: text("notes"),
  tags: text("tags").array().default([]),
  customFields: jsonb("custom_fields").default({}),
  integrationData: jsonb("integration_data").default({}),
  
  // Tracking & Analytics
  acquisitionCost: decimal("acquisition_cost", { precision: 10, scale: 2 }).default("0.00"),
  roi: decimal("roi", { precision: 10, scale: 2 }).default("0.00"),
  conversionTime: integer("conversion_time_hours").default(0),
  touchpoints: integer("touchpoints").default(0),
  
  // Status & Workflow
  isActive: boolean("is_active").default(true),
  isQualified: boolean("is_qualified").default(false),
  isConverted: boolean("is_converted").default(false),
  conversionDate: timestamp("conversion_date"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const leadActivities = pgTable("lead_activities", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id").references(() => leads.id).notNull(),
  userId: integer("user_id").references(() => users.id),
  
  // Activity Details
  type: text("type").notNull(), // call, email, sms, meeting, note, task, event, form_submit, page_view
  subtype: text("subtype"), // inbound_call, outbound_call, demo_scheduled, proposal_sent, etc.
  title: text("title").notNull(),
  description: text("description"),
  
  // Activity Data
  duration: integer("duration_minutes"),
  outcome: text("outcome"), // successful, no_answer, voicemail, interested, not_interested, callback
  sentiment: text("sentiment"), // positive, negative, neutral
  
  // Scheduling & Status
  scheduledAt: timestamp("scheduled_at"),
  completedAt: timestamp("completed_at"),
  status: text("status").default("completed"), // scheduled, completed, cancelled, no_show
  
  // Engagement Metrics
  emailOpened: boolean("email_opened").default(false),
  emailClicked: boolean("email_clicked").default(false),
  responseReceived: boolean("response_received").default(false),
  
  // Additional Data
  attachments: jsonb("attachments").default([]),
  metadata: jsonb("metadata").default({}),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const leadTasks = pgTable("lead_tasks", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id").references(() => leads.id).notNull(),
  assignedTo: integer("assigned_to").references(() => users.id),
  createdBy: integer("created_by").references(() => users.id),
  
  // Task Details
  title: text("title").notNull(),
  description: text("description"),
  type: text("type").notNull(), // call, email, sms, meeting, follow_up, research, proposal
  priority: text("priority").default("medium"), // high, medium, low
  status: text("status").default("pending"), // pending, in_progress, completed, cancelled
  
  // Scheduling
  dueDate: timestamp("due_date"),
  completedAt: timestamp("completed_at"),
  reminderAt: timestamp("reminder_at"),
  
  // Results
  outcome: text("outcome"),
  notes: text("notes"),
  nextAction: text("next_action"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const leadScoring = pgTable("lead_scoring", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  leadId: integer("lead_id").references(() => leads.id).notNull(),
  
  // Scoring Criteria
  demographicScore: integer("demographic_score").default(0),
  firmographicScore: integer("firmographic_score").default(0),
  behavioralScore: integer("behavioral_score").default(0),
  engagementScore: integer("engagement_score").default(0),
  
  // Detailed Scoring
  emailEngagement: integer("email_engagement").default(0),
  websiteActivity: integer("website_activity").default(0),
  socialActivity: integer("social_activity").default(0),
  contentConsumption: integer("content_consumption").default(0),
  
  // Score Changes
  previousScore: integer("previous_score").default(0),
  currentScore: integer("current_score").default(0),
  scoreChange: integer("score_change").default(0),
  
  // Metadata
  scoringReason: text("scoring_reason"),
  scoringDetails: jsonb("scoring_details").default({}),
  
  createdAt: timestamp("created_at").defaultNow(),
});

export const leadNurturing = pgTable("lead_nurturing", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  leadId: integer("lead_id").references(() => leads.id).notNull(),
  campaignId: integer("campaign_id").references(() => leadCampaigns.id),
  
  // Nurturing Details
  sequence: text("sequence").notNull(),
  stage: text("stage").notNull(),
  status: text("status").default("active"), // active, paused, completed, stopped
  
  // Scheduling
  startDate: timestamp("start_date"),
  nextActionDate: timestamp("next_action_date"),
  completedDate: timestamp("completed_date"),
  
  // Progress
  totalSteps: integer("total_steps").default(0),
  completedSteps: integer("completed_steps").default(0),
  currentStep: integer("current_step").default(1),
  
  // Performance
  openRate: decimal("open_rate", { precision: 5, scale: 2 }).default("0.00"),
  clickRate: decimal("click_rate", { precision: 5, scale: 2 }).default("0.00"),
  responseRate: decimal("response_rate", { precision: 5, scale: 2 }).default("0.00"),
  
  // Configuration
  settings: jsonb("settings").default({}),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastLogin: true,
  loginAttempts: true,
  lockedUntil: true,
  emailVerificationToken: true,
  passwordResetToken: true,
  passwordResetExpires: true,
});

export const insertContactSchema = createInsertSchema(contacts).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  // Handle string-to-date conversion for timestamp fields, allowing null values
  nextFollowUpAt: z.union([
    z.date(), 
    z.string().datetime().transform(str => new Date(str)),
    z.null(),
    z.undefined()
  ]).optional().nullable(),
  lastContactedAt: z.union([
    z.date(), 
    z.string().datetime().transform(str => new Date(str)),
    z.null(),
    z.undefined()
  ]).optional().nullable(),
  birthdate: z.union([
    z.date(), 
    z.string().datetime().transform(str => new Date(str)),
    z.null(),
    z.undefined()
  ]).optional().nullable(),
  meetingDate: z.union([
    z.date(), 
    z.string().datetime().transform(str => new Date(str)),
    z.null(),
    z.undefined()
  ]).optional().nullable(),
});

export const insertCallSchema = createInsertSchema(calls).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export const insertRecordingSchema = createInsertSchema(recordings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertVoicemailSchema = createInsertSchema(voicemails).omit({
  id: true,
  createdAt: true,
});

export const insertSettingSchema = createInsertSchema(settings).omit({
  id: true,
  updatedAt: true,
});

export const insertRoleSchema = createInsertSchema(roles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLoginHistorySchema = createInsertSchema(loginHistory).omit({
  id: true,
  timestamp: true,
});

export const insertUserActivitySchema = createInsertSchema(userActivity).omit({
  id: true,
  timestamp: true,
});

export const insertSubscriptionPlanSchema = createInsertSchema(subscriptionPlans).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInvoiceSchema = createInsertSchema(invoices).omit({
  id: true,
  createdAt: true,
});

export const insertCallNoteSchema = createInsertSchema(callNotes).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSmsTemplateSchema = createInsertSchema(smsTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  usageCount: true,
});

export const insertSmsCampaignSchema = createInsertSchema(smsCampaigns).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  sentCount: true,
  deliveredCount: true,
  failedCount: true,
  responseCount: true,
});

export const insertConversationThreadSchema = createInsertSchema(conversationThreads).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  messageCount: true,
});

// Lead Management Insert Schemas
export const insertLeadSourceSchema = createInsertSchema(leadSources).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLeadStatusSchema = createInsertSchema(leadStatuses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLeadCampaignSchema = createInsertSchema(leadCampaigns).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLeadSchema = createInsertSchema(leads).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLeadActivitySchema = createInsertSchema(leadActivities).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLeadTaskSchema = createInsertSchema(leadTasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLeadScoringSchema = createInsertSchema(leadScoring).omit({
  id: true,
  createdAt: true,
});

export const insertLeadNurturingSchema = createInsertSchema(leadNurturing).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Contact List Insert Schemas
export const insertContactListSchema = createInsertSchema(contactLists).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  contactCount: true,
  activeContactCount: true,
  lastContactAdded: true,
  usageCount: true,
  lastUsed: true,
});

export const insertContactListMembershipSchema = createInsertSchema(contactListMemberships).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  addedAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Contact = typeof contacts.$inferSelect;
export type InsertContact = z.infer<typeof insertContactSchema>;
export type Call = typeof calls.$inferSelect;
export type InsertCall = z.infer<typeof insertCallSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Recording = typeof recordings.$inferSelect;
export type InsertRecording = z.infer<typeof insertRecordingSchema>;
export type Voicemail = typeof voicemails.$inferSelect;
export type InsertVoicemail = z.infer<typeof insertVoicemailSchema>;
export type Setting = typeof settings.$inferSelect;
export type InsertSetting = z.infer<typeof insertSettingSchema>;
export type Role = typeof roles.$inferSelect;
export type InsertRole = z.infer<typeof insertRoleSchema>;
export type LoginHistory = typeof loginHistory.$inferSelect;
export type InsertLoginHistory = z.infer<typeof insertLoginHistorySchema>;
export type UserActivity = typeof userActivity.$inferSelect;
export type InsertUserActivity = z.infer<typeof insertUserActivitySchema>;
export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type InsertSubscriptionPlan = z.infer<typeof insertSubscriptionPlanSchema>;
export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type CallNote = typeof callNotes.$inferSelect;
export type InsertCallNote = z.infer<typeof insertCallNoteSchema>;
export type SmsTemplate = typeof smsTemplates.$inferSelect;
export type InsertSmsTemplate = z.infer<typeof insertSmsTemplateSchema>;
export type SmsCampaign = typeof smsCampaigns.$inferSelect;
export type InsertSmsCampaign = z.infer<typeof insertSmsCampaignSchema>;
export type ConversationThread = typeof conversationThreads.$inferSelect;
export type InsertConversationThread = z.infer<typeof insertConversationThreadSchema>;

// Lead Management Types
export type LeadSource = typeof leadSources.$inferSelect;
export type InsertLeadSource = z.infer<typeof insertLeadSourceSchema>;
export type LeadStatus = typeof leadStatuses.$inferSelect;
export type InsertLeadStatus = z.infer<typeof insertLeadStatusSchema>;
export type LeadCampaign = typeof leadCampaigns.$inferSelect;
export type InsertLeadCampaign = z.infer<typeof insertLeadCampaignSchema>;
export type Lead = typeof leads.$inferSelect;
export type InsertLead = z.infer<typeof insertLeadSchema>;
export type LeadActivity = typeof leadActivities.$inferSelect;
export type InsertLeadActivity = z.infer<typeof insertLeadActivitySchema>;
export type LeadTask = typeof leadTasks.$inferSelect;
export type InsertLeadTask = z.infer<typeof insertLeadTaskSchema>;
export type LeadScoring = typeof leadScoring.$inferSelect;
export type InsertLeadScoring = z.infer<typeof insertLeadScoringSchema>;
export type LeadNurturing = typeof leadNurturing.$inferSelect;
export type InsertLeadNurturing = z.infer<typeof insertLeadNurturingSchema>;

// Contact List Types
export type ContactList = typeof contactLists.$inferSelect;
export type InsertContactList = z.infer<typeof insertContactListSchema>;
export type ContactListMembership = typeof contactListMemberships.$inferSelect;
export type InsertContactListMembership = z.infer<typeof insertContactListMembershipSchema>;

// WebSocket Event Types for Parallel Dialer
export interface ParallelDialerContact {
  id: number;
  name: string;
  phone: string;
  company?: string;
  jobTitle?: string;
  email?: string;
}

export interface ParallelDialerCallEvent {
  lineId: string;
  callSid: string;
  callId: number;
  contact: ParallelDialerContact;
  status: 'initiated' | 'ringing' | 'in-progress' | 'answered' | 'completed' | 'failed' | 'busy' | 'no-answer' | 'canceled';
  duration?: number;
  startTime: number;
  isAnsweringMachine?: boolean;
  answeredBy?: 'human' | 'machine';
  timestamp: number;
}

export interface ParallelDialerStatusUpdate {
  lineId: string;
  callSid: string;
  callId: number;
  status: string;
  duration?: number;
  isAnsweringMachine?: boolean;
  answeredBy?: 'human' | 'machine';
  errorMessage?: string;
  timestamp: number;
}
