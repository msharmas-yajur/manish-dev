# Caladrius Health × Nano Hospitals
## EBITDA-Based Pricing Proposal for Inpatient Insurance Revenue Cycle Management

**Prepared by:** Caladrius Health AI
**For:** Nano Hospitals, Bengaluru
**Date:** February 2026
**Version:** 1.0

---

## Executive Summary

Caladrius Health proposes an AI-powered Revenue Cycle Management (RCM) solution for Nano Hospitals' inpatient insurance operations. Our EBITDA-linked pricing model ensures **zero upfront investment** with fees tied directly to measurable financial improvements—creating a true partnership where we succeed only when you succeed.

**Projected Annual Impact for Nano Hospitals:**
| Metric | Current State | With Caladrius | Improvement |
|--------|---------------|----------------|-------------|
| Claim Denial Rate | 15-20% | 3-5% | ↓ 75% |
| AR Cycle (Days) | 90-120 | 30-40 | ↓ 65% |
| RCM Staff Costs | ₹36-48L/year | ₹14-19L/year | ↓ 60% |
| Annual Revenue Leakage | ₹90-150L | ₹18-30L | ↓ 80% |

**Estimated Annual EBITDA Improvement: ₹1.2 - 1.8 Crores**

---

## Part 1: Nano Hospitals - Current State Analysis

### Hospital Profile
| Parameter | Value |
|-----------|-------|
| Bed Capacity | 50-54 beds |
| Locations | 2 (Hulimavu, Uttarahalli) |
| Insurance Empanelments | 25+ providers |
| Key Specialties | Orthopedics, OB-GYN, Cardiology |
| Accreditation | NABH, NABL |

### Inpatient Insurance Volume Estimation

#### Assumptions (Industry Benchmarks)
| Parameter | Conservative | Moderate | Aggressive |
|-----------|--------------|----------|------------|
| Bed Occupancy Rate | 60% | 70% | 80% |
| Insurance Patient Mix | 40% | 50% | 60% |
| Average Length of Stay (ALOS) | 4 days | 3.5 days | 3 days |
| Average Claim Value | ₹75,000 | ₹100,000 | ₹125,000 |

#### Annual Insurance Inpatient Calculations (Moderate Scenario)

```
Total Bed Days/Year     = 52 beds × 365 days × 70% occupancy = 13,286 bed days
Total Admissions/Year   = 13,286 ÷ 3.5 ALOS = 3,796 admissions
Insurance Admissions    = 3,796 × 50% = 1,898 insurance cases/year
Annual Insurance Revenue = 1,898 × ₹1,00,000 = ₹18.98 Crores
```

### Current RCM Pain Points (Typical for 50-Bed Hospital)

| Challenge | Impact |
|-----------|--------|
| **High Denial Rates (15-20%)** | ₹2.85 - 3.80 Cr in disputed/delayed claims |
| **Long AR Cycles (90-120 days)** | Working capital locked, cash flow stress |
| **Manual Coding Errors** | 8-12% claims require rework |
| **TPA Query Delays** | 20-30% claims stuck in query loop |
| **Staff Overhead** | 6-8 FTEs dedicated to insurance processing |
| **Compliance Gaps** | Risk of IRDAI/NHCX penalties |

### Current RCM Cost Structure (Estimated)

| Cost Component | Monthly | Annual |
|----------------|---------|--------|
| Insurance Desk Staff (6-8 FTEs) | ₹3.0-4.0L | ₹36-48L |
| Claim Denials/Write-offs | ₹7.5-12.5L | ₹90-150L |
| Query Resolution Delays | ₹2.0-3.0L | ₹24-36L |
| Compliance & Audit | ₹0.5L | ₹6L |
| Software/Manual Tools | ₹0.3L | ₹3.6L |
| **Total RCM Cost** | **₹13.3-20.3L** | **₹159.6-243.6L** |

---

## Part 2: Caladrius Health Solution

### Platform Capabilities

#### Core Modules for Inpatient Insurance

| Module | Function | Nano Hospitals Benefit |
|--------|----------|----------------------|
| **AI Pre-Authorization** | Automated eligibility check, instant pre-auth | Reduce admission delays from 4hrs to 15min |
| **Smart Coding Engine** | ICD-10, procedure code validation | 99%+ coding accuracy, fewer queries |
| **Real-Time Claim Validation** | Error detection before submission | Prevent 80% of denials at source |
| **TPA Integration Hub** | Direct API with 25+ insurers | Faster adjudication, fewer manual uploads |
| **Discharge Summary AI** | Auto-generate compliant summaries | 70% reduction in documentation time |
| **Denial Management** | Predictive denial flagging, auto-appeals | Recover 60% of previously denied claims |
| **AR Analytics Dashboard** | Real-time aging, bottleneck identification | Actionable insights for CFO/billing head |

