export type PastelTheme = 'peach' | 'sage' | 'lavender' | 'blush' | 'amber' | 'slate';

export type VendorKind = 'manufacturer' | 'supplier';

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  email: string;
  initials: string;
  avatarColor: string;
  status: 'online' | 'busy' | 'away';
  weeklyCapacityHours: number;
}

export interface StageConfig {
  id: string;
  kind: VendorKind;
  label: string;
  theme: PastelTheme;
  isDefault?: boolean;
}

export type ConversationChannel = 'WhatsApp' | 'Email' | 'WeChat' | 'Call' | 'Factory Visit';

export interface ConversationEntry {
  id: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  channel: ConversationChannel;
  summary: string;
  authorId: string;
}

export interface Vendor {
  id: string;
  kind: VendorKind;
  companyName: string;
  contactName: string;
  role: string;
  email: string;
  phone: string;
  messagingHandle: string;
  location: string;
  country: string;
  website?: string;
  category: string;
  specialtyTags: string[];
  stageId: string;
  moq: number;
  moqUnit: string;
  pricingSummary: string;
  sampleCost: string;
  leadTimeDays: number;
  lastContactDate: string; // YYYY-MM-DD
  lastConversation: string;
  conversationLog: ConversationEntry[];
  nextReachOutDate: string; // YYYY-MM-DD
  rating: number;
  notes: string;
}

export type ReminderTargetType = 'manufacturer' | 'supplier' | 'sku' | 'task' | 'general';

export interface Reminder {
  id: string;
  title: string;
  askStatusPrompt: string;
  dueDate: string; // YYYY-MM-DD
  dueTime: string; // HH:mm
  targetType: ReminderTargetType;
  targetId?: string;
  assigneeId: string;
  status: 'pending' | 'done';
  priority: 'high' | 'medium' | 'low';
}

export interface Collection {
  id: string;
  name: string;
  code: string;
  season: string;
  description: string;
  theme: PastelTheme;
  startDate: string;
  launchDate: string;
  milestoneLabel: string;
  status: 'Planning' | 'Sampling' | 'Production' | 'Launched';
  priority: 'High Priority' | 'Mid Priority' | 'Standard';
  leadMemberIds: string[];
}

export interface SkuNote {
  id: string;
  date: string;
  authorId: string;
  tag: 'Fit' | 'Fabric' | 'Costing' | 'Sample' | 'General';
  text: string;
}

export type SkuStatus =
  | 'Concept'
  | 'Tech Pack'
  | 'Sampling'
  | 'Pre-Production'
  | 'Approved'
  | 'In Production';

export interface ProductSku {
  id: string;
  skuCode: string;
  name: string;
  collectionId: string;
  category: string;
  colorway: string;
  sizes: string[];
  status: SkuStatus;
  targetRetailPrice: number;
  targetCogs: number;
  fabricSpec: string;
  manufacturerId?: string;
  supplierIds: string[];
  images: string[];
  notes: SkuNote[];
  measurementsSummary: string;
  createdAt: string;
}

export interface InventoryItem {
  id: string;
  skuId: string;
  collectionId: string;
  manufacturerId?: string;
  stockBySize: Record<string, number>;
  reorderPoint: number;
  targetStock: number;
  incomingQty: number;
  ordersLast7Days: number;
  ordersLast30Days: number;
  totalUnitsSold: number;
  lastOrderDate: string;
  unitCost: number;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  skuId: string;
  manufacturerId: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  status: 'Draft' | 'Sent' | 'In Production' | 'Shipped' | 'Received';
  orderDate: string;
  expectedDate: string;
  notes: string;
}

export interface OrderRecord {
  id: string;
  orderNumber: string;
  skuId: string;
  size: string;
  quantity: number;
  channel: 'Pre-Order' | 'Pop-Up' | 'Direct / IG' | 'Shopify (Soon)';
  date: string;
  revenue: number;
}

export interface TaskChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface BrandTask {
  id: string;
  title: string;
  description: string;
  status: 'Not Started' | 'In Progress' | 'Blocked' | 'Done';
  priority: 'High' | 'Medium' | 'Low';
  dueDate: string;
  assigneeId: string;
  collectionId?: string;
  linkedType?: 'manufacturer' | 'supplier' | 'sku';
  linkedId?: string;
  checklist: TaskChecklistItem[];
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  time?: string;
  category: 'Launch' | 'Photoshoot' | 'Factory Call' | 'Sample Due' | 'Pop-Up' | 'Milestone';
  notes?: string;
  memberIds: string[];
}

export interface BrandProfile {
  brandName: string;
  tagline: string;
  currency: string;
  activeMemberId: string;
  shopifyConnected: boolean;
  shopifyStoreDomain: string;
}

export interface AkoyaStore {
  _updatedAt?: number;
  profile: BrandProfile;
  team: TeamMember[];
  stages: StageConfig[];
  vendors: Vendor[];
  reminders: Reminder[];
  collections: Collection[];
  skus: ProductSku[];
  inventory: InventoryItem[];
  purchaseOrders: PurchaseOrder[];
  orders: OrderRecord[];
  tasks: BrandTask[];
  calendarEvents: CalendarEvent[];
}
