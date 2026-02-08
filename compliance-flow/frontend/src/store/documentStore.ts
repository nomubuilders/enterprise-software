import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ExtractionTemplate, DocumentMeta, DocumentSummary, EvaluationResult, SearchEntry } from '../types/document'

interface DocumentState {
  // State
  templates: ExtractionTemplate[]
  documents: DocumentMeta[]
  summaries: DocumentSummary[]
  searchIndex: SearchEntry[]
  evaluationResults: EvaluationResult[]

  // Template Actions
  addTemplate: (template: ExtractionTemplate) => void
  updateTemplate: (id: string, partial: Partial<ExtractionTemplate>) => void
  deleteTemplate: (id: string) => void

  // Document Actions
  addDocument: (doc: DocumentMeta) => void
  updateDocument: (id: string, partial: Partial<DocumentMeta>) => void
  removeDocument: (id: string) => void

  // Summary Actions
  addSummary: (summary: DocumentSummary) => void
  getSummaryForDocument: (docId: string) => DocumentSummary | undefined

  // Evaluation Actions
  addEvaluationResult: (result: EvaluationResult) => void

  // Search Actions
  addSearchEntry: (entry: SearchEntry) => void
  clearSearchIndex: () => void
}

const defaultTemplates: ExtractionTemplate[] = [
  {
    id: 'template-nda',
    name: 'Non-Disclosure Agreement',
    description: 'Extract key terms from NDAs and confidentiality agreements',
    documentType: 'nda',
    systemPrompt: 'You are a legal analyst specializing in confidentiality and non-disclosure agreements.',
    fields: [
      { name: 'Parties Involved', description: 'Disclosing and receiving parties', instructions: 'Extract the full legal names of all parties to the agreement, including their roles (disclosing party, receiving party).' },
      { name: 'Effective Date', description: 'When the agreement takes effect', instructions: 'Extract the effective date of the agreement and any conditions precedent to effectiveness.' },
      { name: 'Definition of Confidential Information', description: 'What is considered confidential', instructions: 'Extract the definition of confidential information, including any categories, examples, and marking requirements.' },
      { name: 'Obligations of Receiving Party', description: 'Duties of the receiving party', instructions: 'Extract all obligations imposed on the receiving party, including use restrictions, safeguarding requirements, and permitted disclosures.' },
      { name: 'Term and Duration', description: 'Agreement duration and survival period', instructions: 'Extract the term of the agreement, any renewal provisions, and the survival period for confidentiality obligations after termination.' },
      { name: 'Exclusions', description: 'What is excluded from confidential information', instructions: 'Extract all exclusions from the definition of confidential information, such as publicly available information, independently developed information, etc.' },
      { name: 'Remedies for Breach', description: 'Consequences of breaching the agreement', instructions: 'Extract remedies available upon breach, including injunctive relief, damages, indemnification, and any limitation of liability.' },
      { name: 'Governing Law', description: 'Applicable jurisdiction and law', instructions: 'Extract the governing law, jurisdiction, and any dispute resolution mechanisms (arbitration, mediation, litigation).' },
    ],
  },
  {
    id: 'template-lease',
    name: 'Lease/Sublease Agreement',
    description: 'Extract key terms from real estate lease and sublease agreements',
    documentType: 'lease',
    systemPrompt: 'You are a legal analyst specializing in real estate law, known for highly accurate and detailed summaries of lease agreements.',
    fields: [
      { name: 'Parties Involved', description: 'Landlord and tenant details', instructions: 'Extract the full legal names and contact information of the landlord/lessor and tenant/lessee, including any guarantors.' },
      { name: 'Property Details', description: 'Description and address of the property', instructions: 'Extract the complete property description, address, square footage, permitted use, and any included fixtures or equipment.' },
      { name: 'Term and Rent', description: 'Lease duration and payment terms', instructions: 'Extract the lease commencement date, expiration date, renewal options, monthly rent amount, rent escalation schedule, and payment due dates.' },
      { name: 'Security Deposit', description: 'Deposit amount and conditions', instructions: 'Extract the security deposit amount, conditions for its return, permitted deductions, and timeline for refund after lease termination.' },
      { name: 'Responsibilities', description: 'Maintenance and repair obligations', instructions: 'Extract the allocation of maintenance, repair, insurance, tax, and utility responsibilities between landlord and tenant.' },
      { name: 'Consent and Notices', description: 'Required approvals and communication', instructions: 'Extract requirements for landlord consent (subletting, alterations, assignments), notice provisions, and required communication methods.' },
      { name: 'Special Provisions', description: 'Additional clauses and conditions', instructions: 'Extract any special provisions including build-out allowances, right of first refusal, exclusivity clauses, or co-tenancy requirements.' },
      { name: 'Termination Conditions', description: 'How the lease can be ended', instructions: 'Extract all termination conditions including default provisions, cure periods, early termination options, and holdover terms.' },
    ],
  },
  {
    id: 'template-service-agreement',
    name: 'Service Agreement',
    description: 'Extract key terms from commercial service and consulting agreements',
    documentType: 'service-agreement',
    systemPrompt: 'You are a legal analyst specializing in commercial contracts and service-level agreements.',
    fields: [
      { name: 'Parties Involved', description: 'Service provider and client', instructions: 'Extract the full legal names of the service provider and client, including their principal places of business and any authorized representatives.' },
      { name: 'Scope of Services', description: 'What services are being provided', instructions: 'Extract the detailed description of services to be performed, deliverables, milestones, acceptance criteria, and any exclusions from scope.' },
      { name: 'Payment Terms', description: 'Compensation and billing details', instructions: 'Extract the fee structure, payment schedule, invoicing requirements, late payment penalties, expense reimbursement terms, and any performance bonuses.' },
      { name: 'Service Level Requirements', description: 'Performance standards and SLAs', instructions: 'Extract any service level agreements, uptime guarantees, response time requirements, performance metrics, and remedies for SLA breaches.' },
      { name: 'Intellectual Property', description: 'IP ownership and licensing', instructions: 'Extract provisions regarding ownership of work product, pre-existing IP, licenses granted, and any IP assignment or transfer clauses.' },
      { name: 'Liability and Indemnification', description: 'Risk allocation between parties', instructions: 'Extract limitation of liability caps, exclusions of consequential damages, mutual and unilateral indemnification obligations, and insurance requirements.' },
      { name: 'Termination Clause', description: 'How the agreement can be ended', instructions: 'Extract termination for convenience and cause provisions, notice periods, transition assistance obligations, and effects of termination on ongoing obligations.' },
      { name: 'Governing Law', description: 'Applicable jurisdiction and law', instructions: 'Extract the governing law, jurisdiction, dispute resolution mechanism, and any venue selection clauses.' },
    ],
  },
  {
    id: 'template-employment',
    name: 'Employment Contract',
    description: 'Extract key terms from employment agreements and offer letters',
    documentType: 'employment',
    systemPrompt: 'You are a legal analyst specializing in employment law and workplace contracts.',
    fields: [
      { name: 'Parties Involved', description: 'Employer and employee', instructions: 'Extract the full legal name of the employer entity and the employee, including the employee\'s title and reporting structure.' },
      { name: 'Position and Duties', description: 'Job role and responsibilities', instructions: 'Extract the job title, department, reporting manager, primary duties and responsibilities, work location, and any travel requirements.' },
      { name: 'Compensation and Benefits', description: 'Salary, bonuses, and benefits', instructions: 'Extract base salary, bonus structure, equity/stock options, health insurance, retirement plans, paid time off, and any other benefits or perquisites.' },
      { name: 'Work Schedule', description: 'Hours and flexibility', instructions: 'Extract standard work hours, overtime provisions, remote work policies, flexible scheduling terms, and any on-call requirements.' },
      { name: 'Confidentiality Obligations', description: 'Information protection requirements', instructions: 'Extract confidentiality obligations, trade secret protections, return of company property requirements, and post-employment information restrictions.' },
      { name: 'Non-Compete Clause', description: 'Post-employment restrictions', instructions: 'Extract any non-compete, non-solicitation, and non-disparagement provisions including geographic scope, duration, and restricted activities.' },
      { name: 'Termination Conditions', description: 'How employment can be ended', instructions: 'Extract termination for cause and without cause provisions, notice periods, severance packages, garden leave clauses, and any conditions for resignation.' },
      { name: 'Governing Law', description: 'Applicable jurisdiction and law', instructions: 'Extract the governing law, jurisdiction for disputes, mandatory arbitration clauses, and any class action waiver provisions.' },
    ],
  },
  {
    id: 'template-court-filing',
    name: 'Court Filing',
    description: 'Extract key information from complaints, motions, and other court filings',
    documentType: 'court-filing',
    systemPrompt: 'You are a legal analyst specializing in litigation and court proceedings.',
    fields: [
      { name: 'Case Information', description: 'Court and case identifiers', instructions: 'Extract the court name, case number, filing date, document type (complaint, motion, brief, etc.), and the judge or magistrate assigned.' },
      { name: 'Parties Involved', description: 'Plaintiffs, defendants, and counsel', instructions: 'Extract all parties to the case including plaintiffs, defendants, third-party defendants, intervenors, and their respective counsel of record.' },
      { name: 'Claims and Allegations', description: 'Legal claims asserted', instructions: 'Extract each cause of action or claim asserted, the factual allegations supporting each claim, and the legal theories relied upon.' },
      { name: 'Relief Sought', description: 'What the filing party is requesting', instructions: 'Extract all forms of relief requested including monetary damages (amounts if specified), injunctive relief, declaratory relief, and attorney fees.' },
      { name: 'Key Legal Arguments', description: 'Primary legal reasoning', instructions: 'Extract the primary legal arguments made, including statutory interpretations, constitutional claims, and policy arguments advanced.' },
      { name: 'Cited Precedents', description: 'Cases and authorities referenced', instructions: 'Extract key cases cited, statutes referenced, regulations invoked, and any secondary authorities (treatises, law review articles) relied upon.' },
      { name: 'Procedural History', description: 'Prior proceedings in the case', instructions: 'Extract the procedural history including prior motions, orders, discovery status, and any previous rulings relevant to the current filing.' },
      { name: 'Current Status', description: 'Where the case stands now', instructions: 'Extract the current status of the case, upcoming deadlines, scheduled hearings, and any pending motions or discovery disputes.' },
    ],
  },
  {
    id: 'template-regulatory-report',
    name: 'Regulatory Report',
    description: 'Extract key findings from compliance and regulatory reports',
    documentType: 'regulatory-report',
    systemPrompt: 'You are a compliance analyst specializing in regulatory frameworks and audit findings.',
    fields: [
      { name: 'Issuing Authority', description: 'Regulatory body or agency', instructions: 'Extract the name of the issuing regulatory authority, the division or office responsible, and any reference numbers or report identifiers.' },
      { name: 'Subject Entity', description: 'Organization being reported on', instructions: 'Extract the full legal name of the entity subject to the report, its industry classification, registration numbers, and organizational structure.' },
      { name: 'Reporting Period', description: 'Time frame covered', instructions: 'Extract the reporting period start and end dates, the date the report was issued, and any comparison periods referenced.' },
      { name: 'Key Findings', description: 'Primary conclusions of the report', instructions: 'Extract all key findings, observations, and conclusions, categorized by severity (critical, major, minor) and regulatory domain.' },
      { name: 'Compliance Status', description: 'Overall compliance determination', instructions: 'Extract the overall compliance determination, ratings or scores assigned, and any comparison to prior reporting periods.' },
      { name: 'Violations Identified', description: 'Specific regulatory violations', instructions: 'Extract each violation identified including the specific regulation or standard breached, the nature of the violation, and its impact assessment.' },
      { name: 'Recommended Actions', description: 'Required corrective measures', instructions: 'Extract all recommended or required corrective actions, the responsible parties for each action, and any implementation guidance provided.' },
      { name: 'Deadlines and Penalties', description: 'Compliance timelines and consequences', instructions: 'Extract all compliance deadlines, penalty amounts or ranges, enforcement actions threatened, and any conditions for penalty reduction or waiver.' },
    ],
  },
]

