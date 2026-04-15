# Pickleball Court Booking Backend!

A robust Node.js/Express backend for a pickleball court booking platform, featuring role-based access control, venue/court management, and a comprehensive booking/cart system.

## 🚀 Tech Stack

- **Framework:** Express.js (on Node.js)
- **Language:** TypeScript
- **ORM:** Prisma
- **Database:** PostgreSQL
- **Authentication:** JWT (JSON Web Tokens) & BcryptJS
- **File Uploads:** Multer & Cloudinary
- **Validation:** Zod
- **Environment Management:** Dotenv

## 🛠️ Setup & Installation

### Prerequisites

- Node.js (v18+ recommended)
- npm
- PostgreSQL database

### 1. Clone the repository
```bash
git clone <repository-url>
cd pickleball-backend
```

### 2. Install dependencies
```bash
npm install
```

### 3. Environment Variables
Create a `.env` file in the root directory and add the following:
```env
DATABASE_URL="your_postgresql_connection_string"
JWT_SECRET="your_jwt_secret"
PORT=8000
CLOUDINARY_CLOUD_NAME="your_cloudinary_name"
CLOUDINARY_API_KEY="your_api_key"
CLOUDINARY_API_SECRET="your_api_secret"
```

### 4. Database Setup (Mandatory)
```bash
# Generate Prisma client
npx prisma generate

# Push changes to DB
npx prisma db push
```

### 5. Start the server
```bash
# Development mode
npm run dev

# Production build
npm run build
npm start
```

## ✨ Features

- **Authentication:** Secure Register/Login/Logout with role-based access (OWNER, BOOKER, ADMIN).
- **Venue Management:** Court owners can create, update, and delete venues.
- **Court Management:** Owners can add or remove courts within their venues.
- **Pricing:** Dynamic pricing setup for weekdays and weekends.
- **Slot Management:** Automatic slot availability tracking.
- **Booking System:** Bookers can search venues, view available slots, book, reschedule, or cancel.
- **Cart System:** Users can add multiple slots to a cart and checkout in one transaction.
- **Image Uploads:** Managed via Cloudinary for venue photos and thumbnails.

## 🛣️ API Routes

### Authentication (`/api/auth`)
- `POST /register`: Register a new user.
- `POST /login`: Login and receive JWT in a cookie.
- `POST /logout`: Logout and clear cookie.

### Court Owner (`/api/owner`) - Auth Required & Role: OWNER
- `GET /dashboard`: Get owner's performance summary.
- `GET /venues`: List all venues owned by the user.
- `GET /venue/:venue_id`: Get detailed information for a specific venue.
- `POST /create-venue`: Create a new venue.
- `PUT /venue/:venue_id`: Update venue details.
- `DELETE /venue/:venue_id`: Delete a venue.
- `POST /venue/:venue_id/pricing`: Set pricing for weekdays/weekends.
- `POST /create-court`: Add a court to a venue.
- `DELETE /remove-court`: Remove a court from a venue.
- `GET /bookings`: View bookings for the owner's courts.

### Booker (`/api/booker`) - Auth Required & Role: BOOKER
- `GET /venues`: List all available venues for booking.
- `GET /venues/:venue_id`: Get venue details.
- `GET /venues/:venue_id/slots`: Check available time slots for a specific date.

### Cart (`/api/booker/cart`) - Auth Required & Role: BOOKER
- `GET /`: View current cart items.
- `POST /`: Add a slot to the cart.
- `DELETE /:cart_item_id`: Remove an item from the cart.
- `DELETE /clear-all`: Empty the cart.
- `POST /checkout`: Confirm booking for all items in the cart.

### Bookings (`/api/booker/bookings`) - Auth Required
- `GET /`: View current user's bookings.
- `POST /:booking_id/reschedule`: Reschedule a booking to a new time/date.
- `POST /:booking_id/cancel`: Cancel an existing booking.

### Uploads (`/api/owner/upload`) - Auth Required
- `GET /venue-images/:venue_id`: List all images for a venue.
- `POST /venue-images`: Upload new images (max 5).
- `DELETE /venue-images/:image_id`: Remove an image.
- `PUT /venues/images/:image_id`: Replace an image.
- `PUT /venues/images/:image_id/thumbnail`: Set an image as the venue's thumbnail.

## 📁 Project Structure

- `src/app.ts`: Main Express application configuration.
- `src/index.ts`: Entry point for the server.
- `src/controller/`: Business logic for each feature.
- `src/routes/`: Route definitions and middleware mapping.
- `src/middleware/`: Custom Express middleware (auth, validation, etc.).
- `src/validator/`: Zod schemas for request validation.
- `prisma/`: Database schema and migrations.

---
Developed for the Pickleball Booking Platform.