#### Workflow Transformation

```
CURRENT STATE (Manual)
───────────────────────────────────────────────────────────────────────
Admission → Manual Eligibility (2-4 hrs) → Paper Pre-Auth (24-48 hrs) →
Treatment → Manual Coding (errors) → Claim Submission (delays) →
TPA Queries (back-forth) → Partial Payment (90-120 days) → Write-off

WITH CALADRIUS (AI-Powered)
───────────────────────────────────────────────────────────────────────
Admission → Instant Eligibility (API) → Auto Pre-Auth (15 min) →
Treatment → AI Coding (real-time) → Validated Submission (same day) →
Proactive Query Resolution → Full Payment (30-40 days) → Minimal Leakage
```

### Integration Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     NANO HOSPITALS HIS                          │
│              (Existing Hospital Information System)             │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HL7/FHIR/API
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                   CALADRIUS AI PLATFORM                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │ Pre-Auth    │  │ Coding      │  │ Claims      │             │
│  │ Engine      │  │ Engine      │  │ Validator   │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │ Denial      │  │ Analytics   │  │ Compliance  │             │
│  │ Management  │  │ Dashboard   │  │ Monitor     │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
└──────────────────────────┬──────────────────────────────────────┘
                           │ Secure APIs (ABDM/NHCX Compliant)
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    TPA / INSURER NETWORK                        │
│  Star Health │ ICICI Lombard │ Bajaj Allianz │ 22+ Others      │
└─────────────────────────────────────────────────────────────────┘
```

---

## Part 3: EBITDA-Based Pricing Model

### Philosophy

Traditional RCM vendors charge fixed fees regardless of results. Caladrius believes in **outcome-aligned pricing**—we earn only when we deliver measurable EBITDA improvement to Nano Hospitals.

### Pricing Structure

#### Option A: Pure Gain-Share Model (Recommended)

| Component | Structure |
|-----------|-----------|
| **Setup Fee** | ₹0 (Zero upfront cost) |
| **Monthly Platform Fee** | ₹0 |
| **Gain-Share** | 25% of documented EBITDA improvement |
| **Minimum Commitment** | 12 months |
| **Cap** | Maximum 3% of insurance revenue processed |

**How EBITDA Improvement is Measured:**
1. **Denial Reduction Savings** = (Old Denial Rate - New Denial Rate) × Claims Processed × Avg Claim Value
2. **AR Cycle Savings** = Working Capital Released × Cost of Capital (12%)
3. **Staff Efficiency Savings** = FTE Reduction × Avg CTC
4. **Revenue Recovery** = Previously written-off claims recovered

#### Option B: Hybrid Model

| Component | Structure |
|-----------|-----------|
| **Setup Fee** | ₹2.5 Lakhs (one-time) |
| **Monthly Platform Fee** | ₹75,000/month |
| **Gain-Share** | 15% of EBITDA improvement |
| **Minimum Commitment** | 12 months |

#### Option C: Transaction-Based Model

| Component | Structure |
|-----------|-----------|
| **Setup Fee** | ₹1.5 Lakhs (one-time) |
| **Per-Claim Fee** | ₹150 per insurance claim processed |
| **Success Bonus** | 10% of recovered denied claims |
| **Minimum Commitment** | 6 months |

---

## Part 4: Financial Projections for Nano Hospitals

### Scenario Analysis (Option A - Gain-Share Model)

#### Conservative Scenario
| Metric | Year 1 |
|--------|--------|
| Insurance Claims Processed | 1,500 |
| Avg Claim Value | ₹75,000 |
| Total Insurance Revenue | ₹11.25 Cr |
| **Improvements:** | |
| Denial Rate Reduction (18% → 5%) | ₹1.46 Cr saved |
| AR Cycle Reduction (Cash Flow) | ₹0.22 Cr saved |
| Staff Efficiency (2 FTE reduction) | ₹0.12 Cr saved |
| **Total EBITDA Improvement** | **₹1.80 Cr** |
| Caladrius Fee (25% gain-share) | ₹0.45 Cr |
| **Net Benefit to Nano Hospitals** | **₹1.35 Cr** |
| **ROI** | **∞ (Zero Investment)** |

#### Moderate Scenario
| Metric | Year 1 |
|--------|--------|
| Insurance Claims Processed | 1,900 |
| Avg Claim Value | ₹1,00,000 |
| Total Insurance Revenue | ₹19.0 Cr |
| **Improvements:** | |
| Denial Rate Reduction (17% → 4%) | ₹2.47 Cr saved |
| AR Cycle Reduction (Cash Flow) | ₹0.38 Cr saved |
| Staff Efficiency (3 FTE reduction) | ₹0.18 Cr saved |
| **Total EBITDA Improvement** | **₹3.03 Cr** |
| Caladrius Fee (25% gain-share) | ₹0.76 Cr |
| **Net Benefit to Nano Hospitals** | **₹2.27 Cr** |

#### Aggressive Scenario
| Metric | Year 1 |
|--------|--------|
| Insurance Claims Processed | 2,300 |
| Avg Claim Value | ₹1,25,000 |
| Total Insurance Revenue | ₹28.75 Cr |
| **Improvements:** | |
| Denial Rate Reduction (20% → 3%) | ₹4.89 Cr saved |
| AR Cycle Reduction (Cash Flow) | ₹0.57 Cr saved |
| Staff Efficiency (4 FTE reduction) | ₹0.24 Cr saved |
| **Total EBITDA Improvement** | **₹5.70 Cr** |
| Caladrius Fee (25% gain-share, capped at 3%) | ₹0.86 Cr |
| **Net Benefit to Nano Hospitals** | **₹4.84 Cr** |

### 3-Year Projection (Moderate Scenario)

| Year | Insurance Revenue | EBITDA Improvement | Caladrius Fee | Net Benefit |
|------|-------------------|-------------------|---------------|-------------|
| Year 1 | ₹19.0 Cr | ₹3.03 Cr | ₹0.76 Cr | ₹2.27 Cr |
| Year 2 | ₹21.0 Cr | ₹3.15 Cr | ₹0.79 Cr | ₹2.36 Cr |
| Year 3 | ₹23.5 Cr | ₹3.29 Cr | ₹0.82 Cr | ₹2.47 Cr |
| **Total** | **₹63.5 Cr** | **₹9.47 Cr** | **₹2.37 Cr** | **₹7.10 Cr** |

---

## Part 5: Workflow Efficiency Gains

### Pre-Authorization Process

| Step | Current (Manual) | With Caladrius | Time Saved |
|------|------------------|----------------|------------|
| Eligibility Check | 30-60 min | 30 seconds | 98% |
| Pre-Auth Request | 2-4 hours | 15 minutes | 94% |
| Document Collection | 1-2 hours | Auto-pull from HIS | 100% |
| TPA Response | 24-48 hours | 2-4 hours (API) | 90% |
| **Total Pre-Auth Time** | **1-2 days** | **2-4 hours** | **85%** |

### Claims Submission Process

| Step | Current | With Caladrius | Improvement |
|------|---------|----------------|-------------|
| Discharge Summary | 45-60 min manual | 10 min AI-assisted | 80% faster |
| Medical Coding | Error-prone, 15% rework | 99% accurate, <2% rework | 87% reduction |
| Document Assembly | 30 min per claim | Auto-compiled | 95% faster |
| Submission | Manual upload to each TPA | Single-click to all | 90% faster |
| Query Response | 3-5 days avg | Same-day AI response | 80% faster |

### Staff Productivity

| Role | Current FTEs | With Caladrius | Redeployment |
|------|--------------|----------------|--------------|
| Insurance Desk Officers | 4-5 | 2 | Patient relations |
| Medical Coders | 2 | 0.5 | Quality audit |
| AR Follow-up | 2 | 0.5 | Recovery focus |
| **Total** | **8-9** | **3** | **5-6 FTEs freed** |

---

## Part 6: Implementation Plan

### Phase 1: Discovery & Setup (Weeks 1-4)
| Week | Activity |
|------|----------|
| 1 | Kick-off, HIS assessment, data mapping |
| 2 | API integration with existing systems |
| 3 | TPA connection setup (25+ insurers) |
| 4 | Historical data migration, baseline metrics |

### Phase 2: Pilot (Weeks 5-8)
| Week | Activity |
|------|----------|
| 5-6 | Go-live with one department (Orthopedics recommended) |
| 7-8 | Staff training, workflow optimization |
| 8 | Pilot review, KPI validation |

### Phase 3: Full Rollout (Weeks 9-12)
| Week | Activity |
|------|----------|
| 9-10 | Expand to all departments |
| 11 | Both locations (Hulimavu + Uttarahalli) |
| 12 | Optimization, dashboard customization |

### Phase 4: Continuous Improvement (Ongoing)
- Monthly business reviews
- Quarterly EBITDA reconciliation
- AI model tuning based on Nano-specific patterns
- New TPA/insurer additions as needed

---

## Part 7: Risk Mitigation & Guarantees

### Performance Guarantees

| Guarantee | Commitment | Remedy |
|-----------|------------|--------|
| Denial Rate | Reduce to <5% within 6 months | Fee waiver until achieved |
| AR Days | Reduce to <45 days within 6 months | Fee waiver until achieved |
| System Uptime | 99.9% availability | Service credits |
| Compliance | ABDM/NHCX/IRDAI compliant | Full indemnification |

### Data Security

| Measure | Details |
|---------|---------|
| Encryption | AES-256 at rest, TLS 1.3 in transit |
| Access Control | Role-based, MFA enforced |
| Audit Logs | Complete trail, 7-year retention |
| Compliance | HIPAA-aligned, DPDP Act ready |
| Data Residency | India-only servers |

### Exit Provisions

- 90-day notice period
- Complete data export in standard formats
- No lock-in penalties after 12 months
- Transition support included

---

## Part 8: Why Caladrius for Nano Hospitals

### Strategic Fit

| Nano Hospitals Need | Caladrius Capability |
|--------------------|---------------------|
| NABH compliance maintenance | Built-in compliance monitoring |
| 25+ TPA integrations | Pre-built connectors for all major TPAs |
| Orthopedics focus (high-value claims) | Specialty-specific coding accuracy |
| Growing insurance patient base | Scalable platform, no per-bed licensing |
| Cash flow optimization | 60-80 day AR reduction |

### Competitive Differentiation

| Factor | Traditional RCM | Caladrius |
|--------|-----------------|-----------|
| Pricing Model | Fixed fee regardless of results | Pay only for improvement |
| Technology | Rule-based, manual | AI-native, autonomous |
| Implementation | 6-12 months | 8-12 weeks |
| Denial Management | Reactive | Predictive prevention |
| Compliance | Manual audits | Continuous monitoring |

---

## Part 9: Next Steps

### Proposed Timeline

| Step | Timeline | Owner |
|------|----------|-------|
| 1. Proposal Review | Week 1 | Nano Hospitals Management |
| 2. Discovery Call | Week 2 | Joint (Caladrius + Nano) |
| 3. Data Assessment | Week 2-3 | Caladrius Team |
| 4. Custom ROI Model | Week 3 | Caladrius Team |
| 5. Contract Negotiation | Week 4 | Both Parties |
| 6. Kick-off | Week 5 | Joint Team |

### Contact

**Caladrius Health AI**
- **Email:** connect@caladriushealth.ai
- **Website:** [caladriushealth.ai](https://caladriushealth.ai)
- **Leadership:**
  - Giri Mudbidri, CEO
  - Manish Sharma, CPTO

---

## Appendix A: EBITDA Calculation Methodology

### Formula

```
EBITDA Improvement =
    (Denial Savings) +
    (AR Cycle Savings) +
    (Staff Efficiency Savings) +
    (Revenue Recovery)

