import { 
  users, contacts, calls, messages, recordings, voicemails, settings,
  roles, loginHistory, userActivity, subscriptionPlans, invoices, callNotes,
  smsTemplates, smsCampaigns, conversationThreads, contactLists, contactListMemberships,
  leadSources, leadStatuses, leadCampaigns, leads, leadActivities, leadTasks, leadScoring, leadNurturing,
  type User, type InsertUser, type Contact, type InsertContact,
  type Call, type InsertCall, type Message, type InsertMessage,
  type Recording, type InsertRecording, type Voicemail, type InsertVoicemail,
  type Setting, type InsertSetting, type Role, type InsertRole,
  type LoginHistory, type InsertLoginHistory, type UserActivity, type InsertUserActivity,
  type SubscriptionPlan, type InsertSubscriptionPlan, type Invoice, type InsertInvoice,
  type CallNote, type InsertCallNote, type SmsTemplate, type InsertSmsTemplate,
  type SmsCampaign, type InsertSmsCampaign, type ConversationThread, type InsertConversationThread,
  type ContactList, type InsertContactList, type ContactListMembership, type InsertContactListMembership,
  type LeadSource, type InsertLeadSource, type LeadStatus, type InsertLeadStatus,
  type LeadCampaign, type InsertLeadCampaign, type Lead, type InsertLead,
  type LeadActivity, type InsertLeadActivity, type LeadTask, type InsertLeadTask,
  type LeadScoring, type InsertLeadScoring, type LeadNurturing, type InsertLeadNurturing
} from "@shared/schema";
import { normalizePhoneNumber, arePhoneNumbersEqual } from "@shared/phoneUtils";
import { eq, and, or, desc, asc, count, sum, gte, lte, lt, gt, ilike, isNotNull, sql, inArray } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { encryptCredential, decryptCredential } from "./encryption";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByAuth0Id(auth0Id: string): Promise<User | undefined>;
  getUserByTwilioPhoneNumber(phoneNumber: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User>;
  deleteUser(id: number): Promise<void>;
  getAllUsers(): Promise<User[]>;
  searchUsers(query: string): Promise<User[]>;
  bulkUpdateUsers(userIds: number[], updates: Partial<InsertUser>): Promise<User[]>;
  authenticateUser(email: string, password: string): Promise<User | undefined>;
  
  // Per-user Twilio credentials
  updateUserTwilioCredentials(userId: number, credentials: {
    twilioAccountSid?: string;
    twilioAuthToken?: string;
    twilioApiKeySid?: string;
    twilioApiKeySecret?: string;
    twilioPhoneNumber?: string;
    twilioTwimlAppSid?: string;
    twilioConfigured?: boolean;
  }): Promise<User>;
  getUserTwilioCredentials(userId: number): Promise<{
    twilioAccountSid?: string | null;
    twilioAuthToken?: string | null;
    twilioApiKeySid?: string | null;
    twilioApiKeySecret?: string | null;
    twilioPhoneNumber?: string | null;
    twilioTwimlAppSid?: string | null;
    twilioConfigured?: boolean;
  } | undefined>;

  // Roles
  getRole(id: number): Promise<Role | undefined>;
  getRoleByName(name: string): Promise<Role | undefined>;
  createRole(role: InsertRole): Promise<Role>;
  updateRole(id: number, role: Partial<InsertRole>): Promise<Role>;
  deleteRole(id: number): Promise<void>;
  getAllRoles(): Promise<Role[]>;

  // Login History
  getLoginHistory(userId: number, limit?: number): Promise<LoginHistory[]>;
  createLoginHistoryEntry(entry: InsertLoginHistory): Promise<LoginHistory>;
  getAllLoginHistory(limit?: number): Promise<LoginHistory[]>;

  // User Activity
  getUserActivity(userId: number, limit?: number): Promise<UserActivity[]>;
  createUserActivityEntry(entry: InsertUserActivity): Promise<UserActivity>;
  getAllUserActivity(limit?: number): Promise<UserActivity[]>;

  // Subscription Plans
  getSubscriptionPlan(id: number): Promise<SubscriptionPlan | undefined>;
  getSubscriptionPlanByName(name: string): Promise<SubscriptionPlan | undefined>;
  createSubscriptionPlan(plan: InsertSubscriptionPlan): Promise<SubscriptionPlan>;
  updateSubscriptionPlan(id: number, plan: Partial<InsertSubscriptionPlan>): Promise<SubscriptionPlan>;
  deleteSubscriptionPlan(id: number): Promise<void>;
  getAllSubscriptionPlans(): Promise<SubscriptionPlan[]>;

  // Invoices
  getInvoice(id: number): Promise<Invoice | undefined>;
  getInvoicesByUser(userId: number): Promise<Invoice[]>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: number, invoice: Partial<InsertInvoice>): Promise<Invoice>;
  deleteInvoice(id: number): Promise<void>;
  getAllInvoices(): Promise<Invoice[]>;

  // Contacts
  getContact(userId: number, id: number): Promise<Contact | undefined>;
  getContactByPhone(userId: number, phone: string): Promise<Contact | undefined>;
  getContactByNormalizedPhone(userId: number, normalizedPhone: string): Promise<Contact | undefined>;
  findContactByAnyPhoneFormat(userId: number, phone: string): Promise<Contact | undefined>;
  createContact(userId: number, contact: InsertContact): Promise<Contact>;
  updateContact(userId: number, id: number, contact: Partial<InsertContact>): Promise<Contact>;
  upsertContact(userId: number, contactData: InsertContact): Promise<Contact>;
  deleteContact(userId: number, id: number): Promise<void>;
  getAllContacts(userId: number): Promise<Contact[]>;
  searchContacts(userId: number, query: string): Promise<Contact[]>;

  // Calls
  getCall(userId: number, id: number): Promise<Call | undefined>;
  getCallByTwilioSid(twilioCallSid: string): Promise<Call | undefined>;
  createCall(userId: number, call: InsertCall): Promise<Call>;
  updateCall(userId: number, id: number, call: Partial<InsertCall>): Promise<Call>;
  deleteCall(userId: number, id: number): Promise<void>;
  getAllCalls(userId: number): Promise<Call[]>;
  getCallsByContact(userId: number, contactId: number): Promise<Call[]>;
  getRecentCalls(userId: number, limit?: number): Promise<Call[]>;
  getCallsByStatus(userId: number, statuses: string[]): Promise<Call[]>;
  getActiveCalls(userId: number): Promise<Call[]>;
  getCallStats(userId: number): Promise<{
    totalCalls: number;
    completedCalls: number;
    missedCalls: number;
    totalDuration: number;
    averageDuration: number;
    totalCost: number;
    inboundCalls: number;
    outboundCalls: number;
    callSuccessRate: number;
    averageCallQuality: number;
  }>;

  // Messages
  getMessage(userId: number, id: number): Promise<Message | undefined>;
  getMessageByTwilioSid(twilioMessageSid: string): Promise<Message | undefined>;
  createMessage(userId: number, message: InsertMessage): Promise<Message>;
  updateMessage(userId: number, id: number, message: Partial<InsertMessage>): Promise<Message>;
  deleteMessage(userId: number, id: number): Promise<void>;
  getAllMessages(userId: number): Promise<Message[]>;
  getMessagesByContact(userId: number, contactId: number): Promise<Message[]>;
  getMessagesByPhone(userId: number, phone: string): Promise<Message[]>;
  searchMessages(userId: number, query: string): Promise<Message[]>;
  getConversationThread(userId: number, contactId: number): Promise<ConversationThread | undefined>;
  createConversationThread(userId: number, thread: InsertConversationThread): Promise<ConversationThread>;
  updateConversationThread(userId: number, threadId: string, thread: Partial<InsertConversationThread>): Promise<ConversationThread>;
  markMessageAsRead(userId: number, id: number): Promise<Message>;
  getUnreadMessageCount(userId: number): Promise<number>;
  getMessageAnalytics(userId: number): Promise<any>;

  // SMS Templates
  getSmsTemplate(userId: number, id: number): Promise<SmsTemplate | undefined>;
  createSmsTemplate(userId: number, template: InsertSmsTemplate): Promise<SmsTemplate>;
  updateSmsTemplate(userId: number, id: number, template: Partial<InsertSmsTemplate>): Promise<SmsTemplate>;
  deleteSmsTemplate(userId: number, id: number): Promise<void>;
  getAllSmsTemplates(userId: number): Promise<SmsTemplate[]>;
  getSmsTemplatesByCategory(userId: number, category: string): Promise<SmsTemplate[]>;
  incrementTemplateUsage(userId: number, id: number): Promise<void>;

  // SMS Campaigns
  getSmsCampaign(userId: number, id: number): Promise<SmsCampaign | undefined>;
  createSmsCampaign(userId: number, campaign: InsertSmsCampaign): Promise<SmsCampaign>;
  updateSmsCampaign(userId: number, id: number, campaign: Partial<InsertSmsCampaign>): Promise<SmsCampaign>;
  deleteSmsCampaign(userId: number, id: number): Promise<void>;
  getAllSmsCampaigns(userId: number): Promise<SmsCampaign[]>;
  getCampaignsByStatus(userId: number, status: string): Promise<SmsCampaign[]>;
  updateCampaignStats(userId: number, id: number, stats: Partial<SmsCampaign>): Promise<SmsCampaign>;

  // Advanced Recording Management
  getRecording(userId: number, id: number): Promise<Recording | undefined>;
  getRecordingByTwilioSid(userId: number, twilioSid: string): Promise<Recording | undefined>;
  createRecording(userId: number, recording: InsertRecording): Promise<Recording>;
  updateRecording(userId: number, id: number, recording: Partial<InsertRecording>): Promise<Recording>;
  deleteRecording(userId: number, id: number): Promise<void>;
  getAllRecordings(userId: number): Promise<Recording[]>;
  getRecordings(userId: number, options: {
    page: number;
    limit: number;
    filters: {
      search?: string;
      status?: string;
      category?: string;
      direction?: string;
      startDate?: Date;
      endDate?: Date;
      hasTranscript?: boolean;
      sentiment?: string;
      starred?: boolean;
      archived?: boolean;
    };
    sortBy: string;
    sortOrder: 'asc' | 'desc';
  }): Promise<{
    recordings: Recording[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>;
  getRecordingsByContact(userId: number, contactId: number): Promise<Recording[]>;
  getRecordingsOlderThan(userId: number, date: Date): Promise<Recording[]>;
  getRecordingStats(userId: number): Promise<{
    total: number;
    totalDuration: number;
    totalSize: number;
    byStatus: Record<string, number>;
    byCategory: Record<string, number>;
    recentActivity: any[];
  }>;

  // Voicemails
  getVoicemail(userId: number, id: number): Promise<Voicemail | undefined>;
  createVoicemail(userId: number, voicemail: InsertVoicemail): Promise<Voicemail>;
  updateVoicemail(userId: number, id: number, voicemail: Partial<InsertVoicemail>): Promise<Voicemail>;
  deleteVoicemail(userId: number, id: number): Promise<void>;
  getAllVoicemails(userId: number): Promise<Voicemail[]>;
  getVoicemailsByContact(userId: number, contactId: number): Promise<Voicemail[]>;
  getUnreadVoicemails(userId: number): Promise<Voicemail[]>;

  // Settings
  getSetting(key: string): Promise<Setting | undefined>;
  setSetting(key: string, value: any): Promise<Setting>;
  getAllSettings(): Promise<Setting[]>;

  // Call Notes
  getCallNote(userId: number, id: number): Promise<CallNote | undefined>;
  createCallNote(userId: number, note: InsertCallNote): Promise<CallNote>;
  updateCallNote(userId: number, id: number, note: Partial<InsertCallNote>): Promise<CallNote>;
  deleteCallNote(userId: number, id: number): Promise<void>;
  getAllCallNotes(userId: number): Promise<CallNote[]>;
  getCallNotesByCall(userId: number, callId: number): Promise<CallNote[]>;
  getCallNotesByContact(userId: number, contactId: number): Promise<CallNote[]>;
  getCallNotesByPhone(userId: number, phone: string): Promise<CallNote[]>;

  // Lead Sources
  getLeadSource(userId: number, id: number): Promise<LeadSource | undefined>;
  getLeadSourceByName(userId: number, name: string): Promise<LeadSource | undefined>;
  createLeadSource(userId: number, source: InsertLeadSource): Promise<LeadSource>;
  updateLeadSource(userId: number, id: number, source: Partial<InsertLeadSource>): Promise<LeadSource>;
  deleteLeadSource(userId: number, id: number): Promise<void>;
  getAllLeadSources(userId: number): Promise<LeadSource[]>;
  getActiveLeadSources(userId: number): Promise<LeadSource[]>;

  // Lead Statuses
  getLeadStatus(userId: number, id: number): Promise<LeadStatus | undefined>;
  getLeadStatusByName(userId: number, name: string): Promise<LeadStatus | undefined>;
  createLeadStatus(userId: number, status: InsertLeadStatus): Promise<LeadStatus>;
  updateLeadStatus(userId: number, id: number, status: Partial<InsertLeadStatus>): Promise<LeadStatus>;
  deleteLeadStatus(userId: number, id: number): Promise<void>;
  getAllLeadStatuses(userId: number): Promise<LeadStatus[]>;
  getActiveLeadStatuses(userId: number): Promise<LeadStatus[]>;

  // Lead Campaigns
  getLeadCampaign(userId: number, id: number): Promise<LeadCampaign | undefined>;
  createLeadCampaign(userId: number, campaign: InsertLeadCampaign): Promise<LeadCampaign>;
  updateLeadCampaign(userId: number, id: number, campaign: Partial<InsertLeadCampaign>): Promise<LeadCampaign>;
  deleteLeadCampaign(userId: number, id: number): Promise<void>;
  getAllLeadCampaigns(userId: number): Promise<LeadCampaign[]>;
  getLeadCampaignsByStatus(userId: number, status: string): Promise<LeadCampaign[]>;
  getLeadCampaignsByType(userId: number, type: string): Promise<LeadCampaign[]>;

  // Leads
  getLead(userId: number, id: number): Promise<Lead | undefined>;
  getLeadByEmail(userId: number, email: string): Promise<Lead | undefined>;
  getLeadByPhone(userId: number, phone: string): Promise<Lead | undefined>;
  createLead(userId: number, lead: InsertLead): Promise<Lead>;
  updateLead(userId: number, id: number, lead: Partial<InsertLead>): Promise<Lead>;
  deleteLead(userId: number, id: number): Promise<void>;
  getAllLeads(userId: number): Promise<Lead[]>;
  getLeadsByStatus(userId: number, statusId: number): Promise<Lead[]>;
  getLeadsBySource(userId: number, sourceId: number): Promise<Lead[]>;
  getLeadsByAssignee(userId: number, assigneeId: number): Promise<Lead[]>;
  getLeadsByPriority(userId: number, priority: string): Promise<Lead[]>;
  getLeadsByTemperature(userId: number, temperature: string): Promise<Lead[]>;
  searchLeads(userId: number, query: string): Promise<Lead[]>;
  getLeadsWithFilters(userId: number, filters: {
    status?: number;
    source?: number;
    assignee?: number;
    priority?: string;
    temperature?: string;
    score?: { min?: number; max?: number };
    value?: { min?: number; max?: number };
    tags?: string[];
    dateRange?: { start: Date; end: Date };
  }): Promise<Lead[]>;
  getLeadStats(userId: number): Promise<{
    total: number;
    new: number;
    qualified: number;
    converted: number;
    totalValue: number;
    avgScore: number;
    conversionRate: number;
    byStatus: Record<string, number>;
    bySource: Record<string, number>;
    byAssignee: Record<string, number>;
  }>;

  // Lead Activities
  getLeadActivity(userId: number, id: number): Promise<LeadActivity | undefined>;
  createLeadActivity(userId: number, activity: InsertLeadActivity): Promise<LeadActivity>;
  updateLeadActivity(userId: number, id: number, activity: Partial<InsertLeadActivity>): Promise<LeadActivity>;
  deleteLeadActivity(userId: number, id: number): Promise<void>;
  getLeadActivities(userId: number, leadId: number): Promise<LeadActivity[]>;
  getLeadActivitiesByType(userId: number, leadId: number, type: string): Promise<LeadActivity[]>;
  getLeadActivitiesByUser(userId: number, performedByUserId: number): Promise<LeadActivity[]>;
  getRecentLeadActivities(userId: number, limit?: number): Promise<LeadActivity[]>;

  // Lead Tasks
  getLeadTask(userId: number, id: number): Promise<LeadTask | undefined>;
  createLeadTask(userId: number, task: InsertLeadTask): Promise<LeadTask>;
  updateLeadTask(userId: number, id: number, task: Partial<InsertLeadTask>): Promise<LeadTask>;
  deleteLeadTask(userId: number, id: number): Promise<void>;
  getLeadTasks(userId: number, leadId: number): Promise<LeadTask[]>;
  getLeadTasksByAssignee(userId: number, assigneeId: number): Promise<LeadTask[]>;
  getLeadTasksByStatus(userId: number, status: string): Promise<LeadTask[]>;
  getOverdueTasks(userId: number): Promise<LeadTask[]>;
  getUpcomingTasks(userId: number, days?: number): Promise<LeadTask[]>;

  // Lead Scoring
  getLeadScoring(userId: number, id: number): Promise<LeadScoring | undefined>;
  getLeadScoringByLead(userId: number, leadId: number): Promise<LeadScoring[]>;
  createLeadScoring(userId: number, scoring: InsertLeadScoring): Promise<LeadScoring>;
  updateLeadScoring(userId: number, id: number, scoring: Partial<InsertLeadScoring>): Promise<LeadScoring>;
  deleteLeadScoring(userId: number, id: number): Promise<void>;
  getLeadScoringHistory(userId: number, leadId: number): Promise<LeadScoring[]>;

  // Lead Nurturing
  getLeadNurturing(userId: number, id: number): Promise<LeadNurturing | undefined>;
  getLeadNurturingByLead(userId: number, leadId: number): Promise<LeadNurturing[]>;
  createLeadNurturing(userId: number, nurturing: InsertLeadNurturing): Promise<LeadNurturing>;
  updateLeadNurturing(userId: number, id: number, nurturing: Partial<InsertLeadNurturing>): Promise<LeadNurturing>;
  deleteLeadNurturing(userId: number, id: number): Promise<void>;
  getActiveNurturingSequences(userId: number): Promise<LeadNurturing[]>;
  getNurturingSequencesByStatus(userId: number, status: string): Promise<LeadNurturing[]>;

  // Contact Lists
  getContactList(userId: number, id: number): Promise<ContactList | undefined>;
  getContactListByName(userId: number, name: string): Promise<ContactList | undefined>;
  createContactList(userId: number, list: InsertContactList): Promise<ContactList>;
  updateContactList(userId: number, id: number, list: Partial<InsertContactList>): Promise<ContactList>;
  deleteContactList(userId: number, id: number): Promise<void>;
  getAllContactLists(userId: number): Promise<ContactList[]>;
  getContactListsByCategory(userId: number, category: string): Promise<ContactList[]>;
  getContactListsByType(userId: number, type: string): Promise<ContactList[]>;

  // Contact List Memberships
  getContactListMembership(userId: number, id: number): Promise<ContactListMembership | undefined>;
  createContactListMembership(userId: number, membership: InsertContactListMembership): Promise<ContactListMembership>;
  updateContactListMembership(userId: number, id: number, membership: Partial<InsertContactListMembership>): Promise<ContactListMembership>;
  deleteContactListMembership(userId: number, id: number): Promise<void>;
  getContactListMemberships(userId: number, listId: number): Promise<ContactListMembership[]>;
  getContactMemberships(userId: number, contactId: number): Promise<ContactListMembership[]>;
  addContactToList(userId: number, contactId: number, listId: number, addedBy?: number): Promise<ContactListMembership>;
  removeContactFromList(userId: number, contactId: number, listId: number): Promise<void>;
  getContactsInList(userId: number, listId: number): Promise<Contact[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private contacts: Map<number, Contact>;
  private calls: Map<number, Call>;
  private messages: Map<number, Message>;
  private recordings: Map<number, Recording>;
  private voicemails: Map<number, Voicemail>;
  private settings: Map<string, Setting>;
  private roles: Map<number, Role>;
  private loginHistory: Map<number, LoginHistory>;
  private userActivity: Map<number, UserActivity>;
  private subscriptionPlans: Map<number, SubscriptionPlan>;
  private invoices: Map<number, Invoice>;
  private currentId: number;

  constructor() {
    this.users = new Map();
    this.contacts = new Map();
    this.calls = new Map();
    this.messages = new Map();
    this.recordings = new Map();
    this.voicemails = new Map();
    this.settings = new Map();
    this.roles = new Map();
    this.loginHistory = new Map();
    this.userActivity = new Map();
    this.subscriptionPlans = new Map();
    this.invoices = new Map();
    this.currentId = 1;
    this.initializeData();
  }

  private async initializeData() {
    // Initialize roles first
    this.initializeRoles();
    // Initialize subscription plans
    this.initializeSubscriptionPlans();
    // Initialize users with enhanced data
    await this.initializeUsers();
    // Initialize sample calls
    await this.initializeSampleCalls();
  }

  private async initializeSampleCalls() {
    // Generate sample calls for testing
    const sampleCalls = [
      {
        phone: '+1234567890',
        status: 'completed',
        type: 'outgoing',
        duration: 325,
        cost: '0.015',
        callQuality: 4.5,
        contactId: 1,
        tags: ['follow-up', 'important'],
        notes: 'Successful sales call, customer interested in premium package',
        priority: 'high',
        callerId: 'John Smith',
        location: 'New York, NY',
        userAgent: 'SoftPhone v2.1',
        deviceType: 'desktop',
        networkType: 'wifi',
        encryption: 'AES-256',
        codecUsed: 'G.711',
        bandwidthUsed: '64kbps',
        jitter: 12,
        packetLoss: "0.1",
        hangupReason: 'normal',
        transferCount: 0,
        holdTime: 0,
        ringTime: 8,
        answerTime: new Date(Date.now() - 86400000),
        endTime: new Date(Date.now() - 86400000 + 325000),
        sentiment: 'positive',
        customFields: {
          leadSource: 'website',
          product: 'premium'
        },
        metadata: {
          campaign: 'Q4-2024',
          source: 'CRM'
        },
        carrier: 'Verizon',
        sipCallId: 'sip-001-' + Date.now(),
        conferenceId: null,
        recordingSize: null,
        recordingFormat: null,
        recordingDuration: null,
        wasTransferred: false,
        wasConference: false,
        callerIdName: 'John Smith',
        dialedNumber: '+1234567890',
        forwardedFrom: null,
        isRecorded: false,
        transferredFrom: null,
        transferredTo: null,
        dialAttempts: 1,
        callPurpose: 'sales',
        voipProtocol: 'SIP',
        callFlow: 'outbound',
        alertType: 'ring',
        callerNetwork: 'mobile',
        isEmergency: false,
        timeZone: 'America/New_York',
        outcome: 'successful',
        transcript: 'Customer showed interest in premium package. Scheduled follow-up call for next week.',
        summary: 'Sales call with positive outcome',
        actionItems: ['Schedule follow-up call', 'Send premium package details'],
        callbackRequested: false,
        followUpRequired: true,
        assignedAgent: 'Agent001',
        leadScore: 85,
        campaignId: 'CAM-2024-001',
        sessionId: 'sess-' + Date.now(),
        keywords: ['premium', 'package', 'sales'],
        followUpDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        followUpNotes: 'Schedule demo for premium package',
        codec: 'G.711',
        bitrate: 64000
      },
      {
        phone: '+1987654321',
        status: 'missed',
        type: 'incoming',
        duration: 0,
        cost: '0.000',
        callQuality: null,
        contactId: 2,
        tags: ['missed', 'callback'],
        notes: 'Missed call from existing customer',
        priority: 'medium',
        callerId: 'Jane Doe',
        location: 'Los Angeles, CA',
        userAgent: 'Mobile App v1.5',
        deviceType: 'mobile',
        networkType: '4G',
        encryption: 'TLS',
        codecUsed: 'G.729',
        bandwidthUsed: '32kbps',
        jitter: '25ms',
        packetLoss: '0.2%',
        hangupReason: 'no_answer',
        transferCount: 0,
        holdTime: 0,
        ringTime: 30,
        answerTime: null,
        endTime: null,
        sentiment: 'neutral',
        customFields: {
          leadSource: 'referral',
          product: 'basic'
        },
        metadata: {
          campaign: 'Q4-2024',
          source: 'inbound'
        },
        carrier: 'AT&T',
        sipCallId: 'sip-002-' + Date.now(),
        conferenceId: null,
        recordingSize: null,
        recordingFormat: null,
        recordingDuration: null,
        wasTransferred: false,
        wasConference: false,
        callerIdName: 'Jane Doe',
        dialedNumber: '+1987654321',
        forwardedFrom: null,
        isRecorded: false
      },
      {
        phone: '+1555123456',
        status: 'completed',
        type: 'incoming',
        duration: 189,
        cost: '0.012',
        callQuality: 4.2,
        contactId: 3,
        tags: ['support', 'resolved'],
        notes: 'Customer support call, issue resolved successfully',
        priority: 'high',
        callerId: 'Bob Johnson',
        location: 'Chicago, IL',
        userAgent: 'WebRTC Chrome',
        deviceType: 'desktop',
        networkType: 'ethernet',
        encryption: 'SRTP',
        codecUsed: 'Opus',
        bandwidthUsed: '128kbps',
        jitter: '5ms',
        packetLoss: '0.0%',
        hangupReason: 'normal',
        transferCount: 1,
        holdTime: 45,
        ringTime: 5,
        answerTime: new Date(Date.now() - 7200000),
        endTime: new Date(Date.now() - 7200000 + 189000),
        sentiment: 'positive',
        customFields: {
          ticketId: 'SUP-001',
          department: 'technical'
        },
        metadata: {
          ticketId: 'SUP-001',
          department: 'technical'
        },
        carrier: 'T-Mobile',
        sipCallId: 'sip-003-' + Date.now(),
        conferenceId: null,
        recordingSize: null,
        recordingFormat: null,
        recordingDuration: null,
        wasTransferred: true,
        wasConference: false,
        callerIdName: 'Bob Johnson',
        dialedNumber: '+1555123456',
        forwardedFrom: null,
        isRecorded: true
      }
    ];

    sampleCalls.forEach(callData => {
      const call: Call = {
        id: this.currentId++,
        createdAt: new Date(),
        updatedAt: new Date(),
        recordingUrl: null,
        ...callData
      };
      this.calls.set(call.id, call);
    });
  }

  private async initializeRoles() {
    const defaultRoles = [
      {
        name: 'Super Admin',
        description: 'Full system access with all permissions',
        permissions: {
          users: ['create', 'read', 'update', 'delete'],
          contacts: ['create', 'read', 'update', 'delete'],
          calls: ['create', 'read', 'update', 'delete'],
          messages: ['create', 'read', 'update', 'delete'],
          recordings: ['create', 'read', 'update', 'delete'],
          voicemails: ['create', 'read', 'update', 'delete'],
          settings: ['create', 'read', 'update', 'delete'],
          billing: ['create', 'read', 'update', 'delete'],
          analytics: ['read'],
          roles: ['create', 'read', 'update', 'delete']
        },
        isCustom: false
      },
      {
        name: 'Admin',
        description: 'Administrative access with limited system settings',
        permissions: {
          users: ['create', 'read', 'update'],
          contacts: ['create', 'read', 'update', 'delete'],
          calls: ['create', 'read', 'update', 'delete'],
          messages: ['create', 'read', 'update', 'delete'],
          recordings: ['read', 'update', 'delete'],
          voicemails: ['read', 'update', 'delete'],
          settings: ['read', 'update'],
          billing: ['read'],
          analytics: ['read']
        },
        isCustom: false
      },
      {
        name: 'Manager',
        description: 'Team management with user oversight',
        permissions: {
          users: ['read', 'update'],
          contacts: ['create', 'read', 'update', 'delete'],
          calls: ['create', 'read', 'update'],
          messages: ['create', 'read', 'update'],
          recordings: ['read'],
          voicemails: ['read', 'update'],
          analytics: ['read']
        },
        isCustom: false
      },
      {
        name: 'Agent',
        description: 'Front-line agent with call and contact access',
        permissions: {
          contacts: ['create', 'read', 'update'],
          calls: ['create', 'read'],
          messages: ['create', 'read'],
          recordings: ['read'],
          voicemails: ['read']
        },
        isCustom: false
      },
      {
        name: 'Viewer',
        description: 'Read-only access for reporting',
        permissions: {
          contacts: ['read'],
          calls: ['read'],
          messages: ['read'],
          recordings: ['read'],
          voicemails: ['read'],
          analytics: ['read']
        },
        isCustom: false
      }
    ];

    defaultRoles.forEach((roleData, index) => {
      const role: Role = {
        id: index + 1,
        ...roleData,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      this.roles.set(role.id, role);
    });
    this.currentId = Math.max(this.currentId, defaultRoles.length + 1);
  }

  private async initializeSubscriptionPlans() {
    const defaultPlans = [
      {
        name: 'Free',
        description: 'Basic features for small teams',
        price: 0,
        billingCycle: 'monthly',
        features: ['Up to 100 calls/month', 'Basic contact management', 'Email support'],
        limits: { calls: 100, contacts: 500, storage: 1 }, // 1GB
        isActive: true
      },
      {
        name: 'Basic',
        description: 'Essential features for growing teams',
        price: 2900, // $29.00
        billingCycle: 'monthly',
        features: ['Up to 1,000 calls/month', 'Advanced contact management', 'Call recordings', 'Priority support'],
        limits: { calls: 1000, contacts: 5000, storage: 10 }, // 10GB
        isActive: true
      },
      {
        name: 'Pro',
        description: 'Advanced features for professional teams',
        price: 7900, // $79.00
        billingCycle: 'monthly',
        features: ['Unlimited calls', 'Advanced analytics', 'API access', 'Custom integrations', '24/7 support'],
        limits: { calls: -1, contacts: -1, storage: 100 }, // 100GB, -1 = unlimited
        isActive: true
      },
      {
        name: 'Enterprise',
        description: 'Full features for large organizations',
        price: 19900, // $199.00
        billingCycle: 'monthly',
        features: ['Everything in Pro', 'Custom roles', 'SSO integration', 'Dedicated support', 'SLA guarantee'],
        limits: { calls: -1, contacts: -1, storage: -1 },
        isActive: true
      }
    ];

    defaultPlans.forEach((planData, index) => {
      const plan: SubscriptionPlan = {
        id: index + 1,
        ...planData,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      this.subscriptionPlans.set(plan.id, plan);
    });
    this.currentId = Math.max(this.currentId, defaultPlans.length + 1);
  }

  private async initializeUsers() {
    // Create demo users with enhanced data
    // Generate a secure random password for demo users if env var not set
    let demoPassword = process.env.DEMO_USER_PASSWORD;
    if (!demoPassword) {
      // Generate a random password for this session
      const crypto = await import('crypto');
      demoPassword = crypto.randomBytes(32).toString('hex');
      console.warn('⚠️  DEMO_USER_PASSWORD not set. Generated random password for demo users. Set DEMO_USER_PASSWORD environment variable to use a specific password.');
    }
    
    const demoUsers = [
      {
        username: 'admin',
        email: 'admin@demonflare.com',
        password: demoPassword,
        firstName: 'System',
        lastName: 'Administrator',
        role: 'super_admin',
        status: 'active',
        accountType: 'enterprise',
        subscriptionPlan: 'enterprise',
        subscriptionStatus: 'active',
        emailVerified: true,
        gdprConsent: true,
        marketingConsent: false,
        tags: ['System', 'Admin'],
        usageStats: { callsThisMonth: 245, smsThisMonth: 67, storageUsed: 15.4 },
        internalNotes: 'System administrator account'
      },
      {
        username: 'amit',
        email: 'amit@demonflare.com',
        password: demoPassword,
        firstName: 'Amit',
        lastName: 'Sharma',
        role: 'manager',
        status: 'active',
        accountType: 'standard',
        subscriptionPlan: 'pro',
        subscriptionStatus: 'active',
        emailVerified: true,
        twoFactorEnabled: true,
        gdprConsent: true,
        marketingConsent: true,
        tags: ['Manager', 'High Performer'],
        usageStats: { callsThisMonth: 156, smsThisMonth: 89, storageUsed: 8.2 },
        internalNotes: 'Team lead for sales department',
        accountManager: 'Sarah Johnson'
      },
      {
        username: 'sunil',
        email: 'sunil@demonflare.com',
        password: demoPassword,
        firstName: 'Sunil',
        lastName: 'Kumar',
        role: 'agent',
        status: 'active',
        accountType: 'standard',
        subscriptionPlan: 'basic',
        subscriptionStatus: 'active',
        emailVerified: true,
        gdprConsent: true,
        marketingConsent: false,
        tags: ['Agent', 'New Hire'],
        usageStats: { callsThisMonth: 89, smsThisMonth: 34, storageUsed: 2.1 },
        internalNotes: 'Started 3 months ago, showing good progress'
      },
      {
        username: 'ansh',
        email: 'ansh@demonflare.com',
        password: demoPassword,
        firstName: 'Ansh',
        lastName: 'Patel',
        role: 'agent',
        status: 'suspended',
        accountType: 'trial',
        subscriptionPlan: 'free',
        subscriptionStatus: 'trialing',
        trialExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        emailVerified: false,
        gdprConsent: true,
        marketingConsent: true,
        tags: ['Trial', 'Needs Attention'],
        usageStats: { callsThisMonth: 23, smsThisMonth: 12, storageUsed: 0.5 },
        internalNotes: 'Account suspended for policy violation, under review'
      }
    ];

    for (const userData of demoUsers) {
      await this.createUser(userData);
    }
  }

  // Users
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async getUserByAuth0Id(auth0Id: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.auth0Id === auth0Id);
  }

  async getUserByTwilioPhoneNumber(phoneNumber: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.twilioPhoneNumber === phoneNumber);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    
    let hashedPassword = insertUser.password;
    if (insertUser.password && !insertUser.auth0Id) {
      hashedPassword = await bcrypt.hash(insertUser.password, 10);
    }
    
    const user: User = {
      id,
      username: insertUser.username,
      email: insertUser.email,
      password: hashedPassword,
      firstName: insertUser.firstName || null,
      lastName: insertUser.lastName || null,
      phone: insertUser.phone || null,
      avatar: insertUser.avatar || null,
      role: insertUser.role || 'user',
      customRoles: insertUser.customRoles || [],
      permissions: insertUser.permissions || {},
      status: insertUser.status || 'active',
      accountType: insertUser.accountType || 'standard',
      subscriptionPlan: insertUser.subscriptionPlan || 'free',
      subscriptionStatus: insertUser.subscriptionStatus || 'active',
      trialExpiresAt: insertUser.trialExpiresAt || null,
      lastPaymentDate: insertUser.lastPaymentDate || null,
      nextBillingDate: insertUser.nextBillingDate || null,
      usageStats: insertUser.usageStats || {},
      tags: insertUser.tags || [],
      internalNotes: insertUser.internalNotes || null,
      accountManager: insertUser.accountManager || null,
      teamOwner: insertUser.teamOwner || null,
      twoFactorEnabled: insertUser.twoFactorEnabled || false,
      twoFactorSecret: insertUser.twoFactorSecret || null,
      loginAttempts: 0,
      lockedUntil: null,
      lastLoginIp: insertUser.lastLoginIp || null,
      lastLoginLocation: insertUser.lastLoginLocation || null,
      lastLoginDevice: insertUser.lastLoginDevice || null,
      emailVerified: insertUser.emailVerified || false,
      emailVerificationToken: null,
      passwordResetToken: null,
      passwordResetExpires: null,
      gdprConsent: insertUser.gdprConsent || false,
      gdprConsentDate: insertUser.gdprConsentDate || null,
      marketingConsent: insertUser.marketingConsent || false,
      apiKeys: insertUser.apiKeys || [],
      connectedIntegrations: insertUser.connectedIntegrations || [],
      lastLogin: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, updateData: Partial<InsertUser>): Promise<User> {
    const user = this.users.get(id);
    if (!user) throw new Error("User not found");
    
    let dataToUpdate = { ...updateData };
    if (updateData.password) {
      dataToUpdate.password = await bcrypt.hash(updateData.password, 10);
    }
    
    const updatedUser = { ...user, ...dataToUpdate };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async deleteUser(id: number): Promise<void> {
    this.users.delete(id);
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async searchUsers(query: string): Promise<User[]> {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.users.values()).filter(user => 
      user.username.toLowerCase().includes(lowerQuery) ||
      user.email.toLowerCase().includes(lowerQuery) ||
      (user.firstName && user.firstName.toLowerCase().includes(lowerQuery)) ||
      (user.lastName && user.lastName.toLowerCase().includes(lowerQuery)) ||
      (user.tags && user.tags.some(tag => tag.toLowerCase().includes(lowerQuery)))
    );
  }

  async bulkUpdateUsers(userIds: number[], updates: Partial<InsertUser>): Promise<User[]> {
    const updatedUsers: User[] = [];
    for (const userId of userIds) {
      try {
        const updatedUser = await this.updateUser(userId, updates);
        updatedUsers.push(updatedUser);
      } catch (error) {
        // Skip users that don't exist
        continue;
      }
    }
    return updatedUsers;
  }

  async authenticateUser(email: string, password: string): Promise<User | undefined> {
    const user = await this.getUserByEmail(email);
    if (user && user.password === password) {
      // Update last login
      const updatedUser = { ...user, lastLogin: new Date() };
      this.users.set(user.id, updatedUser);
      return updatedUser;
    }
    return undefined;
  }

  // Roles
  async getRole(id: number): Promise<Role | undefined> {
    return this.roles.get(id);
  }

  async getRoleByName(name: string): Promise<Role | undefined> {
    return Array.from(this.roles.values()).find(role => role.name === name);
  }

  async createRole(insertRole: InsertRole): Promise<Role> {
    const id = this.currentId++;
    const role: Role = {
      id,
      name: insertRole.name,
      permissions: insertRole.permissions || {},
      description: insertRole.description || null,
      isCustom: insertRole.isCustom !== undefined ? insertRole.isCustom : true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.roles.set(id, role);
    return role;
  }

  async updateRole(id: number, updateData: Partial<InsertRole>): Promise<Role> {
    const role = this.roles.get(id);
    if (!role) throw new Error("Role not found");
    
    const updatedRole = { ...role, ...updateData, updatedAt: new Date() };
    this.roles.set(id, updatedRole);
    return updatedRole;
  }

  async deleteRole(id: number): Promise<void> {
    this.roles.delete(id);
  }

  async getAllRoles(): Promise<Role[]> {
    return Array.from(this.roles.values());
  }

  // Login History
  async getLoginHistory(userId: number, limit: number = 50): Promise<LoginHistory[]> {
    return Array.from(this.loginHistory.values())
      .filter(entry => entry.userId === userId)
      .sort((a, b) => new Date(b.timestamp!).getTime() - new Date(a.timestamp!).getTime())
      .slice(0, limit);
  }

  async createLoginHistoryEntry(insertEntry: InsertLoginHistory): Promise<LoginHistory> {
    const id = this.currentId++;
    const entry: LoginHistory = {
      id,
      userId: insertEntry.userId,
      ipAddress: insertEntry.ipAddress,
      location: insertEntry.location || null,
      device: insertEntry.device || null,
      userAgent: insertEntry.userAgent || null,
      success: insertEntry.success,
      failureReason: insertEntry.failureReason || null,
      timestamp: new Date(),
    };
    this.loginHistory.set(id, entry);
    return entry;
  }

  async getAllLoginHistory(limit: number = 100): Promise<LoginHistory[]> {
    return Array.from(this.loginHistory.values())
      .sort((a, b) => new Date(b.timestamp!).getTime() - new Date(a.timestamp!).getTime())
      .slice(0, limit);
  }

  // User Activity
  async getUserActivity(userId: number, limit: number = 50): Promise<UserActivity[]> {
    return Array.from(this.userActivity.values())
      .filter(entry => entry.userId === userId)
      .sort((a, b) => new Date(b.timestamp!).getTime() - new Date(a.timestamp!).getTime())
      .slice(0, limit);
  }

  async createUserActivityEntry(insertEntry: InsertUserActivity): Promise<UserActivity> {
    const id = this.currentId++;
    const entry: UserActivity = {
      id,
      userId: insertEntry.userId,
      ipAddress: insertEntry.ipAddress || null,
      userAgent: insertEntry.userAgent || null,
      action: insertEntry.action,
      resource: insertEntry.resource || null,
      resourceId: insertEntry.resourceId || null,
      metadata: insertEntry.metadata || {},
      timestamp: new Date(),
    };
    this.userActivity.set(id, entry);
    return entry;
  }

  async getAllUserActivity(limit: number = 100): Promise<UserActivity[]> {
    return Array.from(this.userActivity.values())
      .sort((a, b) => new Date(b.timestamp!).getTime() - new Date(a.timestamp!).getTime())
      .slice(0, limit);
  }

  // Subscription Plans
  async getSubscriptionPlan(id: number): Promise<SubscriptionPlan | undefined> {
    return this.subscriptionPlans.get(id);
  }

  async getSubscriptionPlanByName(name: string): Promise<SubscriptionPlan | undefined> {
    return Array.from(this.subscriptionPlans.values()).find(plan => plan.name === name);
  }

  async createSubscriptionPlan(insertPlan: InsertSubscriptionPlan): Promise<SubscriptionPlan> {
    const id = this.currentId++;
    const plan: SubscriptionPlan = {
      id,
      name: insertPlan.name,
      description: insertPlan.description || null,
      price: insertPlan.price,
      billingCycle: insertPlan.billingCycle,
      features: insertPlan.features || {},
      limits: insertPlan.limits || {},
      isActive: insertPlan.isActive !== undefined ? insertPlan.isActive : true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.subscriptionPlans.set(id, plan);
    return plan;
  }

  async updateSubscriptionPlan(id: number, updateData: Partial<InsertSubscriptionPlan>): Promise<SubscriptionPlan> {
    const plan = this.subscriptionPlans.get(id);
    if (!plan) throw new Error("Subscription plan not found");
    
    const updatedPlan = { ...plan, ...updateData, updatedAt: new Date() };
    this.subscriptionPlans.set(id, updatedPlan);
    return updatedPlan;
  }

  async deleteSubscriptionPlan(id: number): Promise<void> {
    this.subscriptionPlans.delete(id);
  }

  async getAllSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    return Array.from(this.subscriptionPlans.values()).filter(plan => plan.isActive);
  }

  // Invoices
  async getInvoice(id: number): Promise<Invoice | undefined> {
    return this.invoices.get(id);
  }

  async getInvoicesByUser(userId: number): Promise<Invoice[]> {
    return Array.from(this.invoices.values())
      .filter(invoice => invoice.userId === userId)
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
  }

  async createInvoice(insertInvoice: InsertInvoice): Promise<Invoice> {
    const id = this.currentId++;
    const invoice: Invoice = {
      id,
      status: insertInvoice.status,
      userId: insertInvoice.userId,
      invoiceNumber: insertInvoice.invoiceNumber,
      amount: insertInvoice.amount,
      billingPeriodStart: insertInvoice.billingPeriodStart || null,
      billingPeriodEnd: insertInvoice.billingPeriodEnd || null,
      dueDate: insertInvoice.dueDate || null,
      paidAt: insertInvoice.paidAt || null,
      paymentMethod: insertInvoice.paymentMethod || null,
      stripeInvoiceId: insertInvoice.stripeInvoiceId || null,
      createdAt: new Date(),
    };
    this.invoices.set(id, invoice);
    return invoice;
  }

  async updateInvoice(id: number, updateData: Partial<InsertInvoice>): Promise<Invoice> {
    const invoice = this.invoices.get(id);
    if (!invoice) throw new Error("Invoice not found");
    
    const updatedInvoice = { ...invoice, ...updateData };
    this.invoices.set(id, updatedInvoice);
    return updatedInvoice;
  }

  async deleteInvoice(id: number): Promise<void> {
    this.invoices.delete(id);
  }

  async getAllInvoices(): Promise<Invoice[]> {
    return Array.from(this.invoices.values())
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
  }

  // Contacts
  async getContact(userId: number, id: number): Promise<Contact | undefined> {
    const contact = this.contacts.get(id);
    return contact?.userId === userId ? contact : undefined;
  }

  async getContactByPhone(userId: number, phone: string): Promise<Contact | undefined> {
    return Array.from(this.contacts.values()).find(contact => contact.userId === userId && contact.phone === phone);
  }

  async getContactByNormalizedPhone(userId: number, normalizedPhone: string): Promise<Contact | undefined> {
    return Array.from(this.contacts.values()).find(contact => contact.userId === userId && contact.phone === normalizedPhone);
  }

  async findContactByAnyPhoneFormat(userId: number, phone: string): Promise<Contact | undefined> {
    const normalized = normalizePhoneNumber(phone);
    
    if (!normalized.isValid) {
      return undefined;
    }

    // Try exact match first
    let contact = await this.getContactByPhone(userId, phone);
    if (contact) return contact;

    // Try normalized phone
    contact = await this.getContactByPhone(userId, normalized.normalized);
    if (contact) return contact;

    // Search through all contacts to find any with equivalent phone numbers
    const allContacts = Array.from(this.contacts.values()).filter(c => c.userId === userId);
    for (const existingContact of allContacts) {
      if (arePhoneNumbersEqual(phone, existingContact.phone)) {
        return existingContact;
      }
    }

    return undefined;
  }

  async createContact(userId: number, insertContact: InsertContact): Promise<Contact> {
    // Normalize phone number before creating
    const normalized = normalizePhoneNumber(insertContact.phone);
    const contactData = {
      ...insertContact,
      phone: normalized.isValid ? normalized.normalized : insertContact.phone
    };

    const id = this.currentId++;
    const contact: Contact = {
      id,
      userId,
      name: contactData.name,
      phone: contactData.phone,
      email: contactData.email || null,
      avatar: contactData.avatar || null,
      tags: contactData.tags || [],
      notes: contactData.notes || null,
      isActive: contactData.isActive || null,
      alternatePhone: contactData.alternatePhone || null,
      company: contactData.company || null,
      jobTitle: contactData.jobTitle || null,
      address: contactData.address || null,
      city: contactData.city || null,
      state: contactData.state || null,
      zipCode: contactData.zipCode || null,
      country: contactData.country || null,
      priority: contactData.priority || null,
      leadStatus: contactData.leadStatus || null,
      leadSource: contactData.leadSource || null,
      socialProfiles: contactData.socialProfiles || null,
      customFields: contactData.customFields || {},
      lastContactedAt: contactData.lastContactedAt || null,
      meetingTime: contactData.meetingTime || null,
      industry: contactData.industry || null,
      revenue: contactData.revenue || null,
      employeeSize: contactData.employeeSize || null,
      birthdate: contactData.birthdate || null,
      timezone: contactData.timezone || null,
      listCount: contactData.listCount || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.contacts.set(id, contact);
    return contact;
  }

  async updateContact(userId: number, id: number, updateData: Partial<InsertContact>): Promise<Contact> {
    const contact = this.contacts.get(id);
    if (!contact || contact.userId !== userId) throw new Error("Contact not found");
    
    // Normalize phone number if being updated
    const normalizedUpdateData = { ...updateData };
    if (updateData.phone) {
      const normalized = normalizePhoneNumber(updateData.phone);
      normalizedUpdateData.phone = normalized.isValid ? normalized.normalized : updateData.phone;
    }

    const updatedContact = { ...contact, ...normalizedUpdateData, updatedAt: new Date() };
    this.contacts.set(id, updatedContact);
    return updatedContact;
  }

  async upsertContact(userId: number, contactData: InsertContact): Promise<Contact> {
    // Normalize the phone number
    const normalized = normalizePhoneNumber(contactData.phone);
    const normalizedPhone = normalized.isValid ? normalized.normalized : contactData.phone;
    
    // Try to find existing contact using smart phone matching
    const existingContact = await this.findContactByAnyPhoneFormat(userId, contactData.phone);
    
    if (existingContact) {
      // Update existing contact - merge data intelligently
      const mergedData: Partial<InsertContact> = {
        // Keep existing name if new one is empty/default
        name: contactData.name && contactData.name !== 'Unknown Caller' ? contactData.name : existingContact.name,
        // Always use normalized phone
        phone: normalizedPhone,
        // Merge other fields, preferring new data over empty/null values
        email: contactData.email || existingContact.email,
        company: contactData.company || existingContact.company,
        jobTitle: contactData.jobTitle || existingContact.jobTitle,
        address: contactData.address || existingContact.address,
        city: contactData.city || existingContact.city,
        state: contactData.state || existingContact.state,
        zipCode: contactData.zipCode || existingContact.zipCode,
        country: contactData.country || existingContact.country,
        // Merge notes - append new notes to existing ones
        notes: contactData.notes 
          ? (existingContact.notes ? `${existingContact.notes}\n\n${contactData.notes}` : contactData.notes)
          : existingContact.notes,
        // Preserve or upgrade priority and lead status
        priority: contactData.priority || existingContact.priority,
        leadStatus: contactData.leadStatus || existingContact.leadStatus,
        leadSource: contactData.leadSource || existingContact.leadSource,
        // Merge tags
        tags: contactData.tags && contactData.tags.length > 0 
          ? Array.from(new Set([...(existingContact.tags || []), ...contactData.tags]))
          : existingContact.tags,
        // Update timestamps
        lastContactedAt: new Date()
      };
      
      return this.updateContact(userId, existingContact.id, mergedData);
    } else {
      // Create new contact with normalized phone
      const newContactData = {
        ...contactData,
        phone: normalizedPhone,
        lastContactedAt: new Date()
      };
      
      return this.createContact(userId, newContactData);
    }
  }

  async deleteContact(userId: number, id: number): Promise<void> {
    const contact = this.contacts.get(id);
    if (contact?.userId === userId) {
      this.contacts.delete(id);
    }
  }

  async getAllContacts(userId: number): Promise<Contact[]> {
    return Array.from(this.contacts.values()).filter(contact => contact.userId === userId);
  }

  async searchContacts(userId: number, query: string): Promise<Contact[]> {
    const lowercaseQuery = query.toLowerCase();
    return Array.from(this.contacts.values()).filter(contact =>
      contact.userId === userId && ( 
      contact.name.toLowerCase().includes(lowercaseQuery) ||
      contact.phone.includes(query) ||
      contact.email?.toLowerCase().includes(lowercaseQuery))
    );
  }

  // Calls
  async getCall(userId: number, id: number): Promise<Call | undefined> {
    const call = this.calls.get(id);
    return call?.userId === userId ? call : undefined;
  }

  async getCallByTwilioSid(twilioCallSid: string): Promise<Call | undefined> {
    return Array.from(this.calls.values()).find(call => 
      call.metadata && 
      typeof call.metadata === 'object' && 
      'twilioCallSid' in call.metadata && 
      call.metadata.twilioCallSid === twilioCallSid
    );
  }

  async createCall(userId: number, insertCall: InsertCall): Promise<Call> {
    const id = this.currentId++;
    const call: Call = {
      id,
      phone: insertCall.phone,
      status: insertCall.status,
      tags: insertCall.tags || null,
      type: insertCall.type,
      location: insertCall.location || null,
      userAgent: insertCall.userAgent || null,
      userId: userId,
      metadata: insertCall.metadata || {},
      priority: insertCall.priority || null,
      customFields: insertCall.customFields || {},
      twilioCallSid: insertCall.twilioCallSid || null,
      direction: insertCall.direction || null,
      fromNumber: insertCall.fromNumber || null,
      toNumber: insertCall.toNumber || null,
      callerId: insertCall.callerId || null,
      cost: insertCall.cost || null,
      callQuality: insertCall.callQuality || null,
      callRating: insertCall.callRating || null,
      notes: insertCall.notes || null,
      isRecorded: insertCall.isRecorded || false,
      recordingPath: insertCall.recordingPath || null,
      forwardedFrom: insertCall.forwardedFrom || null,
      transferredFrom: insertCall.transferredFrom || null,
      transferredTo: insertCall.transferredTo || null,
      dialAttempts: insertCall.dialAttempts || null,
      hangupCause: insertCall.hangupCause || null,
      sipResponseCode: insertCall.sipResponseCode || null,
      networkMetrics: insertCall.networkMetrics || null,
      jitter: insertCall.jitter || null,
      packetLoss: insertCall.packetLoss || null,
      contactId: insertCall.contactId || null,
      duration: insertCall.duration || null,
      recordingUrl: insertCall.recordingUrl || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.calls.set(id, call);
    return call;
  }

  async updateCall(userId: number, id: number, updateData: Partial<InsertCall>): Promise<Call> {
    const call = this.calls.get(id);
    if (!call) throw new Error("Call not found");
    if (call.userId !== userId) throw new Error("Unauthorized");
    
    const updatedCall = { ...call, ...updateData };
    this.calls.set(id, updatedCall);
    return updatedCall;
  }

  async deleteCall(userId: number, id: number): Promise<void> {
    const call = this.calls.get(id);
    if (call && call.userId === userId) {
      this.calls.delete(id);
    }
  }

  async getAllCalls(userId: number): Promise<Call[]> {
    return Array.from(this.calls.values()).filter(call => call.userId === userId);
  }

  async getCallsByContact(userId: number, contactId: number): Promise<Call[]> {
    return Array.from(this.calls.values()).filter(call => call.userId === userId && call.contactId === contactId);
  }

  async getRecentCalls(userId: number, limit: number = 10): Promise<Call[]> {
    return Array.from(this.calls.values())
      .filter(call => call.userId === userId)
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
      .slice(0, limit);
  }

  async getCallsByStatus(userId: number, statuses: string[]): Promise<Call[]> {
    return Array.from(this.calls.values())
      .filter(call => call.userId === userId && statuses.includes(call.status))
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
  }

  async getActiveCalls(userId: number): Promise<Call[]> {
    const activeStatuses = ['queued', 'initiated', 'ringing', 'in-progress'];
    return this.getCallsByStatus(userId, activeStatuses);
  }

  async getCallStats(): Promise<{
    totalCalls: number;
    completedCalls: number;
    missedCalls: number;
    totalDuration: number;
    averageDuration: number;
    totalCost: number;
    inboundCalls: number;
    outboundCalls: number;
    callSuccessRate: number;
    averageCallQuality: number;
  }> {
    const calls = Array.from(this.calls.values());
    const totalCalls = calls.length;
    
    const completedCalls = calls.filter(call => call.status === 'completed').length;
    const missedCalls = calls.filter(call => call.status === 'missed').length;
    const inboundCalls = calls.filter(call => call.type === 'incoming').length;
    const outboundCalls = calls.filter(call => call.type === 'outgoing').length;
    
    const totalDuration = calls.reduce((sum, call) => sum + (call.duration || 0), 0);
    const averageDuration = totalCalls > 0 ? totalDuration / totalCalls : 0;
    
    const totalCost = calls.reduce((sum, call) => sum + (Number(call.cost) || 0), 0);
    const callSuccessRate = totalCalls > 0 ? (completedCalls / totalCalls) * 100 : 0;
    
    const callsWithQuality = calls.filter(call => call.callQuality !== null);
    const averageCallQuality = callsWithQuality.length > 0 ? 
      callsWithQuality.reduce((sum, call) => sum + (call.callQuality || 0), 0) / callsWithQuality.length : 0;

    return {
      totalCalls,
      completedCalls,
      missedCalls,
      totalDuration,
      averageDuration,
      totalCost,
      inboundCalls,
      outboundCalls,
      callSuccessRate,
      averageCallQuality
    };
  }

  // Messages
  async getMessage(id: number): Promise<Message | undefined> {
    return this.messages.get(id);
  }

  async getMessageByTwilioSid(twilioMessageSid: string): Promise<Message | undefined> {
    return Array.from(this.messages.values()).find(message => 
      message.metadata && 
      typeof message.metadata === 'object' && 
      'twilioMessageSid' in message.metadata && 
      message.metadata.twilioMessageSid === twilioMessageSid
    );
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = this.currentId++;
    const message: Message = {
      id,
      phone: insertMessage.phone,
      status: insertMessage.status,
      tags: insertMessage.tags || null,
      type: insertMessage.type,
      metadata: insertMessage.metadata || {},
      priority: insertMessage.priority || null,
      customFields: insertMessage.customFields || {},
      content: insertMessage.content,
      direction: insertMessage.direction || null,
      twilioMessageSid: insertMessage.twilioMessageSid || null,
      twilioAccountSid: insertMessage.twilioAccountSid || null,
      fromNumber: insertMessage.fromNumber || null,
      toNumber: insertMessage.toNumber || null,
      cost: insertMessage.cost || null,
      messagingServiceSid: insertMessage.messagingServiceSid || null,
      numSegments: insertMessage.numSegments || null,
      errorCode: insertMessage.errorCode || null,
      errorMessage: insertMessage.errorMessage || null,
      uri: insertMessage.uri || null,
      subresourceUris: insertMessage.subresourceUris || null,
      dateCreated: insertMessage.dateCreated || null,
      dateUpdated: insertMessage.dateUpdated || null,
      dateSent: insertMessage.dateSent || null,
      accountSid: insertMessage.accountSid || null,
      apiVersion: insertMessage.apiVersion || null,
      price: insertMessage.price || null,
      priceUnit: insertMessage.priceUnit || null,
      body: insertMessage.body || null,
      numMedia: insertMessage.numMedia || null,
      mediaUrls: insertMessage.mediaUrls || null,
      isScheduled: insertMessage.isScheduled || false,
      scheduledAt: insertMessage.scheduledAt || null,
      campaignId: insertMessage.campaignId || null,
      templateId: insertMessage.templateId || null,
      variables: insertMessage.variables || null,
      deliveredAt: insertMessage.deliveredAt || null,
      readAt: insertMessage.readAt || null,
      failedAt: insertMessage.failedAt || null,
      retryCount: insertMessage.retryCount || null,
      maxRetries: insertMessage.maxRetries || null,
      lastRetryAt: insertMessage.lastRetryAt || null,
      contactId: insertMessage.contactId || null,
      updatedAt: insertMessage.updatedAt || null,
      createdAt: new Date(),
    };
    this.messages.set(id, message);
    return message;
  }

  async updateMessage(id: number, updateData: Partial<InsertMessage>): Promise<Message> {
    const message = this.messages.get(id);
    if (!message) throw new Error("Message not found");
    
    const updatedMessage = { ...message, ...updateData };
    this.messages.set(id, updatedMessage);
    return updatedMessage;
  }

  async deleteMessage(id: number): Promise<void> {
    this.messages.delete(id);
  }

  async getAllMessages(): Promise<Message[]> {
    return Array.from(this.messages.values());
  }

  async getMessagesByContact(contactId: number): Promise<Message[]> {
    return Array.from(this.messages.values()).filter(message => message.contactId === contactId);
  }

  async getMessagesByPhone(phone: string): Promise<Message[]> {
    return Array.from(this.messages.values()).filter(message => message.phone === phone);
  }

  // Recordings
  async getRecording(id: number): Promise<Recording | undefined> {
    return this.recordings.get(id);
  }

  async createRecording(insertRecording: InsertRecording): Promise<Recording> {
    const id = this.currentId++;
    const recording: Recording = {
      ...insertRecording,
      id,
      contactId: insertRecording.contactId || null,
      callId: insertRecording.callId || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.recordings.set(id, recording);
    return recording;
  }

  async updateRecording(id: number, updateData: Partial<InsertRecording>): Promise<Recording> {
    const recording = this.recordings.get(id);
    if (!recording) throw new Error("Recording not found");
    
    const updatedRecording = { ...recording, ...updateData };
    this.recordings.set(id, updatedRecording);
    return updatedRecording;
  }

  async deleteRecording(id: number): Promise<void> {
    this.recordings.delete(id);
  }

  async getAllRecordings(): Promise<Recording[]> {
    return Array.from(this.recordings.values());
  }

  async getRecordingsByContact(contactId: number): Promise<Recording[]> {
    return Array.from(this.recordings.values()).filter(recording => recording.contactId === contactId);
  }

  // Voicemails
  async getVoicemail(id: number): Promise<Voicemail | undefined> {
    return this.voicemails.get(id);
  }

  async createVoicemail(insertVoicemail: InsertVoicemail): Promise<Voicemail> {
    const id = this.currentId++;
    const voicemail: Voicemail = {
      ...insertVoicemail,
      id,
      contactId: insertVoicemail.contactId || null,
      isRead: insertVoicemail.isRead || false,
      createdAt: new Date(),
    };
    this.voicemails.set(id, voicemail);
    return voicemail;
  }

  async updateVoicemail(id: number, updateData: Partial<InsertVoicemail>): Promise<Voicemail> {
    const voicemail = this.voicemails.get(id);
    if (!voicemail) throw new Error("Voicemail not found");
    
    const updatedVoicemail = { ...voicemail, ...updateData };
    this.voicemails.set(id, updatedVoicemail);
    return updatedVoicemail;
  }

  async deleteVoicemail(id: number): Promise<void> {
    this.voicemails.delete(id);
  }

  async getAllVoicemails(): Promise<Voicemail[]> {
    return Array.from(this.voicemails.values());
  }

  async getVoicemailsByContact(contactId: number): Promise<Voicemail[]> {
    return Array.from(this.voicemails.values()).filter(voicemail => voicemail.contactId === contactId);
  }

  async getUnreadVoicemails(): Promise<Voicemail[]> {
    return Array.from(this.voicemails.values()).filter(voicemail => !voicemail.isRead);
  }

  // Settings
  async getSetting(key: string): Promise<Setting | undefined> {
    return this.settings.get(key);
  }

  async setSetting(key: string, value: any): Promise<Setting> {
    const id = this.currentId++;
    const setting: Setting = {
      id,
      key,
      value,
      updatedAt: new Date(),
    };
    this.settings.set(key, setting);
    return setting;
  }

  async getAllSettings(): Promise<Setting[]> {
    return Array.from(this.settings.values());
  }
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getUserByAuth0Id(auth0Id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.auth0Id, auth0Id));
    return user || undefined;
  }

  async getUserByTwilioPhoneNumber(phoneNumber: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.twilioPhoneNumber, phoneNumber));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    // Hash password if provided and not an Auth0 user
    let hashedPassword = insertUser.password;
    if (insertUser.password && !insertUser.auth0Id) {
      hashedPassword = await bcrypt.hash(insertUser.password, 10);
    }

    const [user] = await db
      .insert(users)
      .values({
        ...insertUser,
        password: hashedPassword
      })
      .returning();
    return user;
  }

  async updateUser(id: number, updateData: Partial<InsertUser>): Promise<User> {
    // Hash password if it's being updated
    let dataToUpdate = { ...updateData };
    if (updateData.password) {
      dataToUpdate.password = await bcrypt.hash(updateData.password, 10);
    }

    const [user] = await db
      .update(users)
      .set(dataToUpdate)
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async deleteUser(id: number): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async searchUsers(query: string): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(
        or(
          ilike(users.username, `%${query}%`),
          ilike(users.email, `%${query}%`),
          ilike(users.firstName, `%${query}%`),
          ilike(users.lastName, `%${query}%`)
        )
      )
      .orderBy(desc(users.createdAt));
  }

  async bulkUpdateUsers(userIds: number[], updates: Partial<InsertUser>): Promise<User[]> {
    // Update users in batch
    await db
      .update(users)
      .set(updates)
      .where(eq(users.id, userIds[0])); // Simplified for now
    
    // Return updated users
    return await db
      .select()
      .from(users)
      .where(eq(users.id, userIds[0]));
  }

  async authenticateUser(email: string, password: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email));
    
    if (!user || !user.password) {
      return undefined;
    }

    // For Auth0 users (no password), always return undefined
    if (user.auth0Id && !user.password) {
      return undefined;
    }

    // Use bcrypt to compare passwords
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return undefined;
    }

    // Update last login
    await db
      .update(users)
      .set({ lastLogin: new Date() })
      .where(eq(users.id, user.id));

    return { ...user, lastLogin: new Date() };
  }

  // Per-user Twilio credentials (with encryption)
  async updateUserTwilioCredentials(userId: number, credentials: {
    twilioAccountSid?: string;
    twilioAuthToken?: string;
    twilioApiKeySid?: string;
    twilioApiKeySecret?: string;
    twilioPhoneNumber?: string;
    twilioTwimlAppSid?: string;
    twilioConfigured?: boolean;
  }): Promise<User> {
    // Encrypt sensitive credentials before storing
    const encryptedCredentials = {
      twilioAccountSid: credentials.twilioAccountSid ? encryptCredential(credentials.twilioAccountSid) : undefined,
      twilioAuthToken: credentials.twilioAuthToken ? encryptCredential(credentials.twilioAuthToken) : undefined,
      twilioApiKeySid: credentials.twilioApiKeySid ? encryptCredential(credentials.twilioApiKeySid) : undefined,
      twilioApiKeySecret: credentials.twilioApiKeySecret ? encryptCredential(credentials.twilioApiKeySecret) : undefined,
      twilioPhoneNumber: credentials.twilioPhoneNumber,
      twilioTwimlAppSid: credentials.twilioTwimlAppSid,
      twilioConfigured: credentials.twilioConfigured,
    };

    const [updatedUser] = await db
      .update(users)
      .set(encryptedCredentials)
      .where(eq(users.id, userId))
      .returning();
    
    if (!updatedUser) {
      throw new Error('User not found');
    }
    
    console.log(`🔐 Encrypted Twilio credentials updated for user ${userId}`);
    return updatedUser;
  }

  async getUserTwilioCredentials(userId: number): Promise<{
    twilioAccountSid?: string | null;
    twilioAuthToken?: string | null;
    twilioApiKeySid?: string | null;
    twilioApiKeySecret?: string | null;
    twilioPhoneNumber?: string | null;
    twilioTwimlAppSid?: string | null;
    twilioConfigured?: boolean;
  } | undefined> {
    const [user] = await db
      .select({
        twilioAccountSid: users.twilioAccountSid,
        twilioAuthToken: users.twilioAuthToken,
        twilioApiKeySid: users.twilioApiKeySid,
        twilioApiKeySecret: users.twilioApiKeySecret,
        twilioPhoneNumber: users.twilioPhoneNumber,
        twilioTwimlAppSid: users.twilioTwimlAppSid,
        twilioConfigured: users.twilioConfigured,
      })
      .from(users)
      .where(eq(users.id, userId));
    
    if (!user) {
      return undefined;
    }

    // Decrypt sensitive credentials
    return {
      twilioAccountSid: decryptCredential(user.twilioAccountSid),
      twilioAuthToken: decryptCredential(user.twilioAuthToken),
      twilioApiKeySid: decryptCredential(user.twilioApiKeySid),
      twilioApiKeySecret: decryptCredential(user.twilioApiKeySecret),
      twilioPhoneNumber: user.twilioPhoneNumber,
      twilioTwimlAppSid: user.twilioTwimlAppSid,
      twilioConfigured: user.twilioConfigured || false,
    };
  }

  // Roles
  async getRole(id: number): Promise<Role | undefined> {
    const [role] = await db.select().from(roles).where(eq(roles.id, id));
    return role || undefined;
  }

  async getRoleByName(name: string): Promise<Role | undefined> {
    const [role] = await db.select().from(roles).where(eq(roles.name, name));
    return role || undefined;
  }

  async createRole(insertRole: InsertRole): Promise<Role> {
    const [role] = await db
      .insert(roles)
      .values(insertRole)
      .returning();
    return role;
  }

  async updateRole(id: number, updateData: Partial<InsertRole>): Promise<Role> {
    const [role] = await db
      .update(roles)
      .set(updateData)
      .where(eq(roles.id, id))
      .returning();
    return role;
  }

  async deleteRole(id: number): Promise<void> {
    await db.delete(roles).where(eq(roles.id, id));
  }

  async getAllRoles(): Promise<Role[]> {
    return await db.select().from(roles).orderBy(asc(roles.name));
  }

  // Login History
  async getLoginHistory(userId: number, limit: number = 50): Promise<LoginHistory[]> {
    return await db
      .select()
      .from(loginHistory)
      .where(eq(loginHistory.userId, userId))
      .orderBy(desc(loginHistory.timestamp))
      .limit(limit);
  }

  async createLoginHistoryEntry(insertEntry: InsertLoginHistory): Promise<LoginHistory> {
    const [entry] = await db
      .insert(loginHistory)
      .values(insertEntry)
      .returning();
    return entry;
  }

  async getAllLoginHistory(limit: number = 100): Promise<LoginHistory[]> {
    return await db
      .select()
      .from(loginHistory)
      .orderBy(desc(loginHistory.timestamp))
      .limit(limit);
  }

  // User Activity
  async getUserActivity(userId: number, limit: number = 50): Promise<UserActivity[]> {
    return await db
      .select()
      .from(userActivity)
      .where(eq(userActivity.userId, userId))
      .orderBy(desc(userActivity.timestamp))
      .limit(limit);
  }

  async createUserActivityEntry(insertEntry: InsertUserActivity): Promise<UserActivity> {
    const [entry] = await db
      .insert(userActivity)
      .values(insertEntry)
      .returning();
    return entry;
  }

  async getAllUserActivity(limit: number = 100): Promise<UserActivity[]> {
    return await db
      .select()
      .from(userActivity)
      .orderBy(desc(userActivity.timestamp))
      .limit(limit);
  }

  // Subscription Plans
  async getSubscriptionPlan(id: number): Promise<SubscriptionPlan | undefined> {
    const [plan] = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, id));
    return plan || undefined;
  }

  async getSubscriptionPlanByName(name: string): Promise<SubscriptionPlan | undefined> {
    const [plan] = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.name, name));
    return plan || undefined;
  }

  async createSubscriptionPlan(insertPlan: InsertSubscriptionPlan): Promise<SubscriptionPlan> {
    const [plan] = await db
      .insert(subscriptionPlans)
      .values(insertPlan)
      .returning();
    return plan;
  }

  async updateSubscriptionPlan(id: number, updateData: Partial<InsertSubscriptionPlan>): Promise<SubscriptionPlan> {
    const [plan] = await db
      .update(subscriptionPlans)
      .set(updateData)
      .where(eq(subscriptionPlans.id, id))
      .returning();
    return plan;
  }

  async deleteSubscriptionPlan(id: number): Promise<void> {
    await db.delete(subscriptionPlans).where(eq(subscriptionPlans.id, id));
  }

  async getAllSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    return await db.select().from(subscriptionPlans).orderBy(asc(subscriptionPlans.name));
  }

  // Invoices
  async getInvoice(id: number): Promise<Invoice | undefined> {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id));
    return invoice || undefined;
  }

  async getInvoicesByUser(userId: number): Promise<Invoice[]> {
    return await db
      .select()
      .from(invoices)
      .where(eq(invoices.userId, userId))
      .orderBy(desc(invoices.createdAt));
  }

  async createInvoice(insertInvoice: InsertInvoice): Promise<Invoice> {
    const [invoice] = await db
      .insert(invoices)
      .values(insertInvoice)
      .returning();
    return invoice;
  }

  async updateInvoice(id: number, updateData: Partial<InsertInvoice>): Promise<Invoice> {
    const [invoice] = await db
      .update(invoices)
      .set(updateData)
      .where(eq(invoices.id, id))
      .returning();
    return invoice;
  }

  async deleteInvoice(id: number): Promise<void> {
    await db.delete(invoices).where(eq(invoices.id, id));
  }

  async getAllInvoices(): Promise<Invoice[]> {
    return await db.select().from(invoices).orderBy(desc(invoices.createdAt));
  }

  // Contacts
  async getContact(userId: number, id: number): Promise<Contact | undefined> {
    const [contact] = await db.select().from(contacts).where(and(eq(contacts.id, id), eq(contacts.userId, userId)));
    return contact || undefined;
  }

  async getContactByPhone(userId: number, phone: string): Promise<Contact | undefined> {
    const [contact] = await db.select().from(contacts).where(and(eq(contacts.phone, phone), eq(contacts.userId, userId)));
    return contact || undefined;
  }

  async getContactByNormalizedPhone(userId: number, normalizedPhone: string): Promise<Contact | undefined> {
    const [contact] = await db.select().from(contacts).where(and(eq(contacts.phone, normalizedPhone), eq(contacts.userId, userId)));
    return contact || undefined;
  }

  async findContactByAnyPhoneFormat(userId: number, phone: string): Promise<Contact | undefined> {
    const normalized = normalizePhoneNumber(phone);
    
    if (!normalized.isValid) {
      return undefined;
    }

    // Try exact match first
    let contact = await this.getContactByPhone(userId, phone);
    if (contact) return contact;

    // Try normalized phone
    contact = await this.getContactByPhone(userId, normalized.normalized);
    if (contact) return contact;

    // Search through user's contacts to find any with equivalent phone numbers
    const allContacts = await db.select().from(contacts).where(eq(contacts.userId, userId));
    for (const existingContact of allContacts) {
      if (arePhoneNumbersEqual(phone, existingContact.phone)) {
        return existingContact;
      }
    }

    return undefined;
  }

  async createContact(userId: number, insertContact: InsertContact): Promise<Contact> {
    // Normalize phone number before creating
    const normalized = normalizePhoneNumber(insertContact.phone);
    const contactData = {
      ...insertContact,
      userId: userId,
      phone: normalized.isValid ? normalized.normalized : insertContact.phone
    };

    const [contact] = await db
      .insert(contacts)
      .values(contactData)
      .returning();
    return contact;
  }

  async updateContact(userId: number, id: number, updateData: Partial<InsertContact>): Promise<Contact> {
    // Normalize phone number if being updated
    const normalizedUpdateData = { ...updateData };
    if (updateData.phone) {
      const normalized = normalizePhoneNumber(updateData.phone);
      normalizedUpdateData.phone = normalized.isValid ? normalized.normalized : updateData.phone;
    }

    const [contact] = await db
      .update(contacts)
      .set(normalizedUpdateData)
      .where(and(eq(contacts.id, id), eq(contacts.userId, userId)))
      .returning();
    return contact;
  }

  async upsertContact(userId: number, contactData: InsertContact): Promise<Contact> {
    // Normalize the phone number
    const normalized = normalizePhoneNumber(contactData.phone);
    const normalizedPhone = normalized.isValid ? normalized.normalized : contactData.phone;
    
    // Try to find existing contact using smart phone matching
    const existingContact = await this.findContactByAnyPhoneFormat(userId, contactData.phone);
    
    if (existingContact) {
      // Update existing contact - merge data intelligently
      const mergedData: Partial<InsertContact> = {
        // Keep existing name if new one is empty/default
        name: contactData.name && contactData.name !== 'Unknown Caller' ? contactData.name : existingContact.name,
        // Always use normalized phone
        phone: normalizedPhone,
        // Merge other fields, preferring new data over empty/null values
        email: contactData.email || existingContact.email,
        company: contactData.company || existingContact.company,
        jobTitle: contactData.jobTitle || existingContact.jobTitle,
        address: contactData.address || existingContact.address,
        city: contactData.city || existingContact.city,
        state: contactData.state || existingContact.state,
        zipCode: contactData.zipCode || existingContact.zipCode,
        country: contactData.country || existingContact.country,
        // Merge notes - append new notes to existing ones
        notes: contactData.notes 
          ? (existingContact.notes ? `${existingContact.notes}\n\n${contactData.notes}` : contactData.notes)
          : existingContact.notes,
        // Preserve or upgrade priority and lead status
        priority: contactData.priority || existingContact.priority,
        leadStatus: contactData.leadStatus || existingContact.leadStatus,
        leadSource: contactData.leadSource || existingContact.leadSource,
        // Merge tags
        tags: contactData.tags && contactData.tags.length > 0 
          ? Array.from(new Set([...(existingContact.tags || []), ...contactData.tags]))
          : existingContact.tags,
        // Update timestamps
        lastContactedAt: new Date()
      };
      
      return this.updateContact(userId, existingContact.id, mergedData);
    } else {
      // Create new contact with normalized phone
      const newContactData = {
        ...contactData,
        phone: normalizedPhone,
        lastContactedAt: new Date()
      };
      
      return this.createContact(userId, newContactData);
    }
  }

  async deleteContact(userId: number, id: number): Promise<void> {
    await db.delete(contacts).where(and(eq(contacts.id, id), eq(contacts.userId, userId)));
  }

  async getAllContacts(userId: number): Promise<Contact[]> {
    return await db.select().from(contacts).where(eq(contacts.userId, userId)).orderBy(asc(contacts.name));
  }

  async searchContacts(userId: number, query: string): Promise<Contact[]> {
    return await db
      .select()
      .from(contacts)
      .where(
        and(
          eq(contacts.userId, userId),
          or(
            ilike(contacts.name, `%${query}%`),
            ilike(contacts.phone, `%${query}%`),
            ilike(contacts.email, `%${query}%`)
          )
        )
      )
      .orderBy(asc(contacts.name));
  }

  // Calls
  async getCall(userId: number, id: number): Promise<Call | undefined> {
    const [call] = await db.select().from(calls).where(and(eq(calls.id, id), eq(calls.userId, userId)));
    return call || undefined;
  }

  async getCallByTwilioSid(twilioCallSid: string): Promise<Call | undefined> {
    const [call] = await db.select().from(calls).where(
      sql`${calls.metadata}->>'twilioCallSid' = ${twilioCallSid}`
    );
    return call || undefined;
  }

  async createCall(userId: number, insertCall: InsertCall): Promise<Call> {
    const callData = {
      ...insertCall,
      userId: userId
    };
    const [call] = await db
      .insert(calls)
      .values(callData)
      .returning();
    return call;
  }

  async updateCall(userId: number, id: number, updateData: Partial<InsertCall>): Promise<Call> {
    const [call] = await db
      .update(calls)
      .set(updateData)
      .where(and(eq(calls.id, id), eq(calls.userId, userId)))
      .returning();
    return call;
  }

  async deleteCall(userId: number, id: number): Promise<void> {
    await db.delete(calls).where(and(eq(calls.id, id), eq(calls.userId, userId)));
  }

  async getAllCalls(userId: number): Promise<Call[]> {
    return await db.select().from(calls).where(eq(calls.userId, userId)).orderBy(desc(calls.createdAt));
  }

  async getCallsByContact(userId: number, contactId: number): Promise<Call[]> {
    return await db
      .select()
      .from(calls)
      .where(and(eq(calls.contactId, contactId), eq(calls.userId, userId)))
      .orderBy(desc(calls.createdAt));
  }

  async getRecentCalls(userId: number, limit: number = 10): Promise<Call[]> {
    return await db
      .select()
      .from(calls)
      .where(eq(calls.userId, userId))
      .orderBy(desc(calls.createdAt))
      .limit(limit);
  }

  async getCallsByStatus(userId: number, statuses: string[]): Promise<Call[]> {
    if (statuses.length === 0) {
      return [];
    }
    return await db
      .select()
      .from(calls)
      .where(and(
        eq(calls.userId, userId),
        inArray(calls.status, statuses)
      ))
      .orderBy(desc(calls.createdAt));
  }

  async getActiveCalls(userId: number): Promise<Call[]> {
    const activeStatuses = ['queued', 'initiated', 'ringing', 'in-progress'];
    return this.getCallsByStatus(userId, activeStatuses);
  }

  async getCallByTwilioSid(callSid: string): Promise<Call | null> {
    const results = await db
      .select()
      .from(calls)
      .where(eq(calls.sipCallId, callSid))
      .limit(1);
    
    if (results.length > 0) {
      return results[0];
    }
    
    const metadataResults = await db
      .select()
      .from(calls)
      .where(sql`${calls.metadata}->>'twilioCallSid' = ${callSid}`)
      .limit(1);
    
    return metadataResults.length > 0 ? metadataResults[0] : null;
  }

  async getCallBySipCallId(sipCallId: string): Promise<Call | null> {
    const results = await db
      .select()
      .from(calls)
      .where(eq(calls.sipCallId, sipCallId))
      .limit(1);
    return results.length > 0 ? results[0] : null;
  }

  async getCallStats(userId: number): Promise<{
    totalCalls: number;
    completedCalls: number;
    missedCalls: number;
    totalDuration: number;
    averageDuration: number;
    totalCost: number;
    inboundCalls: number;
    outboundCalls: number;
    callSuccessRate: number;
    averageCallQuality: number;
  }> {
    const allCalls = await db.select().from(calls).where(eq(calls.userId, userId));
    const totalCalls = allCalls.length;
    
    const completedCalls = allCalls.filter(call => call.status === 'completed').length;
    const missedCalls = allCalls.filter(call => call.status === 'missed').length;
    const inboundCalls = allCalls.filter(call => call.type === 'incoming').length;
    const outboundCalls = allCalls.filter(call => call.type === 'outgoing').length;
    
    const totalDuration = allCalls.reduce((sum, call) => sum + (call.duration || 0), 0);
    const averageDuration = totalCalls > 0 ? totalDuration / totalCalls : 0;
    
    const totalCost = allCalls.reduce((sum, call) => sum + (Number(call.cost) || 0), 0);
    const callSuccessRate = totalCalls > 0 ? (completedCalls / totalCalls) * 100 : 0;
    
    const callsWithQuality = allCalls.filter(call => call.callQuality !== null);
    const averageCallQuality = callsWithQuality.length > 0 ? 
      callsWithQuality.reduce((sum, call) => sum + (call.callQuality || 0), 0) / callsWithQuality.length : 0;

    return {
      totalCalls,
      completedCalls,
      missedCalls,
      totalDuration,
      averageDuration,
      totalCost,
      inboundCalls,
      outboundCalls,
      callSuccessRate,
      averageCallQuality
    };
  }

  // Messages
  async getMessage(userId: number, id: number): Promise<Message | undefined> {
    const [message] = await db.select().from(messages).where(and(eq(messages.id, id), eq(messages.userId, userId)));
    return message || undefined;
  }

  async getMessageByTwilioSid(twilioMessageSid: string): Promise<Message | undefined> {
    const [message] = await db.select().from(messages).where(
      sql`${messages.metadata}->>'twilioMessageSid' = ${twilioMessageSid}`
    );
    return message || undefined;
  }

  async createMessage(userId: number, insertMessage: InsertMessage): Promise<Message> {
    const messageData = {
      ...insertMessage,
      userId: userId
    };
    const [message] = await db
      .insert(messages)
      .values(messageData)
      .returning();
    return message;
  }

  async updateMessage(userId: number, id: number, updateData: Partial<InsertMessage>): Promise<Message> {
    const [message] = await db
      .update(messages)
      .set(updateData)
      .where(and(eq(messages.id, id), eq(messages.userId, userId)))
      .returning();
    return message;
  }

  async deleteMessage(userId: number, id: number): Promise<void> {
    await db.delete(messages).where(and(eq(messages.id, id), eq(messages.userId, userId)));
  }

  async getAllMessages(userId: number): Promise<Message[]> {
    return await db.select().from(messages).where(eq(messages.userId, userId)).orderBy(desc(messages.createdAt));
  }

  async getMessagesByContact(userId: number, contactId: number): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(and(eq(messages.contactId, contactId), eq(messages.userId, userId)))
      .orderBy(desc(messages.createdAt));
  }

  async getMessagesByPhone(userId: number, phone: string): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(and(eq(messages.phone, phone), eq(messages.userId, userId)))
      .orderBy(desc(messages.createdAt));
  }

  async searchMessages(userId: number, query: string): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.userId, userId),
          or(
            ilike(messages.content, `%${query}%`),
            ilike(messages.phone, `%${query}%`)
          )
        )
      )
      .orderBy(desc(messages.createdAt));
  }

  async getConversationThread(userId: number, contactId: number): Promise<ConversationThread | undefined> {
    const [thread] = await db
      .select()
      .from(conversationThreads)
      .where(and(eq(conversationThreads.contactId, contactId), eq(conversationThreads.userId, userId)));
    return thread || undefined;
  }

  async createConversationThread(userId: number, thread: InsertConversationThread): Promise<ConversationThread> {
    const threadData = {
      ...thread,
      userId: userId
    };
    const [created] = await db
      .insert(conversationThreads)
      .values(threadData)
      .returning();
    return created;
  }

  async updateConversationThread(userId: number, threadId: string, thread: Partial<InsertConversationThread>): Promise<ConversationThread> {
    const [updated] = await db
      .update(conversationThreads)
      .set(thread)
      .where(and(eq(conversationThreads.threadId, threadId), eq(conversationThreads.userId, userId)))
      .returning();
    return updated;
  }

  async markMessageAsRead(userId: number, id: number): Promise<Message> {
    const [message] = await db
      .update(messages)
      .set({ isRead: true, readAt: new Date() })
      .where(and(eq(messages.id, id), eq(messages.userId, userId)))
      .returning();
    return message;
  }

  async getUnreadMessageCount(userId: number): Promise<number> {
    const [result] = await db
      .select({ count: count() })
      .from(messages)
      .where(and(eq(messages.isRead, false), eq(messages.userId, userId)));
    return result.count;
  }

  async getMessageAnalytics(userId: number): Promise<any> {
    const [totalMessages] = await db
      .select({ count: count() })
      .from(messages)
      .where(eq(messages.userId, userId));
    
    const [sentMessages] = await db
      .select({ count: count() })
      .from(messages)
      .where(and(eq(messages.type, 'sent'), eq(messages.userId, userId)));
    
    const [deliveredMessages] = await db
      .select({ count: count() })
      .from(messages)
      .where(and(eq(messages.status, 'delivered'), eq(messages.userId, userId)));
    
    return {
      totalMessages: totalMessages.count,
      sentMessages: sentMessages.count,
      deliveredMessages: deliveredMessages.count,
      deliveryRate: totalMessages.count > 0 ? (deliveredMessages.count / totalMessages.count) * 100 : 0
    };
  }

  // SMS Templates
  async getSmsTemplate(userId: number, id: number): Promise<SmsTemplate | undefined> {
    const [template] = await db
      .select()
      .from(smsTemplates)
      .where(and(eq(smsTemplates.id, id), eq(smsTemplates.userId, userId)));
    return template || undefined;
  }

  async createSmsTemplate(userId: number, template: InsertSmsTemplate): Promise<SmsTemplate> {
    const templateData = {
      ...template,
      userId: userId
    };
    const [created] = await db
      .insert(smsTemplates)
      .values(templateData)
      .returning();
    return created;
  }

  async updateSmsTemplate(userId: number, id: number, template: Partial<InsertSmsTemplate>): Promise<SmsTemplate> {
    const [updated] = await db
      .update(smsTemplates)
      .set(template)
      .where(and(eq(smsTemplates.id, id), eq(smsTemplates.userId, userId)))
      .returning();
    return updated;
  }

  async deleteSmsTemplate(userId: number, id: number): Promise<void> {
    await db.delete(smsTemplates).where(and(eq(smsTemplates.id, id), eq(smsTemplates.userId, userId)));
  }

  async getAllSmsTemplates(userId: number): Promise<SmsTemplate[]> {
    return await db
      .select()
      .from(smsTemplates)
      .where(and(
        eq(smsTemplates.isActive, true),
        eq(smsTemplates.userId, userId)
      ))
      .orderBy(asc(smsTemplates.name));
  }

  async getSmsTemplatesByCategory(userId: number, category: string): Promise<SmsTemplate[]> {
    return await db
      .select()
      .from(smsTemplates)
      .where(and(
        eq(smsTemplates.category, category),
        eq(smsTemplates.isActive, true),
        eq(smsTemplates.userId, userId)
      ))
      .orderBy(asc(smsTemplates.name));
  }

  async incrementTemplateUsage(userId: number, id: number): Promise<void> {
    await db
      .update(smsTemplates)
      .set({ usageCount: sql`${smsTemplates.usageCount} + 1` })
      .where(and(eq(smsTemplates.id, id), eq(smsTemplates.userId, userId)));
  }

  // SMS Campaigns
  async getSmsCampaign(userId: number, id: number): Promise<SmsCampaign | undefined> {
    const [campaign] = await db
      .select()
      .from(smsCampaigns)
      .where(and(eq(smsCampaigns.id, id), eq(smsCampaigns.userId, userId)));
    return campaign || undefined;
  }

  async createSmsCampaign(userId: number, campaign: InsertSmsCampaign): Promise<SmsCampaign> {
    const campaignData = {
      ...campaign,
      userId: userId
    };
    const [created] = await db
      .insert(smsCampaigns)
      .values(campaignData)
      .returning();
    return created;
  }

  async updateSmsCampaign(userId: number, id: number, campaign: Partial<InsertSmsCampaign>): Promise<SmsCampaign> {
    const [updated] = await db
      .update(smsCampaigns)
      .set(campaign)
      .where(and(eq(smsCampaigns.id, id), eq(smsCampaigns.userId, userId)))
      .returning();
    return updated;
  }

  async deleteSmsCampaign(userId: number, id: number): Promise<void> {
    await db.delete(smsCampaigns).where(and(eq(smsCampaigns.id, id), eq(smsCampaigns.userId, userId)));
  }

  async getAllSmsCampaigns(userId: number): Promise<SmsCampaign[]> {
    return await db
      .select()
      .from(smsCampaigns)
      .where(eq(smsCampaigns.userId, userId))
      .orderBy(desc(smsCampaigns.createdAt));
  }

  async getCampaignsByStatus(userId: number, status: string): Promise<SmsCampaign[]> {
    return await db
      .select()
      .from(smsCampaigns)
      .where(and(eq(smsCampaigns.status, status), eq(smsCampaigns.userId, userId)))
      .orderBy(desc(smsCampaigns.createdAt));
  }

  async updateCampaignStats(userId: number, id: number, stats: Partial<SmsCampaign>): Promise<SmsCampaign> {
    const [updated] = await db
      .update(smsCampaigns)
      .set(stats)
      .where(and(eq(smsCampaigns.id, id), eq(smsCampaigns.userId, userId)))
      .returning();
    return updated;
  }

  // Advanced Recording Management
  async getRecording(userId: number, id: number): Promise<Recording | undefined> {
    const [recording] = await db.select().from(recordings).where(and(eq(recordings.id, id), eq(recordings.userId, userId)));
    return recording || undefined;
  }

  async getRecordingByTwilioSid(userId: number, twilioSid: string): Promise<Recording | undefined> {
    const [recording] = await db
      .select()
      .from(recordings)
      .where(and(eq(recordings.twilioRecordingSid, twilioSid), eq(recordings.userId, userId)));
    return recording || undefined;
  }

  async createRecording(userId: number, insertRecording: InsertRecording): Promise<Recording> {
    const recordingData = {
      ...insertRecording,
      userId: userId
    };
    const [recording] = await db
      .insert(recordings)
      .values(recordingData)
      .returning();
    return recording;
  }

  async updateRecording(userId: number, id: number, updateData: Partial<InsertRecording>): Promise<Recording> {
    const [recording] = await db
      .update(recordings)
      .set({ ...updateData, updatedAt: new Date() })
      .where(and(eq(recordings.id, id), eq(recordings.userId, userId)))
      .returning();
    return recording;
  }

  async deleteRecording(userId: number, id: number): Promise<void> {
    await db.delete(recordings).where(and(eq(recordings.id, id), eq(recordings.userId, userId)));
  }

  async getAllRecordings(userId: number): Promise<Recording[]> {
    return await db.select().from(recordings).where(eq(recordings.userId, userId)).orderBy(desc(recordings.createdAt));
  }

  async getRecordings(userId: number, options: {
    page: number;
    limit: number;
    filters: {
      search?: string;
      status?: string;
      category?: string;
      direction?: string;
      startDate?: Date;
      endDate?: Date;
      hasTranscript?: boolean;
      sentiment?: string;
      starred?: boolean;
      archived?: boolean;
    };
    sortBy: string;
    sortOrder: 'asc' | 'desc';
  }): Promise<{
    recordings: Recording[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { page, limit, filters, sortBy, sortOrder } = options;
    const offset = (page - 1) * limit;

    // Build where conditions - always include userId
    const whereConditions = [eq(recordings.userId, userId)];

    if (filters.search) {
      whereConditions.push(
        or(
          ilike(recordings.phone, `%${filters.search}%`),
          ilike(recordings.callerName, `%${filters.search}%`),
          ilike(recordings.transcript, `%${filters.search}%`),
          ilike(recordings.summary, `%${filters.search}%`)
        )
      );
    }

    if (filters.status) {
      whereConditions.push(eq(recordings.status, filters.status));
    }

    if (filters.category) {
      whereConditions.push(eq(recordings.category, filters.category));
    }

    if (filters.direction) {
      whereConditions.push(eq(recordings.direction, filters.direction));
    }

    if (filters.startDate) {
      whereConditions.push(gte(recordings.createdAt, filters.startDate));
    }

    if (filters.endDate) {
      whereConditions.push(lte(recordings.createdAt, filters.endDate));
    }

    if (filters.hasTranscript) {
      whereConditions.push(isNotNull(recordings.transcript));
    }

    if (filters.sentiment) {
      whereConditions.push(eq(recordings.sentiment, filters.sentiment));
    }

    if (filters.starred !== undefined) {
      whereConditions.push(eq(recordings.isStarred, filters.starred));
    }

    if (filters.archived !== undefined) {
      whereConditions.push(eq(recordings.isArchived, filters.archived));
    }

    const whereClause = and(...whereConditions);

    // Build order by
    const orderByClause = sortOrder === 'asc' 
      ? asc(recordings[sortBy as keyof typeof recordings] || recordings.createdAt)
      : desc(recordings[sortBy as keyof typeof recordings] || recordings.createdAt);

    // Get total count
    const totalResult = await db
      .select({ count: count() })
      .from(recordings)
      .where(whereClause);
    
    const total = totalResult[0]?.count || 0;

    // Get recordings
    const recordingsResult = await db
      .select()
      .from(recordings)
      .where(whereClause)
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset);

    return {
      recordings: recordingsResult,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  async getRecordingsByContact(userId: number, contactId: number): Promise<Recording[]> {
    return await db
      .select()
      .from(recordings)
      .where(and(eq(recordings.contactId, contactId), eq(recordings.userId, userId)))
      .orderBy(desc(recordings.createdAt));
  }

  async getRecordingsOlderThan(userId: number, date: Date): Promise<Recording[]> {
    return await db
      .select()
      .from(recordings)
      .where(and(lt(recordings.createdAt, date), eq(recordings.userId, userId)))
      .orderBy(desc(recordings.createdAt));
  }

  async getRecordingStats(userId: number): Promise<{
    total: number;
    totalDuration: number;
    totalSize: number;
    byStatus: Record<string, number>;
    byCategory: Record<string, number>;
    recentActivity: any[];
  }> {
    // Get total count and duration
    const totalStats = await db
      .select({
        count: count(),
        totalDuration: sum(recordings.duration),
        totalSize: sum(recordings.fileSize)
      })
      .from(recordings)
      .where(eq(recordings.userId, userId));

    const total = totalStats[0]?.count || 0;
    const totalDuration = Number(totalStats[0]?.totalDuration) || 0;
    const totalSize = Number(totalStats[0]?.totalSize) || 0;

    // Get status breakdown
    const statusStats = await db
      .select({
        status: recordings.status,
        count: count()
      })
      .from(recordings)
      .where(eq(recordings.userId, userId))
      .groupBy(recordings.status);

    const byStatus: Record<string, number> = {};
    statusStats.forEach(stat => {
      if (stat.status) {
        byStatus[stat.status] = stat.count;
      }
    });

    // Get category breakdown
    const categoryStats = await db
      .select({
        category: recordings.category,
        count: count()
      })
      .from(recordings)
      .where(and(isNotNull(recordings.category), eq(recordings.userId, userId)))
      .groupBy(recordings.category);

    const byCategory: Record<string, number> = {};
    categoryStats.forEach(stat => {
      if (stat.category) {
        byCategory[stat.category] = stat.count;
      }
    });

    // Get recent activity (last 10 recordings)
    const recentActivity = await db
      .select({
        id: recordings.id,
        phone: recordings.phone,
        duration: recordings.duration,
        status: recordings.status,
        createdAt: recordings.createdAt
      })
      .from(recordings)
      .where(eq(recordings.userId, userId))
      .orderBy(desc(recordings.createdAt))
      .limit(10);

    return {
      total,
      totalDuration,
      totalSize,
      byStatus,
      byCategory,
      recentActivity
    };
  }


  // Voicemails
  async getVoicemail(userId: number, id: number): Promise<Voicemail | undefined> {
    const [voicemail] = await db.select().from(voicemails).where(and(eq(voicemails.id, id), eq(voicemails.userId, userId)));
    return voicemail || undefined;
  }

  async createVoicemail(userId: number, insertVoicemail: InsertVoicemail): Promise<Voicemail> {
    const voicemailData = {
      ...insertVoicemail,
      userId: userId
    };
    const [voicemail] = await db
      .insert(voicemails)
      .values(voicemailData)
      .returning();
    return voicemail;
  }

  async updateVoicemail(userId: number, id: number, updateData: Partial<InsertVoicemail>): Promise<Voicemail> {
    const [voicemail] = await db
      .update(voicemails)
      .set(updateData)
      .where(and(eq(voicemails.id, id), eq(voicemails.userId, userId)))
      .returning();
    return voicemail;
  }

  async deleteVoicemail(userId: number, id: number): Promise<void> {
    await db.delete(voicemails).where(and(eq(voicemails.id, id), eq(voicemails.userId, userId)));
  }

  async getAllVoicemails(userId: number): Promise<Voicemail[]> {
    return await db.select().from(voicemails).where(eq(voicemails.userId, userId)).orderBy(desc(voicemails.createdAt));
  }

  async getVoicemailsByContact(userId: number, contactId: number): Promise<Voicemail[]> {
    return await db
      .select()
      .from(voicemails)
      .where(and(eq(voicemails.contactId, contactId), eq(voicemails.userId, userId)))
      .orderBy(desc(voicemails.createdAt));
  }

  async getUnreadVoicemails(userId: number): Promise<Voicemail[]> {
    return await db
      .select()
      .from(voicemails)
      .where(and(eq(voicemails.isRead, false), eq(voicemails.userId, userId)))
      .orderBy(desc(voicemails.createdAt));
  }

  // Settings
  async getSetting(key: string): Promise<Setting | undefined> {
    const [setting] = await db.select().from(settings).where(eq(settings.key, key));
    return setting || undefined;
  }

  async setSetting(key: string, value: any): Promise<Setting> {
    const [setting] = await db
      .insert(settings)
      .values({ key, value })
      .onConflictDoUpdate({
        target: settings.key,
        set: { value, updatedAt: new Date() }
      })
      .returning();
    return setting;
  }

  async getAllSettings(): Promise<Setting[]> {
    return await db.select().from(settings).orderBy(asc(settings.key));
  }

  // Call Notes
  async getCallNote(userId: number, id: number): Promise<CallNote | undefined> {
    const [note] = await db.select().from(callNotes).where(and(eq(callNotes.id, id), eq(callNotes.userId, userId)));
    return note || undefined;
  }

  async createCallNote(userId: number, insertNote: InsertCallNote): Promise<CallNote> {
    // Normalize phone number
    const normalized = normalizePhoneNumber(insertNote.phone);
    const normalizedPhone = normalized.isValid ? normalized.normalized : insertNote.phone;
    
    // Smart contact linking - try to find the contact using smart phone matching
    let contactIdToUse = insertNote.contactId;
    if (!contactIdToUse) {
      const existingContact = await this.findContactByAnyPhoneFormat(userId, insertNote.phone);
      if (existingContact) {
        contactIdToUse = existingContact.id;
      }
    }
    
    const noteData = {
      ...insertNote,
      userId: userId,
      phone: normalizedPhone,
      contactId: contactIdToUse
    };
    
    const [note] = await db
      .insert(callNotes)
      .values(noteData)
      .returning();
    return note;
  }

  async updateCallNote(userId: number, id: number, updateData: Partial<InsertCallNote>): Promise<CallNote> {
    const [note] = await db
      .update(callNotes)
      .set({ ...updateData, updatedAt: new Date() })
      .where(and(eq(callNotes.id, id), eq(callNotes.userId, userId)))
      .returning();
    return note;
  }

  async deleteCallNote(userId: number, id: number): Promise<void> {
    await db.delete(callNotes).where(and(eq(callNotes.id, id), eq(callNotes.userId, userId)));
  }

  async getAllCallNotes(userId: number): Promise<CallNote[]> {
    return await db.select().from(callNotes).where(eq(callNotes.userId, userId)).orderBy(desc(callNotes.createdAt));
  }

  async getCallNotesByCall(userId: number, callId: number): Promise<CallNote[]> {
    return await db
      .select()
      .from(callNotes)
      .where(and(eq(callNotes.callId, callId), eq(callNotes.userId, userId)))
      .orderBy(desc(callNotes.createdAt));
  }

  async getCallNotesByContact(userId: number, contactId: number): Promise<CallNote[]> {
    return await db
      .select()
      .from(callNotes)
      .where(and(eq(callNotes.contactId, contactId), eq(callNotes.userId, userId)))
      .orderBy(desc(callNotes.createdAt));
  }

  async getCallNotesByPhone(userId: number, phone: string): Promise<CallNote[]> {
    return await db
      .select()
      .from(callNotes)
      .where(and(eq(callNotes.phone, phone), eq(callNotes.userId, userId)))
      .orderBy(desc(callNotes.createdAt));
  }

  // Initialize default data (admin user and sample data)
  async initializeDefaultData(): Promise<void> {
    try {
      // Check if admin user already exists
      const adminUser = await this.getUserByEmail('admin@demonflare.com');
      
      if (!adminUser) {
        // Create admin user with password from environment variable
        if (!process.env.ADMIN_PASSWORD) {
          throw new Error('ADMIN_PASSWORD environment variable must be set for security. Please set ADMIN_PASSWORD before starting the application.');
        }
        
        await this.createUser({
          username: 'admin',
          email: 'admin@demonflare.com',
          password: process.env.ADMIN_PASSWORD,
          firstName: 'Admin',
          lastName: 'User',
          role: 'admin',
          status: 'active',
          emailVerified: true,
          gdprConsent: true,
          gdprConsentDate: new Date(),
        });
        console.log('✓ Admin user created successfully');
      }

      // Note: Sample data initialization is disabled for multi-tenant setup
      // Each user will need to create their own data
      const hasInitializedSetting = await this.getSetting('sample_data_initialized');
      
      if (!hasInitializedSetting) {
        // Mark that sample data initialization has been checked
        await this.setSetting('sample_data_initialized', true);
        console.log('✓ Sample data initialization skipped (multi-tenant mode)');
      }

      // Initialize default system and twilio settings to prevent 404 errors
      const systemSetting = await this.getSetting('system');
      if (!systemSetting) {
        await this.setSetting('system', {
          appName: 'DialPax CRM',
          timezone: 'America/New_York',
          dateFormat: 'MM/DD/YYYY',
          currency: 'USD',
          autoSave: true,
          theme: 'light'
        });
        console.log('✓ Default system settings created');
      }

      const twilioSetting = await this.getSetting('twilio');
      if (!twilioSetting) {
        await this.setSetting('twilio', {
          configured: false,
          accountSid: null,
          authToken: null,
          phoneNumber: null,
          apiKeySid: null,
          apiKeySecret: null,
          twimlAppSid: null
        });
        console.log('✓ Default twilio settings created');
      }

      const callSettings = await this.getSetting('call-settings');
      if (!callSettings) {
        await this.setSetting('call-settings', {
          autoRecord: false,
          callTimeout: 300,
          callWaiting: true,
          conferencing: true,
          transfer: true,
          enableVoicemail: true,
          voicemailTimeout: 30,
          callQualityReporting: true
        });
        console.log('✓ Default call settings created');
      }

    } catch (error) {
      console.error('Error initializing default data:', error);
    }
  }

  // Lead Sources
  async getLeadSource(userId: number, id: number): Promise<LeadSource | undefined> {
    const [source] = await db.select().from(leadSources).where(and(eq(leadSources.id, id), eq(leadSources.userId, userId)));
    return source || undefined;
  }

  async getLeadSourceByName(userId: number, name: string): Promise<LeadSource | undefined> {
    const [source] = await db.select().from(leadSources).where(and(eq(leadSources.name, name), eq(leadSources.userId, userId)));
    return source || undefined;
  }

  async createLeadSource(userId: number, source: InsertLeadSource): Promise<LeadSource> {
    const sourceData = { ...source, userId };
    const [created] = await db.insert(leadSources).values(sourceData).returning();
    return created;
  }

  async updateLeadSource(userId: number, id: number, source: Partial<InsertLeadSource>): Promise<LeadSource> {
    const [updated] = await db.update(leadSources).set(source).where(and(eq(leadSources.id, id), eq(leadSources.userId, userId))).returning();
    return updated;
  }

  async deleteLeadSource(userId: number, id: number): Promise<void> {
    await db.delete(leadSources).where(and(eq(leadSources.id, id), eq(leadSources.userId, userId)));
  }

  async getAllLeadSources(userId: number): Promise<LeadSource[]> {
    return await db.select().from(leadSources).where(eq(leadSources.userId, userId)).orderBy(asc(leadSources.name));
  }

  async getActiveLeadSources(userId: number): Promise<LeadSource[]> {
    return await db.select().from(leadSources).where(and(eq(leadSources.isActive, true), eq(leadSources.userId, userId))).orderBy(asc(leadSources.name));
  }

  // Lead Statuses
  async getLeadStatus(userId: number, id: number): Promise<LeadStatus | undefined> {
    const [status] = await db.select().from(leadStatuses).where(and(eq(leadStatuses.id, id), eq(leadStatuses.userId, userId)));
    return status || undefined;
  }

  async getLeadStatusByName(userId: number, name: string): Promise<LeadStatus | undefined> {
    const [status] = await db.select().from(leadStatuses).where(and(eq(leadStatuses.name, name), eq(leadStatuses.userId, userId)));
    return status || undefined;
  }

  async createLeadStatus(userId: number, status: InsertLeadStatus): Promise<LeadStatus> {
    const statusData = { ...status, userId };
    const [created] = await db.insert(leadStatuses).values(statusData).returning();
    return created;
  }

  async updateLeadStatus(userId: number, id: number, status: Partial<InsertLeadStatus>): Promise<LeadStatus> {
    const [updated] = await db.update(leadStatuses).set(status).where(and(eq(leadStatuses.id, id), eq(leadStatuses.userId, userId))).returning();
    return updated;
  }

  async deleteLeadStatus(userId: number, id: number): Promise<void> {
    await db.delete(leadStatuses).where(and(eq(leadStatuses.id, id), eq(leadStatuses.userId, userId)));
  }

  async getAllLeadStatuses(userId: number): Promise<LeadStatus[]> {
    return await db.select().from(leadStatuses).where(eq(leadStatuses.userId, userId)).orderBy(asc(leadStatuses.sortOrder));
  }

  async getActiveLeadStatuses(userId: number): Promise<LeadStatus[]> {
    return await db.select().from(leadStatuses).where(and(eq(leadStatuses.isActive, true), eq(leadStatuses.userId, userId))).orderBy(asc(leadStatuses.sortOrder));
  }

  // Lead Campaigns
  async getLeadCampaign(userId: number, id: number): Promise<LeadCampaign | undefined> {
    const [campaign] = await db.select().from(leadCampaigns).where(and(eq(leadCampaigns.id, id), eq(leadCampaigns.userId, userId)));
    return campaign || undefined;
  }

  async createLeadCampaign(userId: number, campaign: InsertLeadCampaign): Promise<LeadCampaign> {
    const campaignData = { ...campaign, userId };
    const [created] = await db.insert(leadCampaigns).values(campaignData).returning();
    return created;
  }

  async updateLeadCampaign(userId: number, id: number, campaign: Partial<InsertLeadCampaign>): Promise<LeadCampaign> {
    const [updated] = await db.update(leadCampaigns).set(campaign).where(and(eq(leadCampaigns.id, id), eq(leadCampaigns.userId, userId))).returning();
    return updated;
  }

  async deleteLeadCampaign(userId: number, id: number): Promise<void> {
    await db.delete(leadCampaigns).where(and(eq(leadCampaigns.id, id), eq(leadCampaigns.userId, userId)));
  }

  async getAllLeadCampaigns(userId: number): Promise<LeadCampaign[]> {
    return await db.select().from(leadCampaigns).where(eq(leadCampaigns.userId, userId)).orderBy(desc(leadCampaigns.createdAt));
  }

  async getLeadCampaignsByStatus(userId: number, status: string): Promise<LeadCampaign[]> {
    return await db.select().from(leadCampaigns).where(and(eq(leadCampaigns.status, status), eq(leadCampaigns.userId, userId))).orderBy(desc(leadCampaigns.createdAt));
  }

  async getLeadCampaignsByType(userId: number, type: string): Promise<LeadCampaign[]> {
    return await db.select().from(leadCampaigns).where(and(eq(leadCampaigns.type, type), eq(leadCampaigns.userId, userId))).orderBy(desc(leadCampaigns.createdAt));
  }

  // Leads
  async getLead(userId: number, id: number): Promise<Lead | undefined> {
    const [lead] = await db.select().from(leads).where(and(eq(leads.id, id), eq(leads.userId, userId)));
    return lead || undefined;
  }

  async getLeadByEmail(userId: number, email: string): Promise<Lead | undefined> {
    const [lead] = await db.select().from(leads).where(and(eq(leads.email, email), eq(leads.userId, userId)));
    return lead || undefined;
  }

  async getLeadByPhone(userId: number, phone: string): Promise<Lead | undefined> {
    const [lead] = await db.select().from(leads).where(and(eq(leads.phone, phone), eq(leads.userId, userId)));
    return lead || undefined;
  }

  async createLead(userId: number, lead: InsertLead): Promise<Lead> {
    const leadData = {
      ...lead,
      userId: userId
    };
    const [created] = await db.insert(leads).values(leadData).returning();
    return created;
  }

  async updateLead(userId: number, id: number, lead: Partial<InsertLead>): Promise<Lead> {
    const [updated] = await db.update(leads).set(lead).where(and(eq(leads.id, id), eq(leads.userId, userId))).returning();
    return updated;
  }

  async deleteLead(userId: number, id: number): Promise<void> {
    await db.delete(leads).where(and(eq(leads.id, id), eq(leads.userId, userId)));
  }

  async getAllLeads(userId: number): Promise<Lead[]> {
    return await db.select().from(leads).where(eq(leads.userId, userId)).orderBy(desc(leads.createdAt));
  }

  async getLeadsByStatus(userId: number, statusId: number): Promise<Lead[]> {
    return await db.select().from(leads).where(and(eq(leads.leadStatusId, statusId), eq(leads.userId, userId))).orderBy(desc(leads.createdAt));
  }

  async getLeadsBySource(userId: number, sourceId: number): Promise<Lead[]> {
    return await db.select().from(leads).where(and(eq(leads.leadSourceId, sourceId), eq(leads.userId, userId))).orderBy(desc(leads.createdAt));
  }

  async getLeadsByAssignee(userId: number, assigneeId: number): Promise<Lead[]> {
    return await db.select().from(leads).where(and(eq(leads.assignedTo, assigneeId), eq(leads.userId, userId))).orderBy(desc(leads.createdAt));
  }

  async getLeadsByPriority(userId: number, priority: string): Promise<Lead[]> {
    return await db.select().from(leads).where(and(eq(leads.priority, priority), eq(leads.userId, userId))).orderBy(desc(leads.createdAt));
  }

  async getLeadsByTemperature(userId: number, temperature: string): Promise<Lead[]> {
    return await db.select().from(leads).where(and(eq(leads.temperature, temperature), eq(leads.userId, userId))).orderBy(desc(leads.createdAt));
  }

  async searchLeads(userId: number, query: string): Promise<Lead[]> {
    return await db.select().from(leads).where(
      and(
        eq(leads.userId, userId),
        or(
          ilike(leads.firstName, `%${query}%`),
          ilike(leads.lastName, `%${query}%`),
          ilike(leads.email, `%${query}%`),
          ilike(leads.phone, `%${query}%`),
          ilike(leads.company, `%${query}%`),
          ilike(leads.jobTitle, `%${query}%`)
        )
      )
    ).orderBy(desc(leads.createdAt));
  }

  async getLeadsWithFilters(userId: number, filters: {
    status?: number;
    source?: number;
    assignee?: number;
    priority?: string;
    temperature?: string;
    score?: { min?: number; max?: number };
    value?: { min?: number; max?: number };
    tags?: string[];
    dateRange?: { start: Date; end: Date };
  }): Promise<Lead[]> {
    const conditions = [eq(leads.userId, userId)];

    if (filters.status) conditions.push(eq(leads.leadStatusId, filters.status));
    if (filters.source) conditions.push(eq(leads.leadSourceId, filters.source));
    if (filters.assignee) conditions.push(eq(leads.assignedTo, filters.assignee));
    if (filters.priority) conditions.push(eq(leads.priority, filters.priority));
    if (filters.temperature) conditions.push(eq(leads.temperature, filters.temperature));
    if (filters.score?.min) conditions.push(gte(leads.leadScore, filters.score.min));
    if (filters.score?.max) conditions.push(lte(leads.leadScore, filters.score.max));
    if (filters.value?.min) conditions.push(gte(leads.estimatedValue, filters.value.min.toString()));
    if (filters.value?.max) conditions.push(lte(leads.estimatedValue, filters.value.max.toString()));
    if (filters.dateRange?.start) conditions.push(gte(leads.createdAt, filters.dateRange.start));
    if (filters.dateRange?.end) conditions.push(lte(leads.createdAt, filters.dateRange.end));

    const whereClause = and(...conditions);

    return await db.select().from(leads).where(whereClause).orderBy(desc(leads.createdAt));
  }

  async getLeadStats(userId: number): Promise<{
    total: number;
    new: number;
    qualified: number;
    converted: number;
    totalValue: number;
    avgScore: number;
    conversionRate: number;
    byStatus: Record<string, number>;
    bySource: Record<string, number>;
    byAssignee: Record<string, number>;
  }> {
    const allLeads = await this.getAllLeads(userId);
    const total = allLeads.length;
    const new_ = allLeads.filter(l => l.temperature === 'cold').length;
    const qualified = allLeads.filter(l => l.isQualified).length;
    const converted = allLeads.filter(l => l.isConverted).length;
    const totalValue = allLeads.reduce((sum, l) => sum + parseFloat(l.estimatedValue || '0'), 0);
    const avgScore = total > 0 ? allLeads.reduce((sum, l) => sum + (l.leadScore || 0), 0) / total : 0;
    const conversionRate = total > 0 ? (converted / total) * 100 : 0;

    const byStatus: Record<string, number> = {};
    const bySource: Record<string, number> = {};
    const byAssignee: Record<string, number> = {};

    allLeads.forEach(lead => {
      if (lead.leadStatusId) {
        byStatus[lead.leadStatusId] = (byStatus[lead.leadStatusId] || 0) + 1;
      }
      if (lead.leadSourceId) {
        bySource[lead.leadSourceId] = (bySource[lead.leadSourceId] || 0) + 1;
      }
      if (lead.assignedTo) {
        byAssignee[lead.assignedTo] = (byAssignee[lead.assignedTo] || 0) + 1;
      }
    });

    return {
      total,
      new: new_,
      qualified,
      converted,
      totalValue,
      avgScore,
      conversionRate,
      byStatus,
      bySource,
      byAssignee
    };
  }

  // Lead Activities
  async getLeadActivity(userId: number, id: number): Promise<LeadActivity | undefined> {
    const [activity] = await db.select().from(leadActivities).where(and(eq(leadActivities.id, id), eq(leadActivities.userId, userId)));
    return activity || undefined;
  }

  async createLeadActivity(userId: number, activity: InsertLeadActivity): Promise<LeadActivity> {
    const activityData = {
      ...activity,
      userId: userId
    };
    const [created] = await db.insert(leadActivities).values(activityData).returning();
    return created;
  }

  async updateLeadActivity(userId: number, id: number, activity: Partial<InsertLeadActivity>): Promise<LeadActivity> {
    const [updated] = await db.update(leadActivities).set(activity).where(and(eq(leadActivities.id, id), eq(leadActivities.userId, userId))).returning();
    return updated;
  }

  async deleteLeadActivity(userId: number, id: number): Promise<void> {
    await db.delete(leadActivities).where(and(eq(leadActivities.id, id), eq(leadActivities.userId, userId)));
  }

  async getLeadActivities(userId: number, leadId: number): Promise<LeadActivity[]> {
    return await db.select().from(leadActivities).where(and(eq(leadActivities.leadId, leadId), eq(leadActivities.userId, userId))).orderBy(desc(leadActivities.createdAt));
  }

  async getLeadActivitiesByType(userId: number, leadId: number, type: string): Promise<LeadActivity[]> {
    return await db.select().from(leadActivities).where(
      and(eq(leadActivities.leadId, leadId), eq(leadActivities.type, type), eq(leadActivities.userId, userId))
    ).orderBy(desc(leadActivities.createdAt));
  }

  async getLeadActivitiesByUser(userId: number, targetUserId: number): Promise<LeadActivity[]> {
    return await db.select().from(leadActivities).where(and(eq(leadActivities.userId, targetUserId), eq(leadActivities.userId, userId))).orderBy(desc(leadActivities.createdAt));
  }

  async getRecentLeadActivities(userId: number, limit: number = 50): Promise<LeadActivity[]> {
    return await db.select().from(leadActivities).where(eq(leadActivities.userId, userId)).orderBy(desc(leadActivities.createdAt)).limit(limit);
  }

  // Lead Tasks
  async getLeadTask(userId: number, id: number): Promise<LeadTask | undefined> {
    const [task] = await db.select().from(leadTasks).where(and(eq(leadTasks.id, id), eq(leadTasks.userId, userId)));
    return task || undefined;
  }

  async createLeadTask(userId: number, task: InsertLeadTask): Promise<LeadTask> {
    const taskData = {
      ...task,
      userId: userId
    };
    const [created] = await db.insert(leadTasks).values(taskData).returning();
    return created;
  }

  async updateLeadTask(userId: number, id: number, task: Partial<InsertLeadTask>): Promise<LeadTask> {
    const [updated] = await db.update(leadTasks).set(task).where(and(eq(leadTasks.id, id), eq(leadTasks.userId, userId))).returning();
    return updated;
  }

  async deleteLeadTask(userId: number, id: number): Promise<void> {
    await db.delete(leadTasks).where(and(eq(leadTasks.id, id), eq(leadTasks.userId, userId)));
  }

  async getLeadTasks(userId: number, leadId: number): Promise<LeadTask[]> {
    return await db.select().from(leadTasks).where(and(eq(leadTasks.leadId, leadId), eq(leadTasks.userId, userId))).orderBy(desc(leadTasks.createdAt));
  }

  async getLeadTasksByAssignee(userId: number, assigneeId: number): Promise<LeadTask[]> {
    return await db.select().from(leadTasks).where(and(eq(leadTasks.assignedTo, assigneeId), eq(leadTasks.userId, userId))).orderBy(desc(leadTasks.createdAt));
  }

  async getLeadTasksByStatus(userId: number, status: string): Promise<LeadTask[]> {
    return await db.select().from(leadTasks).where(and(eq(leadTasks.status, status), eq(leadTasks.userId, userId))).orderBy(desc(leadTasks.createdAt));
  }

  async getOverdueTasks(userId: number): Promise<LeadTask[]> {
    return await db.select().from(leadTasks).where(
      and(
        eq(leadTasks.status, 'pending'),
        lt(leadTasks.dueDate, new Date()),
        eq(leadTasks.userId, userId)
      )
    ).orderBy(asc(leadTasks.dueDate));
  }

  async getUpcomingTasks(userId: number, days: number = 7): Promise<LeadTask[]> {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    
    return await db.select().from(leadTasks).where(
      and(
        eq(leadTasks.status, 'pending'),
        gte(leadTasks.dueDate, new Date()),
        lte(leadTasks.dueDate, futureDate),
        eq(leadTasks.userId, userId)
      )
    ).orderBy(asc(leadTasks.dueDate));
  }

  // Lead Scoring
  async getLeadScoring(userId: number, id: number): Promise<LeadScoring | undefined> {
    const [scoring] = await db.select().from(leadScoring).where(and(eq(leadScoring.id, id), eq(leadScoring.userId, userId)));
    return scoring || undefined;
  }

  async getLeadScoringByLead(userId: number, leadId: number): Promise<LeadScoring[]> {
    return await db.select().from(leadScoring).where(and(eq(leadScoring.leadId, leadId), eq(leadScoring.userId, userId))).orderBy(desc(leadScoring.createdAt));
  }

  async createLeadScoring(userId: number, scoring: InsertLeadScoring): Promise<LeadScoring> {
    const scoringData = {
      ...scoring,
      userId: userId
    };
    const [created] = await db.insert(leadScoring).values(scoringData).returning();
    return created;
  }

  async updateLeadScoring(userId: number, id: number, scoring: Partial<InsertLeadScoring>): Promise<LeadScoring> {
    const [updated] = await db.update(leadScoring).set(scoring).where(and(eq(leadScoring.id, id), eq(leadScoring.userId, userId))).returning();
    return updated;
  }

  async deleteLeadScoring(userId: number, id: number): Promise<void> {
    await db.delete(leadScoring).where(and(eq(leadScoring.id, id), eq(leadScoring.userId, userId)));
  }

  async getLeadScoringHistory(userId: number, leadId: number): Promise<LeadScoring[]> {
    return await db.select().from(leadScoring).where(and(eq(leadScoring.leadId, leadId), eq(leadScoring.userId, userId))).orderBy(desc(leadScoring.createdAt));
  }

  // Lead Nurturing
  async getLeadNurturing(userId: number, id: number): Promise<LeadNurturing | undefined> {
    const [nurturing] = await db.select().from(leadNurturing).where(and(eq(leadNurturing.id, id), eq(leadNurturing.userId, userId)));
    return nurturing || undefined;
  }

  async getLeadNurturingByLead(userId: number, leadId: number): Promise<LeadNurturing[]> {
    return await db.select().from(leadNurturing).where(and(eq(leadNurturing.leadId, leadId), eq(leadNurturing.userId, userId))).orderBy(desc(leadNurturing.createdAt));
  }

  async createLeadNurturing(userId: number, nurturing: InsertLeadNurturing): Promise<LeadNurturing> {
    const nurturingData = {
      ...nurturing,
      userId: userId
    };
    const [created] = await db.insert(leadNurturing).values(nurturingData).returning();
    return created;
  }

  async updateLeadNurturing(userId: number, id: number, nurturing: Partial<InsertLeadNurturing>): Promise<LeadNurturing> {
    const [updated] = await db.update(leadNurturing).set(nurturing).where(and(eq(leadNurturing.id, id), eq(leadNurturing.userId, userId))).returning();
    return updated;
  }

  async deleteLeadNurturing(userId: number, id: number): Promise<void> {
    await db.delete(leadNurturing).where(and(eq(leadNurturing.id, id), eq(leadNurturing.userId, userId)));
  }

  async getActiveNurturingSequences(userId: number): Promise<LeadNurturing[]> {
    return await db.select().from(leadNurturing).where(and(eq(leadNurturing.status, 'active'), eq(leadNurturing.userId, userId))).orderBy(desc(leadNurturing.createdAt));
  }

  async getNurturingSequencesByStatus(userId: number, status: string): Promise<LeadNurturing[]> {
    return await db.select().from(leadNurturing).where(and(eq(leadNurturing.status, status), eq(leadNurturing.userId, userId))).orderBy(desc(leadNurturing.createdAt));
  }

  // Contact Lists
  async getContactList(userId: number, id: number): Promise<ContactList | undefined> {
    const [list] = await db.select().from(contactLists).where(and(eq(contactLists.id, id), eq(contactLists.userId, userId)));
    return list || undefined;
  }

  async getContactListByName(userId: number, name: string): Promise<ContactList | undefined> {
    const [list] = await db.select().from(contactLists).where(and(eq(contactLists.name, name), eq(contactLists.userId, userId)));
    return list || undefined;
  }

  async createContactList(userId: number, list: InsertContactList): Promise<ContactList> {
    const listData = { ...list, userId };
    const [created] = await db.insert(contactLists).values(listData).returning();
    return created;
  }

  async updateContactList(userId: number, id: number, list: Partial<InsertContactList>): Promise<ContactList> {
    const [updated] = await db.update(contactLists).set(list).where(and(eq(contactLists.id, id), eq(contactLists.userId, userId))).returning();
    return updated;
  }

  async deleteContactList(userId: number, id: number): Promise<void> {
    // First, remove all memberships
    await db.delete(contactListMemberships).where(and(eq(contactListMemberships.listId, id), eq(contactListMemberships.userId, userId)));
    // Then delete the list
    await db.delete(contactLists).where(and(eq(contactLists.id, id), eq(contactLists.userId, userId)));
  }

  async getAllContactLists(userId: number): Promise<ContactList[]> {
    return await db.select().from(contactLists).where(eq(contactLists.userId, userId)).orderBy(asc(contactLists.name));
  }

  async getContactListsByCategory(userId: number, category: string): Promise<ContactList[]> {
    return await db.select().from(contactLists).where(and(eq(contactLists.category, category), eq(contactLists.userId, userId))).orderBy(asc(contactLists.name));
  }

  async getContactListsByType(userId: number, type: string): Promise<ContactList[]> {
    return await db.select().from(contactLists).where(and(eq(contactLists.type, type), eq(contactLists.userId, userId))).orderBy(asc(contactLists.name));
  }

  // Contact List Memberships
  async getContactListMembership(userId: number, id: number): Promise<ContactListMembership | undefined> {
    const [membership] = await db.select().from(contactListMemberships).where(and(eq(contactListMemberships.id, id), eq(contactListMemberships.userId, userId)));
    return membership || undefined;
  }

  async createContactListMembership(userId: number, membership: InsertContactListMembership): Promise<ContactListMembership> {
    const membershipData = { ...membership, userId };
    const [created] = await db.insert(contactListMemberships).values(membershipData).returning();
    
    // Update contact count in the list
    const contactCount = await db.select({ count: count() })
      .from(contactListMemberships)
      .where(and(
        eq(contactListMemberships.listId, membership.listId),
        eq(contactListMemberships.status, 'active'),
        eq(contactListMemberships.userId, userId)
      ));
    
    await db.update(contactLists)
      .set({ 
        contactCount: contactCount[0].count,
        lastContactAdded: new Date()
      })
      .where(and(eq(contactLists.id, membership.listId), eq(contactLists.userId, userId)));

    return created;
  }

  async updateContactListMembership(userId: number, id: number, membership: Partial<InsertContactListMembership>): Promise<ContactListMembership> {
    const [updated] = await db.update(contactListMemberships).set(membership).where(and(eq(contactListMemberships.id, id), eq(contactListMemberships.userId, userId))).returning();
    return updated;
  }

  async deleteContactListMembership(userId: number, id: number): Promise<void> {
    const membership = await this.getContactListMembership(userId, id);
    if (membership) {
      await db.delete(contactListMemberships).where(and(eq(contactListMemberships.id, id), eq(contactListMemberships.userId, userId)));
      
      // Update contact count in the list
      const contactCount = await db.select({ count: count() })
        .from(contactListMemberships)
        .where(and(
          eq(contactListMemberships.listId, membership.listId),
          eq(contactListMemberships.status, 'active'),
          eq(contactListMemberships.userId, userId)
        ));
      
      await db.update(contactLists)
        .set({ contactCount: contactCount[0].count })
        .where(and(eq(contactLists.id, membership.listId), eq(contactLists.userId, userId)));
    }
  }

  async getContactListMemberships(userId: number, listId: number): Promise<ContactListMembership[]> {
    return await db.select().from(contactListMemberships).where(and(eq(contactListMemberships.listId, listId), eq(contactListMemberships.userId, userId))).orderBy(desc(contactListMemberships.addedAt));
  }

  async getContactMemberships(userId: number, contactId: number): Promise<ContactListMembership[]> {
    return await db.select().from(contactListMemberships).where(and(eq(contactListMemberships.contactId, contactId), eq(contactListMemberships.userId, userId))).orderBy(desc(contactListMemberships.addedAt));
  }

  async addContactToList(userId: number, contactId: number, listId: number, addedBy?: number): Promise<ContactListMembership> {
    // Check if already exists
    const existing = await db.select().from(contactListMemberships)
      .where(and(
        eq(contactListMemberships.contactId, contactId),
        eq(contactListMemberships.listId, listId),
        eq(contactListMemberships.userId, userId)
      ));

    if (existing.length > 0) {
      // Update status to active if it exists
      const [updated] = await db.update(contactListMemberships)
        .set({ status: 'active' })
        .where(and(eq(contactListMemberships.id, existing[0].id), eq(contactListMemberships.userId, userId)))
        .returning();
      return updated;
    }

    // Create new membership
    return await this.createContactListMembership(userId, {
      contactId,
      listId,
      addedBy,
      status: 'active'
    });
  }

  async removeContactFromList(userId: number, contactId: number, listId: number): Promise<void> {
    await db.delete(contactListMemberships)
      .where(and(
        eq(contactListMemberships.contactId, contactId),
        eq(contactListMemberships.listId, listId),
        eq(contactListMemberships.userId, userId)
      ));
    
    // Update contact count in the list
    const contactCount = await db.select({ count: count() })
      .from(contactListMemberships)
      .where(and(
        eq(contactListMemberships.listId, listId),
        eq(contactListMemberships.status, 'active'),
        eq(contactListMemberships.userId, userId)
      ));
    
    await db.update(contactLists)
      .set({ contactCount: contactCount[0].count })
      .where(and(eq(contactLists.id, listId), eq(contactLists.userId, userId)));
  }

  async getContactsInList(userId: number, listId: number): Promise<Contact[]> {
    const result = await db.select({
      id: contacts.id,
      name: contacts.name,
      phone: contacts.phone,
      email: contacts.email,
      alternatePhone: contacts.alternatePhone,
      company: contacts.company,
      industry: contacts.industry,
      revenue: contacts.revenue,
      employeeSize: contacts.employeeSize,
      jobTitle: contacts.jobTitle,
      address: contacts.address,
      city: contacts.city,
      state: contacts.state,
      zipCode: contacts.zipCode,
      country: contacts.country,
      timezone: contacts.timezone,
      birthdate: contacts.birthdate,
      tags: contacts.tags,
      notes: contacts.notes,
      priority: contacts.priority,
      leadStatus: contacts.leadStatus,
      leadSource: contacts.leadSource,
      disposition: contacts.disposition,
      assignedTo: contacts.assignedTo,
      nextFollowUpAt: contacts.nextFollowUpAt,
      meetingDate: contacts.meetingDate,
      meetingTimezone: contacts.meetingTimezone,
      socialProfiles: contacts.socialProfiles,
      customFields: contacts.customFields,
      communicationPreferences: contacts.communicationPreferences,
      lastContactedAt: contacts.lastContactedAt,
      avatar: contacts.avatar,
      isActive: contacts.isActive,
      doNotCall: contacts.doNotCall,
      doNotEmail: contacts.doNotEmail,
      doNotSms: contacts.doNotSms,
      primaryListId: contacts.primaryListId,
      listCount: contacts.listCount,
      createdAt: contacts.createdAt,
      updatedAt: contacts.updatedAt
    })
    .from(contacts)
    .innerJoin(contactListMemberships, eq(contacts.id, contactListMemberships.contactId))
    .where(and(
      eq(contactListMemberships.listId, listId),
      eq(contactListMemberships.status, 'active'),
      eq(contacts.userId, userId)
    ))
    .orderBy(asc(contacts.name));

    return result;
  }
}

export const storage = new DatabaseStorage();
