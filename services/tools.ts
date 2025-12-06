import { FunctionDeclaration, Type } from '@google/genai';

// Define the schema for Confluence tools

export const tools: FunctionDeclaration[] = [
  {
    name: 'create_space',
    description: 'Create a new space in Confluence.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING, description: 'The name of the space.' },
        key: { type: Type.STRING, description: 'The key for the space (e.g., TEAM).' },
      },
      required: ['name', 'key'],
    },
  },
  {
    name: 'get_space',
    description: 'Retrieve information about a Confluence space.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        key: { type: Type.STRING, description: 'The key of the space to retrieve.' },
      },
      required: ['key'],
    },
  },
  {
    name: 'create_page',
    description: 'Create a new page in a Confluence space.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: 'The title of the page.' },
        spaceKey: { type: Type.STRING, description: 'The key of the space where the page will be created.' },
        content: { type: Type.STRING, description: 'The content of the page (storage format or plain text).' },
      },
      required: ['title', 'spaceKey', 'content'],
    },
  },
  {
    name: 'read_page',
    description: 'Read the content of a Confluence page by ID or Title.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        pageId: { type: Type.STRING, description: 'The ID of the page (preferred).' },
        title: { type: Type.STRING, description: 'The title of the page (if ID is unknown).' },
        spaceKey: { type: Type.STRING, description: 'The space key (required if searching by title).' },
      },
    },
  },
  {
    name: 'update_page',
    description: 'Update an existing Confluence page.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        pageId: { type: Type.STRING, description: 'The ID of the page to update.' },
        title: { type: Type.STRING, description: 'The new title of the page.' },
        content: { type: Type.STRING, description: 'The new content of the page.' },
      },
      required: ['pageId', 'content'],
    },
  },
  {
    name: 'delete_page',
    description: 'Delete a page from Confluence.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        pageId: { type: Type.STRING, description: 'The ID of the page to delete.' },
      },
      required: ['pageId'],
    },
  },
  {
    name: 'search_confluence',
    description: 'Search for content in Confluence.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: { type: Type.STRING, description: 'The search query string.' },
      },
      required: ['query'],
    },
  },
];
