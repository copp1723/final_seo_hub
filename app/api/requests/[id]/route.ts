import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Request as PrismaRequest } from '@prisma/client';

// Assume db is an instance of your database client (e.g., Prisma, Sequelize)
// and Request is your database model/schema for requests.
// import db from '@/lib/db'; // Example import for database client
// import { Request } from '@prisma/client'; // Example import for Prisma model

interface CompletedTask {
  id: string; // Unique ID for the completed task entry
  title: string;
  url?: string;
  notes?: string;
  completedAt: string; // ISO date string
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params; // Request ID from the URL path

  if (!id) {
    return NextResponse.json({ error: 'Request ID is required' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { status, taskDetails } = body;

    // Fetch the existing request
    const existingRequest = await prisma.request.findUnique({ where: { id } });

    if (!existingRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    let updatedData: any = {};
    let responseMessage = '';

    // Handle status updates
    if (status) {
      if (!['OPEN', 'IN_PROGRESS', 'DONE', 'ARCHIVED'].includes(status)) {
        return NextResponse.json({ error: 'Invalid status value' }, { status: 400 });
      }
      updatedData.status = status;
      responseMessage = `Request status updated to ${status}.`;
    }

    // Handle task completion
    if (taskDetails && existingRequest.status === 'IN_PROGRESS') {
      const { title, url, notes } = taskDetails;
      if (!title) {
        return NextResponse.json({ error: 'Task title is required for completion' }, { status: 400 });
      }

      const newCompletedTask: CompletedTask = {
        id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // Simple unique ID
        title,
        url,
        notes,
        completedAt: new Date().toISOString(),
      };

      // Ensure completedTasks is an array
      const currentCompletedTasks = Array.isArray(existingRequest.completedTasks) ? existingRequest.completedTasks : [];
      updatedData.completedTasks = [...currentCompletedTasks, newCompletedTask];

      // Update progress counters
      // Ensure these fields exist on your model or are handled appropriately
      updatedData.completedTaskCount = (existingRequest.completedTaskCount || 0) + 1;

      // Optionally, if completing the last task changes the request status to DONE
      // if (updatedData.completedTaskCount === existingRequest.totalTasks) {
      //   updatedData.status = 'DONE';
      //   responseMessage += ' All tasks completed. Request marked as DONE.';
      // } else {
      //   responseMessage += ' Task marked as complete.';
      // }
      responseMessage = responseMessage ? `${responseMessage} Task marked as complete.` : 'Task marked as complete.';

    } else if (taskDetails && existingRequest.status !== 'IN_PROGRESS') {
      return NextResponse.json({ error: 'Tasks can only be completed if the request is IN_PROGRESS' }, { status: 400 });
    }

    if (Object.keys(updatedData).length === 0) {
      return NextResponse.json({ message: 'No update performed. Provide status or taskDetails.' }, { status: 200 });
    }

    // Add completion date tracking for the request itself when moved to DONE
    if (status === 'DONE' && existingRequest.status !== 'DONE') {
        updatedData.completionDate = new Date().toISOString(); // Main request completion date
    }


    // Update the request in the database
    const updatedRequest = await prisma.request.update({
      where: { id },
      data: updatedData,
    });

    return NextResponse.json({ message: responseMessage || 'Request updated successfully', request: updatedRequest }, { status: 200 });

  } catch (error) {
    console.error('Failed to update request:', error);
    if (error instanceof SyntaxError) { // Handle JSON parsing errors
        return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update request' }, { status: 500 });
  }
}

// Basic GET handler for testing purposes (optional)
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  if (!id) {
    return NextResponse.json({ error: 'Request ID is required' }, { status: 400 });
  }
  const req = await prisma.request.findUnique({ where: { id } });
  if (!req) {
    return NextResponse.json({ error: 'Request not found' }, { status: 404 });
  }
  return NextResponse.json(req, { status: 200 });
}
