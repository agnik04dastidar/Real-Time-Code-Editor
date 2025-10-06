# TODO: Modify Video Call for Group Functionality

## Tasks
- [x] Modify VideoCall.jsx to accept and use roomId prop for Zego room joining
- [x] Update VideoCallSidebar.jsx to pass roomId prop to VideoCall component
- [x] Update backend/index.js toggleVideoCall event to accept and emit callRoomId
- [x] Update App.jsx toggleVideoCall function to use roomId directly as callRoomId
- [x] Update App.jsx socket.on("toggleVideoCall") to destructure callRoomId correctly
- [x] Add joinVideoCall emit in VideoCall.jsx after Zego join for participant tracking

## Progress
- [x] Task 1: Modify VideoCall.jsx
- [x] Task 2: Update VideoCallSidebar.jsx
- [x] Task 3: Update backend/index.js
- [x] Task 4: Update App.jsx toggleVideoCall
- [x] Task 5: Update App.jsx socket.on
- [x] Task 6: Add joinVideoCall emit
