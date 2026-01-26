import { Pool } from 'pg';
import Redis from 'ioredis';
export declare const pgPool: Pool;
export declare const redis: Redis;
export declare function checkPostgresHealth(): Promise<boolean>;
export declare function checkRedisHealth(): Promise<boolean>;
//# sourceMappingURL=database.d.ts.map