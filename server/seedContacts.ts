import { db } from "./db";
import { contacts } from "@shared/schema";

const demoContacts = [
  {
    name: "Sarah Johnson",
    phone: "+1 (555) 123-4567",
    email: "sarah.johnson@techcorp.com",
    alternatePhone: "+1 (555) 123-4568",
    company: "TechCorp Solutions",
    industry: "Technology",
    revenue: "$5M - $10M",
    employeeSize: "50-100",
    address: "123 Innovation Drive",
    city: "San Francisco",
    state: "CA",
    zipCode: "94105",
    timezone: "America/Los_Angeles",
    priority: "high",
    leadStatus: "qualified",
    disposition: "interested",
    nextFollowUpAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
    meetingDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
    meetingTimezone: "America/Los_Angeles",
    socialProfiles: {
      linkedin: "https://linkedin.com/in/sarahjohnson",
      companyLinkedin: "https://linkedin.com/company/techcorp-solutions",
      website: "https://techcorp.com"
    },
    isActive: true
  },
  {
    name: "Michael Chen",
    phone: "+1 (555) 234-5678",
    email: "m.chen@globalmanufacturing.com",
    company: "Global Manufacturing Inc",
    industry: "Manufacturing",
    revenue: "$50M - $100M",
    employeeSize: "500-1000",
    address: "456 Industrial Blvd",
    city: "Detroit",
    state: "MI",
    zipCode: "48201",
    timezone: "America/Detroit",
    priority: "medium",
    leadStatus: "contacted",
    disposition: "callback",
    nextFollowUpAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
    socialProfiles: {
      linkedin: "https://linkedin.com/in/michaelchen",
      companyLinkedin: "https://linkedin.com/company/global-manufacturing",
      website: "https://globalmanufacturing.com"
    },
    isActive: true
  },
  {
    name: "Emily Rodriguez",
    phone: "+1 (555) 345-6789",
    email: "emily@healthcareinnovations.org",
    alternatePhone: "+1 (555) 345-6790",
    company: "Healthcare Innovations",
    industry: "Healthcare",
    revenue: "$10M - $25M",
    employeeSize: "100-250",
    address: "789 Medical Center Dr",
    city: "Houston",
    state: "TX",
    zipCode: "77030",
    timezone: "America/Chicago",
    priority: "high",
    leadStatus: "new",
    disposition: "interested",
    nextFollowUpAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // 1 day from now
    meetingDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
    meetingTimezone: "America/Chicago",
    socialProfiles: {
      linkedin: "https://linkedin.com/in/emilyrodriguez",
      companyLinkedin: "https://linkedin.com/company/healthcare-innovations",
      website: "https://healthcareinnovations.org"
    },
    isActive: true
  },
  {
    name: "David Park",
    phone: "+1 (555) 456-7890",
    email: "david.park@financeplus.com",
    company: "FinancePlus Services",
    industry: "Financial Services",
    revenue: "$25M - $50M",
    employeeSize: "250-500",
    address: "321 Wall Street",
    city: "New York",
    state: "NY",
    zipCode: "10005",
    timezone: "America/New_York",
    priority: "medium",
    leadStatus: "qualified",
    disposition: "voicemail",
    nextFollowUpAt: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000), // 4 days from now
    socialProfiles: {
      linkedin: "https://linkedin.com/in/davidpark",
      companyLinkedin: "https://linkedin.com/company/financeplus-services",
      website: "https://financeplus.com"
    },
    isActive: true
  },
  {
    name: "Lisa Thompson",
    phone: "+1 (555) 567-8901",
    email: "lisa@educationfirst.edu",
    company: "Education First Academy",
    industry: "Education",
    revenue: "$1M - $5M",
    employeeSize: "25-50",
    address: "654 Learning Lane",
    city: "Boston",
    state: "MA",
    zipCode: "02115",
    timezone: "America/New_York",
    priority: "low",
    leadStatus: "contacted",
    disposition: "not_interested",
    nextFollowUpAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    socialProfiles: {
      linkedin: "https://linkedin.com/in/lisathompson",
      companyLinkedin: "https://linkedin.com/company/education-first-academy",
      website: "https://educationfirst.edu"
    },
    isActive: true
  },
  {
    name: "Robert Martinez",
    phone: "+1 (555) 678-9012",
    email: "robert@retailworld.com",
    alternatePhone: "+1 (555) 678-9013",
    company: "Retail World Chain",
    industry: "Retail",
    revenue: "$100M - $500M",
    employeeSize: "1000+",
    address: "987 Commerce Plaza",
    city: "Los Angeles",
    state: "CA",
    zipCode: "90210",
    timezone: "America/Los_Angeles",
    priority: "high",
    leadStatus: "converted",
    disposition: "interested",
    meetingDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
    meetingTimezone: "America/Los_Angeles",
    socialProfiles: {
      linkedin: "https://linkedin.com/in/robertmartinez",
      companyLinkedin: "https://linkedin.com/company/retail-world-chain",
      website: "https://retailworld.com"
    },
    isActive: true
  },
  {
    name: "Jennifer Kim",
    phone: "+1 (555) 789-0123",
    email: "jennifer@consultingpro.biz",
    company: "Consulting Pro",
    industry: "Professional Services",
    revenue: "$2M - $5M",
    employeeSize: "10-25",
    address: "147 Business Blvd",
    city: "Seattle",
    state: "WA",
    zipCode: "98101",
    timezone: "America/Los_Angeles",
    priority: "medium",
    leadStatus: "new",
    disposition: "callback",
    nextFollowUpAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
    socialProfiles: {
      linkedin: "https://linkedin.com/in/jenniferkim",
      companyLinkedin: "https://linkedin.com/company/consulting-pro",
      website: "https://consultingpro.biz"
    },
    isActive: true
  },
  {
    name: "Thomas Wilson",
    phone: "+1 (555) 890-1234",
    email: "thomas@constructionplus.net",
    company: "Construction Plus LLC",
    industry: "Construction",
    revenue: "$10M - $25M",
    employeeSize: "100-250",
    address: "258 Builder's Way",
    city: "Phoenix",
    state: "AZ",
    zipCode: "85001",
    timezone: "America/Phoenix",
    priority: "low",
    leadStatus: "lost",
    disposition: "do_not_call",
    socialProfiles: {
      linkedin: "https://linkedin.com/in/thomaswilson",
      companyLinkedin: "https://linkedin.com/company/construction-plus-llc",
      website: "https://constructionplus.net"
    },
    doNotCall: true,
    isActive: false
  }
];

export async function seedDemoContacts() {
  try {
    console.log("🌱 Seeding demo contacts...");
    
    // Check if we already have comprehensive demo contacts (8 or more)
    const existingContacts = await db.select().from(contacts);
    if (existingContacts.length >= 8) {
      console.log("✅ Demo contacts already exist, skipping seed");
      return;
    }

    // Add userId to all contacts (using admin user ID of 1)
    const contactsWithUserId = demoContacts.map(contact => ({
      ...contact,
      userId: 1
    }));

    // Insert demo contacts
    await db.insert(contacts).values(contactsWithUserId);
    
    console.log(`✅ Successfully seeded ${demoContacts.length} demo contacts`);
  } catch (error) {
    console.error("❌ Error seeding demo contacts:", error);
    throw error;
  }
}