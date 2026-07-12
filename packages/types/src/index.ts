// ─── Enums ────────────────────────────────────────────────────────────────────

export enum UserRole {
  USER = "USER",
  CREATOR = "CREATOR",
  BUSINESS = "BUSINESS",
  MODERATOR = "MODERATOR",
  ADMIN = "ADMIN",
}

export enum LayerType {
  TEXT = "TEXT",
  PHOTO = "PHOTO",
  VIDEO = "VIDEO",
  AUDIO = "AUDIO",
  AR_OBJECT = "AR_OBJECT",
  MEMORY = "MEMORY",
  HISTORICAL = "HISTORICAL",
  REVIEW = "REVIEW",
  EVENT = "EVENT",
}

export enum MediaType {
  IMAGE = "IMAGE",
  VIDEO = "VIDEO",
  AUDIO = "AUDIO",
  MODEL_3D = "MODEL_3D",
}

export enum LocationCategory {
  LANDMARK = "LANDMARK",
  RESTAURANT = "RESTAURANT",
  CAFE = "CAFE",
  MUSEUM = "MUSEUM",
  PARK = "PARK",
  STREET = "STREET",
  BUILDING = "BUILDING",
  MARKET = "MARKET",
  TRANSPORT = "TRANSPORT",
  NATURE = "NATURE",
  SPORTS = "SPORTS",
  CEMETERY = "CEMETERY",
  EDUCATION = "EDUCATION",
  HOSPITAL = "HOSPITAL",
  RELIGIOUS = "RELIGIOUS",
  GOVERNMENT = "GOVERNMENT",
  ENTERTAINMENT = "ENTERTAINMENT",
  OTHER = "OTHER",
}

export enum ReactionType {
  HEART = "HEART",
  MOVED = "MOVED",
  INTERESTING = "INTERESTING",
  FUNNY = "FUNNY",
  IMPORTANT = "IMPORTANT",
}

// ─── Coordinate types ─────────────────────────────────────────────────────────

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface BoundingBox {
  northEast: Coordinates;
  southWest: Coordinates;
}

// ─── User types ───────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  isPremium: boolean;
  isVerified: boolean;
  role: UserRole;
  layerCount: number;
  followerCount: number;
  followingCount: number;
  createdAt: Date;
}

export interface PublicUser
  extends Pick<User, "id" | "username" | "displayName" | "avatarUrl" | "isVerified" | "isPremium"> {}

// ─── Location types ───────────────────────────────────────────────────────────

export interface Location {
  id: string;
  name: string;
  description: string | null;
  lat: number;
  lng: number;
  address: string | null;
  city: string | null;
  country: string | null;
  placeId: string | null;
  category: LocationCategory;
  layerCount: number;
  aiSummary: AiSummary | null;
  createdAt: Date;
}

export interface NearbyLocation extends Location {
  distance: number; // metres
}

// ─── Layer types ──────────────────────────────────────────────────────────────

export interface Layer {
  id: string;
  user: PublicUser;
  location: Pick<Location, "id" | "name" | "lat" | "lng">;
  title: string | null;
  content: string;
  type: LayerType;
  media: Media[];
  year: number | null;
  isPublic: boolean;
  isPinned: boolean;
  viewCount: number;
  reactionCount: number;
  tags: string[];
  userReaction: ReactionType | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateLayerInput {
  locationId: string;
  title?: string;
  content: string;
  type: LayerType;
  year?: number;
  isPublic?: boolean;
  tags?: string[];
}

export interface NearbyLayer extends Layer {
  distance: number; // metres
}

// ─── Media types ──────────────────────────────────────────────────────────────

export interface Media {
  id: string;
  layerId: string;
  type: MediaType;
  url: string;
  thumbnailUrl: string | null;
  duration: number | null;
  size: number | null;
  mimeType: string;
  createdAt: Date;
}

// ─── AI types ─────────────────────────────────────────────────────────────────

export interface AiSummary {
  id: string;
  locationId: string;
  summary: string;
  highlights: string[];
  sentiment: string | null;
  languages: string[];
  lastGenerated: Date;
}

export interface AiPersonalizedFeed {
  locationId: string;
  reason: string;
  layers: Layer[];
}

export interface AiProductAnalysis {
  productName: string;
  ingredients: string[];
  nutritionScore: number;
  warnings: string[];
  alternatives: string[];
  summary: string;
}

// ─── Auth types ───────────────────────────────────────────────────────────────

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  email: string;
  username: string;
  displayName: string;
  password: string;
}

// ─── API response types ───────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// ─── Query params ─────────────────────────────────────────────────────────────

export interface NearbyQuery {
  lat: number;
  lng: number;
  radius?: number; // metres, default 500
  type?: LayerType;
  year?: number;
  limit?: number;
  offset?: number;
}

export interface SearchQuery {
  q: string;
  lat?: number;
  lng?: number;
  radius?: number;
  category?: LocationCategory;
  limit?: number;
  offset?: number;
}

// ─── Time travel types ────────────────────────────────────────────────────────

export interface TimeSliderQuery {
  locationId: string;
  year: number;
}

export interface HistoricalSnapshot {
  year: number;
  layers: Layer[];
  aiNarration: string | null;
  imageCount: number;
  videoCount: number;
}

// ─── AR types ─────────────────────────────────────────────────────────────────

export interface ARLayerMarker {
  layer: Layer;
  distance: number;
  bearing: number; // degrees from North
  elevation: number; // metres above ground
}

export interface ARScene {
  userLocation: Coordinates;
  markers: ARLayerMarker[];
  radius: number;
}

// ─── Notification types ───────────────────────────────────────────────────────

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, string>;
  isRead: boolean;
  createdAt: Date;
}

export enum NotificationType {
  NEW_LAYER_NEARBY = "NEW_LAYER_NEARBY",
  REACTION_ON_LAYER = "REACTION_ON_LAYER",
  NEW_FOLLOWER = "NEW_FOLLOWER",
  MENTIONED = "MENTIONED",
  AI_INSIGHT = "AI_INSIGHT",
}