Where:
  Denial Savings = (Baseline Denial % - Current Denial %) × Claims × Avg Value
  AR Cycle Savings = (Working Capital Released) × (Cost of Capital / 12) × Months Improved
  Staff Efficiency = (FTEs Reduced) × (Avg Annual CTC)
  Revenue Recovery = Denied Claims Recovered × Recovery Rate
```

### Measurement Protocol

1. **Baseline Period:** 3 months pre-implementation
2. **Measurement Frequency:** Monthly
3. **Reconciliation:** Quarterly with joint audit
4. **Dispute Resolution:** Independent auditor if variance >10%

---

## Appendix B: Case Study Reference

### Similar Hospital Profile (Anonymized)

**60-Bed Multi-Specialty Hospital, South India**

| Metric | Before | After 6 Months | Improvement |
|--------|--------|----------------|-------------|
| Denial Rate | 18.5% | 4.2% | -77% |
| AR Days | 98 | 38 | -61% |
| RCM Staff | 7 FTEs | 3 FTEs | -57% |
| Annual Leakage | ₹1.8 Cr | ₹0.35 Cr | -81% |
| **EBITDA Impact** | - | **+₹2.1 Cr/year** | - |

---

*This proposal is confidential and intended solely for Nano Hospitals management. Financial projections are estimates based on industry benchmarks and are subject to validation during the discovery phase.*

**© 2026 Caladrius Health AI. All rights reserved.**