export const useDocumentStore = create<DocumentState>()(
  persist(
    (set, get) => ({
      templates: defaultTemplates,
      documents: [],
      summaries: [],
      searchIndex: [],
      evaluationResults: [],

      // Template Actions
      addTemplate: (template) => {
        set({ templates: [...get().templates, template] })
      },

      updateTemplate: (id, partial) => {
        const templates = get().templates.map((t) =>
          t.id === id ? { ...t, ...partial } : t
        )
        set({ templates })
      },

      deleteTemplate: (id) => {
        const templates = get().templates.filter((t) => t.id !== id)
        set({ templates })
      },

      // Document Actions
      addDocument: (doc) => {
        set({ documents: [...get().documents, doc] })
      },

      updateDocument: (id, partial) => {
        const documents = get().documents.map((d) =>
          d.id === id ? { ...d, ...partial } : d
        )
        set({ documents })
      },

      removeDocument: (id) => {
        const documents = get().documents.filter((d) => d.id !== id)
        set({ documents })
      },

      // Summary Actions
      addSummary: (summary) => {
        set({ summaries: [...get().summaries, summary] })
      },

      getSummaryForDocument: (docId) => {
        return get().summaries.find((s) => s.documentId === docId)
      },

      // Evaluation Actions
      addEvaluationResult: (result) => {
        set({ evaluationResults: [...get().evaluationResults, result] })
      },

      // Search Actions
      addSearchEntry: (entry) => {
        set({ searchIndex: [...get().searchIndex, entry] })
      },

      clearSearchIndex: () => {
        set({ searchIndex: [] })
      },
    }),
    {
      name: 'compliance-document-storage',
      partialize: (state) => ({
        templates: state.templates,
        documents: state.documents.map(({ extractedText: _, ...rest }) => ({ ...rest, extractedText: '' })),
        summaries: state.summaries.map(({ rawOutput: _, ...rest }) => ({ ...rest, rawOutput: '' })),
        evaluationResults: state.evaluationResults,
      }),
    }
  )
)
