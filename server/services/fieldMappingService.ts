/**
 * Custom NLP-based Field Mapping Service
 * Smart field mapping for CSV import using pattern matching and semantic analysis
 */

export interface ContactFieldMapping {
  csvField: string;
  mappedField: string | null;
  confidence: number;
  suggestions: Array<{ field: string; confidence: number }>;
}

export interface FieldPattern {
  field: string;
  patterns: string[];
  keywords: string[];
  aliases: string[];
  weight: number;
}

export class FieldMappingService {
  private fieldPatterns: FieldPattern[] = [
    // Basic Contact Information
    {
      field: 'name',
      patterns: ['^(full_?)?name$', '^contact_?name$', '^customer_?name$', '^person$', '^individual$'],
      keywords: ['name', 'fullname', 'contact', 'person', 'individual', 'customer'],
      aliases: ['full_name', 'contact_name', 'customer_name', 'person_name', 'individual_name'],
      weight: 1.0
    },
    {
      field: 'firstName',
      patterns: ['^first_?name$', '^fname$', '^given_?name$', '^forename$'],
      keywords: ['first', 'given', 'forename', 'fname'],
      aliases: ['first_name', 'given_name', 'fname', 'firstname'],
      weight: 0.95
    },
    {
      field: 'lastName',
      patterns: ['^last_?name$', '^lname$', '^surname$', '^family_?name$'],
      keywords: ['last', 'surname', 'family', 'lname'],
      aliases: ['last_name', 'surname', 'family_name', 'lname', 'lastname'],
      weight: 0.95
    },
    {
      field: 'phone',
      patterns: ['^phone(_?number)?$', '^mobile$', '^cell$', '^telephone$', '^tel$', '^contact_?number$'],
      keywords: ['phone', 'mobile', 'cell', 'telephone', 'tel', 'number', 'contact'],
      aliases: ['phone_number', 'mobile_number', 'cell_phone', 'telephone_number', 'contact_number'],
      weight: 1.0
    },
    {
      field: 'alternatePhone',
      patterns: ['^(alt|alternate|alternative|secondary|other)_?phone$', '^phone_?2$', '^backup_?phone$'],
      keywords: ['alternate', 'alternative', 'secondary', 'other', 'backup', 'second'],
      aliases: ['alt_phone', 'phone2', 'secondary_phone', 'backup_phone', 'other_phone'],
      weight: 0.9
    },
    {
      field: 'email',
      patterns: ['^e?mail(_?address)?$', '^contact_?email$', '^email_?addr$'],
      keywords: ['email', 'mail', 'address', 'contact'],
      aliases: ['email_address', 'mail_address', 'contact_email', 'e_mail'],
      weight: 1.0
    },

    // Company Information
    {
      field: 'company',
      patterns: ['^company(_?name)?$', '^organization$', '^org$', '^business$', '^employer$', '^firm$'],
      keywords: ['company', 'organization', 'business', 'employer', 'firm', 'corp'],
      aliases: ['company_name', 'organization_name', 'business_name', 'employer_name'],
      weight: 0.9
    },
    {
      field: 'industry',
      patterns: ['^industry$', '^business_?type$', '^sector$', '^vertical$', '^market$'],
      keywords: ['industry', 'business', 'sector', 'vertical', 'market', 'type'],
      aliases: ['business_type', 'industry_type', 'market_sector'],
      weight: 0.8
    },
    {
      field: 'jobTitle',
      patterns: ['^(job_?)?title$', '^position$', '^role$', '^designation$', '^job_?position$'],
      keywords: ['title', 'position', 'role', 'designation', 'job'],
      aliases: ['job_title', 'job_position', 'work_title', 'position_title'],
      weight: 0.9
    },
    {
      field: 'revenue',
      patterns: ['^(annual_?)?revenue$', '^income$', '^turnover$', '^sales$'],
      keywords: ['revenue', 'income', 'turnover', 'sales', 'annual'],
      aliases: ['annual_revenue', 'company_revenue', 'yearly_revenue'],
      weight: 0.7
    },
    {
      field: 'employeeSize',
      patterns: ['^employee(_?size|_?count)?$', '^staff_?size$', '^team_?size$', '^headcount$'],
      keywords: ['employee', 'staff', 'team', 'headcount', 'size', 'count'],
      aliases: ['employee_count', 'staff_count', 'team_count', 'company_size'],
      weight: 0.7
    },

    // Address Information
    {
      field: 'address',
      patterns: ['^(street_?)?address$', '^addr$', '^location$', '^street$'],
      keywords: ['address', 'street', 'location', 'addr'],
      aliases: ['street_address', 'mailing_address', 'physical_address'],
      weight: 0.8
    },
    {
      field: 'city',
      patterns: ['^city$', '^town$', '^locality$'],
      keywords: ['city', 'town', 'locality'],
      aliases: ['city_name', 'town_name'],
      weight: 0.9
    },
    {
      field: 'state',
      patterns: ['^state$', '^province$', '^region$'],
      keywords: ['state', 'province', 'region'],
      aliases: ['state_name', 'province_name'],
      weight: 0.9
    },
    {
      field: 'zipCode',
      patterns: ['^(zip|postal)_?code$', '^zip$', '^postcode$'],
      keywords: ['zip', 'postal', 'code', 'postcode'],
      aliases: ['zip_code', 'postal_code', 'post_code'],
      weight: 0.8
    },
    {
      field: 'country',
      patterns: ['^country$', '^nation$'],
      keywords: ['country', 'nation'],
      aliases: ['country_name', 'country_code'],
      weight: 0.8
    },

    // Lead Information
    {
      field: 'leadSource',
      patterns: ['^(lead_?)?source$', '^origin$', '^referral$', '^channel$'],
      keywords: ['source', 'origin', 'referral', 'channel', 'lead'],
      aliases: ['lead_source', 'traffic_source', 'referral_source'],
      weight: 0.7
    },
    {
      field: 'leadStatus',
      patterns: ['^(lead_?)?status$', '^stage$', '^phase$'],
      keywords: ['status', 'stage', 'phase', 'lead'],
      aliases: ['lead_status', 'contact_status', 'stage_status'],
      weight: 0.7
    },
    {
      field: 'priority',
      patterns: ['^priority$', '^importance$', '^urgency$'],
      keywords: ['priority', 'importance', 'urgency'],
      aliases: ['contact_priority', 'lead_priority'],
      weight: 0.6
    },
    {
      field: 'disposition',
      patterns: ['^disposition$', '^outcome$', '^result$'],
      keywords: ['disposition', 'outcome', 'result'],
      aliases: ['call_disposition', 'contact_disposition'],
      weight: 0.6
    },

    // Additional Fields
    {
      field: 'tags',
      patterns: ['^tags?$', '^labels?$', '^categories?$'],
      keywords: ['tag', 'label', 'category'],
      aliases: ['contact_tags', 'labels', 'categories'],
      weight: 0.5
    },
    {
      field: 'notes',
      patterns: ['^notes?$', '^comments?$', '^description$', '^remarks?$'],
      keywords: ['note', 'comment', 'description', 'remark'],
      aliases: ['contact_notes', 'additional_notes', 'comments'],
      weight: 0.5
    },
    {
      field: 'assignedTo',
      patterns: ['^assigned(_?to)?$', '^owner$', '^agent$', '^rep$', '^representative$'],
      keywords: ['assigned', 'owner', 'agent', 'rep', 'representative'],
      aliases: ['assigned_to', 'contact_owner', 'sales_rep'],
      weight: 0.6
    }
  ];

