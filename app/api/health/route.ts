// app/api/health/route.ts
import { NextRequest, NextResponse } from 'next/server';

type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

interface HealthCheckDetails {
  message?: string;
  error?: string;
  heapUsed?: string;
  heapTotal?: string;
  memoryPercent?: string;
  seconds?: number;
  [key: string]: any; // Allow additional properties
}

interface HealthCheckItem {
  status: HealthStatus;
  latency?: number;
  details?: HealthCheckDetails;
}

interface HealthCheckResponse {
  status: HealthStatus;
  timestamp: string;
  uptime: number;
  checks: Record<string, HealthCheckItem>;
  meta?: {
    service: string;
    version: string;
    environment: string;
    responseTime: string;
  };
}

class HealthService {
  async checkDatabase(): Promise<HealthCheckItem> {
    const start = Date.now();
    try {
      // Add your actual database check here
      await new Promise(resolve => setTimeout(resolve, 50));
      
      return {
        status: 'healthy',
        latency: Date.now() - start,
        details: { message: 'Database connected successfully' }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        latency: Date.now() - start,
        details: { error: 'Database connection failed' }
      };
    }
  }

  checkMemory(): HealthCheckItem {
    try {
      const memoryUsage = process.memoryUsage();
      const memoryPercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
      
      return {
        status: memoryPercent > 90 ? 'degraded' : 'healthy',
        details: {
          heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
          heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
          memoryPercent: `${Math.round(memoryPercent)}%`
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: { error: 'Memory check failed' }
      };
    }
  }

  async checkExternalAPI(): Promise<HealthCheckItem> {
    const start = Date.now();
    try {
      await new Promise(resolve => setTimeout(resolve, 100));
      
      return {
        status: 'healthy',
        latency: Date.now() - start,
        details: { message: 'External APIs are reachable' }
      };
    } catch (error) {
      return {
        status: 'degraded',
        latency: Date.now() - start,
        details: { error: 'External API check failed' }
      };
    }
  }

  async performHealthCheck(): Promise<HealthCheckResponse> {
    const startTime = Date.now();
    
    const [databaseCheck, externalApiCheck] = await Promise.allSettled([
      this.checkDatabase(),
      this.checkExternalAPI()
    ]);
    
    const memoryCheck = this.checkMemory();
    
    const checks: Record<string, HealthCheckItem> = {
      database: databaseCheck.status === 'fulfilled' ? databaseCheck.value : {
        status: 'unhealthy',
        details: { error: 'Database check failed' }
      },
      externalApi: externalApiCheck.status === 'fulfilled' ? externalApiCheck.value : {
        status: 'degraded',
        details: { error: 'External API check failed' }
      },
      memory: memoryCheck,
      uptime: {
        status: 'healthy',
        details: { seconds: process.uptime() }
      }
    };
    
    // Determine overall status
    const checkResults = Object.values(checks);
    let overallStatus: HealthStatus = 'healthy';
    
    if (checkResults.some(check => check.status === 'unhealthy')) {
      overallStatus = 'unhealthy';
    } else if (checkResults.some(check => check.status === 'degraded')) {
      overallStatus = 'degraded';
    }
    
    const totalLatency = Date.now() - startTime;
    
    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks,
      meta: {
        service: process.env.npm_package_name || 'nextjs-app',
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        responseTime: `${totalLatency}ms`
      }
    };
  }
}

const healthService = new HealthService();

export async function GET(request: NextRequest) {
  try {
    // Check for authentication
    const authHeader = request.headers.get('authorization');
    const isInternal = authHeader === `Bearer ${process.env.HEALTH_CHECK_SECRET}`;
    
    // Check for detailed parameter
    const url = new URL(request.url);
    const detailed = url.searchParams.get('detailed') === 'true' || isInternal;
    
    const healthData = await healthService.performHealthCheck();

    // Create a sanitized version for public requests
    let responseData: HealthCheckResponse;
    
    if (!detailed) {
      // Create a new object without details
      const checksWithoutDetails: Record<string, HealthCheckItem> = {};
      
      Object.keys(healthData.checks).forEach(key => {
        checksWithoutDetails[key] = {
          status: healthData.checks[key].status,
          latency: healthData.checks[key].latency
          // Don't include details
        };
      });
      
      responseData = {
        status: healthData.status,
        timestamp: healthData.timestamp,
        uptime: healthData.uptime,
        checks: checksWithoutDetails
        // Don't include meta
      };
    } else {
      responseData = healthData;
    }

    // Set appropriate status code
    const statusCode = healthData.status === 'healthy' ? 200 :
                      healthData.status === 'degraded' ? 206 : 503;

    return NextResponse.json(responseData, {
      status: statusCode,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'X-Health-Status': healthData.status
      }
    });
  } catch (error) {
    console.error('Health check error:', error);
    
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { 
        status: 500,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate'
        }
      }
    );
  }
}

// Optional: Simple HEAD method for load balancers
export async function HEAD() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Content-Type': 'application/json'
    }
  });
}

// Optional: CORS support
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Allow': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}