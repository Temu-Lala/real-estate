package main

import (
	"encoding/json"
	"time"
)

// Property is the full listing document returned by the API. Price is stored
// in whole currency units; address, coordinates, and features live in JSONB
// columns and are unmarshalled here.
type Property struct {
	ID            string      `json:"id"`
	Title         string      `json:"title"`
	Slug          string      `json:"slug"`
	Description   string      `json:"description"`
	Price         int64       `json:"price"`
	Status        string      `json:"status"`
	Bedrooms      int         `json:"bedrooms"`
	Bathrooms     float32     `json:"bathrooms"`
	SquareFeet    int         `json:"squareFeet"`
	LotSquareFeet int         `json:"lotSquareFeet"`
	YearBuilt     int         `json:"yearBuilt"`
	PropertyType  string      `json:"propertyType"`
	ListingType   string      `json:"listingType"`
	Availability  string      `json:"availability"`
	AvailableFrom string      `json:"availableFrom"`
	PaymentPlan   string      `json:"paymentPlan"`
	Furnishing    string      `json:"furnishing"`
	Tenure        string      `json:"tenure"`
	IsSold        bool        `json:"isSold"`
	IsFeatured    bool        `json:"isFeatured"`
	// PricingMode is 'single' or 'schedule'; in schedule mode Price is derived from
	// the cheapest available unit row, and it decides how the site quotes the listing.
	PricingMode string      `json:"pricingMode"`
	Address     Address     `json:"address"`
	Coordinates Coordinates `json:"coordinates"`
	Rooms       []Room      `json:"rooms"`
	Features    []string    `json:"features"`
	Media       []Media     `json:"media"`
	CreatedAt   time.Time   `json:"createdAt"`
	UpdatedAt   time.Time   `json:"updatedAt"`
}

type Address struct {
	Street  string `json:"street"`
	City    string `json:"city"`
	State   string `json:"state"`
	Zip     string `json:"zip"`
	Country string `json:"country"`
}

type Coordinates struct {
	Lat float64 `json:"lat"`
	Lng float64 `json:"lng"`
}

type Room struct {
	ID          string   `json:"id"`
	Name        string   `json:"name"`
	Size        string   `json:"size"`
	Description string   `json:"description"`
	// Level is a free-text location within the property ("Ground floor",
	// "Level 3", "Tower A"). Status is the unit's sale state and Price is the
	// per-unit figure used by the schedule pricing mode.
	Level    string   `json:"level"`
	Status   string   `json:"status"`
	Price    int64    `json:"price"`
	MediaIDs []string `json:"mediaIds"`
}

type Media struct {
	ID        string    `json:"id"`
	URL       string    `json:"url"`
	Alt       string    `json:"alt"`
	Kind      string    `json:"kind"`
	Width     int       `json:"width"`
	Height    int       `json:"height"`
	SortOrder int       `json:"sortOrder"`
	CreatedAt time.Time `json:"createdAt"`
}

type Lead struct {
	ID         string    `json:"id"`
	Name       string    `json:"name"`
	Email      string    `json:"email"`
	Phone      string    `json:"phone"`
	Message    string    `json:"message"`
	PropertyID string    `json:"propertyId"`
	Status     string    `json:"status"`
	CreatedAt  time.Time `json:"createdAt"`
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

const propertyColumns = `id,slug,title,description,price,status,bedrooms,bathrooms,square_feet,lot_square_feet,year_built,property_type,listing_type,availability,available_from,payment_plan,furnishing,tenure,is_sold,is_featured,pricing_mode,address,coordinates,features,created_at,updated_at`

// scanner adapts to both *sql.Row and *sql.Rows result scanning.
type scanner interface {
	Scan(dest ...any) error
}

// scanProperty maps one result row (with JSONB blobs) into a Property.
func scanProperty(row scanner) (Property, error) {
	var (
		p       Property
		address []byte
		coords  []byte
		feats   []byte
	)
	err := row.Scan(
		&p.ID, &p.Slug, &p.Title, &p.Description, &p.Price, &p.Status,
		&p.Bedrooms, &p.Bathrooms, &p.SquareFeet, &p.LotSquareFeet,
		&p.YearBuilt, &p.PropertyType, &p.ListingType,
		&p.Availability, &p.AvailableFrom, &p.PaymentPlan, &p.Furnishing, &p.Tenure,
		&p.IsSold, &p.IsFeatured,
		&p.PricingMode,
		&address, &coords, &feats,
		&p.CreatedAt, &p.UpdatedAt,
	)
	if err != nil {
		return p, err
	}
	_ = json.Unmarshal(address, &p.Address)
	_ = json.Unmarshal(coords, &p.Coordinates)
	_ = json.Unmarshal(feats, &p.Features)
	return p, nil
}
