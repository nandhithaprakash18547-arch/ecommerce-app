# E-Commerce Web Application

Express + **MongoDB** (Mongoose) + JWT auth, with **Admin / User roles**.

## Features
- Product catalog with search
- Add to cart (saved in the browser), checkout with delivery address
- Register / login, role-based access (Admin / User)
- Admin: add, edit, delete products; view all orders; update order status
- User: view own order history
- Stock is reduced atomically at checkout (cancelling an order returns stock)

## 1. Database setup (choose one)

**Option A - MongoDB Atlas (cloud, free, no install)**
1. Create an account at mongodb.com/atlas and create a free M0 cluster.
2. Database Access -> Add user (username + password).
3. Network Access -> Add IP Address -> Allow access from anywhere (0.0.0.0/0).
4. Connect -> Drivers -> copy the connection string.
5. Put it in `.env` as `MONGO_URI`, adding the database name before `?`, e.g.
   `mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/ecommerce?retryWrites=true&w=majority`

**Option B - Local MongoDB**
Install MongoDB Community Server (and Compass). The default
`mongodb://127.0.0.1:27017/ecommerce` works without changes.

## 2. Run
```
copy .env.example .env      (Windows)   |   cp .env.example .env   (Mac/Linux)
npm install
npm run seed                # creates admin + sample products
npm start
```
Open http://localhost:3000

**Admin login:** admin@shop.com / admin123 (created by `npm run seed`)
Anyone who registers on the site is a normal User.

## API
| Method | Endpoint | Access |
|---|---|---|
| POST | /api/auth/register, /api/auth/login | public |
| GET | /api/auth/me | logged in |
| GET | /api/products?search= , /api/products/:id | public |
| POST / PUT / DELETE | /api/products, /api/products/:id | admin |
| POST | /api/orders (checkout) | logged in |
| GET | /api/orders/mine | logged in |
| GET | /api/orders | admin |
| PUT | /api/orders/:id/status | admin |

Send token as `Authorization: Bearer <token>`.

## Structure
```
server.js  models/  routes/  middleware/  scripts/seed.js  public/
```
