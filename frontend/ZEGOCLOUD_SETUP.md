# ZegoCloud Video Call Setup Guide

## Prerequisites

1. Sign up for a ZegoCloud account at [https://console.zegocloud.com](https://console.zegocloud.com)
2. Create a new project and get your App ID and Server Secret

## Installation

1. Install the required package:
   ```bash
   npm install @zegocloud/zego-uikit-prebuilt
   ```

2. Create a `.env` file in the frontend directory:
   ```bash
   cp .env.example .env
   ```

3. Add your ZegoCloud credentials to the `.env` file:
   ```
   VITE_ZEGOCLOUD_APP_ID=your_actual_app_id
   VITE_ZEGOCLOUD_SERVER_SECRET=your_actual_server_secret
   ```

## Usage

The VideoCall component is now integrated with ZegoCloud. To use it:

1. Import the component in your App.jsx or wherever needed
2. The component automatically handles room creation/joining
3. Room ID can be passed via URL parameter: `?roomID=your-room-id`

## Features

- Group video calls
- Screen sharing
- Text chat
- User management
- Responsive design

## Troubleshooting

- Make sure your App ID and Server Secret are correctly set in the .env file
- Check browser console for any error messages
- Ensure the @zegocloud/zego-uikit-prebuilt package is properly installed