  /**
   * Normalize field names for comparison
   */
  private normalizeField(field: string): string {
    return field
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  }

  /**
   * Calculate similarity between two strings using Levenshtein distance
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const len1 = str1.length;
    const len2 = str2.length;
    const matrix = Array(len2 + 1).fill(null).map(() => Array(len1 + 1).fill(null));

    for (let i = 0; i <= len1; i++) matrix[0][i] = i;
    for (let j = 0; j <= len2; j++) matrix[j][0] = j;

    for (let j = 1; j <= len2; j++) {
      for (let i = 1; i <= len1; i++) {
        if (str1[i - 1] === str2[j - 1]) {
          matrix[j][i] = matrix[j - 1][i - 1];
        } else {
          matrix[j][i] = Math.min(
            matrix[j - 1][i - 1] + 1, // substitution
            matrix[j][i - 1] + 1,     // insertion
            matrix[j - 1][i] + 1      // deletion
          );
        }
      }
    }

    const maxLen = Math.max(len1, len2);
    return maxLen === 0 ? 1 : (maxLen - matrix[len2][len1]) / maxLen;
  }

  /**
   * Score a field match using multiple criteria
   */
  private scoreFieldMatch(csvField: string, pattern: FieldPattern): number {
    const normalizedCsvField = this.normalizeField(csvField);
    let score = 0;

    // Check regex patterns
    for (const regexPattern of pattern.patterns) {
      const regex = new RegExp(regexPattern, 'i');
      if (regex.test(normalizedCsvField)) {
        score += 0.8 * pattern.weight;
        break;
      }
    }

    // Check exact keyword matches
    for (const keyword of pattern.keywords) {
      if (normalizedCsvField.includes(keyword)) {
        score += 0.6 * pattern.weight;
        break;
      }
    }

    // Check aliases using similarity
    for (const alias of pattern.aliases) {
      const similarity = this.calculateSimilarity(normalizedCsvField, this.normalizeField(alias));
      if (similarity > 0.8) {
        score += similarity * 0.7 * pattern.weight;
        break;
      }
    }

    // Check direct similarity with field name
    const fieldSimilarity = this.calculateSimilarity(normalizedCsvField, pattern.field);
    if (fieldSimilarity > 0.7) {
      score += fieldSimilarity * 0.9 * pattern.weight;
    }

    return Math.min(score, 1.0); // Cap at 1.0
  }

