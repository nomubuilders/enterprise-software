-- ComplianceFlow Demo Database: EU, Netherlands & Spain Regulatory Data
-- Creates tables with realistic compliance data for demonstration

-- ============================================================
-- REGULATORY FRAMEWORKS
-- ============================================================
CREATE TABLE IF NOT EXISTS regulatory_frameworks (
    id SERIAL PRIMARY KEY,
    code VARCHAR(30) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    jurisdiction VARCHAR(50) NOT NULL,
    effective_date DATE,
    status VARCHAR(20) DEFAULT 'Active',
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO
    regulatory_frameworks (
        code,
        name,
        jurisdiction,
        effective_date,
        status,
        description
    )
VALUES (
        'GDPR',
        'General Data Protection Regulation',
        'EU',
        '2018-05-25',
        'Active',
        'Regulation (EU) 2016/679 on data protection and privacy'
    ),
    (
        'AI_ACT',
        'EU Artificial Intelligence Act',
        'EU',
        '2024-08-01',
        'Active',
        'Regulation (EU) 2024/1689 harmonised rules on AI'
    ),
    (
        'DORA',
        'Digital Operational Resilience Act',
        'EU',
        '2025-01-17',
        'Active',
        'Regulation (EU) 2022/2554 on ICT risk management for financial sector'
    ),
    (
        'SOLVENCY_II',
        'Solvency II Directive',
        'EU',
        '2016-01-01',
        'Active',
        'Directive 2009/138/EC on insurance and reinsurance'
    ),
    (
        'NIS2',
        'Network and Information Security Directive',
        'EU',
        '2024-10-17',
        'Active',
        'Directive (EU) 2022/2555 on cybersecurity'
    ),
    (
        'UAVG',
        'Uitvoeringswet Algemene Verordening Gegevensbescherming',
        'Netherlands',
        '2018-05-25',
        'Active',
        'Dutch implementation act for GDPR'
    ),
    (
        'WFT',
        'Wet op het financieel toezicht',
        'Netherlands',
        '2007-01-01',
        'Active',
        'Dutch Financial Supervision Act'
    ),
    (
        'DNB_GUIDANCE',
        'DNB Good Practices for AI',
        'Netherlands',
        '2023-06-01',
        'Active',
        'De Nederlandsche Bank guidance on responsible AI in financial sector'
    ),
    (
        'LOPDGDD',
        'Ley Orgánica de Protección de Datos',
        'Spain',
        '2018-12-06',
        'Active',
        'Spanish Organic Law 3/2018 on personal data protection'
    ),
    (
        'LSSICE',
        'Ley de Servicios de la Sociedad de la Información',
        'Spain',
        '2002-07-11',
        'Active',
        'Spanish law on information society services and e-commerce'
    ),
    (
        'EIOPA_GL',
        'EIOPA Guidelines on ICT Security',
        'EU',
        '2020-07-01',
        'Active',
        'European Insurance supervisory authority ICT guidelines'
    );

-- ============================================================
-- COMPLIANCE OBLIGATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS compliance_obligations (
    id SERIAL PRIMARY KEY,
    framework_code VARCHAR(30) REFERENCES regulatory_frameworks (code),
    article VARCHAR(30),
    obligation_title VARCHAR(300) NOT NULL,
    obligation_type VARCHAR(50),
    risk_level VARCHAR(20),
    deadline DATE,
    description TEXT,
    penalty_max_eur DECIMAL(15, 2)
);

INSERT INTO
    compliance_obligations (
        framework_code,
        article,
        obligation_title,
        obligation_type,
        risk_level,
        deadline,
        description,
        penalty_max_eur
    )
VALUES
    -- GDPR
    (
        'GDPR',
        'Art. 5',
        'Data Processing Principles',
        'Mandatory',
        'Critical',
        NULL,
        'Lawfulness, fairness, transparency, purpose limitation, data minimisation',
        20000000.00
    ),
    (
        'GDPR',
        'Art. 6',
        'Lawful Basis for Processing',
        'Mandatory',
        'Critical',
        NULL,
        'At least one lawful basis must be established before processing',
        20000000.00
    ),
    (
        'GDPR',
        'Art. 17',
        'Right to Erasure',
        'Mandatory',
        'High',
        NULL,
        'Data subjects can request deletion of personal data',
        20000000.00
    ),
    (
        'GDPR',
        'Art. 25',
        'Data Protection by Design',
        'Mandatory',
        'High',
        NULL,
        'Technical and organisational measures in system design',
        10000000.00
    ),
    (
        'GDPR',
        'Art. 32',
        'Security of Processing',
        'Mandatory',
        'Critical',
        NULL,
        'Appropriate technical and organisational security measures',
        10000000.00
    ),
    (
        'GDPR',
        'Art. 33',
        'Breach Notification (72h)',
        'Mandatory',
        'Critical',
        NULL,
        'Notify supervisory authority within 72 hours of breach',
        10000000.00
    ),
    (
        'GDPR',
        'Art. 35',
        'Data Protection Impact Assessment',
        'Conditional',
        'High',
        NULL,
        'Required for high-risk processing activities',
        10000000.00
    ),
    (
        'GDPR',
        'Art. 37',
        'Data Protection Officer',
        'Conditional',
        'Medium',
        NULL,
        'Appoint DPO for public authorities or large-scale processing',
        10000000.00
    ),
    -- AI Act
    (
        'AI_ACT',
        'Art. 6',
        'High-Risk AI Classification',
        'Mandatory',
        'Critical',
        '2026-08-02',
        'Classify AI systems per Annex III risk categories',
        35000000.00
    ),
    (
        'AI_ACT',
        'Art. 9',
        'Risk Management System',
        'Mandatory',
        'Critical',
        '2026-08-02',
        'Establish, implement, document risk management for high-risk AI',
        35000000.00
    ),
    (
        'AI_ACT',
        'Art. 10',
        'Data Governance',
        'Mandatory',
        'High',
        '2026-08-02',
        'Training, validation, testing data quality requirements',
        35000000.00
    ),
    (
        'AI_ACT',
        'Art. 13',
        'Transparency Requirements',
        'Mandatory',
        'High',
        '2026-08-02',
        'High-risk AI must be transparent and explainable to users',
        35000000.00
    ),
    (
        'AI_ACT',
        'Art. 14',
        'Human Oversight',
        'Mandatory',
        'Critical',
        '2026-08-02',
        'Human-in-the-loop for high-risk AI decision-making',
        35000000.00
    ),
    (
        'AI_ACT',
        'Art. 50',
        'Transparency for General-Purpose AI',
        'Mandatory',
        'Medium',
        '2025-08-02',
        'Mark AI-generated content, disclose AI interaction',
        15000000.00
    ),
    -- DORA
    (
        'DORA',
        'Art. 6',
        'ICT Risk Management Framework',
        'Mandatory',
        'Critical',
        '2025-01-17',
        'Comprehensive ICT risk management framework',
        10000000.00
    ),
    (
        'DORA',
        'Art. 17',
        'ICT Incident Classification',
        'Mandatory',
        'High',
        '2025-01-17',
        'Classify ICT-related incidents by severity',
        5000000.00
    ),
    (
        'DORA',
        'Art. 19',
        'Major Incident Reporting',
        'Mandatory',
        'Critical',
        '2025-01-17',
        'Report major ICT incidents to competent authorities',
        10000000.00
    ),
    (
        'DORA',
        'Art. 28',
        'Third-Party Risk Management',
        'Mandatory',
        'High',
        '2025-01-17',
        'Monitor and manage ICT third-party service providers',
        5000000.00
    ),
    -- Netherlands specific
    (
        'UAVG',
        'Art. 46',
        'BSN Processing Restrictions',
        'Mandatory',
        'High',
        NULL,
        'BSN may only be processed when legally mandated',
        820000.00
    ),
    (
        'WFT',
        'Art. 3:17',
        'Controlled Business Operations',
        'Mandatory',
        'High',
        NULL,
        'Financial institutions must have adequate governance',
        5000000.00
    ),
    (
        'DNB_GUIDANCE',
        'Principle 1',
        'Soundness of AI Models',
        'Advisory',
        'Medium',
        NULL,
        'AI models must be sound, validated, and well-documented',
        NULL
    ),
    -- Spain specific
    (
        'LOPDGDD',
        'Art. 9',
        'Digital Rights & ID Processing',
        'Mandatory',
        'High',
        NULL,
        'Additional safeguards for DNI/NIE processing',
        20000000.00
    ),
    (
        'LOPDGDD',
        'Art. 22',
        'Video Surveillance Rules',
        'Mandatory',
        'Medium',
        NULL,
        'Specific rules for video surveillance data processing',
        20000000.00
    ),
    (
        'LSSICE',
        'Art. 21',
        'Commercial Communications',
        'Mandatory',
        'Medium',
        NULL,
        'Prior consent required for commercial emails',
        600000.00
    );

-- ============================================================
-- ORGANIZATIONS (Regulated Entities)
-- ============================================================
CREATE TABLE IF NOT EXISTS organizations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    org_type VARCHAR(50),
    country VARCHAR(50),
    registration_number VARCHAR(50),
    industry VARCHAR(100),
    employee_count INTEGER,
    annual_revenue_eur DECIMAL(15, 2),
    dpo_name VARCHAR(100),
    dpo_email VARCHAR(100),
    compliance_score DECIMAL(5, 2),
    last_audit_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO
    organizations (
        name,
        org_type,
        country,
        registration_number,
        industry,
        employee_count,
        annual_revenue_eur,
        dpo_name,
        dpo_email,
        compliance_score,
        last_audit_date
    )
VALUES (
        'Nationale-Nederlanden Group N.V.',
        'Insurance Company',
        'Netherlands',
        'KvK-27127928',
        'Insurance & Pensions',
        12500,
        8500000000.00,
        'Sophie Bakker',
        'dpo@nn-group.nl',
        87.5,
        '2025-11-15'
    ),
    (
        'Achmea B.V.',
        'Insurance Company',
        'Netherlands',
        'KvK-18068097',
        'Insurance',
        14000,
        22000000000.00,
        'Dirk van Leeuwen',
        'privacy@achmea.nl',
        91.2,
        '2025-09-22'
    ),
    (
        'Mapfre S.A.',
        'Insurance Company',
        'Spain',
        'CIF-A08055741',
        'Insurance & Reinsurance',
        32000,
        27000000000.00,
        'Elena Sánchez',
        'dpo@mapfre.es',
        84.3,
        '2025-10-08'
    ),
    (
        'Línea Directa Aseguradora',
        'Insurance Company',
        'Spain',
        'CIF-A82516643',
        'Direct Insurance',
        2800,
        900000000.00,
        'Miguel Torres',
        'dpd@lineadirecta.es',
        79.8,
        '2025-08-14'
    ),
    (
        'EuroTech Solutions B.V.',
        'AI Technology Vendor',
        'Netherlands',
        'KvK-84729165',
        'AI & Software',
        250,
        45000000.00,
        'Jan de Vries',
        'privacy@eurotech.nl',
        92.7,
        '2025-12-01'
    ),
    (
        'Iberia Compliance Partners S.L.',
        'Consultancy',
        'Spain',
        'CIF-B87654321',
        'Regulatory Compliance',
        85,
        12000000.00,
        'Carlos Rodríguez',
        'dpo@iberia-compliance.es',
        95.1,
        '2025-11-30'
    ),
    (
        'FinServ Analytics GmbH',
        'Fintech',
        'EU-Germany',
        'HRB-234567',
        'Financial Technology',
        180,
        28000000.00,
        'Klaus Weber',
        'datenschutz@finserv.de',
        88.9,
        '2025-07-20'
    ),
    (
        'MedSure Insurance N.V.',
        'Health Insurance',
        'Netherlands',
        'KvK-55667788',
        'Health Insurance',
        3200,
        4200000000.00,
        'Linda Visser',
        'privacy@medsure.nl',
        82.4,
        '2025-06-10'
    );

-- ============================================================
-- COMPLIANCE AUDITS
-- ============================================================
CREATE TABLE IF NOT EXISTS compliance_audits (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER REFERENCES organizations (id),
    framework_code VARCHAR(30) REFERENCES regulatory_frameworks (code),
    audit_type VARCHAR(50),
    auditor VARCHAR(100),
    audit_date DATE,
    status VARCHAR(30),
    findings_count INTEGER,
    critical_findings INTEGER DEFAULT 0,
    score DECIMAL(5, 2),
    next_audit_date DATE,
    notes TEXT
);

INSERT INTO
    compliance_audits (
        organization_id,
        framework_code,
        audit_type,
        auditor,
        audit_date,
        status,
        findings_count,
        critical_findings,
        score,
        next_audit_date,
        notes
    )
VALUES (
        1,
        'GDPR',
        'Annual Review',
        'PwC Netherlands',
        '2025-11-15',
        'Completed',
        12,
        1,
        87.5,
        '2026-05-15',
        'Critical: Incomplete DPIA for new AI claims model. 11 minor findings related to consent management.'
    ),
    (
        1,
        'DORA',
        'Initial Assessment',
        'Deloitte',
        '2025-10-01',
        'Completed',
        8,
        2,
        78.0,
        '2026-04-01',
        'Two critical gaps in ICT incident reporting timeline. Third-party risk register incomplete.'
    ),
    (
        1,
        'AI_ACT',
        'Readiness Assessment',
        'Internal',
        '2025-12-01',
        'In Progress',
        15,
        3,
        65.0,
        '2026-06-01',
        'Three high-risk AI systems identified. Documentation gaps in model transparency.'
    ),
    (
        2,
        'GDPR',
        'Annual Review',
        'EY Netherlands',
        '2025-09-22',
        'Completed',
        5,
        0,
        91.2,
        '2026-03-22',
        'Strong compliance posture. Minor improvements needed in data retention policies.'
    ),
    (
        2,
        'SOLVENCY_II',
        'Regulatory Exam',
        'DNB',
        '2025-08-15',
        'Completed',
        3,
        0,
        94.0,
        '2026-08-15',
        'Full compliance with Solvency II capital requirements. Risk model approved.'
    ),
    (
        3,
        'GDPR',
        'Annual Review',
        'KPMG Spain',
        '2025-10-08',
        'Completed',
        18,
        2,
        84.3,
        '2026-04-08',
        'Cross-border data transfers to LATAM subsidiaries need updated SCCs. Two consent mechanism gaps.'
    ),
    (
        3,
        'LOPDGDD',
        'Regulatory Inspection',
        'AEPD',
        '2025-09-01',
        'Completed',
        7,
        1,
        82.0,
        '2026-09-01',
        'One critical finding: video surveillance signage inadequate in 3 offices.'
    ),
    (
        4,
        'GDPR',
        'Annual Review',
        'Mazars Spain',
        '2025-08-14',
        'Completed',
        22,
        3,
        79.8,
        '2026-02-14',
        'Three critical: outdated processing records, missing DPIAs for 2 systems, incomplete vendor assessment.'
    ),
    (
        4,
        'AI_ACT',
        'Gap Analysis',
        'Internal',
        '2025-12-15',
        'In Progress',
        9,
        2,
        71.0,
        '2026-06-15',
        'AI pricing model needs human oversight mechanism. Explainability documentation missing.'
    ),
    (
        5,
        'AI_ACT',
        'Self-Assessment',
        'Internal',
        '2025-12-01',
        'Completed',
        4,
        0,
        92.7,
        '2026-06-01',
        'Strong AI governance framework. Minor gap in model registry completeness.'
    ),
    (
        6,
        'GDPR',
        'Client Audit',
        'Self-certified',
        '2025-11-30',
        'Completed',
        2,
        0,
        95.1,
        '2026-05-30',
        'Excellent data handling practices. ISO 27001 certified.'
    ),
    (
        8,
        'GDPR',
        'Annual Review',
        'BDO Netherlands',
        '2025-06-10',
        'Completed',
        28,
        5,
        82.4,
        '2025-12-10',
        'Five critical findings related to health data processing. Special categories data governance needs improvement.'
    ),
    (
        8,
        'UAVG',
        'Regulatory Review',
        'Autoriteit Persoonsgegevens',
        '2025-07-15',
        'Completed',
        6,
        2,
        76.0,
        '2026-01-15',
        'BSN processing outside authorized scope in 2 systems. Health data retention exceeding statutory limits.'
    );

-- ============================================================
-- INCIDENTS & BREACHES
-- ============================================================
CREATE TABLE IF NOT EXISTS compliance_incidents (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER REFERENCES organizations (id),
    incident_type VARCHAR(50),
    severity VARCHAR(20),
    framework_code VARCHAR(30) REFERENCES regulatory_frameworks (code),
    incident_date TIMESTAMP,
    detected_date TIMESTAMP,
    reported_date TIMESTAMP,
    resolved_date TIMESTAMP,
    description TEXT,
    affected_records INTEGER,
    root_cause TEXT,
    remediation TEXT,
    reported_to_authority BOOLEAN DEFAULT FALSE,
    fine_eur DECIMAL(15, 2)
);

INSERT INTO
    compliance_incidents (
        organization_id,
        incident_type,
        severity,
        framework_code,
        incident_date,
        detected_date,
        reported_date,
        resolved_date,
        description,
        affected_records,
        root_cause,
        remediation,
        reported_to_authority,
        fine_eur
    )
VALUES (
        1,
        'Data Breach',
        'High',
        'GDPR',
        '2025-09-12 14:30:00',
        '2025-09-12 16:45:00',
        '2025-09-13 08:00:00',
        '2025-09-15 11:00:00',
        'Unauthorized access to policyholder database via compromised API key. Customer names, addresses, and policy numbers exposed.',
        15420,
        'API key leaked in public Git repository',
        'Rotated all API keys, implemented secret scanning, mandatory code review for credentials',
        TRUE,
        NULL
    ),
    (
        1,
        'ICT Incident',
        'Critical',
        'DORA',
        '2025-11-03 02:15:00',
        '2025-11-03 02:45:00',
        '2025-11-03 06:30:00',
        '2025-11-03 18:00:00',
        'Ransomware attack on claims processing system. Core insurance operations disrupted for 16 hours.',
        0,
        'Phishing email with malicious attachment opened by employee',
        'Enhanced email filtering, mandatory phishing training, network segmentation improvement',
        TRUE,
        NULL
    ),
    (
        3,
        'Data Breach',
        'Medium',
        'LOPDGDD',
        '2025-07-22 09:00:00',
        '2025-07-22 11:30:00',
        '2025-07-22 14:00:00',
        '2025-07-25 16:00:00',
        'Marketing emails sent to 3,200 customers who had opted out. DNI numbers included in email metadata.',
        3200,
        'Consent database sync failure between CRM and email platform',
        'Fixed sync pipeline, added consent verification checkpoint before email campaigns',
        TRUE,
        120000.00
    ),
    (
        4,
        'AI Bias Incident',
        'High',
        'AI_ACT',
        '2025-10-15 00:00:00',
        '2025-11-20 00:00:00',
        NULL,
        NULL,
        'AI pricing model found to discriminate based on postal code, disproportionately affecting immigrant neighborhoods in Madrid.',
        28000,
        'Training data reflected historical pricing bias. No fairness testing performed.',
        'Model retrained with debiased data. Fairness testing added to deployment pipeline.',
        FALSE,
        NULL
    ),
    (
        8,
        'Data Breach',
        'Critical',
        'GDPR',
        '2025-04-18 08:00:00',
        '2025-04-18 10:30:00',
        '2025-04-18 12:00:00',
        '2025-04-22 09:00:00',
        'Health insurance claims data of 45,000 policyholders exposed due to misconfigured cloud storage. Medical diagnoses, BSN numbers, and treatment records accessible.',
        45000,
        'S3 bucket permission misconfiguration during migration',
        'All storage permissions audited, automated compliance scanning implemented, affected individuals notified',
        TRUE,
        440000.00
    ),
    (
        2,
        'Near Miss',
        'Low',
        'GDPR',
        '2025-08-05 15:00:00',
        '2025-08-05 15:30:00',
        NULL,
        '2025-08-05 16:00:00',
        'Employee attempted to export full customer database to USB drive. Blocked by DLP software.',
        0,
        'Employee attempting data exfiltration',
        'Terminated employee, enhanced DLP rules, USB port restrictions',
        FALSE,
        NULL
    ),
    (
        5,
        'Compliance Gap',
        'Medium',
        'AI_ACT',
        '2025-11-01 00:00:00',
        '2025-11-15 00:00:00',
        NULL,
        '2025-12-20 00:00:00',
        'AI model registry missing 2 production models. Documentation incomplete for high-risk insurance underwriting model.',
        0,
        'Rapid deployment without governance review',
        'Updated deployment pipeline to require model registry entry before production release',
        FALSE,
        NULL
    );

-- ============================================================
-- AI SYSTEMS REGISTRY (AI Act Compliance)
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_systems (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER REFERENCES organizations (id),
    system_name VARCHAR(200) NOT NULL,
    version VARCHAR(20),
    risk_level VARCHAR(20),
    purpose TEXT,
    deployment_date DATE,
    last_assessment_date DATE,
    model_type VARCHAR(100),
    training_data_description TEXT,
    has_human_oversight BOOLEAN DEFAULT FALSE,
    has_explainability BOOLEAN DEFAULT FALSE,
    has_bias_testing BOOLEAN DEFAULT FALSE,
    conformity_status VARCHAR(30),
    affected_persons_count INTEGER
);

INSERT INTO
    ai_systems (
        organization_id,
        system_name,
        version,
        risk_level,
        purpose,
        deployment_date,
        last_assessment_date,
        model_type,
        training_data_description,
        has_human_oversight,
        has_explainability,
        has_bias_testing,
        conformity_status,
        affected_persons_count
    )
VALUES (
        1,
        'ClaimsIQ Auto-Adjudicator',
        'v3.2',
        'High',
        'Automated insurance claims assessment and approval/rejection',
        '2024-06-15',
        '2025-11-01',
        'XGBoost + BERT ensemble',
        '2.1M historical claims records (2019-2024), anonymized policyholder data',
        TRUE,
        TRUE,
        TRUE,
        'Assessment Pending',
        450000
    ),
    (
        1,
        'FraudNet Detection Engine',
        'v2.1',
        'High',
        'Real-time fraud detection in insurance claims',
        '2023-09-01',
        '2025-08-15',
        'Graph Neural Network',
        '800K claims with fraud labels, synthetic fraud scenarios',
        TRUE,
        FALSE,
        TRUE,
        'Non-Compliant',
        450000
    ),
    (
        2,
        'PriceOptima Underwriting',
        'v4.0',
        'High',
        'Dynamic insurance premium calculation based on risk profile',
        '2024-01-10',
        '2025-09-01',
        'Gradient Boosting + Actuarial Tables',
        '5M policy records, demographic data, claims history',
        TRUE,
        TRUE,
        TRUE,
        'Compliant',
        2100000
    ),
    (
        3,
        'SiniestroBot Claims Handler',
        'v1.8',
        'High',
        'Automated first-notice-of-loss processing for motor insurance',
        '2024-03-20',
        '2025-10-08',
        'Large Language Model (fine-tuned Llama)',
        '1.2M Spanish motor claims, multilingual support (ES, CA, EU)',
        TRUE,
        TRUE,
        FALSE,
        'Assessment Pending',
        800000
    ),
    (
        4,
        'SmartPrice Auto Quoter',
        'v2.5',
        'High',
        'Real-time motor insurance quote generation',
        '2023-12-01',
        '2025-12-15',
        'Neural Network (MLP)',
        '3.5M quote-to-policy records, postcode-level risk data',
        FALSE,
        FALSE,
        FALSE,
        'Non-Compliant',
        1500000
    ),
    (
        5,
        'ComplianceFlow AI Analyzer',
        'v1.0',
        'Limited',
        'Document analysis and compliance gap detection using local LLMs',
        '2025-06-01',
        '2025-12-01',
        'Ollama (Llama 3.2, local)',
        'No customer data used for training. Processes documents on-premises only.',
        TRUE,
        TRUE,
        TRUE,
        'Compliant',
        500
    ),
    (
        8,
        'MedCheck Pre-Authorization',
        'v1.3',
        'High',
        'Automated health insurance pre-authorization decisions',
        '2024-08-01',
        '2025-06-10',
        'Clinical NLP + Decision Tree',
        '400K pre-auth requests, ICD-10 codes, treatment protocols',
        TRUE,
        FALSE,
        FALSE,
        'Non-Compliant',
        320000
    );

-- ============================================================
-- VIEWS for easy reporting
-- ============================================================
CREATE
OR REPLACE VIEW v_compliance_dashboard AS
SELECT
    o.name AS organization,
    o.country,
    o.industry,
    o.compliance_score,
    COUNT(DISTINCT ca.id) AS total_audits,
    SUM(ca.critical_findings) AS total_critical_findings,
    COUNT(DISTINCT ci.id) AS total_incidents,
    COUNT(
        DISTINCT CASE
            WHEN ci.severity = 'Critical' THEN ci.id
        END
    ) AS critical_incidents,
    COALESCE(SUM(ci.fine_eur), 0) AS total_fines_eur,
    COUNT(DISTINCT ai.id) AS ai_systems_count,
    COUNT(
        DISTINCT CASE
            WHEN ai.conformity_status = 'Non-Compliant' THEN ai.id
        END
    ) AS non_compliant_ai_systems
FROM
    organizations o
    LEFT JOIN compliance_audits ca ON o.id = ca.organization_id
    LEFT JOIN compliance_incidents ci ON o.id = ci.organization_id
    LEFT JOIN ai_systems ai ON o.id = ai.organization_id
GROUP BY
    o.id,
    o.name,
    o.country,
    o.industry,
    o.compliance_score
ORDER BY o.compliance_score DESC;

CREATE
OR REPLACE VIEW v_upcoming_deadlines AS
SELECT rf.jurisdiction, rf.code AS framework, co.article, co.obligation_title, co.deadline, co.risk_level, co.penalty_max_eur
FROM
    compliance_obligations co
    JOIN regulatory_frameworks rf ON co.framework_code = rf.code
WHERE
    co.deadline IS NOT NULL
    AND co.deadline >= CURRENT_DATE
ORDER BY co.deadline ASC;

CREATE
OR REPLACE VIEW v_ai_compliance_status AS
SELECT
    o.name AS organization,
    o.country,
    ai.system_name,
    ai.risk_level,
    ai.conformity_status,
    ai.has_human_oversight,
    ai.has_explainability,
    ai.has_bias_testing,
    ai.affected_persons_count,
    ai.last_assessment_date
FROM
    ai_systems ai
    JOIN organizations o ON ai.organization_id = o.id
ORDER BY
    CASE ai.conformity_status
        WHEN 'Non-Compliant' THEN 1
        WHEN 'Assessment Pending' THEN 2
        WHEN 'Compliant' THEN 3
    END,
    ai.affected_persons_count DESC;