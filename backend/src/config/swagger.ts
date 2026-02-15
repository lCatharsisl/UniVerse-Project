import swaggerJsdoc from 'swagger-jsdoc';
import { SwaggerDefinition } from 'swagger-jsdoc';

const swaggerDefinition: SwaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'UniVerse API',
    version: '1.0.0',
    description: 'REST API documentation for UniVerse application',
    contact: {
      name: 'UniVerse API Support',
    },
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Development server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter session token obtained from /auth/login',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'string',
            description: 'Error message',
          },
          details: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                path: { type: 'string' },
                message: { type: 'string' },
              },
            },
          },
        },
      },
      RegisterRequest: {
        type: 'object',
        required: ['email', 'password', 'role'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8 },
          role: { type: 'string', enum: ['student', 'staff', 'admin'] },
          studentNumber: { type: 'string' },
          studentName: { type: 'string' },
          studentSurname: { type: 'string' },
          departmentId: { type: 'integer' },
          staffName: { type: 'string' },
          staffSurname: { type: 'string' },
          adminName: { type: 'string' },
          adminSurname: { type: 'string' },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string' },
        },
      },
      LoginResponse: {
        type: 'object',
        properties: {
          message: { type: 'string' },
          sessionToken: { type: 'string' },
          expiresAt: { type: 'string', format: 'date-time' },
        },
      },
      UserProfile: {
        type: 'object',
        properties: {
          userId: { type: 'integer' },
          email: { type: 'string' },
          role: { type: 'string' },
          isEmailVerified: { type: 'boolean' },
          profileImageUrl: { type: 'string' },
          profile: { type: 'object' },
        },
      },
      FreeRoomsResponse: {
        type: 'object',
        properties: {
          count: { type: 'integer' },
          rooms: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                room_id: { type: 'integer' },
                room_code: { type: 'string' },
                building_name: { type: 'string' },
                floor_number: { type: 'integer' },
              },
            },
          },
        },
      },
      RoomCourseAtTimeResponse: {
        type: 'object',
        properties: {
          roomCode: { type: 'string' },
          isOccupied: { type: 'boolean' },
          course: {
            type: 'object',
            nullable: true,
            properties: {
              code: { type: 'string' },
              name: { type: 'string' },
              dayOfWeek: { type: 'integer' },
              startTime: { type: 'string' },
              endTime: { type: 'string' },
            },
          },
        },
      },
      RoomScheduleResponse: {
        type: 'object',
        properties: {
          roomId: { type: 'integer' },
          day: { type: 'integer', nullable: true },
          schedule: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                day_of_week: { type: 'integer' },
                start_time: { type: 'string' },
                end_time: { type: 'string' },
                course_code: { type: 'string' },
                course_name: { type: 'string' },
              },
            },
          },
        },
      },
      CreateLostItemRequest: {
        type: 'object',
        required: ['lostItemName', 'location'],
        properties: {
          lostItemName: { type: 'string' },
          location: { type: 'string' },
          description: { type: 'string' },
          lostDate: { type: 'string', format: 'date-time' },
        },
      },
      CreateFoundItemRequest: {
        type: 'object',
        required: ['foundItemName', 'location'],
        properties: {
          foundItemName: { type: 'string' },
          location: { type: 'string' },
          description: { type: 'string' },
          foundDate: { type: 'string', format: 'date-time' },
        },
      },
      LostItemsResponse: {
        type: 'object',
        properties: {
          total: { type: 'integer' },
          limit: { type: 'integer' },
          offset: { type: 'integer' },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                lost_item_id: { type: 'integer' },
                lost_item_name: { type: 'string' },
                lost_by_user_id: { type: 'integer', nullable: true },
                location: { type: 'string', nullable: true },
                description: { type: 'string', nullable: true },
                lost_date: { type: 'string', format: 'date-time', nullable: true },
                is_resolved: { type: 'boolean' },
                resolved_at: { type: 'string', format: 'date-time', nullable: true },
                resolved_by_user_id: { type: 'integer', nullable: true },
              },
            },
          },
        },
      },
      FoundItemsResponse: {
        type: 'object',
        properties: {
          total: { type: 'integer' },
          limit: { type: 'integer' },
          offset: { type: 'integer' },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                found_item_id: { type: 'integer' },
                found_item_name: { type: 'string' },
                found_by_user_id: { type: 'integer', nullable: true },
                location: { type: 'string', nullable: true },
                description: { type: 'string', nullable: true },
                found_date: { type: 'string', format: 'date-time', nullable: true },
                is_resolved: { type: 'boolean' },
                resolved_at: { type: 'string', format: 'date-time', nullable: true },
                resolved_by_user_id: { type: 'integer', nullable: true },
              },
            },
          },
        },
      },
    },
  },
  tags: [
    {
      name: 'Authentication',
      description: 'User authentication and authorization endpoints',
    },
    {
      name: 'Rooms',
      description: 'Room availability and schedule endpoints',
    },
    {
      name: 'Lost Items',
      description: 'Lost items management endpoints',
    },
    {
      name: 'Found Items',
      description: 'Found items management endpoints',
    },
  ],
};

const options = {
  definition: swaggerDefinition,
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);