  /**
   * Map CSV fields to contact schema fields
   */
  public mapFields(csvHeaders: string[]): ContactFieldMapping[] {
    const mappings: ContactFieldMapping[] = [];

    for (const csvField of csvHeaders) {
      const scores: Array<{ field: string; confidence: number }> = [];

      // Score against all field patterns
      for (const pattern of this.fieldPatterns) {
        const confidence = this.scoreFieldMatch(csvField, pattern);
        if (confidence > 0.1) { // Only include meaningful matches
          scores.push({ field: pattern.field, confidence });
        }
      }

      // Sort by confidence
      scores.sort((a, b) => b.confidence - a.confidence);

      // Determine best match
      const bestMatch = scores[0];
      const mappedField = bestMatch && bestMatch.confidence > 0.4 ? bestMatch.field : null;

      mappings.push({
        csvField,
        mappedField,
        confidence: bestMatch ? bestMatch.confidence : 0,
        suggestions: scores.slice(0, 5) // Top 5 suggestions
      });
    }

    // Handle conflicts - if multiple CSV fields map to the same contact field,
    // keep only the one with highest confidence
    const usedFields = new Set<string>();
    const finalMappings = mappings.map(mapping => {
      if (mapping.mappedField && usedFields.has(mapping.mappedField)) {
        // Find existing mapping with this field
        const existingMapping = mappings.find(m => 
          m.mappedField === mapping.mappedField && m !== mapping
        );
        
        if (existingMapping && existingMapping.confidence > mapping.confidence) {
          // Current mapping loses, set to null
          return {
            ...mapping,
            mappedField: null,
            confidence: 0
          };
        } else {
          // Current mapping wins, mark existing as null
          if (existingMapping) {
            existingMapping.mappedField = null;
            existingMapping.confidence = 0;
          }
          usedFields.add(mapping.mappedField);
          return mapping;
        }
      } else if (mapping.mappedField) {
        usedFields.add(mapping.mappedField);
        return mapping;
      }
      
      return mapping;
    });

    return finalMappings;
  }

  /**
   * Get available contact fields for manual mapping
   */
  public getAvailableFields(): Array<{ field: string; label: string; description: string }> {
    return [
      { field: 'name', label: 'Full Name', description: 'Contact\'s full name (required)' },
      { field: 'firstName', label: 'First Name', description: 'Contact\'s first name' },
      { field: 'lastName', label: 'Last Name', description: 'Contact\'s last name' },
      { field: 'phone', label: 'Phone Number', description: 'Primary phone number (required)' },
      { field: 'email', label: 'Email Address', description: 'Primary email address' },
      { field: 'alternatePhone', label: 'Alternate Phone', description: 'Secondary phone number' },
      { field: 'company', label: 'Company', description: 'Company or organization name' },
      { field: 'industry', label: 'Industry', description: 'Business industry or sector' },
      { field: 'jobTitle', label: 'Job Title', description: 'Position or role title' },
      { field: 'revenue', label: 'Revenue', description: 'Annual revenue or income' },
      { field: 'employeeSize', label: 'Employee Size', description: 'Number of employees' },
      { field: 'address', label: 'Address', description: 'Street address' },
      { field: 'city', label: 'City', description: 'City name' },
      { field: 'state', label: 'State/Province', description: 'State or province' },
      { field: 'zipCode', label: 'ZIP/Postal Code', description: 'ZIP or postal code' },
      { field: 'country', label: 'Country', description: 'Country name or code' },
      { field: 'leadSource', label: 'Lead Source', description: 'How the lead was acquired' },
      { field: 'leadStatus', label: 'Lead Status', description: 'Current lead status' },
      { field: 'priority', label: 'Priority', description: 'Contact priority (high, medium, low)' },
      { field: 'disposition', label: 'Disposition', description: 'Contact disposition or outcome' },
      { field: 'assignedTo', label: 'Assigned To', description: 'Assigned agent or representative' },
      { field: 'tags', label: 'Tags', description: 'Comma-separated tags' },
      { field: 'notes', label: 'Notes', description: 'Additional notes or comments' }
    ];
  }

