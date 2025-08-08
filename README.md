# Realtime Code Collaboration Platform

This is a realtime code collaboration platform with integrated whiteboard and AI assistant features.

## Features

- Realtime code editing with multiple users
- Integrated whiteboard for visual collaboration
- AI-powered code assistant
- User activity tracking with MongoDB

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)

## Setup Instructions

### 1. Install Dependencies

```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd frontend && npm install
```

### 2. Set up MongoDB

You have two options for setting up MongoDB:

#### Option A: Local MongoDB Installation

1. Download and install MongoDB Community Server from [mongodb.com](https://www.mongodb.com/try/download/community)

2. Start MongoDB service:
   - Windows: `net start MongoDB`
   - macOS: `brew services start mongodb-community`
   - Linux: `sudo systemctl start mongod`

3. The application will automatically connect to your local MongoDB instance at `mongodb://localhost:27017/realtimecode`

#### Option B: MongoDB Atlas (Cloud)

1. Create a free account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)

2. Create a new cluster and database

3. Get your connection string from the Atlas dashboard

4. Update the `.env` file in the project root with your connection string:
   ```
   MONGO_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/realtimecode?retryWrites=true&w=majority
   ```

### 3. Configure Environment Variables

Create a `.env` file in the project root directory with the following content:

```env
MONGO_URI=mongodb://localhost:27017/realtimecode
```

If using MongoDB Atlas, replace the connection string with your Atlas connection string.

### 4. Start the Application

```bash
# Start the backend server
npm run dev

# In a new terminal, start the frontend
cd frontend && npm run dev
```

## Usage

1. Open your browser and navigate to `http://localhost:5173`
2. Create or join a code room
3. Start collaborating in real-time with other users
4. Use the integrated whiteboard for visual collaboration
5. Get AI-powered code assistance with the Code Buddy feature

## Activity Tracking

All user activities are tracked and stored in MongoDB:

- User join/leave events
- Code changes and language changes
- Code execution results
- Whiteboard drawing activities
- AI assistant interactions (excluded as per requirements)

## Troubleshooting

### MongoDB Connection Issues

1. Ensure MongoDB is running on your system
2. Check that the connection string in `.env` is correct
3. Verify network connectivity if using MongoDB Atlas
4. Check MongoDB logs for any error messages

### Common Issues

- If you see "Error: connect ECONNREFUSED", MongoDB is not running
- If you see "Authentication failed", check your MongoDB credentials
- If you see "Database not found", ensure the database name is correct

For additional support, please check the MongoDB documentation or contact the project maintainers.
