// Domain types mirrored from the Go API (api/models.go). All dates are ISO-8601 strings.

export type Address = {
  street: string
  city: string
  state: string
  zip: string
  country: string
}

export type Coordinates = {
  lat: number
  lng: number
}

export type Room = {
  id: string
  name: string
  size: string
  description: string
  /** Where the unit sits: "Ground floor", "Level 3", "Tower A". */
  level: string
  /** Unit state shown as a badge on the public schedule: Available | Reserved | Sold | ''. */
  status: string
  /** Price for this specific room/unit in whole currency units; 0 means unpriced. */
  price: number
  mediaIds: string[]
}

// The shape the admin CMS edits: a unit row without server-assigned identity.
export type RoomInput = Omit<Room, 'id' | 'mediaIds'>

export type Media = {
  id: string
  url: string
  alt: string
  kind: string
  width: number
  height: number
  sortOrder: number
  createdAt: string
}

export type PropertyStatus = 'draft' | 'active' | 'archived' | string

export type Property = {
  id: string
  title: string
  slug: string
  description: string
  price: number
  status: PropertyStatus
  bedrooms: number
  bathrooms: number
  squareFeet: number
  lotSquareFeet: number
  yearBuilt: number
  propertyType: string
  listingType?: string
  availability?: string
  availableFrom?: string
  paymentPlan?: string
  furnishing?: string
  tenure?: string
  isSold?: boolean
  isFeatured?: boolean
  /** 'single' = one price for the property; 'schedule' = each unit row is priced. */
  pricingMode?: string
  address: Address
  coordinates: Coordinates
  rooms: Room[]
  features: string[]
  media: Media[]
  createdAt: string
  updatedAt: string
}

export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'closed' | string

export type Lead = {
  id: string
  name: string
  email: string
  phone: string
  message: string
  propertyId: string
  status: LeadStatus
  createdAt: string
}

export type LeadInput = {
  name: string
  email: string
  phone: string
  message: string
  propertyId: string
}

// Query parameters supported by GET /api/v1/properties (server-side filtering).
export type PropertyQuery = {
  q?: string
  status?: string
  minPrice?: number
  maxPrice?: number
  beds?: number
  baths?: number
  listingType?: string
  type?: string
  sort?: 'updated' | 'price_asc' | 'price_desc' | 'newest'
}

export type AnalyticsBreakdown = { key: string; label: string; views: number; uniques: number }
export type AnalyticsTrendPoint = { day: string; views: number; uniques: number }
export type AnalyticsPropertyStat = { propertyId: string; title: string; slug: string; views: number; uniques: number }
export type AnalyticsSearchStat = { query: string; searches: number; uniques: number }

// Aggregated listing-view analytics served by GET /api/v1/admin/analytics.
export type AnalyticsReport = {
  range: { days: number; allTime: boolean; propertyId: string }
  totals: { views: number; uniqueVisitors: number }
  botsFiltered: number
  trend: AnalyticsTrendPoint[]
  properties: AnalyticsPropertyStat[]
  engagement: AnalyticsBreakdown[]
  countries: AnalyticsBreakdown[]
  sources: AnalyticsBreakdown[]
  devices: AnalyticsBreakdown[]
  searches: { total: number; uniqueSearchers: number; unmetDemand: number }
  topSearches: AnalyticsSearchStat[]
  generatedAt: string
}

// Payload used by the admin CMS when creating or updating a listing.
export type PropertyInput = Pick<
  Property,
  | 'title'
  | 'slug'
  | 'description'
  | 'price'
  | 'status'
  | 'bedrooms'
  | 'bathrooms'
  | 'squareFeet'
  | 'lotSquareFeet'
  | 'yearBuilt'
  | 'propertyType'
  | 'address'
  | 'coordinates'
  | 'features'
> & {
  id?: string
  listingType?: string
  availability?: string
  availableFrom?: string
  paymentPlan?: string
  furnishing?: string
  tenure?: string
  isSold?: boolean
  isFeatured?: boolean
  pricingMode?: string
  rooms?: RoomInput[]
}