  /**
   * Validate and transform imported data
   */
  public validateAndTransformData(
    rawData: any[], 
    fieldMappings: { [csvField: string]: string }
  ): { valid: any[]; invalid: Array<{ row: any; errors: string[] }> } {
    const valid: any[] = [];
    const invalid: Array<{ row: any; errors: string[] }> = [];

    for (const row of rawData) {
      const transformedRow: any = {};
      const errors: string[] = [];

      // Transform fields according to mapping
      for (const [csvField, contactField] of Object.entries(fieldMappings)) {
        if (contactField && row[csvField] !== undefined && row[csvField] !== '') {
          const value = this.transformFieldValue(contactField, row[csvField]);
          transformedRow[contactField] = value;
        }
      }

      // Auto-generate full name from firstName and lastName if name is not mapped
      if (!transformedRow.name || transformedRow.name.trim() === '') {
        const firstName = transformedRow.firstName?.trim() || '';
        const lastName = transformedRow.lastName?.trim() || '';
        
        if (firstName || lastName) {
          transformedRow.name = `${firstName} ${lastName}`.trim();
        }
      }

      // Validate required fields
      if (!transformedRow.name || transformedRow.name.trim() === '') {
        errors.push('Name is required');
      }
      
      if (!transformedRow.phone || transformedRow.phone.trim() === '') {
        errors.push('Phone number is required');
      }

      // Validate phone number format
      if (transformedRow.phone && !this.isValidPhone(transformedRow.phone)) {
        errors.push('Invalid phone number format');
      }

      // Validate email format if provided
      if (transformedRow.email && !this.isValidEmail(transformedRow.email)) {
        errors.push('Invalid email format');
      }

      if (errors.length === 0) {
        valid.push(transformedRow);
      } else {
        invalid.push({ row: transformedRow, errors });
      }
    }

    return { valid, invalid };
  }

  /**
   * Transform field values to appropriate types
   */
  private transformFieldValue(field: string, value: any): any {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const stringValue = String(value).trim();

    switch (field) {
      case 'tags':
        // Split comma-separated tags
        return stringValue.split(',').map(tag => tag.trim()).filter(tag => tag);
      
      case 'doNotCall':
      case 'doNotEmail':
      case 'doNotSms':
        // Convert to boolean
        return ['true', 'yes', '1', 'on'].includes(stringValue.toLowerCase());
      
      case 'priority':
        // Normalize priority values
        const priority = stringValue.toLowerCase();
        if (['high', 'urgent', '3'].includes(priority)) return 'high';
        if (['low', '1'].includes(priority)) return 'low';
        return 'medium';
      
      case 'leadStatus':
        // Normalize lead status
        const status = stringValue.toLowerCase();
        if (['contacted', 'reached', 'spoke'].includes(status)) return 'contacted';
        if (['qualified', 'interested', 'hot'].includes(status)) return 'qualified';
        if (['converted', 'closed', 'won', 'customer'].includes(status)) return 'converted';
        if (['lost', 'closed-lost', 'unqualified'].includes(status)) return 'lost';
        return 'new';
      
      case 'phone':
      case 'alternatePhone':
        // Clean phone number
        return this.cleanPhoneNumber(stringValue);
      
      default:
        return stringValue;
    }
  }

  /**
   * Clean and format phone number
   */
  private cleanPhoneNumber(phone: string): string {
    // Remove all non-digit characters except + at the beginning
    const cleaned = phone.replace(/[^\d+]/g, '');
    
    // If it starts with +1, keep it; if it's 10 digits, add +1
    if (cleaned.startsWith('+1')) {
      return cleaned;
    } else if (cleaned.length === 10) {
      return '+1' + cleaned;
    } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return '+' + cleaned;
    }
    
    return cleaned;
  }

  /**
   * Validate phone number
   */
  private isValidPhone(phone: string): boolean {
    const cleaned = phone.replace(/[^\d]/g, '');
    return cleaned.length >= 10 && cleaned.length <= 15;
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

export const fieldMappingService = new FieldMappingService();