// Healthcare Application MongoDB Initialization
// Collections for unstructured data, logs, and ML results

// Switch to application database
db = db.getSiblingDB('manish_dev');

// Create collections with schemas

// Chat messages collection (for AI copilot conversations)
db.createCollection('chat_messages', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['user_id', 'role', 'content', 'created_at'],
      properties: {
        user_id: { bsonType: 'string' },
        session_id: { bsonType: 'string' },
        role: { enum: ['user', 'assistant', 'system'] },
        content: { bsonType: 'string' },
        model: { bsonType: 'string' },
        metadata: { bsonType: 'object' },
        created_at: { bsonType: 'date' }
      }
    }
  }
});

// ML pipeline results
db.createCollection('ml_results', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['pipeline_name', 'status', 'created_at'],
      properties: {
        pipeline_name: { bsonType: 'string' },
        input_data: { bsonType: 'object' },
        output_data: { bsonType: 'object' },
        model_used: { bsonType: 'string' },
        status: { enum: ['pending', 'processing', 'completed', 'failed'] },
        error: { bsonType: 'string' },
        processing_time_ms: { bsonType: 'int' },
        created_at: { bsonType: 'date' },
        completed_at: { bsonType: 'date' }
      }
    }
  }
});

// Audit logs
db.createCollection('audit_logs', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['action', 'timestamp'],
      properties: {
        user_id: { bsonType: 'string' },
        action: { bsonType: 'string' },
        resource_type: { bsonType: 'string' },
        resource_id: { bsonType: 'string' },
        old_value: { bsonType: 'object' },
        new_value: { bsonType: 'object' },
        ip_address: { bsonType: 'string' },
        user_agent: { bsonType: 'string' },
        timestamp: { bsonType: 'date' }
      }
    }
  }
});

// Document embeddings for semantic search
db.createCollection('embeddings', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['document_id', 'embedding', 'created_at'],
      properties: {
        document_id: { bsonType: 'string' },
        document_type: { bsonType: 'string' },
        content: { bsonType: 'string' },
        embedding: { bsonType: 'array' },
        model: { bsonType: 'string' },
        metadata: { bsonType: 'object' },
        created_at: { bsonType: 'date' }
      }
    }
  }
});

// SNOMED CT cache
db.createCollection('snomed_cache', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['concept_id', 'term'],
      properties: {
        concept_id: { bsonType: 'string' },
        term: { bsonType: 'string' },
        semantic_tag: { bsonType: 'string' },
        parents: { bsonType: 'array' },
        children: { bsonType: 'array' },
        synonyms: { bsonType: 'array' },
        cached_at: { bsonType: 'date' }
      }
    }
  }
});

// Telehealth session recordings metadata
db.createCollection('telehealth_sessions', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['room_id', 'created_at'],
      properties: {
        room_id: { bsonType: 'string' },
        appointment_id: { bsonType: 'string' },
        participants: { bsonType: 'array' },
        duration_seconds: { bsonType: 'int' },
        recording_url: { bsonType: 'string' },
        transcript: { bsonType: 'string' },
        ai_summary: { bsonType: 'string' },
        created_at: { bsonType: 'date' },
        ended_at: { bsonType: 'date' }
      }
    }
  }
});

// Create indexes
db.chat_messages.createIndex({ user_id: 1, created_at: -1 });
db.chat_messages.createIndex({ session_id: 1 });

db.ml_results.createIndex({ pipeline_name: 1, created_at: -1 });
db.ml_results.createIndex({ status: 1 });

db.audit_logs.createIndex({ user_id: 1, timestamp: -1 });
db.audit_logs.createIndex({ action: 1 });
db.audit_logs.createIndex({ resource_type: 1, resource_id: 1 });
db.audit_logs.createIndex({ timestamp: -1 }, { expireAfterSeconds: 31536000 }); // TTL: 1 year

db.embeddings.createIndex({ document_id: 1 });
db.embeddings.createIndex({ document_type: 1 });

db.snomed_cache.createIndex({ concept_id: 1 }, { unique: true });
db.snomed_cache.createIndex({ term: 'text' });

db.telehealth_sessions.createIndex({ room_id: 1 }, { unique: true });
db.telehealth_sessions.createIndex({ appointment_id: 1 });

print('MongoDB initialization completed successfully');
