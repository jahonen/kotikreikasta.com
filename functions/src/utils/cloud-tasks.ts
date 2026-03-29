import { CloudTasksClient } from '@google-cloud/tasks';
import * as functions from 'firebase-functions/v1';

const tasksClient = new CloudTasksClient();

interface TaskPayload {
  contentId: string;
  platform: string;
  contentType: 'blog' | 'listing';
  contentCollection: string;
}

interface CreateTaskOptions {
  payload: TaskPayload;
  scheduleTime: Date;
  windowStart: Date;
}

export async function createPublishTask(options: CreateTaskOptions): Promise<string> {
  const { payload, scheduleTime, windowStart } = options;
  const project = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT;
  const location = 'europe-west1';
  const queue = 'social-media-publishing';
  
  // Task name for deduplication: contentId-platform-windowStart
  const taskId = `${payload.contentId}-${payload.platform}-${windowStart.getTime()}`;
  const taskName = tasksClient.taskPath(project!, location, queue, taskId);
  
  // Get the publisher function URL
  const functionUrl = `https://${location}-${project}.cloudfunctions.net/socialMediaPublisher`;
  
  const task = {
    name: taskName,
    scheduleTime: {
      seconds: Math.floor(scheduleTime.getTime() / 1000),
    },
    httpRequest: {
      httpMethod: 'POST' as const,
      url: functionUrl,
      headers: {
        'Content-Type': 'application/json',
      },
      body: Buffer.from(JSON.stringify(payload)).toString('base64'),
      oidcToken: {
        serviceAccountEmail: `${project}@appspot.gserviceaccount.com`,
      },
    },
  };
  
  try {
    const parent = tasksClient.queuePath(project!, location, queue);
    const [response] = await tasksClient.createTask({ parent, task });
    
    functions.logger.info('Cloud Task created', {
      taskName: response.name,
      scheduleTime: scheduleTime.toISOString(),
      platform: payload.platform,
      contentId: payload.contentId,
    });
    
    return response.name!;
  } catch (error: any) {
    // If task already exists (409), that's OK - it means deduplication worked
    if (error.code === 6 || error.message?.includes('ALREADY_EXISTS')) {
      functions.logger.info('Task already exists (deduplication)', {
        taskId,
        platform: payload.platform,
        contentId: payload.contentId,
      });
      return taskName;
    }
    
    functions.logger.error('Failed to create Cloud Task', {
      error: error?.message,
      platform: payload.platform,
      contentId: payload.contentId,
    });
    throw error;
  }
}

export async function deleteTask(taskName: string): Promise<void> {
  try {
    await tasksClient.deleteTask({ name: taskName });
    functions.logger.info('Task deleted', { taskName });
  } catch (error: any) {
    functions.logger.error('Failed to delete task', {
      taskName,
      error: error?.message,
    });
    throw error;
  }
}

export async function listTasks(queueName: string): Promise<any[]> {
  const project = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT;
  const location = 'europe-west1';
  const parent = tasksClient.queuePath(project!, location, queueName);
  
  try {
    const [tasks] = await tasksClient.listTasks({ parent });
    return tasks;
  } catch (error: any) {
    functions.logger.error('Failed to list tasks', {
      queueName,
      error: error?.message,
    });
    return [];
  }
}
