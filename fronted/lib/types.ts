export interface User {
  _id: string;
  name?: string;
  email?: string;
  phone?: string;
  department?: string;
  region?: string;
  role?: string;
  isActive?: boolean;
  createdAt?: string;
  position?: string;
  city?: string;
  state?: string;
  country?: string;
  engagementScore?: number;
  nin?: string;
  employeeId?: string;
  location?: string;
}

export interface Client {
  _id: string;
  name?: string;
  company?: string;
  email?: string;
  phone?: string;
  status?: string;
  leadStatus?: string;
  value?: number;
  amount?: number;
  stage?: string;
  createdAt?: string;
  rating?: string;
  agent?: User | string;
  assignedTo?: User | string;
  industry?: string;
  position?: string;
  city?: string;
  state?: string;
  country?: string;
  address?: string;
  priority?: string;
  tags?: string[];
  notes?: string;
  contacts?: Array<{ name?: string; position?: string; email?: string; phone?: string; isPrimary?: boolean }>;
  interactions?: Array<{ t?: string; when?: string }>;
  tasks?: unknown[];
  pipelineValue?: number;
  assignedAgents?: (User | string)[];
}

export interface Deal {
  _id: string;
  name?: string;
  title?: string;
  value?: number;
  amount?: number;
  stage?: string;
  createdAt?: string;
  agent?: User | string;
  assignedTo?: User | string;
  client?: Client | string;
}

export interface Schedule {
  _id: string;
  client?: Client | string;
  agent?: User | string;
  date?: string;
  time?: string;
  topic?: string;
  status?: string;
}

export interface Meeting {
  _id: string;
  client?: Client | string;
  title?: string;
  scheduledTime?: string;
  location?: string;
  date?: string;
  time?: string;
}

export interface Task {
  _id: string;
  title?: string;
  description?: string;
  status?: string;
  dueDate?: string;
  priority?: string;
}

export interface Sale {
  _id: string;
  name?: string;
  amount?: number;
  createdAt?: string;
  saleDate?: string;
}