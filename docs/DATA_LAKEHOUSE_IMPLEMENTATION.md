# Data Lakehouse Implementation Guide for Caladrius Healthcare Platform

**Research Completed**: January 27, 2026
**Based on**: 5 authoritative sources including Alex Merced's tutorials and 2025-2026 guides
**Status**: Ready for Phase 1 implementation

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Technology Stack](#technology-stack)
3. [Docker Compose Configuration](#docker-compose-configuration)
4. [Healthcare Data Schema](#healthcare-data-schema)
5. [Spark-Iceberg Integration](#spark-iceberg-integration)
6. [Data Ingestion Patterns](#data-ingestion-patterns)
7. [Dremio Setup](#dremio-setup)
8. [Service Integration](#service-integration)
9. [HIPAA Compliance](#hipaa-compliance)
10. [Performance Optimization](#performance-optimization)
11. [Implementation Roadmap](#implementation-roadmap)
12. [Cost Analysis](#cost-analysis)

---

## Executive Summary

A **data lakehouse** combines the best of data lakes and data warehouses:

- **Data Lake**: Store raw, unstructured, semi-structured data at low cost
- **Data Warehouse**: ACID transactions, SQL queries, structured analytics
- **Git-like Versioning**: Branch, merge, rollback data changes (via Nessie)

### Why Data Lakehouse for Healthcare?

| Requirement | Traditional Solution | Data Lakehouse Solution |
|-------------|---------------------|------------------------|
| **HIPAA Audit Trails** | Application logs | Native versioning (every change tracked) |
| **Data Recovery** | Backups (slow) | Time travel (instant rollback) |
| **Multi-Format Data** | Multiple systems | Single storage (EHR, FHIR, DICOM, devices) |
| **Cost** | High ($1,250/mo for 10TB) | Low ($230/mo for 10TB on S3) |
| **Real-time Analytics** | Complex ETL | Direct queries on fresh data |

### Key Technologies

- **Apache Iceberg**: Table format with ACID transactions and time travel
- **Project Nessie**: Git-like catalog (branch, merge, rollback data)
- **Dremio**: SQL query engine with semantic layer and RBAC
- **MinIO**: S3-compatible object storage (local dev) / AWS S3 (production)
- **Apache Spark**: Data ingestion and transformation

---

## Technology Stack

### Core Components

```
┌──────────────────────────────────────────────────────────┐
│                  Data Lakehouse Stack                     │
│                                                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐      │
│  │   Dremio    │  │   Nessie    │  │    Spark    │      │
│  │ Query Engine│  │   Catalog   │  │  Ingestion  │      │
│  │  Port 9047  │  │  Port 19120 │  │  Port 8888  │      │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘      │
│         │                 │                 │             │
│         └─────────────────┴─────────────────┘             │
│                           │                               │
│                    ┌──────▼──────┐                        │
│                    │   Iceberg   │                        │
│                    │ Table Format│                        │
│                    └──────┬──────┘                        │
│                           │                               │
│                    ┌──────▼──────┐                        │
│                    │    MinIO    │                        │
│                    │ Object Store│                        │
│                    │ Ports 9000  │                        │
│                    └─────────────┘                        │
└──────────────────────────────────────────────────────────┘
```

### New Docker Services (7 containers)

| Service | Image | Ports | Purpose |
|---------|-------|-------|---------|
| **minioserver** | minio/minio | 9000, 9001 | S3-compatible object storage |
| **nessie** | projectnessie/nessie | 19120 | Git-like catalog for data versioning |
| **dremio** | dremio/dremio-oss | 9047, 31010, 32010 | SQL query engine + RBAC |
| **spark_notebook** | alexmerced/spark33-notebook | 8888 | Jupyter Lab for PySpark |

---

## Docker Compose Configuration

### Add to `docker-compose.yml`

```yaml
# ===========================================
# Phase X: Data Lakehouse
# ===========================================

# MinIO Object Storage
minioserver:
  image: minio/minio
  container_name: manish-minio
  ports:
    - "9000:9000"   # S3 API
    - "9001:9001"   # Web Console
  environment:
    MINIO_ROOT_USER: ${MINIO_USER:-minioadmin}
    MINIO_ROOT_PASSWORD: ${MINIO_PASSWORD:-minioadmin}
  command: server /data --console-address ":9001"
  volumes:
    - lakehouse_minio:/data
  healthcheck:
    test: ["CMD", "mc", "ready", "local"]
    interval: 30s
    timeout: 10s
    retries: 3
  restart: unless-stopped
  networks:
    - app-network

# Nessie Catalog (Git for Data)
nessie:
  image: projectnessie/nessie:latest
  container_name: manish-nessie
  ports:
    - "19120:19120"
  environment:
    QUARKUS_PROFILE: prod
    QUARKUS_HTTP_PORT: 19120
    # Production: Enable OAuth
    # NESSIE_SERVER_AUTHENTICATION_ENABLED: "true"
  volumes:
    - lakehouse_nessie:/nessie/data
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:19120/api/v2/config"]
    interval: 30s
    timeout: 10s
    retries: 3
  restart: unless-stopped
  networks:
    - app-network

# Dremio Query Engine
dremio:
  platform: linux/x86_64
  image: dremio/dremio-oss:latest
  container_name: manish-dremio
  ports:
    - "9047:9047"   # Web UI
    - "31010:31010" # JDBC
    - "32010:32010" # Arrow Flight
  volumes:
    - lakehouse_dremio:/opt/dremio/data
  depends_on:
    nessie:
      condition: service_healthy
    minioserver:
      condition: service_healthy
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:9047"]
    interval: 30s
    timeout: 10s
    retries: 5
    start_period: 60s
  restart: unless-stopped
  networks:
    - app-network

# Spark with Jupyter Notebook
spark_notebook:
  image: alexmerced/spark33-notebook
  container_name: manish-spark
  ports:
    - "8888:8888"   # Jupyter Lab
    - "4040:4040"   # Spark UI
  env_file: .env.lakehouse
  volumes:
    - ./notebooks:/workspace
    - ./healthcare-data:/data
  depends_on:
    - nessie
    - minioserver
  restart: unless-stopped
  networks:
    - app-network

# Add volumes
volumes:
  lakehouse_minio:
  lakehouse_nessie:
  lakehouse_dremio:
```

### Environment Configuration (`.env.lakehouse`)

```bash
# AWS/S3 Configuration (for MinIO)
AWS_REGION=us-east-1
AWS_DEFAULT_REGION=us-east-1
AWS_ACCESS_KEY_ID=minioadmin
AWS_SECRET_ACCESS_KEY=minioadmin
AWS_S3_ENDPOINT=http://minioserver:9000

# Lakehouse Configuration
WAREHOUSE=s3a://healthcare-warehouse/
NESSIE_URI=http://nessie:19120/api/v1

# Spark Configuration
SPARK_MASTER=local[*]
SPARK_DRIVER_MEMORY=4g
SPARK_EXECUTOR_MEMORY=4g

# Production: Add encryption keys
# MINIO_KMS_SECRET_KEY=your-32-character-encryption-key
# NESSIE_AUTH_TOKEN=your-oauth-token
```

---

## Healthcare Data Schema

### Iceberg Table Structure

```python
# Create namespace
spark.sql("CREATE NAMESPACE IF NOT EXISTS nessie.healthcare")

# 1. Patient Demographics Table
spark.sql("""
CREATE TABLE IF NOT EXISTS nessie.healthcare.patients (
    patient_id STRING NOT NULL,
    mrn STRING NOT NULL,
    first_name STRING,
    last_name STRING,
    date_of_birth DATE,
    gender STRING,
    blood_type STRING,
    email STRING,
    phone STRING,
    address STRUCT<
        street: STRING,
        city: STRING,
        state: STRING,
        zip: STRING
    >,
    insurance STRUCT<
        provider: STRING,
        policy_number: STRING,
        group_number: STRING
    >,
    emergency_contact STRUCT<
        name: STRING,
        relationship: STRING,
        phone: STRING
    >,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    created_by STRING,
    is_active BOOLEAN
) USING iceberg
PARTITIONED BY (days(created_at))
TBLPROPERTIES (
    'write.target-file-size-bytes'='536870912',
    'write.metadata.delete-after-commit.enabled'='true',
    'write.metadata.previous-versions-max'='5',
    'history.expire.max-snapshot-age-ms'='2592000000'
);
""")

# 2. Medical Records Table
spark.sql("""
CREATE TABLE IF NOT EXISTS nessie.healthcare.medical_records (
    record_id STRING NOT NULL,
    patient_id STRING NOT NULL,
    encounter_id STRING,
    record_type STRING,
    record_date TIMESTAMP,
    provider_id STRING,
    facility_id STRING,

    -- Clinical Data (nested structures)
    diagnosis_codes ARRAY<STRUCT<
        code: STRING,
        system: STRING,
        display: STRING,
        clinical_status: STRING
    >>,
    procedure_codes ARRAY<STRUCT<
        code: STRING,
        system: STRING,
        display: STRING,
        performed_date: TIMESTAMP
    >>,
    medications ARRAY<STRUCT<
        name: STRING,
        dosage: STRING,
        frequency: STRING,
        route: STRING,
        start_date: DATE,
        end_date: DATE
    >>,
    lab_results ARRAY<STRUCT<
        test_name: STRING,
        loinc_code: STRING,
        value: STRING,
        unit: STRING,
        reference_range: STRING,
        abnormal_flag: STRING
    >>,

    clinical_notes STRING,
    chief_complaint STRING,

    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    phi_flag BOOLEAN,
    retention_policy STRING
) USING iceberg
PARTITIONED BY (months(record_date), record_type)
TBLPROPERTIES (
    'write.target-file-size-bytes'='268435456',
    'write.distribution-mode'='hash'
);
""")

# 3. Appointments Table
spark.sql("""
CREATE TABLE IF NOT EXISTS nessie.healthcare.appointments (
    appointment_id STRING NOT NULL,
    patient_id STRING NOT NULL,
    provider_id STRING NOT NULL,
    appointment_date TIMESTAMP,
    appointment_type STRING,
    status STRING,
    duration_minutes INT,
    chief_complaint STRING,
    notes STRING,
    livekit_room_id STRING,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
) USING iceberg
PARTITIONED BY (days(appointment_date))
TBLPROPERTIES (
    'write.target-file-size-bytes'='134217728'
);
""")

# 4. Providers Table
spark.sql("""
CREATE TABLE IF NOT EXISTS nessie.healthcare.providers (
    provider_id STRING NOT NULL,
    npi STRING NOT NULL,
    first_name STRING,
    last_name STRING,
    credentials STRING,
    specialty STRING,
    sub_specialty STRING,
    department STRING,
    license_state STRING,
    license_number STRING,
    license_expiry DATE,
    is_active BOOLEAN,
    created_at TIMESTAMP
) USING iceberg
TBLPROPERTIES (
    'write.target-file-size-bytes'='67108864'
);
""")

# 5. Audit Log Table
spark.sql("""
CREATE TABLE IF NOT EXISTS nessie.healthcare.audit_log (
    audit_id STRING,
    user_id STRING,
    action STRING,
    table_name STRING,
    row_count BIGINT,
    query STRING,
    ip_address STRING,
    timestamp TIMESTAMP,
    session_id STRING
) USING iceberg
PARTITIONED BY (days(timestamp))
TBLPROPERTIES (
    'write.target-file-size-bytes'='268435456'
);
""")
```

### Partitioning Strategy

| Table | Partition By | File Size | Rationale |
|-------|-------------|-----------|-----------|
| **patients** | days(created_at) | 512MB | Time-based queries |
| **medical_records** | months(record_date), record_type | 256MB | Multi-dimensional queries |
| **appointments** | days(appointment_date) | 128MB | Time-based scheduling |
| **providers** | None | 64MB | Small, frequently accessed |
| **audit_log** | days(timestamp) | 256MB | Time-based compliance queries |

---

## Spark-Iceberg Integration

### Complete Spark Session Configuration

```python
import pyspark
from pyspark.sql import SparkSession
import os

def create_iceberg_spark_session(app_name="HealthcareDataLakehouse"):
    """
    Create Spark session configured for Apache Iceberg with Nessie catalog
    """

    NESSIE_URI = os.environ.get("NESSIE_URI", "http://nessie:19120/api/v1")
    WAREHOUSE = os.environ.get("WAREHOUSE", "s3a://healthcare-warehouse/")
    AWS_ACCESS_KEY = os.environ.get("AWS_ACCESS_KEY_ID", "minioadmin")
    AWS_SECRET_KEY = os.environ.get("AWS_SECRET_ACCESS_KEY", "minioadmin")
    AWS_S3_ENDPOINT = os.environ.get("AWS_S3_ENDPOINT", "http://minioserver:9000")

    conf = (
        pyspark.SparkConf()
        .setAppName(app_name)

        # Iceberg + Nessie Dependencies
        .set('spark.jars.packages',
             'org.apache.iceberg:iceberg-spark-runtime-3.3_2.12:1.3.1,'
             'org.projectnessie.nessie-integrations:nessie-spark-extensions-3.3_2.12:0.67.0,'
             'software.amazon.awssdk:bundle:2.17.178,'
             'software.amazon.awssdk:url-connection-client:2.17.178')

        # Spark Extensions
        .set('spark.sql.extensions',
             'org.apache.iceberg.spark.extensions.IcebergSparkSessionExtensions,'
             'org.projectnessie.spark.extensions.NessieSparkSessionExtensions')

        # Nessie Catalog Configuration
        .set('spark.sql.catalog.nessie', 'org.apache.iceberg.spark.SparkCatalog')
        .set('spark.sql.catalog.nessie.uri', NESSIE_URI)
        .set('spark.sql.catalog.nessie.ref', 'main')
        .set('spark.sql.catalog.nessie.authentication.type', 'NONE')
        .set('spark.sql.catalog.nessie.catalog-impl',
             'org.apache.iceberg.nessie.NessieCatalog')

        # S3/MinIO Configuration
        .set('spark.sql.catalog.nessie.s3.endpoint', AWS_S3_ENDPOINT)
        .set('spark.sql.catalog.nessie.warehouse', WAREHOUSE)
        .set('spark.sql.catalog.nessie.io-impl',
             'org.apache.iceberg.aws.s3.S3FileIO')

        # S3 Credentials
        .set('spark.hadoop.fs.s3a.access.key', AWS_ACCESS_KEY)
        .set('spark.hadoop.fs.s3a.secret.key', AWS_SECRET_KEY)
        .set('spark.hadoop.fs.s3a.endpoint', AWS_S3_ENDPOINT)
        .set('spark.hadoop.fs.s3a.path.style.access', 'true')
        .set('spark.hadoop.fs.s3a.impl', 'org.apache.hadoop.fs.s3a.S3AFileSystem')

        # Performance Tuning
        .set('spark.sql.adaptive.enabled', 'true')
        .set('spark.sql.adaptive.coalescePartitions.enabled', 'true')
    )

    spark = SparkSession.builder.config(conf=conf).getOrCreate()
    return spark

# Initialize
spark = create_iceberg_spark_session()

# Test connectivity
spark.sql("SHOW NAMESPACES IN nessie").show()
```

---

## Data Ingestion Patterns

### Pattern A: Batch Ingestion (Historical Data)

```python
def ingest_patients_from_postgresql(spark, batch_id=None):
    """
    Migrate existing patient data from PostgreSQL to Iceberg
    """
    from datetime import datetime
    from pyspark.sql.functions import lit

    # Read from PostgreSQL
    postgres_df = spark.read \
        .format("jdbc") \
        .option("url", "jdbc:postgresql://postgres:5432/manish_dev") \
        .option("dbtable", "patients") \
        .option("user", "manish") \
        .option("password", os.getenv("POSTGRES_PASSWORD")) \
        .option("driver", "org.postgresql.Driver") \
        .load()

    # Add metadata
    postgres_df = postgres_df \
        .withColumn("ingested_at", lit(datetime.now())) \
        .withColumn("ingestion_batch_id", lit(batch_id)) \
        .withColumn("data_source", lit("postgresql_prod"))

    # Write to Iceberg (append mode)
    postgres_df.write \
        .format("iceberg") \
        .mode("append") \
        .option("mergeSchema", "true") \
        .save("nessie.healthcare.patients")

    print(f"Batch {batch_id}: Ingested {postgres_df.count()} patient records")

# Execute migration
ingest_patients_from_postgresql(spark, batch_id="2026-01-27-001")
```

### Pattern B: Streaming Ingestion (Real-time Data)

```python
def stream_patient_vitals(spark):
    """
    Stream real-time patient vitals from Kafka to Iceberg
    Requires: Background compaction service
    """
    from pyspark.sql.functions import from_json, col
    from pyspark.sql.types import StructType, StringType, TimestampType, DoubleType

    # Define schema
    vitals_schema = StructType() \
        .add("patient_id", StringType()) \
        .add("vital_type", StringType()) \
        .add("value", DoubleType()) \
        .add("unit", StringType()) \
        .add("timestamp", TimestampType())

    # Read from Kafka
    stream_df = spark.readStream \
        .format("kafka") \
        .option("kafka.bootstrap.servers", "kafka:9092") \
        .option("subscribe", "patient-vitals") \
        .option("startingOffsets", "latest") \
        .load()

    # Parse JSON
    parsed_df = stream_df \
        .selectExpr("CAST(value AS STRING)") \
        .select(from_json(col("value"), vitals_schema).alias("data")) \
        .select("data.*")

    # Write to Iceberg with checkpointing
    query = parsed_df.writeStream \
        .format("iceberg") \
        .outputMode("append") \
        .option("checkpointLocation", "/tmp/checkpoints/vitals") \
        .option("fanout-enabled", "true") \
        .toTable("nessie.healthcare.patient_vitals")

    return query

# Start streaming (runs continuously)
vitals_query = stream_patient_vitals(spark)
```

### Critical: Automated Compaction

```python
def compact_patient_tables(spark):
    """
    Background compaction to fix small files from streaming
    MUST run every 15-30 minutes via Celery/Airflow
    """
    from datetime import datetime, timedelta

    # Compact only "cold" partitions (older than 1 hour)
    cutoff_time = datetime.now() - timedelta(hours=1)

    # Use RewriteDataFiles procedure
    spark.sql(f"""
    CALL nessie.system.rewrite_data_files(
        table => 'nessie.healthcare.patients',
        where => 'created_at < timestamp("{cutoff_time.isoformat()}")',
        options => map(
            'target-file-size-bytes', '536870912',
            'min-input-files', '5',
            'max-concurrent-file-group-rewrites', '4'
        )
    );
    """)

    print(f"Compaction completed for patient table at {datetime.now()}")

# Schedule with Celery (add to apps/workers/tasks.py)
from celery import Celery
celery_app = Celery('workers')

@celery_app.task
def lakehouse_compaction_task():
    spark = create_iceberg_spark_session()
    compact_patient_tables(spark)
    spark.stop()

# Run every 30 minutes
celery_app.conf.beat_schedule = {
    'compact-lakehouse-every-30-min': {
        'task': 'workers.tasks.lakehouse_compaction_task',
        'schedule': 1800.0,  # 30 minutes
    }
}
```

---

## Dremio Setup

### Access and Initial Configuration

1. **Start Services**:
   ```bash
   docker compose up -d minioserver nessie dremio
   ```

2. **Access Dremio UI**: http://localhost:9047

3. **Create Admin Account**:
   - Username: admin
   - Password: (store in .env as DREMIO_PASSWORD)

### Add Nessie Data Source

**Step 1: Add Source**
- Go to: Settings → Data Sources → Add Source
- Type: Nessie

**General Tab:**
```
Name: nessie_healthcare
Endpoint URL: http://nessie:19120/api/v2
Authentication: None (development) / OAuth (production)
```

**Storage Tab:**
```
Authentication Type: AWS Access Key
AWS Access Key: minioadmin
AWS Secret Key: minioadmin
Root Path: /healthcare-warehouse

Connection Properties (click "Add"):
Key: fs.s3a.path.style.access
Value: true

Key: fs.s3a.endpoint
Value: http://minioserver:9000

Key: dremio.s3.compat
Value: true

Encryption:
☐ Encrypt connection (disable for local dev)
```

**Step 2: Browse Tables**

Navigate to: Sources → nessie_healthcare → healthcare → patients

### Configure RBAC in Dremio

```sql
-- Create healthcare-specific roles
CREATE ROLE clinical_staff;
CREATE ROLE billing_staff;
CREATE ROLE admin_staff;
CREATE ROLE patient_role;

-- Grant table permissions
GRANT SELECT ON nessie.healthcare.patients TO ROLE clinical_staff;
GRANT SELECT ON nessie.healthcare.medical_records TO ROLE clinical_staff;
GRANT SELECT, INSERT, UPDATE ON nessie.healthcare.appointments TO ROLE clinical_staff;

GRANT SELECT ON nessie.healthcare.patients TO ROLE billing_staff;
GRANT SELECT ON nessie.healthcare.appointments TO ROLE billing_staff;

-- Row-level security: Patients can only see own data
CREATE ROW ACCESS POLICY patient_own_data
ON nessie.healthcare.patients
TO ROLE patient_role
USING (patient_id = CURRENT_USER());

CREATE ROW ACCESS POLICY patient_own_records
ON nessie.healthcare.medical_records
TO ROLE patient_role
USING (patient_id = CURRENT_USER());
```

### Create Dremio Reflections (Query Acceleration)

```sql
-- Reflection for patient summary queries (10-100x faster)
CREATE REFLECTION patient_summary_reflection
ON nessie.healthcare.medical_records
DIMENSIONS (patient_id, record_date, record_type)
MEASURES (
    COUNT(*),
    MAX(record_date),
    MIN(record_date)
);

-- Reflection for appointment dashboard
CREATE REFLECTION appointment_dashboard_reflection
ON nessie.healthcare.appointments
DIMENSIONS (provider_id, appointment_date, status)
MEASURES (
    COUNT(*),
    AVG(duration_minutes)
);
```

---

## Service Integration

### BFF Integration (Node.js/TypeScript)

```typescript
// apps/bff/src/services/lakehouse.ts
import axios, { AxiosInstance } from 'axios';
import { logger } from '../config/logger';

interface DremioAuthResponse {
  token: string;
}

interface DremioQueryRequest {
  sql: string;
  context?: string[];
}

export class LakehouseService {
  private dremioUrl = process.env.DREMIO_URL || 'http://dremio:9047';
  private dremioToken: string | null = null;
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: this.dremioUrl,
      timeout: 30000,
    });
  }

  async authenticate() {
    const response = await this.client.post<DremioAuthResponse>(
      '/apiv2/login',
      {
        userName: 'admin',
        password: process.env.DREMIO_PASSWORD,
      }
    );
    this.dremioToken = response.data.token;
    logger.info('Dremio authentication successful');
  }

  async queryPatientHistory(patientId: string, userId: string) {
    // RBAC check
    const hasPermission = await rbacService.hasPermission(
      userId,
      'records:read'
    );
    if (!hasPermission) {
      throw new Error('Unauthorized: Missing records:read permission');
    }

    const sql = `
      SELECT
        record_id,
        record_type,
        record_date,
        diagnosis_codes,
        medications,
        clinical_notes
      FROM nessie.healthcare.medical_records
      WHERE patient_id = '${patientId}'
      ORDER BY record_date DESC
      LIMIT 100
    `;

    const response = await this.client.post(
      '/api/v3/sql',
      { sql },
      {
        headers: {
          Authorization: `Bearer ${this.dremioToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data.rows;
  }

  async getPatientTimelineForLLM(patientId: string) {
    // Optimized query for LLM context (recent 2 years only)
    const sql = `
      SELECT
        record_date,
        record_type,
        ARRAY_JOIN(
          TRANSFORM(diagnosis_codes, c -> c.display),
          ', '
        ) as diagnoses,
        clinical_notes
      FROM nessie.healthcare.medical_records
      WHERE patient_id = '${patientId}'
        AND record_date >= CURRENT_DATE - INTERVAL '2' YEAR
      ORDER BY record_date DESC
    `;

    const result = await this.executeQuery(sql);

    // Format for LLM consumption
    return result.map((r: any) => ({
      date: r.record_date,
      summary: `${r.record_type}: ${r.diagnoses}. ${r.clinical_notes}`,
    }));
  }

  private async executeQuery(sql: string) {
    if (!this.dremioToken) {
      await this.authenticate();
    }

    const response = await this.client.post(
      '/api/v3/sql',
      { sql },
      {
        headers: {
          Authorization: `Bearer ${this.dremioToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data.rows;
  }
}

export const lakehouseService = new LakehouseService();
```

### LLM Service Integration (Python)

```python
# apps/llm-service/src/services/lakehouse_context.py
from typing import Optional, List
import os

# Install: pip install pydremio
from pydremio import DremioClient

class LakehouseContextService:
    def __init__(self):
        self.dremio = DremioClient(
            base_url=os.getenv("DREMIO_URL", "http://dremio:9047"),
            username="admin",
            password=os.getenv("DREMIO_PASSWORD")
        )
        self.dremio.authenticate()

    async def get_patient_context_for_llm(
        self,
        patient_id: str,
        lookback_days: int = 90
    ) -> str:
        """
        Retrieve patient context from data lakehouse for LLM processing
        """
        sql = f"""
        SELECT
            p.first_name,
            p.last_name,
            p.date_of_birth,
            p.blood_type,
            mr.record_date,
            mr.chief_complaint,
            mr.clinical_notes,
            ARRAY_JOIN(
                TRANSFORM(mr.diagnosis_codes, d -> d.display),
                '; '
            ) as active_diagnoses,
            ARRAY_JOIN(
                TRANSFORM(mr.medications, m -> CONCAT(m.name, ' ', m.dosage)),
                '; '
            ) as current_medications
        FROM nessie.healthcare.patients p
        LEFT JOIN nessie.healthcare.medical_records mr
            ON p.patient_id = mr.patient_id
        WHERE p.patient_id = '{patient_id}'
            AND mr.record_date >= CURRENT_DATE - INTERVAL '{lookback_days}' DAY
        ORDER BY mr.record_date DESC
        LIMIT 50
        """

        result = self.dremio.query(sql)

        # Format as LLM-friendly context
        if not result:
            return f"No patient data found for ID: {patient_id}"

        context = f"Patient: {result[0]['first_name']} {result[0]['last_name']}\n"
        context += f"DOB: {result[0]['date_of_birth']}\n"
        context += f"Blood Type: {result[0]['blood_type']}\n\n"
        context += "Recent Medical History:\n"

        for record in result:
            context += f"- {record['record_date']}: {record['chief_complaint']}\n"
            if record['active_diagnoses']:
                context += f"  Diagnoses: {record['active_diagnoses']}\n"
            if record['current_medications']:
                context += f"  Medications: {record['current_medications']}\n"

        return context

    async def get_clinical_summary_for_llm(
        self,
        patient_id: str
    ) -> dict:
        """
        Get structured clinical summary for LLM agent actions
        """
        sql = f"""
        SELECT
            MAX(record_date) as last_visit,
            APPROX_COUNT_DISTINCT(encounter_id) as total_encounters,
            ARRAY_AGG(DISTINCT
                TRANSFORM(diagnosis_codes, d -> d.display)
            ) as all_diagnoses,
            ARRAY_AGG(DISTINCT
                TRANSFORM(medications, m -> m.name)
            ) as all_medications
        FROM nessie.healthcare.medical_records
        WHERE patient_id = '{patient_id}'
        GROUP BY patient_id
        """

        result = self.dremio.query(sql)
        return result[0] if result else {}

# Initialize service
lakehouse_service = LakehouseContextService()
```

### Celery Worker Integration

```python
# apps/workers/tasks.py
from celery import Celery
from pyspark.sql import SparkSession
import os

celery_app = Celery('workers')

def get_spark_session():
    """Create Spark session for worker tasks"""
    # Same config as notebooks
    from lakehouse_config import create_iceberg_spark_session
    return create_iceberg_spark_session()

@celery_app.task(name='lakehouse.compaction')
def lakehouse_compaction_task():
    """
    Run compaction on Iceberg tables
    Schedule: Every 30 minutes
    """
    spark = get_spark_session()

    try:
        # Compact patients table
        spark.sql("""
        CALL nessie.system.rewrite_data_files(
            table => 'nessie.healthcare.patients',
            options => map('target-file-size-bytes', '536870912')
        );
        """)

        # Compact medical_records table
        spark.sql("""
        CALL nessie.system.rewrite_data_files(
            table => 'nessie.healthcare.medical_records',
            options => map('target-file-size-bytes', '268435456')
        );
        """)

        print("Lakehouse compaction completed successfully")
    finally:
        spark.stop()

@celery_app.task(name='lakehouse.expire_snapshots')
def expire_old_snapshots_task():
    """
    Expire old Iceberg snapshots (keep last 30 days)
    Schedule: Daily at 2 AM
    """
    spark = get_spark_session()

    try:
        from datetime import datetime, timedelta
        cutoff = datetime.now() - timedelta(days=30)

        tables = [
            'nessie.healthcare.patients',
            'nessie.healthcare.medical_records',
            'nessie.healthcare.appointments'
        ]

        for table in tables:
            spark.sql(f"""
            CALL nessie.system.expire_snapshots(
                table => '{table}',
                older_than => TIMESTAMP '{cutoff.isoformat()}',
                retain_last => 10
            );
            """)

        print("Snapshot expiration completed successfully")
    finally:
        spark.stop()

@celery_app.task(name='lakehouse.monitor_health')
def monitor_lakehouse_health():
    """
    Check lakehouse health metrics
    Schedule: Every 15 minutes
    """
    spark = get_spark_session()

    try:
        # Check for small files
        small_files_result = spark.sql("""
            SELECT COUNT(*) as small_file_count
            FROM nessie.healthcare.medical_records.files
            WHERE file_size_in_bytes < 134217728
        """).collect()

        small_files = small_files_result[0]['small_file_count']

        # Check snapshot count
        snapshots_result = spark.sql("""
            SELECT COUNT(*) as snapshot_count
            FROM nessie.healthcare.patients.snapshots
        """).collect()

        snapshots = snapshots_result[0]['snapshot_count']

        metrics = {
            'small_files_count': small_files,
            'snapshot_count': snapshots,
            'timestamp': datetime.now().isoformat()
        }

        # Alert if thresholds exceeded
        if small_files > 10000:
            send_alert("Lakehouse: Too many small files, run compaction")

        if snapshots > 100:
            send_alert("Lakehouse: Too many snapshots, run expiration")

        return metrics
    finally:
        spark.stop()

# Celery Beat Schedule
celery_app.conf.beat_schedule = {
    'compact-lakehouse-every-30-min': {
        'task': 'lakehouse.compaction',
        'schedule': 1800.0,  # 30 minutes
    },
    'expire-snapshots-daily': {
        'task': 'lakehouse.expire_snapshots',
        'schedule': crontab(hour=2, minute=0),  # 2 AM daily
    },
    'monitor-health-every-15-min': {
        'task': 'lakehouse.monitor_health',
        'schedule': 900.0,  # 15 minutes
    }
}
```

---

## HIPAA Compliance

### 1. Encryption at Rest

```yaml
# Production MinIO configuration
minioserver:
  environment:
    MINIO_KMS_SECRET_KEY: "${MINIO_ENCRYPTION_KEY}"  # 32 characters
    MINIO_SSE_MASTER_KEY: "${MINIO_MASTER_KEY}"
  command: server /data --console-address ":9001" --certs-dir /certs
  volumes:
    - ./certs:/certs:ro  # SSL certificates
```

### 2. Complete Audit Trail

```python
def log_data_access(spark, user_id, action, table_name, row_count, query):
    """
    Log all data access to audit table (HIPAA requirement)
    """
    from datetime import datetime
    import uuid

    audit_df = spark.createDataFrame([{
        "audit_id": str(uuid.uuid4()),
        "user_id": user_id,
        "action": action,  # READ, WRITE, UPDATE, DELETE
        "table_name": table_name,
        "row_count": row_count,
        "query": query,
        "ip_address": get_client_ip(),
        "timestamp": datetime.now(),
        "session_id": get_session_id()
    }])

    audit_df.write \
        .format("iceberg") \
        .mode("append") \
        .save("nessie.healthcare.audit_log")

# Example usage
log_data_access(
    spark,
    user_id="physician-123",
    action="READ",
    table_name="nessie.healthcare.patients",
    row_count=150,
    query="SELECT * FROM patients WHERE ..."
)
```

### 3. Data Retention (HIPAA 6 Years)

```python
def enforce_hipaa_retention(spark):
    """
    Enforce HIPAA retention policy:
    - Keep data for 6 years minimum
    - Keep snapshots for 30 days
    - Remove orphan files older than 7 days
    """
    from datetime import datetime, timedelta

    # Expire snapshots older than 30 days
    snapshot_cutoff = datetime.now() - timedelta(days=30)
    spark.sql(f"""
    CALL nessie.system.expire_snapshots(
        table => 'nessie.healthcare.medical_records',
        older_than => TIMESTAMP '{snapshot_cutoff.isoformat()}',
        retain_last => 10  # Always keep at least 10 snapshots
    );
    """)

    # Remove orphan files (data files not referenced by snapshots)
    orphan_cutoff = datetime.now() - timedelta(days=7)
    spark.sql(f"""
    CALL nessie.system.remove_orphan_files(
        table => 'nessie.healthcare.medical_records',
        older_than => TIMESTAMP '{orphan_cutoff.isoformat()}'
    );
    """)

    # Rewrite manifests to consolidate metadata
    spark.sql("""
    CALL nessie.system.rewrite_manifests(
        table => 'nessie.healthcare.medical_records'
    );
    """)
```

### 4. Row-Level Security (RLS)

```sql
-- Dremio RLS: Patients can only access own data
CREATE ROW ACCESS POLICY patient_own_data
ON nessie.healthcare.patients
TO ROLE patient_role
USING (patient_id = CURRENT_USER());

-- Physicians can only access their assigned patients
CREATE ROW ACCESS POLICY physician_assigned_patients
ON nessie.healthcare.patients
TO ROLE physician_role
USING (
    patient_id IN (
        SELECT patient_id
        FROM nessie.healthcare.provider_patient_assignments
        WHERE provider_id = CURRENT_USER()
    )
);
```

---

## Performance Optimization

### 1. Partition Pruning

```python
# Bad: Full table scan
spark.sql("""
SELECT * FROM nessie.healthcare.medical_records
WHERE patient_id = 'abc-123'
""")

# Good: Partition pruning (only scan relevant partitions)
spark.sql("""
SELECT * FROM nessie.healthcare.medical_records
WHERE record_date >= '2026-01-01'
  AND record_date < '2026-02-01'
  AND record_type = 'diagnosis'
  AND patient_id = 'abc-123'
""")
# Only scans: January 2026 diagnosis partition
```

### 2. File Size Management

```python
# Configure optimal file sizes per table
spark.sql("""
ALTER TABLE nessie.healthcare.patients
SET TBLPROPERTIES (
    'write.target-file-size-bytes'='536870912',  -- 512MB
    'write.distribution-mode'='hash'
);
""")

# Small tables (< 1GB total)
# File size: 64MB

# Medium tables (1-100GB)
# File size: 256MB

# Large tables (> 100GB)
# File size: 512MB
```

### 3. Z-Ordering for Multi-Dimensional Queries

```python
# Optimize for queries by patient_id + record_date
spark.sql("""
CALL nessie.system.rewrite_data_files(
    table => 'nessie.healthcare.medical_records',
    strategy => 'sort',
    sort_order => 'patient_id, record_date'
);
""")

# Benefits:
# - 2-10x faster queries on sorted columns
# - Better data skipping (min/max stats)
# - Improved compression
```

### 4. Metadata Optimization

```python
# Rewrite manifests to consolidate metadata files
spark.sql("""
CALL nessie.system.rewrite_manifests(
    table => 'nessie.healthcare.medical_records'
);
""")

# Benefits:
# - Faster query planning
# - Reduced metadata overhead
# - Better Parquet footer caching
```

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1) ✅

- [ ] Add lakehouse services to docker-compose.yml
- [ ] Create .env.lakehouse configuration
- [ ] Deploy MinIO, Nessie, Dremio, Spark
- [ ] Verify service connectivity
- [ ] Create MinIO buckets (healthcare-warehouse)
- [ ] Test Spark → Nessie → MinIO pipeline

**Success Criteria:**
- All services healthy
- Can create/query Iceberg table
- Dremio can connect to Nessie

---

### Phase 2: Schema Design (Week 1-2) ✅

- [ ] Design Iceberg table schemas (patients, medical_records, appointments, providers)
- [ ] Create tables with partitioning strategy
- [ ] Setup Dremio RBAC (clinical_staff, billing_staff, patient_role)
- [ ] Configure row-level security policies
- [ ] Create audit logging table

**Success Criteria:**
- All tables created
- RBAC configured
- RLS policies tested

---

### Phase 3: Data Migration (Week 2-3) 📊

- [ ] Build PostgreSQL → Iceberg batch pipeline
- [ ] Migrate 1M+ historical patient records
- [ ] Migrate medical records (all types)
- [ ] Migrate appointments and providers
- [ ] Validate data integrity (count, checksum)
- [ ] Performance benchmarking

**Success Criteria:**
- Data migrated successfully
- Query latency < 2s for dashboards
- No data loss

---

### Phase 4: Service Integration (Week 3-4) 🔗

- [ ] Create LakehouseService in BFF (TypeScript)
- [ ] Add Dremio client to LLM Service (Python)
- [ ] Build REST endpoints for lakehouse queries
- [ ] Integrate with CopilotKit agent actions
- [ ] Add lakehouse context to LLM prompts
- [ ] Update frontend dashboards

**Success Criteria:**
- API endpoints functional
- LLM agents use lakehouse context
- Frontend displays lakehouse data

---

### Phase 5: Optimization (Week 4-5) ⚡

- [ ] Setup automated compaction (Celery task every 30 min)
- [ ] Configure snapshot expiration (30-day retention)
- [ ] Implement monitoring and alerting (small files, metadata size)
- [ ] Create Dremio reflections for hot queries (patient summary, appointments)
- [ ] Z-ordering for multi-column queries
- [ ] Performance tuning (file sizes, partition pruning)

**Success Criteria:**
- Compaction runs automatically
- No performance degradation
- Query latency < 2s maintained

---

### Phase 6: Production Hardening (Week 5-6) 🔒

- [ ] Enable Nessie OAuth authentication
- [ ] Setup SSL/TLS for all lakehouse services
- [ ] Comprehensive audit logging (all data access)
- [ ] HIPAA compliance validation
- [ ] Disaster recovery testing (backup/restore)
- [ ] Documentation and runbooks

**Success Criteria:**
- Passes HIPAA security audit
- Complete audit trail
- DR plan tested

---

### Phase 7: Advanced Features (Week 7-8) 🚀

- [ ] Streaming ingestion from Kafka (medical devices)
- [ ] Real-time vitals monitoring
- [ ] Branch-based development workflows (research, testing)
- [ ] Automated data quality checks
- [ ] Data validation rules

**Success Criteria:**
- Real-time data pipeline functional
- Branching workflow documented

---

### Phase 8: ML/AI Integration (Week 8-9) 🤖

- [ ] Connect ML models to lakehouse
- [ ] Feature engineering pipelines (Spark)
- [ ] Model training on Iceberg tables
- [ ] Prediction serving via Dremio
- [ ] A/B testing with branches

**Success Criteria:**
- ML model trained on lakehouse data
- Predictions accessible via API

---

### Phase 9: Testing & Documentation (Week 9-10) 📚

- [ ] Integration tests (Pytest, Jest)
- [ ] Performance benchmarks (query latency, throughput)
- [ ] Operational runbooks (compaction, DR, troubleshooting)
- [ ] Developer documentation (API, schemas, examples)
- [ ] User training materials

**Success Criteria:**
- Tests pass
- Documentation complete

---

### Phase 10: Go-Live (Week 10) 🎉

- [ ] Production deployment checklist
- [ ] Data validation (spot checks)
- [ ] Performance monitoring (Grafana dashboards)
- [ ] Team training sessions
- [ ] Handoff to operations team

**Success Criteria:**
- Production stable
- Team trained

---

## Cost Analysis

### Storage Costs (S3 Standard)

| Data Volume | Monthly Cost (S3) | vs Snowflake | vs Redshift | Savings |
|-------------|-------------------|--------------|-------------|---------|
| **1 TB** | $23 | $40 | $125 | 43-82% |
| **10 TB** | $230 | $400 | $1,250 | 42-82% |
| **100 TB** | $2,300 | $4,000 | $12,500 | 42-82% |

### Compute Costs (AWS)

| Service | Configuration | Monthly Cost |
|---------|--------------|--------------|
| **EKS Cluster** | 3x t3.xlarge nodes | $150 |
| **Dremio Executors** | Spot instances | $50-100 |
| **Spark Workers** | On-demand when needed | $0-200 |
| **Total** | - | **$200-450** |

### Traditional Data Warehouse Costs (10 TB)

| Solution | Storage | Compute | Total/month |
|----------|---------|---------|-------------|
| **Snowflake** | $400 | $200-500 | $600-900 |
| **BigQuery** | $200 | $100-300 | $300-500 |
| **Redshift** | $1,250 | $0 | $1,250 |

### Data Lakehouse Cost (10 TB)

| Component | Cost |
|-----------|------|
| S3 Storage | $230 |
| EKS Compute | $200-450 |
| **Total** | **$430-680** |

**Savings**: 25-65% vs traditional data warehouses

---

## Success Criteria

### Technical Metrics

- [ ] Successfully ingest 1M+ patient records
- [ ] Query latency < 2s for clinical dashboards
- [ ] < 5,000 small files per table
- [ ] < 100 snapshots per table
- [ ] Compaction runs every 30 minutes
- [ ] Zero data loss during migration

### Compliance Metrics

- [ ] Complete audit trail for all data access
- [ ] Row-level security tested and validated
- [ ] Encryption at rest enabled
- [ ] HIPAA compliance audit passed
- [ ] Disaster recovery plan tested

### Business Metrics

- [ ] 40-50% cost savings vs traditional data warehouse
- [ ] Support for 100+ concurrent users
- [ ] Real-time analytics on fresh data (< 5 min latency)
- [ ] Self-service analytics for non-technical users

---

## Key Takeaways

### Critical Success Factors

1. **Automate Compaction**: Not optional - streaming creates small files
2. **Monitor Metadata**: Snapshots and manifests grow quickly
3. **Partition Wisely**: Time-based partitioning works best for healthcare
4. **Test RBAC Early**: Patient data isolation is critical
5. **Plan for Scale**: 512MB files, regular compaction, aggressive expiration

### Common Pitfalls to Avoid

1. **Small Files Problem**: Streaming without compaction kills performance
2. **Metadata Bloat**: Unlimited snapshots consume storage and slow queries
3. **Over-Partitioning**: Too many partitions create metadata overhead
4. **Ignoring Security**: Healthcare data requires encryption, RBAC, audit trails
5. **Vendor Lock-in**: Use open standards (Iceberg REST Catalog, Nessie)

### Healthcare-Specific Advantages

1. **Time Travel**: Query data as it existed at any point (audit compliance)
2. **Schema Evolution**: Add fields without breaking existing queries
3. **ACID Transactions**: Ensure data consistency for clinical records
4. **Multi-Engine Access**: Same data in Spark, Dremio, Python, BI tools
5. **Cost Efficiency**: Query only relevant partitions, not entire datasets

---

## Next Steps

1. **Review this guide** with the team
2. **Provision AWS resources** (S3 bucket, EKS cluster) OR **start locally** with MinIO
3. **Begin Phase 1** implementation (Foundation - Week 1)
4. **Schedule weekly check-ins** to track progress

---

## Resources

### Documentation
- [Apache Iceberg Official Docs](https://iceberg.apache.org/)
- [Project Nessie Documentation](https://projectnessie.org/)
- [Dremio Documentation](https://docs.dremio.com/)
- [AWS Iceberg Best Practices](https://docs.aws.amazon.com/prescriptive-guidance/latest/apache-iceberg-on-aws/)

### Training Resources
- [Alex Merced's LinkedIn Post](https://www.linkedin.com/pulse/creating-local-data-lakehouse-using-alex-merced)
- [Video Tutorial](https://www.youtube.com/watch?v=X3wfVaSQS_c)
- [Dev.to Guide](https://dev.to/alexmercedcoder/data-engineering-create-a-apache-iceberg-based-data-lakehouse-on-your-laptop-41a8)
- [YouTube Playlist](https://www.youtube.com/playlist?list=PL-gIUf9e9CCuPu4Y-YgiHkqvmolS2YS2Y)

### Support
- GitHub: [developer-advocacy-dremio/iceberg-nessie-dremio-env](https://github.com/developer-advocacy-dremio/iceberg-nessie-dremio-env)
- Slack: Project Nessie Community
- Forum: Apache Iceberg Mailing List

---

**Document Version**: 1.0
**Last Updated**: January 27, 2026
**Maintained By**: Caladrius Engineering Team
