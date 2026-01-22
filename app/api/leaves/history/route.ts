import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    const { db } = await connectToDatabase();
    
    if (!db) {
      return NextResponse.json(
        { error: 'Database connection failed' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const empId = searchParams.get('empId');
    
    if (!empId) {
      return NextResponse.json(
        { error: 'Employee ID is required' },
        { status: 400 }
      );
    }

    // Fetch leaves ONLY for this employee
    const leaves = await db.collection('leaves')
      .find({ 
        employeeId: empId,
        $or: [
          { status: 'pending' },
          { status: 'manager-pending' },
          { status: 'approved' },
          { status: 'rejected' },
          { status: 'auto-approved' }
        ]
      })
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json(leaves, { status: 200 });
  } catch (error) {
    console.error('Error fetching leave history:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}